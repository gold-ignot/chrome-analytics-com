package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"github.com/redis/go-redis/v9"
)

type AdminHandler struct {
	db          *mongo.Database
	redisClient *redis.Client
}

func NewAdminHandler(db *mongo.Database, redisURL string) *AdminHandler {
	// Parse Redis URL and create client
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to default Redis configuration
		opt = &redis.Options{
			Addr: "localhost:6379",
		}
	}
	
	redisClient := redis.NewClient(opt)
	
	return &AdminHandler{
		db:          db,
		redisClient: redisClient,
	}
}

// requireAdminAuth checks if the request has proper admin authentication
func (ah *AdminHandler) requireAdminAuth(c *gin.Context) bool {
	// Check for admin password in header or query param
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "password123" // Default for development
	}
	
	providedPassword := c.GetHeader("X-Admin-Password")
	if providedPassword == "" {
		providedPassword = c.Query("password")
	}
	
	if providedPassword != adminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized. Provide admin password in X-Admin-Password header or password query param",
		})
		return false
	}
	
	return true
}

// ClearDatabase clears all collections in the database
func (ah *AdminHandler) ClearDatabase(c *gin.Context) {
	if !ah.requireAdminAuth(c) {
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Get all collection names
	collections := []string{"extensions", "analytics", "jobs", "completed_jobs"}
	
	cleared := []string{}
	errors := []string{}
	
	for _, collectionName := range collections {
		collection := ah.db.Collection(collectionName)
		
		// Get document count before deletion
		count, err := collection.CountDocuments(ctx, bson.M{})
		if err != nil {
			errors = append(errors, collectionName+": failed to count documents - "+err.Error())
			continue
		}
		
		// Drop the collection entirely (faster than deleteMany for large collections)
		err = collection.Drop(ctx)
		if err != nil {
			errors = append(errors, collectionName+": failed to drop collection - "+err.Error())
			continue
		}
		
		cleared = append(cleared, collectionName+" ("+string(rune(count))+" documents)")
	}
	
	response := gin.H{
		"message": "Database clear operation completed",
		"cleared_collections": cleared,
		"timestamp": time.Now().UTC(),
	}
	
	if len(errors) > 0 {
		response["errors"] = errors
	}
	
	c.JSON(http.StatusOK, response)
}

// ClearRedis clears all Redis data
func (ah *AdminHandler) ClearRedis(c *gin.Context) {
	if !ah.requireAdminAuth(c) {
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Get Redis info before clearing
	info, err := ah.redisClient.Info(ctx, "keyspace").Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get Redis info: " + err.Error(),
		})
		return
	}
	
	// Clear all Redis data
	result, err := ah.redisClient.FlushAll(ctx).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to clear Redis: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Redis cleared successfully",
		"result": result,
		"redis_info_before_clear": info,
		"timestamp": time.Now().UTC(),
	})
}

// ClearAll clears both database and Redis
func (ah *AdminHandler) ClearAll(c *gin.Context) {
	if !ah.requireAdminAuth(c) {
		return
	}
	
	// Clear database
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	
	// Database clearing
	collections := []string{"extensions", "analytics", "jobs", "completed_jobs"}
	dbCleared := []string{}
	dbErrors := []string{}
	
	for _, collectionName := range collections {
		collection := ah.db.Collection(collectionName)
		count, err := collection.CountDocuments(ctx, bson.M{})
		if err != nil {
			dbErrors = append(dbErrors, collectionName+": failed to count - "+err.Error())
			continue
		}
		
		err = collection.Drop(ctx)
		if err != nil {
			dbErrors = append(dbErrors, collectionName+": failed to drop - "+err.Error())
			continue
		}
		
		dbCleared = append(dbCleared, collectionName+" ("+string(rune(count))+" documents)")
	}
	
	// Redis clearing
	redisInfo := ""
	redisError := ""
	
	info, err := ah.redisClient.Info(ctx, "keyspace").Result()
	if err != nil {
		redisError = "Failed to get Redis info: " + err.Error()
	} else {
		redisInfo = info
	}
	
	if redisError == "" {
		_, err = ah.redisClient.FlushAll(ctx).Result()
		if err != nil {
			redisError = "Failed to clear Redis: " + err.Error()
		}
	}
	
	response := gin.H{
		"message": "Complete system clear operation completed",
		"database": gin.H{
			"cleared_collections": dbCleared,
		},
		"redis": gin.H{
			"cleared": redisError == "",
			"info_before_clear": redisInfo,
		},
		"timestamp": time.Now().UTC(),
	}
	
	if len(dbErrors) > 0 {
		response["database"].(gin.H)["errors"] = dbErrors
	}
	
	if redisError != "" {
		response["redis"].(gin.H)["error"] = redisError
	}
	
	status := http.StatusOK
	if len(dbErrors) > 0 || redisError != "" {
		status = http.StatusPartialContent
	}
	
	c.JSON(status, response)
}

// GetSystemStatus returns the current status of database and Redis
func (ah *AdminHandler) GetSystemStatus(c *gin.Context) {
	if !ah.requireAdminAuth(c) {
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Database status
	collections := []string{"extensions", "analytics", "jobs", "completed_jobs"}
	dbStatus := make(map[string]interface{})
	
	for _, collectionName := range collections {
		collection := ah.db.Collection(collectionName)
		count, err := collection.CountDocuments(ctx, bson.M{})
		if err != nil {
			dbStatus[collectionName] = gin.H{
				"error": err.Error(),
				"count": 0,
			}
		} else {
			dbStatus[collectionName] = gin.H{
				"count": count,
				"status": "ok",
			}
		}
	}
	
	// Redis status
	redisStatus := gin.H{}
	
	// Check Redis connection
	_, err := ah.redisClient.Ping(ctx).Result()
	if err != nil {
		redisStatus["connection"] = "failed: " + err.Error()
	} else {
		redisStatus["connection"] = "ok"
		
		// Get Redis info
		info, err := ah.redisClient.Info(ctx, "keyspace").Result()
		if err != nil {
			redisStatus["keyspace_info"] = "failed to get info: " + err.Error()
		} else {
			redisStatus["keyspace_info"] = info
		}
		
		// Get memory usage
		memory, err := ah.redisClient.Info(ctx, "memory").Result()
		if err != nil {
			redisStatus["memory_info"] = "failed to get memory info: " + err.Error()
		} else {
			redisStatus["memory_info"] = memory
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"database": dbStatus,
		"redis": redisStatus,
		"timestamp": time.Now().UTC(),
	})
}

// AdminHealth checks if admin endpoints are accessible
func (ah *AdminHandler) AdminHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "admin-endpoints",
		"timestamp": time.Now().UTC(),
		"auth_required": true,
		"auth_methods": []string{"X-Admin-Password header", "password query parameter"},
	})
}