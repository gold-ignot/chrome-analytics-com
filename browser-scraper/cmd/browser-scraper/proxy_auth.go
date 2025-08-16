package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"strings"
)

// ProxyAuthHandler creates a local proxy that adds authentication to upstream proxy
type ProxyAuthHandler struct {
	upstreamHost string
	upstreamPort string
	username     string
	password     string
	localPort    int
}

// NewProxyAuthHandler creates a new proxy authentication handler
func NewProxyAuthHandler(host, port, username, password string) *ProxyAuthHandler {
	return &ProxyAuthHandler{
		upstreamHost: host,
		upstreamPort: port,
		username:     username,
		password:     password,
		localPort:    0, // Will be assigned when starting
	}
}

// Start starts the local proxy server
func (p *ProxyAuthHandler) Start() (string, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}

	addr := listener.Addr().(*net.TCPAddr)
	p.localPort = addr.Port
	
	go p.serve(listener)
	
	return fmt.Sprintf("http://127.0.0.1:%d", p.localPort), nil
}

func (p *ProxyAuthHandler) serve(listener net.Listener) {
	for {
		conn, err := listener.Accept()
		if err != nil {
			continue
		}
		go p.handleConnection(conn)
	}
}

func (p *ProxyAuthHandler) handleConnection(clientConn net.Conn) {
	defer clientConn.Close()

	// Connect to upstream proxy
	upstreamConn, err := net.Dial("tcp", fmt.Sprintf("%s:%s", p.upstreamHost, p.upstreamPort))
	if err != nil {
		return
	}
	defer upstreamConn.Close()

	// Create auth header
	auth := p.username + ":" + p.password
	authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))

	// Read the initial request
	buf := make([]byte, 4096)
	n, err := clientConn.Read(buf)
	if err != nil {
		return
	}

	request := string(buf[:n])
	
	// Add Proxy-Authorization header if it's not there
	if !strings.Contains(request, "Proxy-Authorization:") {
		lines := strings.Split(request, "\r\n")
		var newRequest []string
		for i, line := range lines {
			newRequest = append(newRequest, line)
			// Add auth header after the first line (request line)
			if i == 0 {
				newRequest = append(newRequest, "Proxy-Authorization: "+authHeader)
			}
		}
		request = strings.Join(newRequest, "\r\n")
	}

	// Send modified request to upstream proxy
	upstreamConn.Write([]byte(request))

	// Relay data between client and upstream
	go io.Copy(upstreamConn, clientConn)
	io.Copy(clientConn, upstreamConn)
}