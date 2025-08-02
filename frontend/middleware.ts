import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Remove X-Frame-Options header if it exists
  response.headers.delete('X-Frame-Options')
  
  // Get allowed domains from environment variable
  const allowedDomains = process.env.ALLOWED_FRAME_DOMAINS || 'https://dermaself-dev.myshopify.com'
  
  // Set Content-Security-Policy to allow iframe embedding
  response.headers.set(
    'Content-Security-Policy',
    `frame-ancestors 'self' ${allowedDomains}`
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 