/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { cpus: 1 },
};
export default nextConfig;
