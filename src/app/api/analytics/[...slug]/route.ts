import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'https://chrome-extension-api.namedry.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Construct the analytics endpoint path
    const analyticsPath = slug.join('/');
    const queryString = searchParams.toString();
    const apiUrl = `${API_BASE_URL}/analytics/${analyticsPath}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch analytics data from ${analyticsPath}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}