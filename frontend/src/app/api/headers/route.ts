import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ 
    message: 'Headers test',
    timestamp: new Date().toISOString()
  })
  
  // Set headers to allow iframe embedding
  response.headers.delete('X-Frame-Options')
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com https://dermaself-dev.myshopify.com https://*"
  )
  
  return response
} 