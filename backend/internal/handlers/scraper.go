package handlers

import (
	"net/http"

	"chrome-analytics-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// ScrapeExtension scrapes a single extension by ID
func (h *Handler) ScrapeExtension(c *gin.Context) {
	extensionID := c.Param("id")
	if extensionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Extension ID is required"})
		return
	}

	scraper := services.NewScraper(h.db)
	
	extension, err := scraper.ScrapeExtension(extensionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to scrape extension",
			"details": err.Error(),
		})
		return
	}

	err = scraper.SaveExtension(extension)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save extension",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Extension scraped successfully",
		"extension": extension,
	})
}

// ScrapePopularExtensions scrapes a list of popular extensions
func (h *Handler) ScrapePopularExtensions(c *gin.Context) {
	// Popular Chrome extension IDs
	popularExtensions := []string{
		"cjpalhdlnbpafiamejdnhcphjbkeiagm", // uBlock Origin
		"nkbihfbeogaeaoehlefnkodbefgpgknn", // MetaMask
		"gighmmpiobklfepjocnamgkkbiglidom", // AdBlock
		"cfhdojbkjhnklbpkdaibdccddilifddb", // Adblock Plus
		"liecbddmkiiihnedobmlmillhodjkdmb", // Loom
		"bhhhlbepdkbapadjdnnojkbgioiodbic", // Solflare Wallet
		"fhbohimaelbohpjbbldcngcnapndodjp", // Honey
		"oldceeleldhonbafppcapldpdifcinji", // LanguageTool
		"gbmdgpbipfallnpgmpaldhdfnhfmnbpn", // OctoTree
		"ldipcbpaocekfooobnbcddclnhejkcpn", // Disconnect
	}

	scraper := services.NewScraper(h.db)
	
	go func() {
		err := scraper.ScrapeMultiple(popularExtensions)
		if err != nil {
			// Log error but don't fail the request since it's async
			// In production, you'd want proper error handling/notification
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Scraping started for popular extensions",
		"count": len(popularExtensions),
		"extensions": popularExtensions,
	})
}

// GetScrapingStatus returns the current status of scraping operations
func (h *Handler) GetScrapingStatus(c *gin.Context) {
	// This is a simplified status check
	// In production, you'd want to track scraping jobs properly
	c.JSON(http.StatusOK, gin.H{
		"status": "active",
		"message": "Scraping service is running",
		"last_update": "Check individual extensions for last update time",
	})
}