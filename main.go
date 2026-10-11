package main

import (
	"log"
	"os"
	"strconv"
	"time"

	"solana-pay/config"
	"solana-pay/models"
	"solana-pay/routes"
	"solana-pay/services"
	solanarpc "solana-pay/solana"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("✅ Database connected")

	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run database migration: %v", err)
	}
	log.Println("✅ Database tables initialized")

	rpcClient, err := solanarpc.NewRPCClient()
	if err != nil {
		log.Fatalf("Failed to initialize Solana RPC client: %v", err)
	}
	log.Println("✅ Solana RPC client initialized (Devnet)")

	checker := services.NewCampaignSyncer(db, rpcClient)
	// Scan interval: configurable via SYNC_INTERVAL_SECONDS (default 15s).
	// Public devnet RPCs rate-limit aggressively; 5s × several active campaigns exhausts the quota.
	syncInterval := 15 * time.Second
	if v, err := strconv.Atoi(os.Getenv("SYNC_INTERVAL_SECONDS")); err == nil && v > 0 {
		syncInterval = time.Duration(v) * time.Second
	}
	reconciler := services.NewReconciler(db, checker, syncInterval)
	go reconciler.Start()

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	routes.SetupRoutes(r, db, checker)

	log.Println("🚀 Server started at http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
