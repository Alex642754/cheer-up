package services

import (
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"solana-pay/models"
	solanarpc "solana-pay/solana"

	"gorm.io/gorm"
)

// CampaignSyncer is the on-chain synchronizer for fundraising campaigns.
// It scans incoming transactions to the receiver address, records each one,
// and accumulates the raised amount. Because scanning is address-based,
// direct transfers (without opening the link) are also counted.
type CampaignSyncer struct {
	db       *gorm.DB
	rpc      *solanarpc.RPCClient
	usdcMint string
}

func NewCampaignSyncer(db *gorm.DB, rpc *solanarpc.RPCClient) *CampaignSyncer {
	return &CampaignSyncer{db: db, rpc: rpc, usdcMint: solanarpc.USDCMintDevnet}
}

// formatUnits converts a raw smallest-unit amount to a decimal string (trimming trailing zeros)
func formatUnits(raw *big.Int, decimals int) string {
	if raw == nil {
		return "0"
	}
	denom := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	rat := new(big.Rat).SetFrac(raw, denom)
	s := rat.FloatString(decimals)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	if s == "" {
		return "0"
	}
	return s
}

// parseDecimal parses a decimal amount string into big.Float
func parseDecimal(s string) (*big.Float, bool) {
	return new(big.Float).SetString(strings.TrimSpace(s))
}

// FetchBaseline returns the current latest signature of the address, used as the creation baseline.
// Retries a few times — public RPCs rate-limit and an empty baseline would
// attribute pre-creation transfers to the campaign.
func (s *CampaignSyncer) FetchBaseline(receiverAddr string) string {
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(3 * time.Second)
		}
		sigs, err := s.rpc.GetRecentSignatures(receiverAddr, 1, time.Time{})
		if err == nil {
			if len(sigs) > 0 {
				return sigs[0]
			}
			return "" // address genuinely has no history
		}
		log.Printf("⚠️ FetchBaseline attempt %d failed for %s: %v", attempt+1, receiverAddr, err)
	}
	return ""
}

// SyncCampaign syncs a single campaign: scan chain → record → accumulate → complete if target reached
func (s *CampaignSyncer) SyncCampaign(campaign *models.Campaign) (newContributions int, err error) {
	if campaign == nil {
		return 0, fmt.Errorf("campaign cannot be nil")
	}
	if campaign.Status != models.StatusActive {
		return 0, nil
	}

	currency := strings.ToUpper(campaign.Currency)
	if currency != "SOL" && currency != "USDC" {
		return 0, fmt.Errorf("unsupported currency: %s", campaign.Currency)
	}

	sigs, err := s.rpc.GetRecentSignatures(campaign.ReceiverAddress, 50, time.Time{})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch signatures: %w", err)
	}

	// Trim by baseline: the list is time-descending; stop at the creation-time baseline
	// so only transactions after the campaign was created are counted (avoids validator time drift)
	filtered := sigs[:0]
	for _, sig := range sigs {
		if campaign.BaselineSignature != "" && sig == campaign.BaselineSignature {
			break
		}
		filtered = append(filtered, sig)
	}
	sigs = filtered

	// Process at most maxTxFetches transaction details per round: public RPCs
	// allow only a trickle of requests, and getTransaction is the expensive one.
	// Signatures come newest-first, so the freshest transfers land first and the
	// rest are picked up by subsequent rounds.
	const maxTxFetches = 2
	fetched := 0
	for _, sig := range sigs {
		// Skip transactions already recorded (tx_hash unique constraint as safety net)
		var exist int64
		s.db.Model(&models.Contribution{}).Where("tx_hash = ?", sig).Count(&exist)
		if exist > 0 {
			continue
		}
		if fetched >= maxTxFetches {
			break
		}
		fetched++

		var found bool
		var info *solanarpc.TransferInfo
		var amountStr string

		if currency == "SOL" {
			found, info, err = s.rpc.GetSOLTransferDetails(sig, campaign.ReceiverAddress)
			if err != nil {
				// Transient RPC failure (e.g. rate limit): abort the round so the
				// reconciler backoff retries it later — silently skipping here
				// would lose the contribution until the next successful fetch.
				return newContributions, fmt.Errorf("failed to fetch tx %s: %w", sig[:20], err)
			}
			if !found || info == nil {
				continue
			}
			amountStr = formatUnits(info.Amount, 9)
		} else {
			found, info, err = s.rpc.GetUSDCTransferDetails(sig, campaign.ReceiverAddress, s.usdcMint)
			if err != nil {
				return newContributions, fmt.Errorf("failed to fetch tx %s: %w", sig[:20], err)
			}
			if !found || info == nil {
				continue
			}
			amountStr = formatUnits(info.Amount, solanarpc.USDCDecimals)
		}

		contribution := models.Contribution{
			CampaignID:  campaign.ID,
			TxHash:      sig,
			FromAddress: info.From,
			Amount:      amountStr,
			BlockTime:   info.BlockTime,
		}

		err := s.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&contribution).Error; err != nil {
				return err
			}
			return s.recalcRaised(tx, campaign)
		})
		if err != nil {
			// Unique key conflict means it was already recorded concurrently; ignore
			continue
		}
		newContributions++
	}

	// Target reached check
	if target, ok := parseDecimal(campaign.TargetAmount); ok {
		if raised, ok2 := parseDecimal(campaign.RaisedAmount); ok2 && raised.Sign() > 0 && raised.Cmp(target) >= 0 {
			s.db.Model(&models.Campaign{}).Where("id = ?", campaign.ID).Updates(map[string]interface{}{
				"status":     models.StatusCompleted,
				"updated_at": time.Now(),
			})
			campaign.Status = models.StatusCompleted
		}
	}

	return newContributions, nil
}

// recalcRaised recomputes the raised amount by summing all contributions (avoids float drift)
func (s *CampaignSyncer) recalcRaised(tx *gorm.DB, campaign *models.Campaign) error {
	var contribs []models.Contribution
	if err := tx.Where("campaign_id = ?", campaign.ID).Find(&contribs).Error; err != nil {
		return err
	}

	total := new(big.Float)
	for _, c := range contribs {
		if amt, ok := parseDecimal(c.Amount); ok {
			total.Add(total, amt)
		}
	}

	raised := total.Text('f', 9)
	raised = strings.TrimRight(raised, "0")
	raised = strings.TrimRight(raised, ".")
	if raised == "" {
		raised = "0"
	}

	campaign.RaisedAmount = raised
	return tx.Model(&models.Campaign{}).Where("id = ?", campaign.ID).Updates(map[string]interface{}{
		"raised_amount": raised,
		"updated_at":    time.Now(),
	}).Error
}
