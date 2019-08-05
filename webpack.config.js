const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const config = {
  mode: 'development',
  entry: {
    app: path.resolve(__dirname, 'source/index.ts'),
  },
  target: 'web',
  externals: [nodeExternals()],
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js',
  },
  devtool: 'source-map',
  node: {
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx'],
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

if (process.env.NODE_ENV === 'production') {
  config.mode = 'production';
  delete config.devtool;
}

module.exports = config;
