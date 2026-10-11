package services

import (
	"log"
	"time"

	"solana-pay/models"

	"gorm.io/gorm"
)

type Reconciler struct {
	db       *gorm.DB
	syncer   *CampaignSyncer
	interval time.Duration
	stopCh   chan struct{}

	// Per-campaign failure backoff: public RPCs rate-limit aggressively,
	// so on repeated failures skip the campaign for a growing window
	failCounts map[uint]int
	nextRetry  map[uint]time.Time
}

func NewReconciler(db *gorm.DB, syncer *CampaignSyncer, interval time.Duration) *Reconciler {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	return &Reconciler{
		db:         db,
		syncer:     syncer,
		interval:   interval,
		stopCh:     make(chan struct{}),
		failCounts: make(map[uint]int),
		nextRetry:  make(map[uint]time.Time),
	}
}

func (r *Reconciler) Start() {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.runOnce()
		case <-r.stopCh:
			return
		}
	}
}

func (r *Reconciler) Stop() {
	close(r.stopCh)
}

func (r *Reconciler) runOnce() {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("⚠️ Reconciler panic recovered: %v", rec)
		}
	}()

	var campaigns []models.Campaign
	// Newest first: when RPC quota is tight, the campaign being demonstrated syncs first
	if err := r.db.Where("status = ?", models.StatusActive).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		log.Printf("❌ Failed to query active campaigns: %v", err)
		return
	}

	total := 0
	for i := range campaigns {
		c := &campaigns[i]

		// Exponential backoff: skip campaigns that keep failing (rate limit etc.)
		if retryAt, ok := r.nextRetry[c.ID]; ok && time.Now().Before(retryAt) {
			continue
		}

		newOnes, err := r.syncer.SyncCampaign(c)
		if err != nil {
			r.failCounts[c.ID]++
			backoff := time.Duration(1<<min(r.failCounts[c.ID], 6)) * 30 * time.Second // 60s → 32min
			r.nextRetry[c.ID] = time.Now().Add(backoff)
			log.Printf("⚠️ Failed to sync campaign %s (attempt %d, retry in %s): %v",
				c.CampaignNo, r.failCounts[c.ID], backoff.Truncate(time.Second), err)
			continue
		}
		delete(r.failCounts, c.ID)
		delete(r.nextRetry, c.ID)

		total += newOnes
		if newOnes > 0 {
			log.Printf("✅ Campaign %s added %d contribution(s), raised %s / %s %s",
				c.CampaignNo, newOnes, c.RaisedAmount, c.TargetAmount, c.Currency)
		}
	}
	if total > 0 {
		log.Printf("🔄 Reconciliation round done, %d new contribution(s) total", total)
	}
}
