package services

import (
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// Extractor handles data extraction from Chrome Web Store HTML using CSS selectors
type Extractor struct{}

// NewExtractor creates a new extractor instance
func NewExtractor() *Extractor {
	return &Extractor{}
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

// ExtractDeveloperURL extracts the developer's website URL using CSS selectors
func (e *Extractor) ExtractDeveloperURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	// Look for "Offered by" section and find links
	var devURL string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.Contains(strings.TrimSpace(firstDiv.Text()), "Offered by") {
			// Look for links in this li or nearby
			s.Find("a").Each(func(j int, link *goquery.Selection) {
				href, exists := link.Attr("href")
				if exists && strings.HasPrefix(href, "http") {
					if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
						devURL = href
					}
				}
			})
		}
	})

	// Also check for general links with privacy/website context
	if devURL == "" {
		doc.Find("a").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists && strings.HasPrefix(href, "http") {
				linkText := strings.ToLower(strings.TrimSpace(s.Text()))
				if strings.Contains(linkText, "privacy") || strings.Contains(linkText, "website") {
					if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
						devURL = href
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
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "website") || strings.Contains(linkText, "homepage") {
				if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
					website = href
				}
			}
		}
	})
	return website
}

// ExtractSupportURL extracts the support/help URL using CSS selectors
func (e *Extractor) ExtractSupportURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var supportURL string
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.HasPrefix(href, "http") {
			linkText := strings.ToLower(strings.TrimSpace(s.Text()))
			if strings.Contains(linkText, "support") || strings.Contains(linkText, "help") || strings.Contains(linkText, "contact") {
				supportURL = href
			}
		}
	})
	return supportURL
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

// ExtractLanguages extracts supported languages count/info
func (e *Extractor) ExtractLanguages(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var languages string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Languages" {
			secondDiv := firstDiv.Next()
			languages = strings.TrimSpace(secondDiv.Text())
		}
	})
	return languages
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
func (e *Extractor) ExtractReviewCount(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var reviewCount string
	
	// Look for patterns like "26.7K ratings", "(26.7K ratings)"
	doc.Find("span, div").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(text, "ratings") || strings.Contains(text, "reviews") {
			// Extract the number part
			if strings.Contains(text, "(") && strings.Contains(text, ")") {
				start := strings.Index(text, "(")
				end := strings.Index(text, ")")
				if start >= 0 && end > start {
					reviewCount = strings.TrimSpace(text[start+1 : end])
				}
			} else {
				// Direct format like "26.7K ratings"
				parts := strings.Fields(text)
				for _, part := range parts {
					if strings.Contains(part, "K") || strings.Contains(part, "M") || 
					   (len(part) > 0 && part[0] >= '0' && part[0] <= '9') {
						reviewCount = part
						break
					}
				}
			}
		}
	})
	
	return reviewCount
}

// ExtractPrivacyDetails extracts privacy policy details
func (e *Extractor) ExtractPrivacyDetails(html string) []string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []string{}
	}
	
	var privacyDetails []string
	
	// Look for privacy section content
	doc.Find("div, section").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(strings.ToLower(text), "privacy") && len(text) > 50 {
			// Look for specific privacy items
			if strings.Contains(text, "Personal communications") {
				privacyDetails = append(privacyDetails, "Personal communications")
			}
			if strings.Contains(text, "User activity") {
				privacyDetails = append(privacyDetails, "User activity")
			}
			if strings.Contains(text, "Not being sold to third parties") {
				privacyDetails = append(privacyDetails, "Not being sold to third parties")
			}
		}
	})
	
	return privacyDetails
}

// ExtractRating extracts the star rating (like 4.9)
func (e *Extractor) ExtractRating(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var rating string
	// Look more specifically for rating patterns
	doc.Find("*").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		// Look for "4.9 out of 5" pattern first (most reliable)
		if strings.Contains(text, "out of 5") {
			parts := strings.Fields(text)
			for _, part := range parts {
				if len(part) >= 3 && strings.Contains(part, ".") {
					if rating == "" { // Take first match
						rating = part
						return
					}
				}
			}
		}
	})
	
	// If no "out of 5" found, look for standalone ratings
	if rating == "" {
		doc.Find("*").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if len(text) >= 3 && len(text) <= 5 && strings.Contains(text, ".") {
				// Check if it looks like a rating (1.0-5.0)
				if text[0] >= '1' && text[0] <= '5' && text[1] == '.' {
					rating = text
					return
				}
			}
		})
	}
	return rating
}

// ExtractUserCount extracts user count (like "1,000,000 users")
func (e *Extractor) ExtractUserCount(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var userCount string
	doc.Find("span, div").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(text, "users") {
			// Extract the number part before "users"
			parts := strings.Fields(text)
			for i, part := range parts {
				if part == "users" && i > 0 {
					userCount = parts[i-1]
					break
				}
			}
		}
	})
	return userCount
}

// ExtractRelatedExtensions extracts related/recommended extensions
func (e *Extractor) ExtractRelatedExtensions(html string) []map[string]string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []map[string]string{}
	}
	
	var related []map[string]string
	
	// Look for sections that might contain related extensions
	doc.Find("div, section").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(strings.ToLower(text), "related") {
			// Look for extension names and ratings within this section
			s.Find("a").Each(func(j int, link *goquery.Selection) {
				href, exists := link.Attr("href")
				name := strings.TrimSpace(link.Text())
				if exists && strings.Contains(href, "/detail/") && len(name) > 5 {
					ext := map[string]string{
						"name": name,
						"url":  href,
					}
					related = append(related, ext)
				}
			})
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
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if exists && strings.HasPrefix(src, "http") {
			// Look for larger images that are likely screenshots
			if strings.Contains(src, "googleusercontent.com") && 
			   (strings.Contains(src, "screenshot") || strings.Contains(src, "s640") || 
			    strings.Contains(src, "s460") || strings.Contains(src, "w640")) {
				screenshots = append(screenshots, src)
			}
		}
	})
	return screenshots
}