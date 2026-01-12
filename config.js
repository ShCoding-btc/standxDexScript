// 交易配置
export const tradingConfig = {
  // 交易对
  symbol: 'BTC-USD',
  chain: 'bsc',
  expiresSeconds: 3600,//token生效时间
  refreshTokenSeconds: 3400,//token刷新阈值
  // 订单配置
  order: {
    // 订单数量（用于创建买入和卖出订单买入卖出同数量）
    quantity: '0.018',
    // 默认订单数量（用于 placeOrder 默认参数）
    defaultQuantity: '0.005',
    // 杠杆
    leverage: '40',
    // 时间类型
    timeInForce: 'gtc',
    // 是否只减仓
    reduceOnly: false,
  },
  
  // 价格调整配置
  price: {
    // 价格调整比例在下单时，以低于或高于当前市场价格的adjustmentRatio进行下单（0.088%）
    adjustmentRatio: 0.0008,
    // 价格差值阈值（百分比）在下单时，如果价格差值小于min%或大于max%，则取消订单
    diffThreshold: {
      min: 0.06,  // 最小差值阈值
      max: 0.1,  // 最大差值阈值
    },
  },
};
