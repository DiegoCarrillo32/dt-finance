import withPWA from '@ducanh2912/next-pwa'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    skipWaiting: true,
  },
})(nextConfig)
