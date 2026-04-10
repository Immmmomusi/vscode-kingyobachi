// @ts-check
'use strict';

const path = require('path');

/** @type {import('webpack').Configuration[]} */
const configs = [
  // Extension (Node.js)
  {
    name: 'extension',
    target: 'node',
    // mode はCLI引数 (--mode) で指定
    entry: './src/extension/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
      ],
    },
    devtool: 'nosources-source-map',
  },
  // Webview (ブラウザ)
  {
    name: 'webview',
    target: 'web',
    // mode はCLI引数 (--mode) で指定
    entry: './src/webview/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'webview.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
      ],
    },
    devtool: 'nosources-source-map',
  },
];

module.exports = configs;
