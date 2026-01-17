import 'dotenv/config';
import StandXOrderWebSocket from './wssApi/wssNewOrder.js';
import { validateBalance } from './util/validateBalance.js';
import { sendDingTalkMsg } from './util/dingTalk.js';

// 主函数
async function main() {
  try {
    // 第一步：检查必要的环境变量配置
    const apiToken = process.env.API_TOKEN;
    const privateKeyEd25519 = process.env.PRIVATE_KEY_ED25519;
    
    // 检查API_TOKEN
    if (!apiToken) {
      console.error('='.repeat(60));
      console.error('❌ 未配置 API_TOKEN');
      console.error('='.repeat(60));
      console.error('\n请按照以下步骤配置：');
      console.error('1. 访问 https://standx.com/user/session');
      console.error('2. 在页面上生成并获取 API Token');
      console.error('3. 在 .env 文件中添加：API_TOKEN=你的API_TOKEN');
      console.error('\n配置完成后重新运行程序。\n');
      process.exit(1);
    }
    
    // 检查PRIVATE_KEY_ED25519
    if (!privateKeyEd25519) {
      console.error('='.repeat(60));
      console.error('❌ 未配置 PRIVATE_KEY_ED25519');
      console.error('='.repeat(60));
      console.error('\n请按照以下步骤配置：');
      console.error('1. 访问 https://standx.com/user/session');
      console.error('2. 在页面上生成并获取 Private Key (Ed25519)');
      console.error('3. 在 .env 文件中添加：PRIVATE_KEY_ED25519=你的PRIVATE_KEY_ED25519');
      console.error('\n配置完成后重新运行程序。\n');
      process.exit(1);
    }
    
    console.log('✅ 环境变量配置检查通过');
    console.log('步骤1: 开始检查账户余额...');
    
    // 校验账户余额是否充足
    const balanceResult = await validateBalance();
    if (!balanceResult.success) {
      console.error('余额检查失败，程序退出');
      process.exit(1);
    }
    
    // 余额检查完成，发送钉钉通知
    const successMsg = `✅ 系统启动成功\n\n` +
      `**状态**: 余额检查完成\n` +
      `**账户余额**: ${balanceResult.balance?.toFixed(4) || 'N/A'}\n` +
      `**时间**: ${new Date().toLocaleString('zh-CN')}\n` +
      `交易系统已启动，开始监控市场...`;
    await sendDingTalkMsg(successMsg);
    
    // 启动下订单流程
    console.log('步骤2: 启动StandXOrderWebSocket...');
    new StandXOrderWebSocket();
    
  } catch (error) {
    console.error('程序执行出错:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
