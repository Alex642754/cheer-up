package routes

import (
	"net/http"

	"solana-pay/handlers"
	"solana-pay/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, syncer *services.CampaignSyncer) {
	campaignHandler := handlers.NewCampaignHandler(db, syncer)

	api := r.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		campaigns := api.Group("/campaigns")
		{
			campaigns.GET("", campaignHandler.ListCampaigns)
			campaigns.POST("", campaignHandler.CreateCampaign)
			campaigns.GET("/:id", campaignHandler.GetCampaign)
			campaigns.POST("/:id/sync", campaignHandler.ManualSyncCampaign)
                    campaigns.POST("/:id/contribute", campaignHandler.DemoContribute)
		}
	}
}
