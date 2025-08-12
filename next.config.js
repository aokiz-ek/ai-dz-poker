/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable SWC plugin for better performance
    swcPlugins: []
  }
}

module.exports = nextConfig