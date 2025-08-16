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