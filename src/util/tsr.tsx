import { Platform } from 'react-native';

// 注意：在生产环境中应使用有效的SSL证书，以下方案仅用于开发环境测试自签名证书
export async function generateTSR(data: string): Promise<string> {
  try {
    const baseUrl = 'http://gcp.feehi.com:8081/tool/generate-tsr';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.tsr;
  } catch (error) {
    console.error('Error generating TSR:', error);
    throw error;
  }
}
