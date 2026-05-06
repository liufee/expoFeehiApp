import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

// 声明全局 Buffer 类型
declare var Buffer: any;

// 注意：在生产环境中应使用有效的SSL证书，以下方案仅用于开发环境测试自签名证书
export async function generateTSR(data: string): Promise<[boolean, string]> {
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

export const calculateHash = async (data, tp) => {
  // Go 的 sha256.New() + Write + Sum 对应这里的 digestStringAsync
  const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data,
      { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
};

export const calculateHashWithMedia = async (data, tp, mediaStr) => {
  let mediaContent = "";

  if (mediaStr && mediaStr !== "") {
    // 对应 strings.Split(mediaStr, ",")
    const mediaPaths = mediaStr.split(",");

    for (const path of mediaPaths) {
      try {
        /**
         * 对应 os.ReadFile(m) + base64.StdEncoding.EncodeToString(data)
         * Expo FileSystem File 类可以直接读取并返回 Base64 格式
         */
        const mediaFile = new File(path);
        const base64Data = mediaFile.base64();
        mediaContent += base64Data;
      } catch (err) {
        // 对应 fmt.Sprintf("error:%v", err)
        return `error:${err.message}`;
      }
    }
  }

  // 对应 hash.Write([]byte(data + mediaContent))
  const finalContent = data + mediaContent;

  const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      finalContent,
      { encoding: Crypto.CryptoEncoding.HEX }
  );

  return hash;
};

export const assembleStrToCreateTSR = async (str, mediaStr) => {
  let mediaDigestHex = "";

  if (mediaStr && mediaStr !== "") {
    // 对应 Go: strings.Split(mediaStr, ",")
    const mediaPaths = mediaStr.split(",");

    // 我们需要一个容器来模拟 Go 的 h.Write([]byte) 连续写入
    let combinedBytes: any;

    try {
      for (let m of mediaPaths) {
        // 对应 Go: strings.TrimSpace(m)
        m = m.trim();
        if (m === "") continue;

        /**
         * 对应 Go: os.Open(m) 和 io.CopyBuffer(h, f, buf)
         * 使用 File 类的 base64() 方法读取文件内容
         */
        const mediaFile = new File(m);
        const fileContent = mediaFile.base64();

        // 将不同文件的 Base64 转换回原始二进制数据并合并
        // 注意：简单的字符串拼接 Base64 是不行的，因为 Base64 有补位符 (=)
        // 我们需要通过 Buffer 将其还原为字节流再合并，以确保哈希值 100% 匹配
        const fileBuffer = (Buffer as any).from(fileContent, 'base64');

        // 这一步模拟了 Go 的 h.Write(f)
        if (typeof combinedBytes === 'undefined') {
          combinedBytes = fileBuffer;
        } else {
          combinedBytes = (Buffer as any).concat([combinedBytes, fileBuffer]);
        }
      }

      /**
       * 计算所有媒体字节流的 SHA256
       * 对应 Go: hex.EncodeToString(h.Sum(nil))
       */
      if (combinedBytes) {
        // 将合并后的字节流转回 base64 给 Crypto 库计算
        const finalBase64 = combinedBytes.toString('base64');
        mediaDigestHex = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            finalBase64,
            { encoding: Crypto.CryptoEncoding.HEX }
        );
      }

    } catch (err) {
      return [false, err.message];
    }
  }

  // 对应 Go: return str + mediaDigestHex
  return [true, str + mediaDigestHex];
};
