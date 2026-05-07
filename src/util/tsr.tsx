import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

export const calculateHash = async (data, tp) => {
  const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data,
      { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
};

export async function generateTSR(data: string): Promise<[boolean, string]> {
  try {
    const baseUrl = 'http://gcp.feehi.com:8081/tool/generate-tsr';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data:data }),
    });

    if (!response.ok) {
      return [false, `HTTP error! status: ${response.status}`];
    }

    const result = await response.json();
    return [true, result.tsr || ''];
  } catch (error) {
    console.error('Error generating TSR:', error);
    return [false, error instanceof Error ? error.message : 'Unknown error'];
  }
}

export async function parseTSR(data: string): Promise<[boolean, any]> {
  try {
    const baseUrl = 'http://gcp.feehi.com:8081/tool/parse-tsr';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tsr:data }),
    });

    if (!response.ok) {
      return [false, `HTTP error! status: ${response.status}`];
    }

    const result = await response.json();
    return [true, result];
  } catch (error) {
    console.error('Error generating TSR:', error);
    return [false, error instanceof Error ? error.message : 'Unknown error'];
  }
}

// digestMediaV1 把所有文件的 base64 字符串连接起来
// digestMediaV2 把所有文件连起来做一次 sha256 摘要
// digestMediaV3 对所有文件分别做 md5，然后连起来
export const digestMedia = async (mediaStr, time:Date) => {
  if(mediaStr.trim() === ""){
    return [true, ""];
  }
  const createdAt = new Date(time).getTime();
  if( createdAt < new Date('2025-12-18').getTime() ){
    return await digestMediaV1(mediaStr);
  }else if( createdAt < new Date('2026-05-07').getTime() ){
    return await digestMediaV2(mediaStr);
  }
  return await digestMediaV3(mediaStr);
};

const digestMediaV1 = async (mediaStr) => {
  let mediaContents = '';
  try {
      const mediaPaths = mediaStr.split(",");
      for (let m of mediaPaths) {
        m = m.trim();
        if (m === "") continue;
        const file = new File(m);
        const base64Content = await file.base64();
        mediaContents += base64Content;
      }
      return [true, mediaContents];
    }catch (err) {
      return [false, err.message];
    }
}

const digestMediaV2 = async (mediaStr) => {
  return [true, mediaStr];//todo
}

const digestMediaV3 = async (mediaStr) => {
    const mediaPaths = mediaStr.split(",");
    const individualMd5s = [];
    try {
      for (let m of mediaPaths) {
        m = m.trim();
        if (m === "") continue;

        const mediaFile = new File(m);
        individualMd5s.push(mediaFile.info({md5: true}).md5);
      }
    }catch (err) {
      return [false, err.message];
    }
    return [true, individualMd5s.join('')];
};
