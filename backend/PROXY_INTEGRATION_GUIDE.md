# Real Proxy Integration Test Guide

## 🚀 Running the Real Proxy Integration Test

The `test_real_proxy_integration.go` script provides comprehensive testing of the standalone scraper with real proxy configurations.

### 📋 **Test Phases**

1. **Performance Comparison** - Direct vs Proxy connection speed
2. **Proxy Rotation** - Tests automatic proxy switching 
3. **Load Testing** - Multiple requests to verify stability
4. **Statistics Analysis** - Success rates and performance metrics

### 🔧 **Configuration Methods**

#### Method 1: PROXY_LIST (Recommended for multiple proxies)
```bash
export PROXY_LIST="proxy1.com:8080:user1:pass1,proxy2.com:8080:user2:pass2,proxy3.com:8080:user3:pass3"
go run test_real_proxy_integration.go
```

#### Method 2: Individual Environment Variables (Single proxy)
```bash
export PROXY_HOST="your-proxy-host.com"
export PROXY_PORT="8080"
export PROXY_USERNAME="your-username" 
export PROXY_PASSWORD="your-password"
go run test_real_proxy_integration.go
```

#### Method 3: Numbered Variables (Multiple proxies)
```bash
export PROXY_HOST_1="proxy1.com"
export PROXY_PORT_1="8080"
export PROXY_USERNAME_1="user1"
export PROXY_PASSWORD_1="pass1"

export PROXY_HOST_2="proxy2.com"
export PROXY_PORT_2="8080"
export PROXY_USERNAME_2="user2"
export PROXY_PASSWORD_2="pass2"

go run test_real_proxy_integration.go
```

### 📊 **What the Test Does**

#### Phase 1: Performance Comparison
- Tests 3 extensions with **direct connection** (baseline)
- Tests same 3 extensions with **proxy connection**
- Measures response times and success rates

#### Phase 2: Proxy Rotation Testing  
- Makes 12 requests to trigger proxy rotations
- Rotates every 5 requests (configurable)
- Tracks which proxy handles each request
- Verifies rotation logic works correctly

#### Phase 3: Results Analysis
- **Performance metrics**: Average, min, max response times
- **Success rates**: Direct vs proxy comparison
- **Proxy statistics**: Per-proxy success/failure rates
- **Recommendations**: Based on test results

### 📈 **Expected Output**

```
🚀 Real Proxy Integration Test for Standalone Scraper...
✅ Loaded 3 proxy configurations
   Proxy 1: proxy1.com:8080 (user: user1)
   Proxy 2: proxy2.com:8080 (user: user2)
   Proxy 3: proxy3.com:8080 (user: user3)

============================================================
PHASE 1: DIRECT vs PROXY PERFORMANCE COMPARISON
============================================================

📋 Test 1: Direct Connection Baseline
   Direct Test 1: cjpalhdlnbpafiamejdnhcphjbkeiagm
   ✅ Success in 425ms: uBlock Origin (19000000 users)

📋 Test 2: Proxy Connection Test
   Proxy Test 1: cjpalhdlnbpafiamejdnhcphjbkeiagm
   ✅ Success in 650ms: uBlock Origin (19000000 users)

============================================================
PHASE 2: PROXY ROTATION AND LOAD TESTING
============================================================

📋 Test 3: Proxy Rotation Test (12 requests)
   📊 Before: Proxy index 0, requests 0
   ✅ Success in 580ms: uBlock Origin
   📊 After: Proxy index 0, requests 1
   
   ...after 5 requests...
   🔄 PROXY ROTATED: 0 → 1

============================================================
RESULTS ANALYSIS
============================================================

📊 Performance Comparison:
   Direct Connection:
     Success Rate: 100.0% (3/3)
     Average Duration: 420ms
     
   Proxy Connection:
     Success Rate: 100.0% (3/3) 
     Average Duration: 635ms

🎯 Success Rate Analysis:
   Direct Connection: 100.0% success rate
   Proxy Connection: 100.0% success rate
   Proxy Rotation: 91.7% success rate

💡 Recommendations:
   ✅ Proxies are working well! Consider using them for production.
   ✅ Proxy rotation is working reliably.
```

### 🔍 **Key Metrics to Watch**

1. **Success Rate**: Should be >90% for both direct and proxy
2. **Response Time**: Proxy should be <2x direct connection time  
3. **Rotation**: Should show proxy index changing every 5 requests
4. **Error Handling**: Failed requests should trigger proxy rotation

### ⚠️ **Troubleshooting**

#### Low Success Rate (<90%)
- Check proxy credentials
- Verify proxy server is accessible
- Test proxy manually with curl

#### High Response Times (>3 seconds)
- Check proxy server location (latency)
- Try different proxy providers
- Reduce concurrent requests

#### Rotation Not Working
- Check logs for "PROXY ROTATED" messages
- Verify multiple proxies are configured
- Check proxy manager statistics

### 🎯 **Production Readiness Checklist**

- [ ] Success rate >95% for proxy connections
- [ ] Response times <2x direct connection
- [ ] Proxy rotation working (rotates every 5 requests)
- [ ] Error handling working (failed proxies get marked)
- [ ] Statistics tracking working (per-proxy metrics)

Once all checks pass, the proxy integration is ready for production use!