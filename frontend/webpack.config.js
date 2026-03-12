const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const Dotenv = require("dotenv-webpack");

const isDevelopment = process.env.NODE_ENV === "development";

// Derive a safe websocket host for WDS client when running behind HTTPS proxy
let wsHost = process.env.WDS_SOCKET_HOST;
if (!wsHost) {
  const domain = process.env.DOMAIN || 'dev.granular-registry.com';
  try {
    // If DOMAIN doesn't start with http/https, add it
    const urlString = domain.startsWith('http') ? domain : `https://${domain}`;
    wsHost = new URL(urlString).hostname;
  } catch (e) {
    // Fallback: just use the DOMAIN as-is if it's not parseable
    wsHost = domain.replace(/^https?:\/\//, '');
  }
}

module.exports = {
  mode: isDevelopment ? "development" : "production",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: isDevelopment ? "[name].js" : "[name].[contenthash].js",
    publicPath: "/",
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
            plugins: [
              "@babel/plugin-transform-runtime",
            ].filter(Boolean),
          },
        },
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/, // Exclude CSS Modules
        use: [
          "style-loader", // Injects CSS into the DOM
          "css-loader", // Resolves CSS imports
        ],
      },
      {
        test: /\.module\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ],
      },
      {
        test: /\.module\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: isDevelopment ? "[name]__[local]--[hash:base64:5]" : "[hash:base64:6]",
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/, // For fonts
        type: "asset/resource", // Webpack 5's built-in asset handling
        generator: {
          filename: "fonts/[name][ext]", // Customize the output directory
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: "asset/resource",
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      }
    ],
  },

  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, "../.env"),
      safe: false,
      systemvars: true,
      silent: false,
    }),
    new HtmlWebpackPlugin({
      template: "./src/public/index.html",
      favicon: "./src/public/favicon.ico",
      minify: !isDevelopment && {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    isDevelopment && new ReactRefreshWebpackPlugin(),
    !isDevelopment &&
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        openAnalyzer: false,
      }),
    new webpack.DefinePlugin({
      "process.env.REACT_APP_API_URL": JSON.stringify(
        process.env.REACT_APP_API_URL
      ),
    }),
  ].filter(Boolean),

  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    historyApiFallback: true,
    compress: true,
    port: 3000,
    host: '0.0.0.0',
    open: false,
    hot: isDevelopment,
    liveReload: isDevelopment,
    allowedHosts: ['dev.granular-registry.com', 'app.granular-registry.com', 'localhost', '.amazonaws.com', '.tailf2a377.ts.net', process.env.DOMAIN].filter(Boolean),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    client: isDevelopment ? {
      // Force WDS client to use domain:443 via proxy (no :3000)
      webSocketURL: {
        hostname: wsHost || 'localhost',
        pathname: '/ws',
        protocol: 'wss',
        port: 443,
      },
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
      reconnect: 5,
    } : false,
    // Let dev-server manage its internal websocket server; avoid forcing a port here
    webSocketServer: isDevelopment ? {
      options: {
        path: '/ws',
      },
    } : false,
  },

  resolve: {
    extensions: [".js", ".jsx"],
    mainFiles: ['index'],
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
}; 