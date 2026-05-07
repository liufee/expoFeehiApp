const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取git commit hash（短版本）
let gitCommit = 'unknown';
try {
    gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    console.log('无法获取git commit信息');
}

// 获取git commit完整hash
let gitCommitFull = 'unknown';
try {
    gitCommitFull = execSync('git rev-parse HEAD').toString().trim();
} catch (e) {
    console.log('无法获取git commit完整信息');
}

// 获取git commit时间
let gitCommitTime = 'unknown';
try {
    gitCommitTime = execSync('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M:%S"').toString().trim();
} catch (e) {
    console.log('无法获取git commit时间');
}

// 获取git branch
let gitBranch = 'unknown';
try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (e) {
    console.log('无法获取git branch信息');
}

// 获取当前时间（发布时间）
const publishTime = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});

// 生成配置文件内容
const configContent = `// 此文件由 scripts/generate-build-info.js 自动生成
// 请勿手动修改

export const BUILD_INFO = {
    gitCommit: '${gitCommit}',
    gitCommitFull: '${gitCommitFull}',
    gitCommitTime: '${gitCommitTime}',
    gitBranch: '${gitBranch}',
    publishTime: '${publishTime}',
};
`;

// 确保目录存在
const outputDir = path.join(__dirname, '../src/config');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 写入文件
const outputPath = path.join(outputDir, 'buildInfo.ts');
fs.writeFileSync(outputPath, configContent);

console.log('✅ 构建信息已生成:');
console.log(`   Git Commit: ${gitCommit}`);
console.log(`   Git Branch: ${gitBranch}`);
console.log(`   Commit Time: ${gitCommitTime}`);
console.log(`   Publish Time: ${publishTime}`);
console.log(`   文件路径: ${outputPath}`);
