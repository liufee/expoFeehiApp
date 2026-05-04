// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 重点：允许 Metro 解析 .wasm 文件作为静态资源
config.resolver.assetExts.push('wasm');

module.exports = config;
