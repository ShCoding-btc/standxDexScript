// 交易配置
export const tradingConfig = {
  // 交易对
  symbol: 'BTC-USD',
  chain: 'bsc',
  expiresSeconds: 518400,//token生效时间
  refreshTokenSeconds: 510000,//token刷新阈值
  // 订单配置
  order: {
    // 订单数量（用于创建买入和卖出订单买入卖出同数量）
    quantity: '0.042',//动态计算失败后的兜底数量
    // 默认订单数量（用于 placeOrder 默认参数）
    defaultQuantity: '0.005',
    // 动态计算订单数量的比例（余额 × leverage × calculationRatio ÷ 2）
     calculationRatio: 0.91,  // 95%
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
    adjustmentRatio: 0.00075,
    // 价格差值阈值（百分比）在下单时，如果价格差值小于min%或大于max%，则取消订单
    diffThreshold: {
      min: 0.05,  // 最小差值阈值
      max: 0.1,  // 最大差值阈值
    },
  },
  
  // 钉钉推送配置
  dingTalk: {
    // 钉钉机器人关键词（如果机器人设置了关键词验证，必须在此配置，多个关键词用逗号分隔）
    // 例如：keyword: '通知,告警' 或 keyword: '系统通知'
    // 如果不配置或为空，则不会自动添加关键词
    keyword: '通知',  // 请根据你的钉钉机器人设置填写关键词，如：'通知' 或 '告警,系统'
  },
};
