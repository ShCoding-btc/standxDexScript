import WebSocket from 'ws';
// 订阅市场价格的WebSocket客户端
class StandXWebSocket {
  constructor(symbol = 'BTC-USD', onMessage = null) {
    this.ws = new WebSocket('wss://perps.standx.com/ws-stream/v1');
    this.symbol = symbol;
    this.onMessage = onMessage;

    this.ws.on('open', () => {
      this.subscribePrice(this.symbol);
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (this.onMessage) {
        this.onMessage(message);
      } else {
        console.log('ws-stream当前'+this.symbol+'市场信息为:', message);
      }
    });

    this.ws.on('error', (error) => {
      console.error('ws-stream连接失败，失败原因:', error);
    });

    this.ws.on('close', () => {
      console.log('ws-stream连接关闭');
    });
  }

  subscribePrice(symbol) {
    const message = {
      subscribe: {
        channel: 'price',
        symbol: symbol
      }
    };
    this.ws.send(JSON.stringify(message));
  }
}

export default StandXWebSocket;
