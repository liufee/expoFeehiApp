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

/**
 * 计算两点之间的距离（Haversine公式）
 * @param point1 起点
 * @param point2 终点
 * @returns 距离（公里）
 */
export const haversineDistance = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number => {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371; // 地球半径 km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 格式化时间戳为 HH:MM:SS
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds()
  ).padStart(2, '0')}`;
};

/**
 * 计算分段配速
 * @param data 路径点数组
 * @param interval 分段间隔（分钟），默认10分钟
 * @returns 分段数据数组
 */
export const calculateSegments = (
  data: Array<{ latitude: number; longitude: number; time: number }>,
  interval: number = 10
) => {
  const segments: Array<{
    startTime: number;
    endTime: number;
    distance: number;
    avgPace: number;
  }> = [];
  const startTime = data[0].time;
  const intervalMs = interval * 60 * 1000; // 转换为毫秒

  let segmentStart = startTime;
  let segmentDistance = 0;
  let previousPoint = data[0];

  for (let i = 1; i < data.length; i++) {
    const point = data[i];
    if (point.time - segmentStart > intervalMs) {
      // 计算当前段的平均配速（km/h）
      const segmentDurationHrs = (point.time - segmentStart) / (1000 * 60 * 60);
      const avgPace = segmentDistance / segmentDurationHrs;

      segments.push({
        startTime: new Date(segmentStart).getTime(),
        endTime: new Date(point.time).getTime(),
        distance: segmentDistance,
        avgPace: avgPace,
      });

      segmentStart = point.time;
      segmentDistance = 0;
    }
    segmentDistance += haversineDistance(previousPoint, point);
    previousPoint = point;
  }

  return segments;
};
