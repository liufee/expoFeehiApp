import baseConfig from './config';

// 递归合并对象的函数
export function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
    for (const key in source) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
        ) {
            // 递归合并对象
            target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            // 直接覆盖
            target[key] = source[key];
        }
    }
    return target;
}
export {getProgress, saveProgress, clearProgress} from './progress';
export default baseConfig;
