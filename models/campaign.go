package models

import (
	"fmt"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

type CampaignStatus string

const (
	StatusActive    CampaignStatus = "active"    // fundraising in progress
	StatusCompleted CampaignStatus = "completed" // target amount reached
)

// Campaign is a fundraising activity: a single collection target, completed by multiple transfers
type Campaign struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	CampaignNo      string         `json:"campaign_no" gorm:"uniqueIndex;size:64;not null"`
	Title           string         `json:"title" gorm:"size:255;not null"`
	TargetAmount    string         `json:"target_amount" gorm:"size:32;not null"`   // target amount (string avoids float precision)
	RaisedAmount    string         `json:"raised_amount" gorm:"size:32;not null;default:'0'"` // raised amount
	Currency        string         `json:"currency" gorm:"size:16;not null"`        // SOL / USDC
	ReceiverAddress string         `json:"receiver_address" gorm:"size:128;not null"` // receiver address (scan baseline)
	// BaselineSignature is the latest on-chain signature at campaign creation;
	// scanning stops at it so only post-creation contributions are counted
	BaselineSignature string         `json:"-" gorm:"size:256"`
	Status            CampaignStatus `json:"status" gorm:"size:16;not null;default:active"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`

	Contributions []Contribution `json:"contributions,omitempty" gorm:"foreignKey:CampaignID"`
}

// Contribution is a single on-chain contribution record (tx_hash unique, prevents double counting)
type Contribution struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	CampaignID  uint           `json:"campaign_id" gorm:"index;not null"`
	TxHash      string         `json:"tx_hash" gorm:"uniqueIndex;size:256;not null"`
	FromAddress string         `json:"from_address" gorm:"size:128"` // payer (fee payer)
	Amount      string         `json:"amount" gorm:"size:32;not null"`
	BlockTime   *time.Time     `json:"block_time,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Campaign{}, &Contribution{})
}

func GenerateCampaignNo() string {
	now := time.Now()
	timestamp := now.Format("20060102150405")
	suffix := rand.Intn(1000000)
	return fmt.Sprintf("FUND%s%06d", timestamp, suffix)
}
