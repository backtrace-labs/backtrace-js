const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const package = require('./package.json');

const config = {
  mode: 'production',
  entry: {
    app: path.resolve(__dirname, 'source/index.ts'),
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: 'backtraceJs',
    libraryTarget: 'umd',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@src': path.resolve('source'),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(package.version),
    }),
    new ForkTsCheckerWebpackPlugin({
      tslint: true,
      workers: 2,
      useTypescriptIncrementalApi: false,
    }),
    // new BundleAnalyzerPlugin(),
  ],
};

module.exports = config;
