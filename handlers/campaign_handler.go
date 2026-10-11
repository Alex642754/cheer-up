package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"solana-pay/models"
	"solana-pay/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CampaignHandler struct {
	db     *gorm.DB
	syncer *services.CampaignSyncer
}

func NewCampaignHandler(db *gorm.DB, syncer *services.CampaignSyncer) *CampaignHandler {
	return &CampaignHandler{db: db, syncer: syncer}
}

type CreateCampaignRequest struct {
	Title           string `json:"title" binding:"required"`
	TargetAmount    string `json:"target_amount" binding:"required"`
	Currency        string `json:"currency" binding:"required,oneof=SOL USDC"`
	ReceiverAddress string `json:"receiver_address" binding:"required"`
}

func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
	var req CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request parameters",
			"details": err.Error(),
		})
		return
	}

	campaign := models.Campaign{
		CampaignNo:        models.GenerateCampaignNo(),
		Title:             req.Title,
		TargetAmount:      req.TargetAmount,
		RaisedAmount:      "0",
		Currency:          req.Currency,
		ReceiverAddress:   req.ReceiverAddress,
		BaselineSignature: h.syncer.FetchBaseline(req.ReceiverAddress),
		Status:            models.StatusActive,
	}

	if err := h.db.Create(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create campaign",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Campaign created successfully",
		"data":    campaign,
	})
}

func (h *CampaignHandler) ListCampaigns(c *gin.Context) {
	var campaigns []models.Campaign
	if err := h.db.Order("created_at DESC").Find(&campaigns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list campaigns",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Query successful",
		"data":    campaigns,
		"total":   len(campaigns),
	})
}

func (h *CampaignHandler) findCampaign(c *gin.Context, id string) (*models.Campaign, bool) {
	var campaign models.Campaign
	err := h.db.Where("id = ? OR campaign_no = ?", id, id).First(&campaign).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return nil, false
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to query campaign",
			"details": err.Error(),
		})
		return nil, false
	}
	return &campaign, true
}

func (h *CampaignHandler) GetCampaign(c *gin.Context) {
	id := c.Param("id")
	campaign, ok := h.findCampaign(c, id)
	if !ok {
		return
	}

	var contributions []models.Contribution
	h.db.Where("campaign_id = ?", campaign.ID).Order("created_at DESC").Find(&contributions)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Query successful",
		"data":          campaign,
		"contributions": contributions,
	})
}

// DemoContribute records a simulated contribution (demo mode only, no on-chain transfer)
func (h *CampaignHandler) DemoContribute(c *gin.Context) {
	id := c.Param("id")
	campaign, ok := h.findCampaign(c, id)
	if !ok {
		return
	}
	if campaign.Status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Campaign already completed"})
		return
	}

	var req struct {
		FromAddress string `json:"from_address" binding:"required"`
		Amount      string `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters", "details": err.Error()})
		return
	}
	amt, err := strconv.ParseFloat(req.Amount, 64)
	if err != nil || amt <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"})
		return
	}

	txHash := fmt.Sprintf("demo-%d-%s", time.Now().UnixMilli(), req.FromAddress[:8])
	now := time.Now()
	contrib := models.Contribution{
		CampaignID:  campaign.ID,
		TxHash:      txHash,
		FromAddress: req.FromAddress,
		Amount:      req.Amount,
		BlockTime:   &now,
	}
	if err := h.db.Create(&contrib).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save", "details": err.Error()})
		return
	}

	// Recalculate raised amount and update status
	var total float64
	h.db.Model(&models.Contribution{}).Where("campaign_id = ?", campaign.ID).
		Select("COALESCE(SUM(CAST(amount AS DECIMAL(20,9))),0)").Scan(&total)
	target, _ := strconv.ParseFloat(campaign.TargetAmount, 64)
	campaign.RaisedAmount = strconv.FormatFloat(total, 'f', -1, 64)
	if target > 0 && total >= target {
		campaign.Status = "completed"
	}
	h.db.Save(campaign)

	c.JSON(http.StatusOK, gin.H{"message": "Contribution recorded", "data": campaign})
}

// ManualSyncCampaign manually triggers an on-chain sync to refresh progress immediately
func (h *CampaignHandler) ManualSyncCampaign(c *gin.Context) {
	id := c.Param("id")
	campaign, ok := h.findCampaign(c, id)
	if !ok {
		return
	}

	newOnes, err := h.syncer.SyncCampaign(campaign)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "On-chain sync failed",
			"details": err.Error(),
		})
		return
	}

	h.db.Where("id = ?", campaign.ID).First(campaign)
	var contributions []models.Contribution
	h.db.Where("campaign_id = ?", campaign.ID).Order("created_at DESC").Find(&contributions)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Sync completed",
		"new":           newOnes,
		"data":          campaign,
		"contributions": contributions,
	})
}
