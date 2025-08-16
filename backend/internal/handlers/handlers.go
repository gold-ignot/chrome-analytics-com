package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"chrome-analytics-backend/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Handler struct {
	db *mongo.Database
}

func New(db *mongo.Database) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
		"service":   "chrome-analytics-backend",
	})
}

func (h *Handler) GetExtensions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort", "users") // Default sort by users
	order := c.DefaultQuery("order", "desc")  // Default descending order
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	skip := (page - 1) * limit

	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Count total documents
	total, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count extensions"})
		return
	}

	// Determine sort order
	sortOrder := -1 // descending
	if order == "asc" {
		sortOrder = 1
	}

	// Determine sort field
	sortField := "users"
	switch sortBy {
	case "recent", "created", "createdAt":
		sortField = "createdAt"
	case "updated", "updatedAt":
		sortField = "updatedAt"
	case "rating":
		sortField = "rating"
	case "reviews":
		sortField = "reviewCount"
	case "name":
		sortField = "name"
	default:
		sortField = "users"
	}

	// Find documents with pagination
	findOptions := options.Find()
	findOptions.SetSkip(int64(skip))
	findOptions.SetLimit(int64(limit))
	findOptions.SetSort(bson.D{{Key: sortField, Value: sortOrder}})

	cursor, err := collection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch extensions"})
		return
	}
	defer cursor.Close(ctx)

	var extensions []models.Extension
	if err = cursor.All(ctx, &extensions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode extensions"})
		return
	}

	response := models.ExtensionResponse{
		Extensions: extensions,
		Total:      total,
		Page:       page,
		Limit:      limit,
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetExtension(c *gin.Context) {
	id := c.Param("id")
	
	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var extension models.Extension
	
	// Try to find by ObjectID first, then by extensionId
	objectID, err := primitive.ObjectIDFromHex(id)
	var filter bson.M
	if err != nil {
		filter = bson.M{"extensionId": id}
	} else {
		filter = bson.M{"_id": objectID}
	}

	err = collection.FindOne(ctx, filter).Decode(&extension)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Extension not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch extension"})
		return
	}

	c.JSON(http.StatusOK, extension)
}

func (h *Handler) SearchExtensions(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	skip := (page - 1) * limit

	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create text search filter
	filter := bson.M{
		"$or": []bson.M{
			{"name": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
			{"developer": bson.M{"$regex": query, "$options": "i"}},
			{"keywords": bson.M{"$in": []string{query}}},
		},
	}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count extensions"})
		return
	}

	// Find documents with pagination
	findOptions := options.Find()
	findOptions.SetSkip(int64(skip))
	findOptions.SetLimit(int64(limit))
	findOptions.SetSort(bson.D{{Key: "users", Value: -1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search extensions"})
		return
	}
	defer cursor.Close(ctx)

	var extensions []models.Extension
	if err = cursor.All(ctx, &extensions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode extensions"})
		return
	}

	response := models.ExtensionResponse{
		Extensions: extensions,
		Total:      total,
		Page:       page,
		Limit:      limit,
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetAnalytics(c *gin.Context) {
	id := c.Param("id")
	
	collection := h.db.Collection("analytics")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"extensionId": id}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analytics"})
		return
	}
	defer cursor.Close(ctx)

	var analytics []models.Analytics
	if err = cursor.All(ctx, &analytics); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode analytics"})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

func (h *Handler) GetGrowthMetrics(c *gin.Context) {
	id := c.Param("id")
	
	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var extension models.Extension
	filter := bson.M{"extensionId": id}
	err := collection.FindOne(ctx, filter).Decode(&extension)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Extension not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch extension"})
		return
	}

	// Calculate growth metrics from snapshots
	if len(extension.Snapshots) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"userGrowth": 0,
			"ratingChange": 0,
			"reviewGrowth": 0,
			"message": "Insufficient data for growth calculation",
		})
		return
	}

	latest := extension.Snapshots[len(extension.Snapshots)-1]
	previous := extension.Snapshots[len(extension.Snapshots)-2]

	growth := gin.H{
		"userGrowth": latest.Users - previous.Users,
		"ratingChange": latest.Rating - previous.Rating,
		"reviewGrowth": latest.ReviewCount - previous.ReviewCount,
		"period": gin.H{
			"from": previous.Date,
			"to": latest.Date,
		},
	}

	c.JSON(http.StatusOK, growth)
}

func (h *Handler) GetKeywordPerformance(c *gin.Context) {
	id := c.Param("id")
	
	collection := h.db.Collection("analytics")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"extensionId": id}
	findOptions := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(1)

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch keyword data"})
		return
	}
	defer cursor.Close(ctx)

	var analytics []models.Analytics
	if err = cursor.All(ctx, &analytics); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode analytics"})
		return
	}

	if len(analytics) == 0 {
		c.JSON(http.StatusOK, gin.H{"keywords": []models.KeywordMetric{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"keywords": analytics[0].Keywords})
}

// Admin Dashboard Analytics Handlers
func (h *Handler) GetDashboardOverview(c *gin.Context) {
	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get total counts and aggregated metrics
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id": nil,
				"total_extensions": bson.M{"$sum": 1},
				"total_users": bson.M{"$sum": "$users"},
				"average_rating": bson.M{"$avg": "$rating"},
				"categories": bson.M{"$push": "$category"},
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch overview data"})
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil || len(results) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process overview data"})
		return
	}

	result := results[0]
	
	// Process category breakdown
	categories := result["categories"].(primitive.A)
	categoryBreakdown := make(map[string]int)
	for _, cat := range categories {
		if category, ok := cat.(string); ok && category != "" {
			categoryBreakdown[category]++
		}
	}

	// Get top extensions
	findOptions := options.Find().SetSort(bson.D{{Key: "users", Value: -1}}).SetLimit(5)
	topCursor, err := collection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top extensions"})
		return
	}
	defer topCursor.Close(ctx)

	var topExtensions []models.Extension
	if err = topCursor.All(ctx, &topExtensions); err != nil {
		topExtensions = []models.Extension{}
	}

	// Calculate growth metrics (simplified for now)
	totalUsers := int64(0)
	if users, ok := result["total_users"].(int64); ok {
		totalUsers = users
	} else if users, ok := result["total_users"].(int32); ok {
		totalUsers = int64(users)
	}

	overview := map[string]interface{}{
		"total_extensions": result["total_extensions"],
		"total_users": totalUsers,
		"average_rating": result["average_rating"],
		"growth_metrics": map[string]interface{}{
			"daily_growth": totalUsers * 2 / 100,   // Placeholder calculation
			"weekly_growth": totalUsers * 5 / 100,  // Placeholder calculation  
			"monthly_growth": totalUsers * 15 / 100, // Placeholder calculation
		},
		"category_breakdown": categoryBreakdown,
		"top_extensions": topExtensions,
		"recent_snapshots": []map[string]interface{}{}, // To be implemented with actual snapshot data
	}

	c.JSON(http.StatusOK, overview)
}

func (h *Handler) GetExtensionGrowthTrends(c *gin.Context) {
	collection := h.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get growth by category
	pipeline := []bson.M{
		{
			"$unwind": "$snapshots",
		},
		{
			"$group": bson.M{
				"_id": bson.M{
					"category": "$category",
					"date": bson.M{
						"$dateToString": bson.M{
							"format": "%Y-%m-%d",
							"date": "$snapshots.date",
						},
					},
				},
				"total_users": bson.M{"$sum": "$snapshots.users"},
				"avg_rating": bson.M{"$avg": "$snapshots.rating"},
			},
		},
		{
			"$sort": bson.M{"_id.date": 1},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch growth trends"})
		return
	}
	defer cursor.Close(ctx)

	var growthData []bson.M
	if err = cursor.All(ctx, &growthData); err != nil {
		growthData = []bson.M{}
	}

	// Process growth by category
	growthByCategory := make(map[string][]map[string]interface{})
	for _, item := range growthData {
		id := item["_id"].(bson.M)
		category := id["category"].(string)
		date := id["date"].(string)
		
		if growthByCategory[category] == nil {
			growthByCategory[category] = []map[string]interface{}{}
		}
		
		growthByCategory[category] = append(growthByCategory[category], map[string]interface{}{
			"date": date,
			"users": item["total_users"],
			"rating": item["avg_rating"],
		})
	}

	// Get top growing extensions (simplified)
	findOptions := options.Find().SetSort(bson.D{{Key: "users", Value: -1}}).SetLimit(3)
	topCursor, err := collection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top growing extensions"})
		return
	}
	defer topCursor.Close(ctx)

	var topGrowingExtensions []models.Extension
	if err = topCursor.All(ctx, &topGrowingExtensions); err != nil {
		topGrowingExtensions = []models.Extension{}
	}

	// Convert to response format
	topGrowingFormatted := []map[string]interface{}{}
	for _, ext := range topGrowingExtensions {
		topGrowingFormatted = append(topGrowingFormatted, map[string]interface{}{
			"extension": ext,
			"growth_rate": 15.5, // Placeholder calculation
			"growth_period": "Last 30 days",
		})
	}

	trends := map[string]interface{}{
		"growth_by_category": growthByCategory,
		"top_growing_extensions": topGrowingFormatted,
		"market_trends": []map[string]interface{}{}, // To be implemented
	}

	c.JSON(http.StatusOK, trends)
}