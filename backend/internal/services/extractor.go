package services

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	md "github.com/JohannesKaufmann/html-to-markdown"
)

// Extractor handles data extraction from Chrome Web Store HTML using CSS selectors
type Extractor struct{}

// NewExtractor creates a new extractor instance
func NewExtractor() *Extractor {
	return &Extractor{}
}

// generateSlug converts a string to a URL-friendly slug
func (e *Extractor) generateSlug(text string) string {
	if text == "" {
		return ""
	}
	
	// Convert to lowercase
	slug := strings.ToLower(text)
	
	// Replace spaces and special characters with hyphens
	slug = regexp.MustCompile(`[^\p{L}\p{N}]+`).ReplaceAllString(slug, "-")
	
	// Remove leading and trailing hyphens
	slug = strings.Trim(slug, "-")
	
	return slug
}

// ExtractVersion extracts the extension version using CSS selectors
func (e *Extractor) ExtractVersion(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var version string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Version" {
			secondDiv := firstDiv.Next()
			version = strings.TrimSpace(secondDiv.Text())
		}
	})
	return version
}

// ExtractFileSize extracts the extension file size using CSS selectors
func (e *Extractor) ExtractFileSize(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var size string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Size" {
			secondDiv := firstDiv.Next()
			size = strings.TrimSpace(secondDiv.Text())
		}
	})
	return size
}

// ExtractLastUpdated extracts the last updated date using CSS selectors
func (e *Extractor) ExtractLastUpdated(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var updated string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Updated" {
			secondDiv := firstDiv.Next()
			updated = strings.TrimSpace(secondDiv.Text())
		}
	})
	return updated
}

// ExtractLastUpdatedDate extracts the last updated date and parses it to ISO 8601 format
func (e *Extractor) ExtractLastUpdatedDate(html string) string {
	dateStr := e.ExtractLastUpdated(html)
	if dateStr == "" {
		return ""
	}
	
	// Parse formats like "July 12, 2025" or "August 14, 2025"
	layouts := []string{
		"January 2, 2006",
		"Jan 2, 2006",
		"January 02, 2006",
		"Jan 02, 2006",
	}
	
	for _, layout := range layouts {
		if parsedTime, err := time.Parse(layout, dateStr); err == nil {
			return parsedTime.Format("2006-01-02")
		}
	}
	
	// If parsing fails, return the original string
	return dateStr
}

// ExtractDeveloperURL extracts the developer's website URL using CSS selectors
func (e *Extractor) ExtractDeveloperURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var devURL string
	
	// First, look for privacy policy links which usually point to developer's domain
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "privacy policy") || strings.Contains(linkText, "privacy") {
				// Skip Google/Chrome Store URLs
				if !strings.Contains(href, "google.com") && !strings.Contains(href, "chrome") {
					// Extract domain from privacy policy URL
					if strings.Contains(href, "/privacy") || strings.Contains(href, "/policy") {
						// Extract base domain (e.g., https://www.aitopia.ai/privacy-policy -> https://www.aitopia.ai)
						parts := strings.Split(href, "/")
						if len(parts) >= 3 {
							devURL = parts[0] + "//" + parts[2]
						}
						return
					}
				}
			}
		}
	})
	
	// If no privacy policy found, look for other developer links
	if devURL == "" {
		doc.Find("a").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists && strings.HasPrefix(href, "http") {
				linkText := strings.ToLower(strings.TrimSpace(s.Text()))
				// Look for website, homepage, or developer links
				if strings.Contains(linkText, "website") || strings.Contains(linkText, "homepage") || strings.Contains(linkText, "developer") {
					if !strings.Contains(href, "google.com") && !strings.Contains(href, "chrome") {
						devURL = href
						return
					}
				}
			}
		})
	}

	return devURL
}

// ExtractWebsite extracts the extension's official website URL using CSS selectors
func (e *Extractor) ExtractWebsite(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var website string
	
	// Look for specific website links first
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "website") || strings.Contains(linkText, "homepage") || strings.Contains(linkText, "official site") {
				if !strings.Contains(href, "google.com") && !strings.Contains(href, "chrome") {
					website = href
					return
				}
			}
		}
	})
	
	// If no specific website link found, look for common developer website patterns
	if website == "" {
		doc.Find("a").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists && strings.HasPrefix(href, "http") {
				// Skip Google/Chrome URLs but allow GitHub for developer projects
				if strings.Contains(href, "google.com") || strings.Contains(href, "chrome") {
					return
				}
				
				// Look for typical developer website domains
				if strings.Contains(href, ".com") || strings.Contains(href, ".org") || 
				   strings.Contains(href, ".net") || strings.Contains(href, ".io") {
					// Skip specific non-website URLs
					if !strings.Contains(href, "/support") && !strings.Contains(href, "/privacy") && 
					   !strings.Contains(href, "/policy") && !strings.Contains(href, "/terms") {
						website = href
						return
					}
				}
			}
		})
	}
	
	// As last resort, use the developer URL
	if website == "" {
		website = e.ExtractDeveloperURL(html)
	}
	
	return website
}

// ExtractSupportURL extracts the support/help URL using CSS selectors
func (e *Extractor) ExtractSupportURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var supportURL string
	
	// Look for support, help, or contact links (excluding Google/Chrome Store URLs and email links)
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") && !strings.HasPrefix(href, "mailto:") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "support") || strings.Contains(linkText, "help") || strings.Contains(linkText, "contact") || strings.Contains(linkText, "privacy") {
				// Skip Google/Chrome Store support URLs but allow GitHub URLs
				if !strings.Contains(href, "google.com") && !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
					supportURL = href
					return
				}
			}
		}
	})
	
	return supportURL
}

// ExtractSupportEmail extracts support/contact email addresses
func (e *Extractor) ExtractSupportEmail(html string) string {
	// Use regex to find email addresses in the HTML
	re := regexp.MustCompile(`([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`)
	matches := re.FindAllString(html, -1)
	
	// Filter out common email domains that are not useful for support
	excludeDomains := []string{"google.com", "gmail.com", "googlemail.com", "chrome.google.com"}
	
	// First pass: look for common support email patterns
	for _, email := range matches {
		emailLower := strings.ToLower(email)
		
		// Skip excluded domains
		isExcluded := false
		for _, domain := range excludeDomains {
			if strings.Contains(emailLower, "@"+domain) {
				isExcluded = true
				break
			}
		}
		if isExcluded {
			continue
		}
		
		// Look for common support email patterns
		if strings.Contains(emailLower, "info@") || 
		   strings.Contains(emailLower, "support@") || 
		   strings.Contains(emailLower, "contact@") ||
		   strings.Contains(emailLower, "help@") ||
		   strings.Contains(emailLower, "hello@") ||
		   strings.Contains(emailLower, "mail@") {
			return email
		}
	}
	
	// Second pass: if no common support patterns found, return the first non-excluded email
	// This catches developer emails that might not follow common patterns
	for _, email := range matches {
		emailLower := strings.ToLower(email)
		
		// Skip excluded domains
		isExcluded := false
		for _, domain := range excludeDomains {
			if strings.Contains(emailLower, "@"+domain) {
				isExcluded = true
				break
			}
		}
		if !isExcluded {
			return email
		}
	}
	
	return ""
}

// ExtractPrivacyURL extracts the privacy policy URL using CSS selectors
func (e *Extractor) ExtractPrivacyURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var privacyURL string
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "privacy") {
				if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
					privacyURL = href
				}
			}
		}
	})
	return privacyURL
}

// ExtractLogo extracts the extension's logo/icon URL using CSS selectors
func (e *Extractor) ExtractLogo(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var logoURL string
	
	// Look for icon images - Chrome Web Store typically uses img tags for extension icons
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		alt, hasAlt := s.Attr("alt")
		
		if exists && strings.HasPrefix(src, "http") {
			// Look for images that are likely the extension icon
			if hasAlt && (strings.Contains(strings.ToLower(alt), "icon") || 
						  strings.Contains(strings.ToLower(alt), "logo")) {
				logoURL = src
			} else if strings.Contains(src, "googleusercontent.com") && 
					  (strings.Contains(src, "icon") || strings.Contains(src, "logo")) {
				logoURL = src
			}
		}
	})
	
	// If no specific icon found, look for the first large image that could be the icon
	if logoURL == "" {
		doc.Find("img").Each(func(i int, s *goquery.Selection) {
			src, exists := s.Attr("src")
			if exists && strings.HasPrefix(src, "http") && strings.Contains(src, "googleusercontent.com") {
				// Chrome Web Store icons are typically hosted on googleusercontent.com
				logoURL = src
			}
		})
	}
	
	return logoURL
}

// ExtractFeatures extracts features like "Offers in-app purchases"
func (e *Extractor) ExtractFeatures(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var features []string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Features" {
			secondDiv := firstDiv.Next()
			featureText := strings.TrimSpace(secondDiv.Text())
			if featureText != "" {
				features = append(features, featureText)
			}
		}
	})
	return features
}

// ExtractLanguages extracts supported languages as an array
func (e *Extractor) ExtractLanguages(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var languagesText string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Languages" {
			secondDiv := firstDiv.Next()
			languagesText = strings.TrimSpace(secondDiv.Text())
		}
	})
	
	// If we found language info, extract the individual languages
	if languagesText != "" {
		// Remove the count prefix like "47 languages" and get the remaining text
		if idx := strings.Index(languagesText, "languages"); idx > 0 {
			remainingText := strings.TrimSpace(languagesText[idx+9:])
			if remainingText != "" {
				// Split by common separators like comma, semicolon
				languages := strings.FieldsFunc(remainingText, func(r rune) bool {
					return r == ',' || r == ';' || r == '\n'
				})
				
				// Clean up each language name
				var cleanLanguages []string
				for _, lang := range languages {
					lang = strings.TrimSpace(lang)
					if lang != "" {
						cleanLanguages = append(cleanLanguages, lang)
					}
				}
				
				if len(cleanLanguages) > 0 {
					return cleanLanguages
				}
			}
		}
		
		// If no specific languages found, extract the count and return it
		parts := strings.Fields(languagesText)
		if len(parts) > 0 && strings.Contains(parts[0], "language") {
			// Return just the count as a single item
			countStr := strings.TrimSuffix(parts[0], "languages")
			countStr = strings.TrimSuffix(countStr, "language")
			if countStr != "" {
				return []string{countStr + " languages supported"}
			}
		}
	}
	
	return []string{}
}

// ExtractFullDescription extracts the complete extension description
func (e *Extractor) ExtractFullDescription(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var fullDesc string
	
	// Look for Overview section or main description area
	doc.Find("section").Each(func(i int, s *goquery.Selection) {
		// Check if this section contains overview/description content
		text := strings.TrimSpace(s.Text())
		if strings.Contains(strings.ToLower(text), "overview") || len(text) > 200 {
			// Extract text from this section, cleaning up whitespace
			fullDesc = strings.TrimSpace(text)
		}
	})
	
	// If no section found, look for long div content
	if fullDesc == "" {
		doc.Find("div").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if len(text) > 200 && !strings.Contains(text, "screenshot") {
				fullDesc = text
			}
		})
	}
	
	return fullDesc
}

// ExtractScreenshots extracts screenshot URLs
func (e *Extractor) ExtractScreenshots(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var screenshots []string
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		alt, hasAlt := s.Attr("alt")
		
		if exists && strings.HasPrefix(src, "http") {
			// Look for screenshot images
			if hasAlt && (strings.Contains(strings.ToLower(alt), "screenshot") || 
						  strings.Contains(strings.ToLower(alt), "item media")) {
				screenshots = append(screenshots, src)
			}
		}
	})
	return screenshots
}

// ExtractCategory extracts the main category and subcategory
func (e *Extractor) ExtractCategory(html string) (string, string) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return "", ""
	}
	
	var category, subcategory string
	
	// Look for category breadcrumb or navigation
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/category/") {
			// Check for productivity/tools pattern
			if strings.Contains(href, "/productivity/tools") {
				category = "Productivity"
				subcategory = "Tools"
				return
			}
			
			// Extract from URL like /category/ext/11-web-development
			text := strings.TrimSpace(s.Text())
			if text != "" {
				if category == "" {
					category = text
				} else {
					subcategory = text
				}
			}
		}
	})
	
	// Also check for text content that indicates categories
	doc.Find("span, div").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if text == "Tools" || text == "Productivity" || text == "Extension" {
			if strings.Contains(strings.ToLower(text), "tools") {
				subcategory = "Tools"
				category = "Productivity"
			}
		}
	})
	
	return category, subcategory
}

// ExtractCategorySlug extracts the category and returns a URL-friendly slug
func (e *Extractor) ExtractCategorySlug(html string) string {
	category, _ := e.ExtractCategory(html)
	return e.generateSlug(category)
}

// ExtractSubcategorySlug extracts the subcategory and returns a URL-friendly slug
func (e *Extractor) ExtractSubcategorySlug(html string) string {
	_, subcategory := e.ExtractCategory(html)
	return e.generateSlug(subcategory)
}

// ExtractStatus extracts status like "Featured"
func (e *Extractor) ExtractStatus(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var statuses []string
	doc.Find("span, div").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if text == "Featured" || text == "Recommended" || text == "Popular" {
			statuses = append(statuses, text)
		}
	})
	return statuses
}

// ExtractReviewCount extracts the actual review count (like 26.7K)
func (e *Extractor) ExtractReviewCount(html string) int {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return 0
	}
	
	var reviewCountStr string
	
	// Look for the specific CSS class used for review count
	reviewText := doc.Find(".xJEoWe").First().Text()
	if reviewText != "" {
		// Extract just the number part before " ratings"
		parts := strings.Fields(strings.TrimSpace(reviewText))
		if len(parts) >= 2 && parts[1] == "ratings" {
			reviewCountStr = parts[0]
		}
	}
	
	// Look in the banner area first for review count
	if reviewCountStr == "" {
		doc.Find("div[role='banner'] *").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if strings.Contains(text, "ratings") && len(text) < 20 {
				parts := strings.Fields(text)
				for i, part := range parts {
					if part == "ratings" && i > 0 {
						candidate := parts[i-1]
						if strings.ContainsAny(candidate, "0123456789") {
							reviewCountStr = candidate
							return
						}
					}
				}
			}
		})
	}
	
	// Look for patterns like "(26.7K ratings)" in general content
	if reviewCountStr == "" {
		doc.Find("*").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if strings.Contains(text, "ratings") && strings.Contains(text, "(") && strings.Contains(text, ")") {
				start := strings.Index(text, "(")
				end := strings.Index(text, ")")
				if start >= 0 && end > start {
					content := strings.TrimSpace(text[start+1 : end])
					// Look for pattern like "26.7K ratings"
					parts := strings.Fields(content)
					for _, part := range parts {
						if strings.ContainsAny(part, "0123456789") && (strings.Contains(part, "K") || strings.Contains(part, "M") || strings.Contains(part, ".")) {
							reviewCountStr = part
							return
						}
					}
				}
			}
		})
	}
	
	// If no parentheses format, look for direct "X.XK ratings" format
	if reviewCountStr == "" {
		doc.Find("*").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if strings.Contains(text, "ratings") && len(text) < 30 {
				parts := strings.Fields(text)
				for i, part := range parts {
					if part == "ratings" && i > 0 {
						candidate := parts[i-1]
						if strings.ContainsAny(candidate, "0123456789") {
							reviewCountStr = candidate
							return
						}
					}
				}
			}
		})
	}
	
	// Parse the review count string to int
	return parseCountToInt(reviewCountStr)
}

// parseCountToInt converts count strings like "26.7K" or "1.2M" to integers
func parseCountToInt(countStr string) int {
	if countStr == "" {
		return 0
	}
	
	countStr = strings.TrimSpace(countStr)
	
	// Handle K (thousands) and M (millions) suffixes
	if strings.HasSuffix(countStr, "K") {
		numStr := strings.TrimSuffix(countStr, "K")
		if num, err := strconv.ParseFloat(numStr, 64); err == nil {
			return int(num * 1000)
		}
	} else if strings.HasSuffix(countStr, "M") {
		numStr := strings.TrimSuffix(countStr, "M")
		if num, err := strconv.ParseFloat(numStr, 64); err == nil {
			return int(num * 1000000)
		}
	} else {
		// Try to parse as regular integer
		if num, err := strconv.Atoi(strings.ReplaceAll(countStr, ",", "")); err == nil {
			return num
		}
	}
	
	return 0
}

// ExtractPrivacyDetails extracts privacy policy details
func (e *Extractor) ExtractPrivacyDetails(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var privacyDetails []string
	seen := make(map[string]bool)
	
	// Look for privacy section content
	doc.Find("div, section").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(strings.ToLower(text), "privacy") && len(text) > 50 {
			// Look for specific privacy items and avoid duplicates
			if strings.Contains(text, "Personal communications") && !seen["Personal communications"] {
				privacyDetails = append(privacyDetails, "Personal communications")
				seen["Personal communications"] = true
			}
			if strings.Contains(text, "User activity") && !seen["User activity"] {
				privacyDetails = append(privacyDetails, "User activity")
				seen["User activity"] = true
			}
			if strings.Contains(text, "Not being sold to third parties") && !seen["Not being sold to third parties"] {
				privacyDetails = append(privacyDetails, "Not being sold to third parties")
				seen["Not being sold to third parties"] = true
			}
		}
	})
	
	return privacyDetails
}

// ExtractRating extracts the star rating (like 4.9)
func (e *Extractor) ExtractRating(html string) float64 {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return 0.0
	}
	
	var ratingStr string
	
	// Look for the specific CSS class used for ratings
	rating := doc.Find(".Vq0ZA").First().Text()
	if rating != "" {
		ratingStr = strings.TrimSpace(rating)
	}
	
	// Fallback: Look for rating near star icons or in rating context
	if ratingStr == "" {
		doc.Find("*").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			
			// Look for exact patterns like "4.9" that appear standalone
			if len(text) == 3 && strings.Contains(text, ".") {
				// Check if it looks like a rating (1.0-5.0)
				if text[0] >= '1' && text[0] <= '5' && text[1] == '.' && text[2] >= '0' && text[2] <= '9' {
					// Prefer higher ratings (more likely to be accurate)
					if ratingStr == "" || text > ratingStr {
						ratingStr = text
					}
				}
			}
			
			// Also look for "X.X out of 5" pattern
			if strings.Contains(text, "out of 5") {
				parts := strings.Fields(text)
				for _, part := range parts {
					if len(part) == 3 && strings.Contains(part, ".") {
						if part[0] >= '1' && part[0] <= '5' && part[1] == '.' && part[2] >= '0' && part[2] <= '9' {
							if ratingStr == "" || part > ratingStr {
								ratingStr = part
							}
						}
					}
				}
			}
		})
	}
	
	// Parse the string rating to float64
	if ratingStr != "" {
		if ratingFloat, err := strconv.ParseFloat(ratingStr, 64); err == nil {
			return ratingFloat
		}
	}
	
	return 0.0
}

// ExtractUserCount extracts user count (like "1,000,000 users")
func (e *Extractor) ExtractUserCount(html string) int {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return 0
	}
	
	var userCountStr string
	
	// Look for patterns like "19,000,000 users" in text nodes
	doc.Find("*").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		
		// Use regex to find patterns like "1,000,000 users" or "19,000,000 users"
		re := regexp.MustCompile(`(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KM]?)\s+users`)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			userCountStr = matches[1]
			return
		}
	})
	
	// Parse the user count string to int
	return parseCountToInt(userCountStr)
}

// ExtractRelatedExtensions extracts related/recommended extensions
func (e *Extractor) ExtractRelatedExtensions(html string) []map[string]string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []map[string]string{}
	}
	
	var related []map[string]string
	seenExtensions := make(map[string]bool)
	
	// Look for sections that might contain related extensions
	// This is often in the sidebar or bottom of the page
	doc.Find("a").Each(func(i int, link *goquery.Selection) {
		href, exists := link.Attr("href")
		if exists && strings.Contains(href, "/detail/") {
			// Skip the current extension's own links (reviews, support, report)
			if strings.Contains(href, "/reviews") || strings.Contains(href, "/support") || strings.Contains(href, "/report") {
				return
			}
			
			// Extract extension info from href
			parts := strings.Split(href, "/")
			var name string
			var extensionID string
			
			// Parse URL like "./detail/extension-name/extensionid" or "/detail/extension-name/extensionid" 
			for j, part := range parts {
				if part == "detail" && j+2 < len(parts) {
					name = parts[j+1]
					extensionID = parts[j+2]
					break
				}
			}
			
			// Get the link text as the extension name if available
			linkText := strings.TrimSpace(link.Text())
			if linkText != "" && !strings.Contains(strings.ToLower(linkText), "rating") {
				name = linkText
			} else if name != "" {
				// Clean up the name from URL slug
				name = strings.ReplaceAll(name, "-", " ")
				name = strings.Title(name)
			}
			
			if name != "" && extensionID != "" && len(extensionID) == 32 {
				key := extensionID // Use extension ID as unique key
				if !seenExtensions[key] {
					seenExtensions[key] = true
					
					// Convert relative URLs to absolute Chrome Web Store URLs
					cleanURL := href
					if strings.HasPrefix(href, "./") {
						cleanURL = strings.TrimPrefix(href, "./")
					} else if strings.HasPrefix(href, "/") {
						cleanURL = strings.TrimPrefix(href, "/")
					}
					
					// Build proper Chrome Web Store URL
					fullURL := "https://chromewebstore.google.com/" + cleanURL
					
					ext := map[string]string{
						"name": name,
						"url":  fullURL,
						"id":   extensionID,
					}
					related = append(related, ext)
				}
			}
		}
	})
	
	return related
}

// ExtractBetterScreenshots tries better screenshot extraction
func (e *Extractor) ExtractBetterScreenshots(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var screenshots []string
	seenUrls := make(map[string]bool)
	
	// Look for data-media-url attributes which contain high-quality screenshot URLs
	doc.Find("[data-media-url]").Each(func(i int, s *goquery.Selection) {
		mediaUrl, exists := s.Attr("data-media-url")
		if exists && strings.HasPrefix(mediaUrl, "http") {
			if !seenUrls[mediaUrl] {
				seenUrls[mediaUrl] = true
				screenshots = append(screenshots, mediaUrl)
			}
		}
	})
	
	// If no media URLs found, look for larger images but filter out logos
	if len(screenshots) == 0 {
		doc.Find("img").Each(func(i int, s *goquery.Selection) {
			src, exists := s.Attr("src")
			if exists && strings.HasPrefix(src, "http") {
				// Filter out small icons/logos (s60, s120, etc.) and focus on screenshots
				if strings.Contains(src, "googleusercontent.com") && 
				   (strings.Contains(src, "s640") || strings.Contains(src, "s460") || 
				    strings.Contains(src, "w640") || strings.Contains(src, "w460") || 
				    strings.Contains(src, "h350") || strings.Contains(src, "w275")) &&
				   !strings.Contains(src, "s60") && !strings.Contains(src, "s120") {
					if !seenUrls[src] {
						seenUrls[src] = true
						screenshots = append(screenshots, src)
					}
				}
			}
		})
	}
	
	return screenshots
}

// ExtractSlug extracts the extension slug from URL (e.g., "chat-with-all-ai-models-g")
func (e *Extractor) ExtractSlug(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	// First, look for canonical URL in meta tags which contains the main slug
	canonicalURL, exists := doc.Find("link[rel='canonical']").Attr("href")
	if exists && strings.Contains(canonicalURL, "/detail/") {
		// Extract from URL like https://chromewebstore.google.com/detail/chat-with-all-ai-models-g/becfinhbfclcgokjlobojlnldbfillpf
		parts := strings.Split(canonicalURL, "/")
		for i, part := range parts {
			if part == "detail" && i+1 < len(parts) {
				// The part after "detail" is the slug
				candidate := parts[i+1]
				// Slugs contain hyphens and letters, not just extension IDs
				if len(candidate) > 5 && strings.Contains(candidate, "-") {
					return candidate
				}
			}
		}
	}
	
	var slug string
	
	// Look for the extension slug in URLs 
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/detail/") {
			// Extract from URL like /detail/chat-with-all-ai-models-g/extensionid
			parts := strings.Split(href, "/")
			for i, part := range parts {
				if part == "detail" && i+1 < len(parts) {
					// The part after "detail" is the slug
					candidate := parts[i+1]
					// Slugs contain hyphens and letters, not just extension IDs
					if len(candidate) > 5 && strings.Contains(candidate, "-") {
						slug = candidate
						return
					}
				}
			}
		}
	})
	
	return slug
}

// ExtractID extracts the extension ID (32-character string like \"becfinhbfclcgokjlobojlnldbfillpf\")
func (e *Extractor) ExtractID(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	// First, look for canonical URL in meta tags which contains the extension ID
	canonicalURL, exists := doc.Find("link[rel='canonical']").Attr("href")
	if exists && strings.Contains(canonicalURL, "/detail/") {
		// Extract from URL like https://chromewebstore.google.com/detail/chat-with-all-ai-models-g/becfinhbfclcgokjlobojlnldbfillpf
		parts := strings.Split(canonicalURL, "/")
		if len(parts) >= 2 {
			// The last part is the extension ID
			candidate := parts[len(parts)-1]
			// Extension IDs are typically 32 characters of lowercase letters
			if len(candidate) == 32 {
				allLowercase := true
				for _, ch := range candidate {
					if ch < 'a' || ch > 'z' {
						allLowercase = false
						break
					}
				}
				if allLowercase {
					return candidate
				}
			}
		}
	}
	
	var id string
	
	// Look for the extension ID in URLs or data attributes
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/detail/") {
			// Extract from URL like /detail/extension-name/extensionid
			parts := strings.Split(href, "/")
			if len(parts) >= 2 {
				// The last part is usually the extension ID
				candidate := parts[len(parts)-1]
				// Extension IDs are typically 32 characters of lowercase letters
				if len(candidate) == 32 {
					allLowercase := true
					for _, ch := range candidate {
						if ch < 'a' || ch > 'z' {
							allLowercase = false
							break
						}
					}
					if allLowercase && id == "" {
						id = candidate
					}
				}
			}
		}
	})
	
	return id
}

// ExtractMarkdownDescription creates a markdown-formatted description using HTML to Markdown converter
func (e *Extractor) ExtractMarkdownDescription(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	// Create markdown converter
	converter := md.NewConverter("", true, nil)
	
	// Find the main description section
	var descriptionHTML string
	doc.Find("section").Each(func(i int, s *goquery.Selection) {
		// Find the Overview section
		if strings.Contains(s.Text(), "Overview") {
			// Get the HTML content of paragraphs
			s.Find("p").Each(func(j int, p *goquery.Selection) {
				html, _ := p.Html()
				if html != "" && !strings.Contains(p.Text(), "Overview") {
					descriptionHTML += "<p>" + html + "</p>"
				}
			})
		}
	})
	
	// Convert HTML to Markdown
	markdownDesc := ""
	if descriptionHTML != "" {
		md, err := converter.ConvertString(descriptionHTML)
		if err == nil {
			markdownDesc = md
		}
	}
	
	// If no proper description found, create a basic one
	if markdownDesc == "" {
		var markdown strings.Builder
		
		// Add features if available
		features := e.ExtractFeatures(html)
		if len(features) > 0 {
			markdown.WriteString("## Features\n\n")
			for _, feature := range features {
				markdown.WriteString("- " + feature + "\n")
			}
			markdown.WriteString("\n")
		}
		
		// Add key information
		version := e.ExtractVersion(html)
		if version != "" {
			markdown.WriteString("## Details\n\n")
			markdown.WriteString("- **Version:** " + version + "\n")
		}
		
		fileSize := e.ExtractFileSize(html)
		if fileSize != "" {
			markdown.WriteString("- **Size:** " + fileSize + "\n")
		}
		
		lastUpdated := e.ExtractLastUpdated(html)
		if lastUpdated != "" {
			markdown.WriteString("- **Last Updated:** " + lastUpdated + "\n")
		}
		
		userCount := e.ExtractUserCount(html)
		if userCount > 0 {
			markdown.WriteString("- **Users:** " + strconv.Itoa(userCount) + "\n")
		}
		
		rating := e.ExtractRating(html)
		if rating > 0.0 {
			markdown.WriteString("- **Rating:** " + strconv.FormatFloat(rating, 'f', 1, 64) + " / 5.0\n")
		}
		
		markdownDesc = markdown.String()
	}
	
	return markdownDesc
}

// ExtractDeveloperName extracts the actual developer/company name
func (e *Extractor) ExtractDeveloperName(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var developerName string
	
	// Method 1: Look for "Offered by" section
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(text, "Offered by") {
			// Extract the name after "Offered by"
			if idx := strings.Index(text, "Offered by"); idx >= 0 {
				name := strings.TrimSpace(text[idx+10:])
				// Clean up any trailing links or extra text
				if idx := strings.IndexAny(name, "\n\t"); idx > 0 {
					name = name[:idx]
				}
				developerName = strings.TrimSpace(name)
			}
		}
	})
	
	// Method 2: If no "Offered by" found, look for developer name in common developer section classes
	if developerName == "" {
		// Look for common developer section selectors
		selectors := []string{".mdSapd", ".developer-name", ".yyjN4 .mdSapd"}
		
		for _, selector := range selectors {
			doc.Find(selector).Each(func(i int, s *goquery.Selection) {
				text := strings.TrimSpace(s.Text())
				if text != "" {
					// For company names with addresses, extract just the company name part
					// Common patterns: "COMPANY NAME\nAddress..." or "COMPANY NAME, INC.Address..."
					
					// First try to split by newlines
					lines := strings.Split(text, "\n")
					if len(lines) > 0 {
						firstLine := strings.TrimSpace(lines[0])
						
						// Check if the first line contains company name + address on same line
						// Look for patterns like "COMPANY, INC.12333 Address" (no space after company)
						// Use regex to extract company name ending with common business suffixes
						re := regexp.MustCompile(`^([^0-9]*(?:INC\.?|LLC\.?|CORP\.?|CO\.?|LTD\.?|COMPANY\.?))\s*[0-9].*`)
						matches := re.FindStringSubmatch(firstLine)
						if len(matches) > 1 {
							developerName = strings.TrimSpace(matches[1])
						} else {
							// If no business suffix pattern, just take the first line
							developerName = firstLine
						}
					}
				}
			})
			if developerName != "" {
				break
			}
		}
	}
	
	return developerName
}