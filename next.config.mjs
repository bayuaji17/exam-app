/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  experimental: {
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
}

export default nextConfig
