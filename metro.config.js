// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;
const feehiAppProject = path.resolve(projectRoot, '../FeehiApp');

config.watchFolders = [
    path.resolve(feehiAppProject, 'src'),
];

config.resolver.unstable_enableSymlinks = true;

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
    react: path.resolve(projectRoot, 'node_modules/react'),
    'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

config.resolver.sourceExts.unshift('expo.js', 'expo.ts', 'expo.tsx');

// 重点：允许 Metro 解析 .wasm 文件作为静态资源
config.resolver.assetExts.push('wasm');

module.exports = config;
