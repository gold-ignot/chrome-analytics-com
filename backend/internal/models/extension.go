package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Extension struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ExtensionID string             `json:"extensionId" bson:"extensionId"`
	Name        string             `json:"name" bson:"name"`
	Description string             `json:"description" bson:"description"`
	Category    string             `json:"category" bson:"category"`
	Developer   string             `json:"developer" bson:"developer"`
	Users       int64              `json:"users" bson:"users"`
	Rating      float64            `json:"rating" bson:"rating"`
	ReviewCount int64              `json:"reviewCount" bson:"reviewCount"`
	Keywords    []string           `json:"keywords" bson:"keywords"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt"`
	Snapshots   []Snapshot         `json:"snapshots" bson:"snapshots"`
}

type Snapshot struct {
	Date        time.Time `json:"date" bson:"date"`
	Users       int64     `json:"users" bson:"users"`
	Rating      float64   `json:"rating" bson:"rating"`
	ReviewCount int64     `json:"reviewCount" bson:"reviewCount"`
}

type Analytics struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ExtensionID string             `json:"extensionId" bson:"extensionId"`
	Date        time.Time          `json:"date" bson:"date"`
	Metrics     Metrics            `json:"metrics" bson:"metrics"`
	Keywords    []KeywordMetric    `json:"keywords" bson:"keywords"`
}

type Metrics struct {
	UserGrowth    int64   `json:"userGrowth" bson:"userGrowth"`
	RatingChange  float64 `json:"ratingChange" bson:"ratingChange"`
	ReviewGrowth  int64   `json:"reviewGrowth" bson:"reviewGrowth"`
}

type KeywordMetric struct {
	Keyword      string `json:"keyword" bson:"keyword"`
	Position     int    `json:"position" bson:"position"`
	SearchVolume int64  `json:"searchVolume" bson:"searchVolume"`
}

type ExtensionResponse struct {
	Extensions []Extension `json:"extensions"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}