/**
 * 格式化时间为 HH:MM:SS 格式
 * @param ms 毫秒数
 * @returns 格式化后的时间字符串
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * 计算平均速度
 * @param distance 距离（公里）
 * @param timeInMilliseconds 时间（毫秒）
 * @param showType 显示类型：0=km/h, 1=m/min, 2=m/s
 * @returns 平均速度
 */
export const calculateAverageSpeed = (
  distance: number,
  timeInMilliseconds: number,
  showType: number
): number => {
  if (distance <= 0 || timeInMilliseconds <= 0) {
    return 0;
  }
  
  switch (showType) {
    case 0:
      return distance / (timeInMilliseconds / 3600000); // km/h
    case 1:
      return (distance * 1000) / (timeInMilliseconds / 60000); // m/min
    case 2:
      return (distance * 1000) / (timeInMilliseconds / 1000); // m/s
    default:
      return distance / (timeInMilliseconds / 3600000); // km/h
  }
};
