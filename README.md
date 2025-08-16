# Chrome Extension Analytics MVP

A comprehensive analytics platform for tracking Google Chrome extension growth and keyword performance, built with Go, MongoDB, and Next.js.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Local Development Setup

1. **Clone and navigate to the project**
   ```bash
   git clone <your-repo-url>
   cd google-chrome-extensions-analytics
   ```

2. **Start all services with live reload**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - MongoDB: localhost:27017

4. **Stop services**
   ```bash
   docker-compose down
   ```

## 🏗️ Architecture

### Tech Stack
- **Backend**: Go (Gin framework) with Air for live reload
- **Database**: MongoDB with sample data
- **Frontend**: Next.js 15 with Tailwind CSS and Turbopack
- **Development**: Docker Compose with hot reload

### Project Structure
```
/
├── backend/              # Go API server
│   ├── cmd/server/       # Application entry point
│   ├── internal/         # Private application code
│   │   ├── models/       # Data models
│   │   ├── handlers/     # HTTP handlers
│   │   ├── services/     # Business logic
│   │   └── database/     # Database connection
│   ├── scripts/          # Database initialization
│   └── Dockerfile.dev    # Development container
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and API client
│   └── Dockerfile.dev    # Development container
├── docker-compose.yml    # Local development setup
└── PLAN.md              # Development roadmap
```

## 🛠️ Development

### Backend Development
The Go backend runs with Air for automatic reloading on file changes.

**Key endpoints:**
- `GET /api/health` - Health check
- `GET /api/extensions` - List extensions with pagination
- `GET /api/extensions/:id` - Get extension details
- `GET /api/extensions/search` - Search extensions
- `GET /api/analytics/:id` - Get extension analytics
- `GET /api/analytics/:id/growth` - Get growth metrics
- `GET /api/analytics/:id/keywords` - Get keyword performance

### Frontend Development
The Next.js frontend runs with Turbopack for fast hot reload.

**Key features:**
- Extension listing with pagination
- Search functionality
- Responsive design with Tailwind CSS
- Error handling and loading states
- TypeScript for type safety

### Database
MongoDB is pre-populated with sample extension data including:
- uBlock Origin
- MetaMask
- AdBlock

## 🔧 Configuration

### Environment Variables

**Backend** (auto-configured in Docker):
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 8080)
- `GIN_MODE` - Gin mode (debug/release)

**Frontend** (auto-configured in Docker):
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NODE_ENV` - Environment mode

## 📊 Sample Data

The database comes pre-loaded with sample Chrome extensions and analytics data to demonstrate the platform functionality. This includes:

- Extension metadata (name, description, users, ratings)
- Historical snapshots for growth tracking
- Keyword analytics for SEO insights

## 🚀 Deployment

### Frontend (Vercel)
The frontend is ready for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` - Your production API URL
3. Deploy automatically on push

### Backend & Database
For production deployment, consider:
- MongoDB Atlas for managed database
- Docker containers on cloud platforms
- Environment-specific configuration

## 📈 MVP Features

### ✅ Completed
- [x] Project structure with Docker Compose
- [x] Go backend with REST API
- [x] MongoDB with sample data
- [x] Next.js frontend with extension listing
- [x] Search and pagination
- [x] Responsive design

### 🔄 In Progress
- [ ] Chrome Web Store scraper
- [ ] Analytics dashboard
- [ ] Growth metrics visualization

### 📋 Planned
- [ ] Keyword tracking
- [ ] Email alerts
- [ ] Advanced filtering
- [ ] Export functionality

## 🤝 Contributing

1. Make changes to the code
2. The development servers will automatically reload
3. Test your changes locally
4. Commit and push to your repository

## 🐛 Troubleshooting

### Common Issues

**Services not starting:**
```bash
docker-compose down
docker-compose up -d --build
```

**Database connection issues:**
```bash
docker-compose logs mongodb
```

**Frontend build errors:**
```bash
docker-compose logs frontend
```

**Backend compilation errors:**
```bash
docker-compose logs backend
```

### Checking Service Status
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]
```

## 📄 License

This project is licensed under the MIT License.