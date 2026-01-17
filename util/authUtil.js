import { base58 } from '@scure/base';
import { ed25519 } from '@noble/curves/ed25519.js';

/**
 * 报文头requestId获取
 */
export function generateTempKeysAndRequestId() {
  // 生成 Ed25519 密钥对
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  // 生成 requestId（base58 编码的公钥）
  const requestId = base58.encode(publicKey);
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
    // 从.env读取PRIVATE_KEY_ED25519（hex格式），转换为Uint8Array
    const signature = ed25519.sign(
      Buffer.from(message, "utf-8"),
      base58.decode(process.env.PRIVATE_KEY_ED25519)
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
      base58.decode(process.env.PRIVATE_KEY_ED25519)
    );
    return {
      "x-request-id": requestId,
      "x-request-timestamp": timestamp.toString(),
      "x-request-signature": Buffer.from(signature).toString("base64"),
    };
}