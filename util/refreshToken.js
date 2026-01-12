import 'dotenv/config';
import axios from "axios";
import { generateTempKeysAndRequestId } from "./authUtil.js";
import crypto from 'crypto';
import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import { tradingConfig } from '../config.js';

const chain = tradingConfig.chain; // 从 config.js 中读取
const expiresSeconds = tradingConfig.expiresSeconds; // 从 config.js 中读取
const refreshTokenSeconds = tradingConfig.refreshTokenSeconds; // 从 config.js 中读取

// 从.env读取或生成钱包
let walletAddress = process.env.WALLET_ADDRESS;
let privateKey = process.env.PRIVATE_KEY;

if (!walletAddress || !privateKey) {
  console.log('未找到.env中的钱包配置，生成新的钱包...');
  const wallet = ethers.Wallet.createRandom();
  walletAddress = wallet.address;
  privateKey = wallet.privateKey;

  // 写入.env
  const envPath = path.join(process.cwd(), '.env');
  const envContent = `WALLET_ADDRESS=${walletAddress}\nPRIVATE_KEY=${privateKey}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('.env文件已更新');
}

// 函数：更新.env文件中的TOKEN
function updateEnvToken(token) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  const tokenLine = `TOKEN=${token}`;
  if (envContent.includes('TOKEN=')) {
    envContent = envContent.replace(/TOKEN=.*/, tokenLine);
  } else {
    envContent += `\n${tokenLine}`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log('Token已存入缓存');
}

// 函数：获取token
async function getToken() {
  try {
    const url = `https://api.standx.com/v1/offchain/prepare-signin?chain=${chain}`;

    // 生成requestId
    const { requestId } = generateTempKeysAndRequestId();

    const data = {
      address: walletAddress,
      requestId: requestId,
    };

    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.success) {
      const signedData = response.data.signedData;

      // 获取验证公钥
      const certsUrl = 'https://api.standx.com/v1/offchain/certs';
      const certsResponse = await axios.get(certsUrl);
      const keys = certsResponse.data.keys;
      if (!keys || keys.length === 0) {
        throw new Error('公钥未找到');
      }
      const jwk = keys[0];

      // 解析JWT
      const parts = signedData.split('.');
      if (parts.length !== 3) {
        throw new Error('signedData不是有效的JWT格式');
      }
      const [headerB64, payloadB64, signatureB64] = parts;

      // base64url to base64
      const toBase64 = (str) => str.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(toBase64(payloadB64), 'base64').toString("utf-8"));
      const signature = Buffer.from(toBase64(signatureB64), 'base64');

      // 构造公钥
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });

      // 验证签名
      const message = headerB64 + '.' + payloadB64;
      const isValid = crypto.verify('sha256', Buffer.from(toBase64(message)), { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);

      if (isValid) {
        console.log('JWT签名验证成功');
        // 签署留言
        const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
        const wallet = new ethers.Wallet(privateKey, provider);

        // 验证地址匹配
        if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error(`私钥不匹配地址。期望: ${walletAddress}, 实际: ${wallet.address}`);
        }

        // 使用payload.message签名
        const userSignature = await wallet.signMessage(payload.message);

        // 获取访问令牌
        const loginUrl = `https://api.standx.com/v1/offchain/login?chain=${chain}`;
        const loginResponse = await axios.post(
          loginUrl,
          {
            signature: userSignature,
            signedData,
            expiresSeconds: parseInt(expiresSeconds),
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        const { token, address, alias, chain: responseChain, perpsAlpha } = loginResponse.data;
        console.log('您好，尊敬的'+alias+'('+address+')用户登录成功！');
        console.log('当前链:', responseChain);

        // 保存token
        updateEnvToken(token);

        return token;
      } else {
        console.log('签名验证失败');
        return null;
      }
    }
  } catch (error) {
    console.error("获取token失败:", error.message);
    return null;
  }
}

// 主函数
export async function initToken() {
  const token = await getToken();
  if (token) {
    console.log('Token定时刷新流程启动，间隔时长为'+refreshTokenSeconds+'秒');
    // 每refreshTokenSeconds秒刷新一次
    setInterval(async () => {
      console.log('刷新token');
      await getToken();
    }, refreshTokenSeconds * 1000);
    return token;
  } else {
    console.log('初始token获取失败');
    return null;
  }
}