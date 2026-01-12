import 'dotenv/config';
import { initToken } from './util/refreshToken.js';
import StandXOrderWebSocket from './wssApi/wssNewOrder.js';
import { validateBalance } from './util/validateBalance.js';

// 主函数
async function main() {
  try {
    // 第一步：初始化token
    console.log('步骤1: 开始初始化token...');
    const token = await initToken();
    
    if (!token) {
      console.error('Token初始化失败，程序退出');
      process.exit(1);
    }
    // 第二步：校验账户余额是否充足
    console.log('步骤2: 检查账户余额...');
    const balanceResult = await validateBalance();
    if (!balanceResult.success) {
      console.error('余额检查失败，程序退出');
      process.exit(1);
    }
    
    // 第三步：启动下订单流程
    console.log('步骤3: 启动StandXOrderWebSocket...');
    const wsClient = new StandXOrderWebSocket();
    
  } catch (error) {
    console.error('程序执行出错:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
