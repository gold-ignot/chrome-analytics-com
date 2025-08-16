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