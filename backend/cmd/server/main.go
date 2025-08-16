package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chrome-analytics-backend/internal/database"
	"chrome-analytics-backend/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Disconnect()

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-Admin-Password", "x-admin-password"}
	router.Use(cors.New(config))

	// Initialize handlers
	h := handlers.New(db)
	
	// Initialize automation handler
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}
	
	automationHandler, err := handlers.NewAutomationHandler(db, redisURL)
	if err != nil {
		log.Fatal("Failed to initialize automation handler:", err)
	}
	defer automationHandler.Close()
	
	// Initialize admin handler
	adminHandler := handlers.NewAdminHandler(db, redisURL)

	// Routes
	api := router.Group("/api")
	{
		api.GET("/health", h.Health)
		
		extensions := api.Group("/extensions")
		{
			extensions.GET("", h.GetExtensions)
			extensions.GET("/:id", h.GetExtension)
			extensions.GET("/search", h.SearchExtensions)
		}

		analytics := api.Group("/analytics")
		{
			analytics.GET("/:id", h.GetAnalytics)
			analytics.GET("/:id/growth", h.GetGrowthMetrics)
			analytics.GET("/:id/keywords", h.GetKeywordPerformance)
		}

		scraper := api.Group("/scraper")
		{
			scraper.GET("/status", h.GetScrapingStatus)
			scraper.POST("/extension/:id", h.ScrapeExtension)
			scraper.POST("/popular", h.ScrapePopularExtensions)
		}

		automation := api.Group("/automation")
		{
			automation.POST("/start", automationHandler.StartAutomation)
			automation.POST("/stop", automationHandler.StopAutomation)
			automation.GET("/status", automationHandler.GetAutomationStatus)
			automation.GET("/queue/stats", automationHandler.GetQueueStats)
			automation.GET("/completed/stats", automationHandler.GetCompletedJobsStats)
			automation.GET("/proxy/stats", automationHandler.GetProxyStats)
			automation.POST("/cleanup", automationHandler.CleanupInvalidExtensions)
			automation.GET("/categories", automationHandler.GetAvailableCategories)
			automation.GET("/keywords", automationHandler.GetPopularKeywords)
			
			jobs := automation.Group("/jobs")
			{
				jobs.POST("/discovery", automationHandler.ScheduleDiscoveryJob)
				jobs.POST("/update/:extensionId", automationHandler.ScheduleUpdateJob)
				jobs.POST("/bulk-update", automationHandler.BulkScheduleUpdates)
				jobs.GET("/:jobId", automationHandler.GetJobDetails)
			}
		}

		admin := api.Group("/admin")
		{
			// Admin system management
			admin.GET("/health", adminHandler.AdminHealth)
			admin.GET("/debug-headers", adminHandler.DebugHeaders)
			admin.GET("/status", adminHandler.GetSystemStatus)
			admin.POST("/clear/database", adminHandler.ClearDatabase)
			admin.POST("/clear/redis", adminHandler.ClearRedis)
			admin.POST("/clear/all", adminHandler.ClearAll)
			
			dashboard := admin.Group("/dashboard")
			{
				dashboard.GET("/overview", h.GetDashboardOverview)
				dashboard.GET("/growth-trends", h.GetExtensionGrowthTrends)
			}
		}
	}

	// Server configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}