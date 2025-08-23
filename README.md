# Chrome Extension Analytics - Frontend

A responsive Next.js dashboard for Chrome Web Store extension analytics, displaying real-time metrics, growth trends, and competitive analysis.

## Features

### 📊 Analytics Dashboard
- **Extension Listing**: Paginated list with search and filtering
- **Category Pages**: Dedicated pages for each extension category with SEO optimization
- **Filter Pages**: Specialized pages for popular, top-rated, and trending extensions
- **Real-time Metrics**: Users, ratings, reviews, and growth trends
- **Performance Insights**: Percentile rankings and benchmark comparisons
- **Market Position**: Adoption levels, quality scores, and competitive analysis
- **Interactive Charts**: Growth trends and historical data visualization

### 🎨 UI/UX
- **Responsive Design**: Works seamlessly across all devices
- **Consistent Design**: Unified slate color palette throughout the application
- **SEO-Optimized Pages**: Category and filter pages with proper meta tags and structure
- **Enhanced Navigation**: Clear navigation paths with breadcrumbs and view-all buttons
- **Interactive Components**: Enhanced loading states, hover effects, and micro-interactions
- **Data Visualization**: Custom charts with Recharts library
- **Accessibility**: Proper ARIA labels and keyboard navigation support

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
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Enhanced landing page with SEO sections
│   │   ├── extensions/         # All extensions listing page
│   │   ├── extension/[id]/     # Individual extension details
│   │   ├── category/[category]/ # Category-specific extension pages
│   │   ├── popular/            # Most popular extensions
│   │   ├── top-rated/          # Highest rated extensions
│   │   ├── trending/           # Recently updated extensions
│   │   ├── globals.css         # Global styles and custom CSS classes
│   │   └── layout.tsx          # Root layout with consistent styling
│   ├── components/             # Reusable UI components
│   │   ├── ExtensionCard.tsx   # Enhanced extension cards with metrics
│   │   ├── SearchBar.tsx       # Search functionality
│   │   ├── Pagination.tsx      # Pagination component
│   │   ├── Breadcrumb.tsx      # Navigation breadcrumbs
│   │   ├── Chart.tsx           # Data visualization
│   │   ├── Header.tsx          # Site header
│   │   └── Footer.tsx          # Site footer
│   └── lib/
│       └── api.ts              # API client with enhanced endpoint support
├── public/                     # Static assets
├── package.json
└── README.md
```

## API Integration

The frontend connects to a public Chrome Extension API:

### Endpoints Used
- `GET /search` - List extensions with pagination, sorting, and category filtering
- `GET /extension/:id` - Get detailed extension information
- `GET /search?q={query}` - Search extensions by name and description
- `GET /health` - API health check and service status

### Enhanced API Features
- **Smart Caching**: Automatic cache-busting with timestamps for real-time data
- **Error Handling**: Comprehensive error states with retry functionality
- **Sorting Options**: Support for sorting by users, rating, reviews, and update date
- **Category Filtering**: Built-in category filtering for better content organization

### API Configuration
API base URL is configured in `src/lib/api.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

## Key Components

### Extension Pages

#### Main Extensions Listing (`/extensions`)
- Paginated grid of extension cards with enhanced metrics
- Search functionality with real-time filtering
- Category and sorting filters with consistent UI
- Loading states and comprehensive error handling

#### Category Pages (`/category/[category]`)
- Dedicated pages for each extension category (Productivity, Developer Tools, etc.)
- SEO-optimized with descriptive meta tags and structured data
- Category-specific filtering and breadcrumb navigation
- Static generation for better performance

#### Filter Pages
- **Popular Extensions** (`/popular`): Most downloaded extensions with user count rankings
- **Top Rated Extensions** (`/top-rated`): Highest quality extensions with rating badges
- **Trending Extensions** (`/trending`): Recently updated extensions with "New" indicators

#### Landing Page Enhancements
- Multiple SEO-focused sections showcasing different extension types
- Category cards with hover effects and clear call-to-action buttons
- "View All" buttons linking to dedicated pages for better user flow
- Consistent visual hierarchy and improved content organization

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

## Performance & SEO Features

- **SSR & SSG**: Server-side rendering and static generation for optimal SEO
- **SEO Optimization**: Dedicated pages for categories and filters with proper meta tags
- **Code Splitting**: Automatic code splitting with Next.js App Router
- **Image Optimization**: Built-in Next.js image optimization with fallbacks
- **Smart Caching**: API response caching with timestamp-based cache busting
- **Loading States**: Skeleton screens, progressive loading, and smooth transitions
- **Static Generation**: Pre-generated category pages for faster initial loads
- **Structured Data**: SEO-friendly page structure with breadcrumbs and clear navigation

## Browser Support

- Chrome (latest)
- Firefox (latest) 
- Safari (latest)
- Edge (latest)

## Recent Improvements

### UI/UX Enhancements (Latest)
- **Consistent Design System**: Migrated from mixed gray/slate colors to unified slate palette
- **SEO-Optimized Structure**: Added category and filter pages for better search visibility
- **Enhanced Navigation**: Implemented breadcrumbs, clear CTAs, and logical page hierarchy
- **Visual Polish**: Consistent spacing, hover effects, and loading states across all pages

### New Page Types
- **Category Pages**: `/category/productivity`, `/category/developer-tools`, etc.
- **Filter Pages**: `/popular`, `/top-rated`, `/trending` with specialized content
- **Landing Page**: Enhanced with multiple sections and clear navigation paths

## Contributing

This is a frontend-only application that displays data from the Chrome Extension API. The frontend follows these principles:

- **Data-driven**: Only displays data from the API, no client-side calculations
- **SEO-First**: Structured for optimal search engine visibility and user discovery
- **Responsive**: Works seamlessly on all screen sizes and devices
- **Accessible**: Follows web accessibility guidelines with proper ARIA labels
- **Performance-Focused**: Optimized for speed, SEO, and user experience
- **Consistent**: Unified design system and predictable user interface patterns