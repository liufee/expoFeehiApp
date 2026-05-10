// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

config.watchFolders = [
    '/Users/lf/work/js/FeehiApp/src',
];

config.resolver.unstable_enableSymlinks = true;

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
    react: path.resolve(projectRoot, 'node_modules/react'),
    'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// 重点：允许 Metro 解析 .wasm 文件作为静态资源
config.resolver.assetExts.push('wasm');

module.exports = config;
