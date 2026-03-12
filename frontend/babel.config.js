const path = require('path');

const isDevelopment = process.env.NODE_ENV === "development";

module.exports = {
  presets: [
    '@babel/preset-env',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    isDevelopment && 'react-refresh/babel',
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@components': './src/components',
        '@pages': './src/pages',
        '@utils': './src/utils',
        '@services': './src/services',
        '@store': './src/store'
      }
    }]
  ].filter(Boolean),
}; 