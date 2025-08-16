package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"chrome-analytics-backend/internal/services"
	"github.com/joho/godotenv"
)

type ProxyTestRequest struct {
	Proxy *ProxyInfo `json:"proxy,omitempty"`
}

type ProxyInfo struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type ProxyTestResponse struct {
	ProxyConfigured string      `json:"proxy_configured"`
	ActualIP        interface{} `json:"actual_ip"`
	Success         bool        `json:"success"`
	UsingProxy      bool        `json:"using_proxy"`
	Timestamp       string      `json:"timestamp"`
}

func main() {
	fmt.Println("Chrome Browser Scraper Proxy Integration Test")
	fmt.Println(strings.Repeat("=", 60))

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Test browser scraper proxy endpoint
	browserScraperURL := "http://localhost:8081"

	// Test 1: Direct connection (no proxy)
	fmt.Println("\n[TEST 1] Testing direct connection (no proxy)")
	directResult, err := testProxyEndpoint(browserScraperURL, nil)
	if err != nil {
		fmt.Printf("❌ FAILED: %v\n", err)
	} else {
		fmt.Printf("✅ SUCCESS\n")
		fmt.Printf("   IP Address: %v\n", directResult.ActualIP)
		fmt.Printf("   Using Proxy: %v\n", directResult.UsingProxy)
	}

	// Test 2: With proxy authentication
	fmt.Println("\n[TEST 2] Testing with authenticated proxy")
	
	// Initialize proxy manager to get a proxy
	proxyManager, err := services.NewProxyManager("proxies.txt")
	if err != nil {
		fmt.Printf("❌ FAILED to load proxies: %v\n", err)
		return
	}

	proxy, err := proxyManager.GetRandomProxy()
	if err != nil {
		fmt.Printf("❌ FAILED to get proxy: %v\n", err)
		return
	}

	proxyInfo := &ProxyInfo{
		Host:     proxy.Host,
		Port:     proxy.Port,
		Username: proxy.Username,
		Password: proxy.Password,
	}

	proxyResult, err := testProxyEndpoint(browserScraperURL, proxyInfo)
	if err != nil {
		fmt.Printf("❌ FAILED: %v\n", err)
	} else {
		fmt.Printf("✅ SUCCESS\n")
		fmt.Printf("   Configured Proxy: %v\n", proxyResult.ProxyConfigured)
		fmt.Printf("   Actual IP: %v\n", proxyResult.ActualIP)
		fmt.Printf("   Using Proxy: %v\n", proxyResult.UsingProxy)
	}

	// Test 3: Compare IPs to verify proxy is working
	fmt.Println("\n[TEST 3] IP Comparison Analysis")
	if directResult != nil && proxyResult != nil {
		directIPStr := fmt.Sprintf("%v", directResult.ActualIP)
		proxyIPStr := fmt.Sprintf("%v", proxyResult.ActualIP)
		
		if directIPStr != proxyIPStr {
			fmt.Println("✅ SUCCESS: IPs are different - proxy is working!")
			fmt.Printf("   Direct IP: %s\n", directIPStr)
			fmt.Printf("   Proxy IP: %s\n", proxyIPStr)
		} else {
			fmt.Println("⚠️  WARNING: IPs are the same - proxy might not be working")
			fmt.Printf("   Both IPs: %s\n", directIPStr)
		}
	}

	// Summary
	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("PROXY INTEGRATION TEST SUMMARY")
	fmt.Println(strings.Repeat("=", 60))
	
	if directResult != nil && directResult.Success {
		fmt.Println("✅ Direct connection: WORKING")
	} else {
		fmt.Println("❌ Direct connection: FAILED")
	}
	
	if proxyResult != nil && proxyResult.Success {
		fmt.Println("✅ Proxy connection: WORKING")
	} else {
		fmt.Println("❌ Proxy connection: FAILED")
	}

	if directResult != nil && proxyResult != nil && 
		fmt.Sprintf("%v", directResult.ActualIP) != fmt.Sprintf("%v", proxyResult.ActualIP) {
		fmt.Println("✅ Proxy verification: CONFIRMED (different IPs)")
	} else {
		fmt.Println("⚠️  Proxy verification: UNCLEAR (same IPs or test failed)")
	}

	fmt.Println("\n🔍 This test verifies that:")
	fmt.Println("   1. Browser scraper can connect without proxy")
	fmt.Println("   2. Browser scraper can connect with authenticated proxy")
	fmt.Println("   3. Proxy is actually being used (different IP addresses)")
}

func testProxyEndpoint(baseURL string, proxy *ProxyInfo) (*ProxyTestResponse, error) {
	requestBody := ProxyTestRequest{
		Proxy: proxy,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	resp, err := client.Post(baseURL+"/test-proxy", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("received status code %d", resp.StatusCode)
	}

	var result ProxyTestResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}