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

// 获取当前时间（发布时间），格式与git commit时间保持一致
let publishTime = 'unknown';
try {
    publishTime = execSync('date +"%Y-%m-%d %H:%M:%S"').toString().trim();
} catch (e) {
    // 如果date命令失败，使用JavaScript格式化
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    publishTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

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
