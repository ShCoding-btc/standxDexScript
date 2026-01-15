import 'dotenv/config';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { encodeRequestSignature } from '../util/authUtil.js';
import { cancelAllOrders, closeAllPositions, queryPositions } from '../httpApi/httpApi.js';
import crypto from 'crypto';
import StandXWebSocket from "./wssQueryMarketPrice.js";
import { tradingConfig } from '../config.js';

class StandXOrderWebSocket {
  constructor() {
    this.ws = new WebSocket('wss://perps.standx.com/ws-api/v1');
    this.sessionId = uuidv4(); // 保持不变的会话ID
    this.currentOrderId = null;
    this.firstFlag = true;
    this.adjustedPrice_buy = null;
    this.adjustedPrice_sell = null;
    this.lastClosePositionTime = 0; // 上次平仓时间，用于防止频繁平仓
    this.closePositionInterval = 5000; // 平仓间隔时间（毫秒），5秒内不重复平仓

    this.ws.on('open', () => {
      this.authenticate();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      //console.log('Received:', message);
      if (message.code === 0) {
        if (message.message === 'login success') {
          console.log('ws-api服务连接成功，开始查询市场价格...');
          var that = this;
          new StandXWebSocket(tradingConfig.symbol, async (priceMessage) => {
            console.log('当前市场价格:'+priceMessage.data.mark_price+" 当前挂单买入价："+that.adjustedPrice_buy+" 当前挂单卖出价："+that.adjustedPrice_sell);
            
            if (that.firstFlag) {
              // 首次下单
              const markPrice = parseFloat(priceMessage.data.mark_price);
              const basePrice = markPrice * tradingConfig.price.adjustmentRatio;
              const adjustedPrice_buy = (markPrice - basePrice).toFixed(2);
              const adjustedPrice_sell = (markPrice + basePrice).toFixed(2);
              // 保存调整后的价格
              that.adjustedPrice_buy = parseFloat(adjustedPrice_buy);
              that.adjustedPrice_sell = parseFloat(adjustedPrice_sell);
              
              // 检查价格差值是否小于min%或大于max%
              const diffBuy = Math.abs(markPrice - that.adjustedPrice_buy) / markPrice * 100;
              const diffSell = Math.abs(markPrice - that.adjustedPrice_sell) / markPrice * 100;
              
              if (diffBuy < tradingConfig.price.diffThreshold.min || diffSell < tradingConfig.price.diffThreshold.min || diffBuy > tradingConfig.price.diffThreshold.max || diffSell > tradingConfig.price.diffThreshold.max) {
                console.log(`首次下单时价格差值不符合要求，跳过下单。买入差值: ${diffBuy.toFixed(4)}%，卖出差值: ${diffSell.toFixed(4)}%`);
              } else {
                that.createOrders(markPrice);
              }
              
              that.firstFlag = false;
            } else {
              // 首次下单后，在后续价格更新时检测持仓并平仓
              await that.checkAndClosePositions();
              
              // 在后续价格更新时也进行检查
              if (that.adjustedPrice_buy !== null && that.adjustedPrice_sell !== null) {
                const markPrice = parseFloat(priceMessage.data.mark_price);
                const diffBuy = Math.abs(markPrice - that.adjustedPrice_buy) / markPrice * 100;
                const diffSell = Math.abs(markPrice - that.adjustedPrice_sell) / markPrice * 100;
                
                if (diffBuy < tradingConfig.price.diffThreshold.min || diffSell < tradingConfig.price.diffThreshold.min || diffBuy > tradingConfig.price.diffThreshold.max || diffSell > tradingConfig.price.diffThreshold.max) {
                  console.log(`价格差值不符合要求，取消所有订单。买入差值: ${diffBuy.toFixed(4)}%，卖出差值: ${diffSell.toFixed(4)}%`);
                  cancelAllOrders().then(() => {
                    // 取消订单后重新下单
                    that.createOrders(markPrice);
                  });
                }
              }
            }
          });
        }
      }
    });

    this.ws.on('error', (error) => {
      console.error('ws-api连接失败，失败原因:', error);
    });

    this.ws.on('close', () => {
      console.log('ws-api连接关闭');
    });
  }
 //认证登录 
  authenticate() {
    const token = process.env.TOKEN;
    if (!token) {
      console.error('未找到TOKEN，请先运行index.js文件获取token');
      return;
    }

    const requestId = uuidv4();
    const params = JSON.stringify({ token: token });

    const message = {
      session_id: this.sessionId,
      request_id: requestId,
      method: 'auth:login',
      params: params
    };

    this.ws.send(JSON.stringify(message));
  }
  // 根据市场价格创建买入和卖出订单
  createOrders(markPrice) {
    // 以低于当前市场价格的adjustmentRatio进行下单
    const basePrice = parseFloat(markPrice) * tradingConfig.price.adjustmentRatio;
    const adjustedPrice_buy = (parseFloat(markPrice) - basePrice).toFixed(2);
    const adjustedPrice_sell = (parseFloat(markPrice) + basePrice).toFixed(2);
    // 保存调整后的价格
    this.adjustedPrice_buy = parseFloat(adjustedPrice_buy);
    this.adjustedPrice_sell = parseFloat(adjustedPrice_sell);
    // 下订单
    this.placeOrder(tradingConfig.symbol, 'buy', 'limit', adjustedPrice_buy, tradingConfig.order.quantity);
    this.placeOrder(tradingConfig.symbol, 'sell', 'limit', adjustedPrice_sell, tradingConfig.order.quantity);
  }

  //下订单 参数分别为：交易对，方向（buy/sell），订单类型（limit，market），开单价格，开单数量
  async placeOrder(tokenPaire = tradingConfig.symbol, side, orderType, price, amout = tradingConfig.order.defaultQuantity) {
    const payload = {
      symbol: tokenPaire,
      side: side,
      order_type: orderType,
      price: price,
      qty: amout,
      leverage: tradingConfig.order.leverage,
      time_in_force: tradingConfig.order.timeInForce,
      reduce_only: tradingConfig.order.reduceOnly,
    };
    const params = JSON.stringify(payload);
    console.log('wss开始下订单，方向：'+side+' 类型：'+orderType+' 价格：'+price+' 数量：'+amout+' 交易对：'+tokenPaire+' 杠杆：'+tradingConfig.order.leverage);
    const requestId =  crypto.randomUUID();
    this.pendingOrderRequestId = requestId;
    const timestamp = Date.now();
    const headers = encodeRequestSignature(params, requestId, timestamp);

    const message = {
      session_id: this.sessionId,
      request_id: requestId,
      method: 'order:new',
      header: headers,
      params: params
    };

    this.ws.send(JSON.stringify(message));
  }

  // 检测持仓并平仓
  async checkAndClosePositions() {
    try {
      // 防止频繁平仓，检查时间间隔
      const now = Date.now();
      if (now - this.lastClosePositionTime < this.closePositionInterval) {
        return;
      }

      // 查询持仓（静默模式，避免频繁日志输出）
      const positions = await queryPositions(null, true);
      
      if (!positions || positions.length === 0) {
        return;
      }

      // 过滤出状态为 open 的持仓
      const openPositions = positions.filter(pos => pos.status === 'open' && parseFloat(pos.qty) !== 0);
      
      if (openPositions.length > 0) {
        console.log(`检测到 ${openPositions.length} 个开放持仓，开始自动平仓...`);
        this.lastClosePositionTime = now;
        await closeAllPositions();
      }
    } catch (error) {
      console.error('检测持仓并平仓时出错:', error.message);
    }
  }
}

export default StandXOrderWebSocket;
