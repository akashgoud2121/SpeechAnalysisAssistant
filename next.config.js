/** @type {import('next').NextConfig} */
const nextConfig = {

  /* config options here */
  typescript: {
    ignoreBuildErrors: false,  // It's better to resolve TypeScript errors
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],

  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    return config;
>>>>>>> 337e95e4fe440fc6f994dd46af18b47fc9494e50
  },
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  // Enable SWC minification for better performance
  swcMinify: true,
};

module.exports = nextConfig;
