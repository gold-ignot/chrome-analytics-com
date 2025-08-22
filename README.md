# Chrome Extension Analytics - Frontend

A responsive Next.js dashboard for Chrome Web Store extension analytics, displaying real-time metrics, growth trends, and competitive analysis.

## Features

### 📊 Analytics Dashboard
- **Extension Listing**: Paginated list with search and filtering
- **Real-time Metrics**: Users, ratings, reviews, and growth trends
- **Performance Insights**: Percentile rankings and benchmark comparisons
- **Market Position**: Adoption levels, quality scores, and competitive analysis
- **Interactive Charts**: Growth trends and historical data visualization

### 🎨 UI/UX
- **Responsive Design**: Works seamlessly across all devices
- **Professional Theme**: Modern slate color palette with gradient cards
- **Interactive Components**: Enhanced loading states and micro-interactions
- **Data Visualization**: Custom charts with Recharts library

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Charts**: Recharts library
- **API**: REST endpoints from public Chrome Extension API
- **Development**: TypeScript, ESLint, PostCSS

## Getting Started

### Prerequisites
- Node.js 18+ or pnpm
- Access to Chrome Extension API

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd chrome-extension-analytics
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   # .env.local
   NEXT_PUBLIC_API_URL=https://chrome-extension-api.namedry.com
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

4. **Open application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Testing production build locally
pnpm build && pnpm start
```

## Project Structure

```
/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── extensions/      # Extensions listing
│   │   └── extension/[id]/  # Extension details
│   ├── components/          # Reusable UI components
│   │   ├── ExtensionCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Chart.tsx
│   │   └── ...
│   └── lib/
│       └── api.ts           # API client configuration
├── public/                  # Static assets
├── package.json
└── README.md
```

## API Integration

The frontend connects to a public Chrome Extension API:

### Endpoints Used
- `GET /api/extensions` - List extensions with pagination
- `GET /api/extensions/:id` - Get extension details
- `GET /api/extensions/search` - Search extensions
- `GET /api/analytics/:id` - Get extension analytics
- `GET /api/analytics/:id/growth` - Get growth metrics
- `GET /api/health` - API health check

### API Configuration
API base URL is configured in `src/lib/api.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

## Key Components

### Extension Listing (`/extensions`)
- Paginated grid of extension cards
- Search functionality with real-time filtering
- Sort options and responsive design
- Loading states and error handling

### Extension Details (`/extension/[id]`)
- Comprehensive analytics dashboard
- Interactive growth charts
- Performance benchmarks and market position
- Historical data trends

### Data Visualization
- **Growth Charts**: Area charts showing user growth over time
- **Rating Trends**: Line charts for rating changes
- **Market Benchmarks**: Progress bars and percentile indicators
- **Performance Cards**: Gradient-styled metric displays

## Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
2. **Set environment variables**:
   - `NEXT_PUBLIC_API_URL`: Your production API URL
   - `NODE_ENV`: `production`
3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Manual Deployment

```bash
# Build for production
pnpm build

# The built files will be in .next/
# Deploy .next/ directory to your hosting platform
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Chrome Extension API base URL | `http://localhost:8080` |
| `NODE_ENV` | Environment mode | `development` |

## Data Flow

1. **API Requests**: Frontend makes REST API calls to Chrome Extension API
2. **State Management**: React state for UI interactions and data caching
3. **Real-time Updates**: Auto-refresh functionality for latest data
4. **Error Handling**: Graceful fallbacks and retry mechanisms

## Performance Features

- **SSR**: Server-side rendering for better SEO and initial load
- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Built-in Next.js image optimization
- **Caching**: API response caching with timestamp-based cache busting
- **Loading States**: Skeleton screens and progressive loading

## Browser Support

- Chrome (latest)
- Firefox (latest) 
- Safari (latest)
- Edge (latest)

## Contributing

This is a frontend-only application that displays data from the Chrome Extension API. The frontend follows these principles:

- **Data-driven**: Only displays data from the API, no client-side calculations
- **Responsive**: Works on all screen sizes
- **Accessible**: Follows web accessibility guidelines
- **Fast**: Optimized for performance and user experience