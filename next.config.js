/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Disable the Next.js loading indicator
  devIndicators: {
    buildActivityPosition: 'bottom-right',
    buildActivity: true,
  },
  // Add output configuration for better static optimization
  output: 'standalone',
  // Add environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  }
}

module.exports = nextConfig