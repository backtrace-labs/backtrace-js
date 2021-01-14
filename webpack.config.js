const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

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
    new ForkTsCheckerWebpackPlugin({
      tslint: true,
      workers: 2,
      useTypescriptIncrementalApi: false,
    }),
  ],
};

module.exports = config;
