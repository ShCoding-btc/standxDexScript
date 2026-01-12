import { base58 } from '@scure/base';
import { ed25519 } from '@noble/curves/ed25519.js';
import fs from 'fs';
import path from 'path';

/**
 * 报文头requestId获取
 */
export function generateTempKeysAndRequestId() {
  // 生成 Ed25519 密钥对
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = ed25519.getPublicKey(privateKey);

  // 生成 requestId（base58 编码的公钥）
  const requestId = base58.encode(publicKey);

  // 保存到 .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // 转换为 hex 保存
  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  const publicKeyHex = Buffer.from(publicKey).toString('hex');

  const updates = {
    'PRIVATE_KEY_ED25519': privateKeyHex,
    'PUBLIC_KEY_ED25519': publicKeyHex,
    'REQUEST_ID': requestId
  };

  for (const [key, value] of Object.entries(updates)) {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log('Ed25519 私钥和公钥以及requestId已经保存至 .env文件中');

  return { privateKey, publicKey, requestId };
}

/**
 * 报文体签名http
 */
export function encodeRequestSignature(
    payload,
    requestId,
    timestamp
) {
    const version = "v1";
    const message = `${version},${requestId},${timestamp},${payload}`;
    const signature = ed25519.sign(
      Buffer.from(message, "utf-8"),
      Buffer.from(process.env.PRIVATE_KEY_ED25519, 'hex')
    );
 
    return {
      "x-request-sign-version": version,
      "x-request-id": requestId,
      "x-request-timestamp": timestamp.toString(),
      "x-request-signature": Buffer.from(signature).toString("base64"),
    };
}
/**
 * 报文体签名http
 */
export function encodeRequestSignatureForWss(
    payload,
    requestId,
    timestamp
) {
    const message = `${requestId},${timestamp},${payload}`;
    const signature = ed25519.sign(
      Buffer.from(message, "utf-8"),
      Buffer.from(process.env.PRIVATE_KEY_ED25519, 'hex')
    );
    return {
      "x-request-id": requestId,
      "x-request-timestamp": timestamp.toString(),
      "x-request-signature": Buffer.from(signature).toString("base64"),
    };
}