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

//创建新订单（通用函数）
async function createOrder(orderParams) {
  const {
    symbol = "BTC-USD",
    side = "buy",
    order_type = "market",
    qty = "0.001",
    leverage = "10",
    time_in_force = "gtc",
    reduce_only = false,
  } = orderParams || {};

  const payload = JSON.stringify({
    symbol,
    side,
    order_type,
    qty,
    leverage,
    time_in_force,
    reduce_only,
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
    return response.data;
  } catch (error) {
    console.error('http订单创建失败:', error.response?.data || error.message);
    throw error;
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

// 查询用户持仓
async function queryPositions(symbol = null, silent = false) {
  try {
    const params = {};
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await axios.get("https://perps.standx.com/api/query_positions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: params,
    });
    if (!silent) {
      console.log('已成功查询用户持仓:', response.data);
    }
    return response.data;
  } catch (error) {
    if (!silent) {
      console.error('http查询用户持仓失败:', error.response?.data || error.message);
    }
    throw error;
  }
}

// 市价平仓函数
async function closeAllPositions(symbol = null) {
  try {
    // 查询持仓
    const positions = await queryPositions(symbol);
    
    if (!positions || positions.length === 0) {
      console.log('当前无持仓，无需平仓');
      return [];
    }

    // 过滤出状态为 open 的持仓
    const openPositions = positions.filter(pos => pos.status === 'open');
    
    if (openPositions.length === 0) {
      console.log('当前无开放持仓，无需平仓');
      return [];
    }

    console.log(`找到 ${openPositions.length} 个开放持仓，开始平仓...`);
    
    const closeResults = [];
    
    // 对每个持仓创建平仓订单
    for (const position of openPositions) {
      const qty = parseFloat(position.qty);
      
      // 如果数量为0，跳过
      if (qty === 0) {
        console.log(`持仓 ${position.symbol} 数量为0，跳过`);
        continue;
      }
      
      // 判断持仓方向：正数为多头（买入），需要卖出平仓；负数为空头（卖出），需要买入平仓
      const side = qty > 0 ? 'sell' : 'buy';
      const absQty = Math.abs(qty).toString();
      
      console.log(`平仓 ${position.symbol}: 方向=${side}, 数量=${absQty}, 原持仓数量=${qty}`);
      
      try {
        const result = await createOrder({
          symbol: position.symbol,
          side: side,
          order_type: 'market',
          qty: absQty,
          leverage: position.leverage || '10',
          time_in_force: 'gtc',
          reduce_only: true,
        });
        
        closeResults.push({
          symbol: position.symbol,
          side: side,
          qty: absQty,
          result: result,
        });
        
        console.log(`成功创建平仓订单: ${position.symbol} ${side} ${absQty}`);
      } catch (error) {
        console.error(`创建平仓订单失败 ${position.symbol}:`, error.response?.data || error.message);
        closeResults.push({
          symbol: position.symbol,
          side: side,
          qty: absQty,
          error: error.response?.data || error.message,
        });
      }
    }
    
    console.log(`平仓操作完成，成功: ${closeResults.filter(r => r.result).length}, 失败: ${closeResults.filter(r => r.error).length}`);
    return closeResults;
  } catch (error) {
    console.error('市价平仓失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主函数
async function main() {
  // 获取账户信息（需要认证，但暂时跳过签名）
   //await getAccountInfo();
// 查询（需要认证，但暂时跳过签名）账户持仓
  // await queryPositions();
  // 获取市场数据（无需认证）
   //await getMarketData();

  // 创建订单（需要认证）
   //await createOrder(); // 取消注释以测试创建订单
  
   // 查询所有订单（需要认证）
   //await getUserAllOrders(); // 取消注释以测试查询所有订单
   
   // 取消所有订单（需要认证）
   //await cancelAllOrders(); // 取消注释以测试取消所有订单  

   // 市价平仓（需要认证）
   await closeAllPositions(); // 取消注释以测试市价平仓
}

// 运行主函数
main();

export { createOrder, getAccountInfo, getMarketData, getUserAllOrders, cancelAllOrders, queryPositions, closeAllPositions };