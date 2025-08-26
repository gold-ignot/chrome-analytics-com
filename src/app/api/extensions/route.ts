import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://chrome-extension-api.namedry.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to the backend API
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });
    
    // Add timestamp for cache busting on non-static endpoints
    const isStaticEndpoint = searchParams.has('categories') || searchParams.has('health');
    if (!isStaticEndpoint) {
      params.append('_t', Date.now().toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/search?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: isStaticEndpoint ? 'force-cache' : 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch extensions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}