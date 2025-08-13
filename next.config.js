/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
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
  },
  webpack(config, { isServer }) {
    // Ensure the CSS modules and PostCSS are processed correctly
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader', 
        'css-loader', 
        'postcss-loader'
      ],
    });

    return config;
  },
};

module.exports = nextConfig;
