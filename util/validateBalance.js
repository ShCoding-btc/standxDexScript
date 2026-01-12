import 'dotenv/config';
import { getAccountInfo } from '../httpApi/httpApi.js';
import { tradingConfig } from '../config.js';
/**
 * 检查账户余额是否充足
 * @returns {Promise<{success: boolean, balance?: number, requiredMargin?: number, markPrice?: number, message?: string}>}
 */
export async function validateBalance() {
  try {
    console.log('正在查询账户余额...');
    // 查询账户信息
    const accountInfo = await getAccountInfo();
    if (!accountInfo) {
      console.error('获取账户信息失败，无法检查余额');
      return {
        success: false,
        message: '获取账户信息失败，无法检查余额'
      };
    }
    // 获取账户余额
    const balance = parseFloat(accountInfo.balance || 0);
    if (isNaN(balance) || balance <= 0) {
      console.error('无法获取有效的账户余额');
      console.log('账户信息:', JSON.stringify(accountInfo, null, 2));
      return {
        success: false,
        message: '无法获取有效的账户余额'
      };
    }
    // 简单的余额检查：至少需要一些余额
    const minRequiredBalance = 0.01; // 最小余额要求
    console.log('='.repeat(50));
    console.log('账户余额检查:');
    console.log(`  账户余额: ${balance.toFixed(4)}`);
    
    if (balance < minRequiredBalance) {
      console.error('❌ 余额不足！');
      return {
        success: false,
        balance: balance,
        requiredMargin: minRequiredBalance,
        message: `余额不足！当前余额: ${balance.toFixed(4)}, 最小余额要求: ${minRequiredBalance.toFixed(4)}`
      };
    }
    console.log('✅ 余额充足，可以开始交易');
    return {
      success: true,
      balance: balance
    };
  } catch (error) {
    console.error('检查账户余额时出错:', error.message);
    return {
      success: false,
      message: `检查账户余额时出错: ${error.message}`
    };
  }
}