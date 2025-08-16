# Deployment Guide - Chrome Extension Analytics

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- GitHub repository connected to Vercel

### Quick Deploy
1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   # From project root
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_API_URL` - Your production API URL
   - `NODE_ENV` - Set to "production"

### Manual Deployment Steps

#### 1. Vercel Configuration
- `vercel.json` is already configured in project root
- Frontend source is in `/frontend` directory
- Production environment variables in `/frontend/.env.production`

#### 2. Environment Variables Setup
In Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Value | Environment |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-api-domain.com` | Production |
| `NODE_ENV` | `production` | Production |
| `NEXT_TELEMETRY_DISABLED` | `1` | All |

#### 3. Build Configuration
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/.next`
- Install Command: `cd frontend && npm install`

## Backend Deployment Options

### Option 1: Railway/Render (Recommended)
1. Connect GitHub repository
2. Set build path to `/backend`
3. Configure environment variables:
   - `PORT` - 8080
   - `MONGO_URI` - Your MongoDB connection string
   - `GIN_MODE` - release

### Option 2: Docker (DigitalOcean, AWS, etc.)
```bash
# Build production backend image
cd backend
docker build -t chrome-analytics-backend .

# Run with environment variables
docker run -p 8080:8080 \
  -e MONGO_URI="your-mongo-connection-string" \
  -e PORT=8080 \
  -e GIN_MODE=release \
  chrome-analytics-backend
```

### Option 3: Vercel Serverless Functions
Convert Go handlers to Vercel serverless functions (requires refactoring).

## Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Cluster
- Sign up at [MongoDB Atlas](https://cloud.mongodb.com)
- Create a free cluster
- Configure network access (0.0.0.0/0 for development)

### 2. Get Connection String
- Database > Connect > Connect your application
- Copy connection string
- Replace `<password>` with your database user password

### 3. Initialize Database
The application will automatically create collections and indexes on first run.

## Domain Configuration

### Custom Domain (Optional)
1. **Add Domain in Vercel**:
   - Project Settings > Domains
   - Add your custom domain

2. **DNS Configuration**:
   - CNAME: `your-domain.com` → `vercel-domain.vercel.app`
   - A Record: `your-domain.com` → Vercel IP

## Production Checklist

### Frontend
- [ ] Environment variables configured in Vercel
- [ ] Custom domain set up (optional)
- [ ] SSL certificate enabled (automatic with Vercel)
- [ ] Error monitoring configured

### Backend
- [ ] Production database (MongoDB Atlas) configured
- [ ] Environment variables set on hosting platform
- [ ] Health check endpoint working (`/api/health`)
- [ ] CORS configured for production domain

### Security
- [ ] API rate limiting implemented
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Error logging configured (no sensitive data)

## Monitoring & Maintenance

### Performance Monitoring
- Vercel Analytics automatically enabled
- Monitor Core Web Vitals in Vercel dashboard

### Error Tracking
- Consider adding Sentry for error tracking
- Monitor API response times and errors

### Database Monitoring
- MongoDB Atlas provides built-in monitoring
- Set up alerts for high usage or errors

## Troubleshooting

### Common Issues
1. **Build Failures**: Check Node.js version compatibility
2. **API Connection**: Verify CORS settings and API URL
3. **Database Connection**: Check MongoDB connection string and network access

### Logs
- **Vercel Logs**: Dashboard > Functions > View Function Logs
- **Backend Logs**: Check your hosting platform's logging system

### Testing Production Build Locally
```bash
# Test frontend production build
cd frontend
npm run build
npm run start

# Test with production API URL
NEXT_PUBLIC_API_URL=https://your-api-url.com npm run start
```