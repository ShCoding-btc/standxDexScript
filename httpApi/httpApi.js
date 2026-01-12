import 'dotenv/config';
import axios from "axios";
import crypto from 'crypto';
import { encodeRequestSignature } from "../util/authUtil.js";

// 从.env加载token
const token = process.env.TOKEN;
if (!token) {
  console.error('未找到TOKEN，请先运行index.js文件获取token');
  process.exit(1);
}
// auth对象，模拟签名请求
const auth = {
  signRequest: (payload, requestId, timestamp) => {
    const { xRequestVersion, xRequestId, xRequestTimestamp, signature } = encodeRequestSignature(payload, requestId, timestamp);
    return {
      'x-request-sign-version': xRequestVersion,
      'x-request-id': xRequestId,
      'x-request-timestamp': xRequestTimestamp.toString(),
      'x-request-signature': signature,
    };
  }
};

//创建新订单
async function createOrder() {
  const payload = JSON.stringify({
    symbol: "BTC-USD",
    side: "buy",
    order_type: "market",
    qty: "0.001",
    leverage:"10",
    time_in_force: "gtc",
    reduce_only: true,
  });
  const headers = encodeRequestSignature(payload, crypto.randomUUID(), Date.now());
  try {
    const response = await axios.post("https://perps.standx.com/api/new_order", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    });

    console.log('http订单创建成功:', response.data);
  } catch (error) {
    console.error('http订单创建失败:', error.response?.data || error.message);
  }
}

//获取账户信息
async function getAccountInfo() {
  const payload = ''; // GET请求body为空
  const requestId = crypto.randomUUID();
  const timestamp = Date.now();

  //const headers = auth.signRequest(payload, requestId, timestamp);

  try {
    const response = await axios.get("https://perps.standx.com/api/query_balance", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('http获取账户信息失败:', error.response?.data || error.message);
  }
}

// 示例：获取市场数据
async function getMarketData() {
  try {
    const response = await axios.get("https://perps.standx.com/api/query_symbol_info");
    return response.data;
  } catch (error) {
    console.error('http获取市场数据失败:', error.message);
  }
}

// 查询用户所有未完成订单
async function getUserAllOrders() {
  try {
    const response = await axios.get("https://perps.standx.com/api/query_open_orders", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('http获取所有订单信息失败:', error.response?.data || error.message);
  }
}

// 重试获取未完成订单（最多3次）
async function getUserAllOrdersWithRetry(maxRetries = 3, delayMs = 500) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getUserAllOrders();
      if (result && result.result) {
        return result;
      }
      throw new Error('获取订单为空');
    } catch (error) {
      lastError = error;
      console.error(`获取未完成订单失败，第${attempt}/${maxRetries}次尝试`, error.response?.data || error.message);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError || new Error('多次获取未完成订单失败');
}

// 取消用户所有订单
async function cancelAllOrders() {
  let orderResponse;
  try {
    orderResponse = await getUserAllOrdersWithRetry();
  } catch (error) {
    console.error('获取订单失败，无法取消订单:', error.message || error);
    return;
  }

  const clOrdIds = orderResponse.result.map(order => order.cl_ord_id);
  if (!clOrdIds.length) {
    console.log('当前无未完成订单，无需取消');
    return;
  }

  console.log('当前要取消订单列表:', clOrdIds);
  const payload = JSON.stringify({
    cl_ord_id_list: clOrdIds // 使用提取的 cl_ord_id 列表
  });
  const headers = encodeRequestSignature(payload, crypto.randomUUID(), Date.now());
  try {
    const response = await axios.post("https://perps.standx.com/api/cancel_orders", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    });
    console.log('已成功取消全部订单');
  } catch (error) {
    console.error('取消全部订单失败:', error.response?.data || error.message);
  }
}

// 主函数
async function main() {
  // 获取账户信息（需要认证，但暂时跳过签名）
   await getAccountInfo();

  // 获取市场数据（无需认证）
   //await getMarketData();

  // 创建订单（需要认证）
   //await createOrder(); // 取消注释以测试创建订单
  
   // 查询所有订单（需要认证）
   //await getUserAllOrders(); // 取消注释以测试查询所有订单
   
   // 取消所有订单（需要认证）
   //await cancelAllOrders(); // 取消注释以测试取消所有订单  
}

// 运行主函数
//main();

export { createOrder, getAccountInfo, getMarketData, getUserAllOrders, cancelAllOrders };