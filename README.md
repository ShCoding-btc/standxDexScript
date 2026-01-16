# StandX DEX 交易脚本

这是一个用于 StandX 去中心化交易所的自动化交易脚本，支持通过 WebSocket 和 HTTP API 进行交易操作。

## 📁 项目目录结构

```
standxDexScript/
├── config.js                    # 交易配置文件
├── index.js                     # 主入口文件
├── package.json                 # 项目依赖配置
├── package-lock.json            # 依赖锁定文件
├── httpApi/                     # HTTP API 模块
│   └── httpApi.js              # HTTP API 接口封装（创建订单、查询账户、取消订单等）
├── util/                        # 工具函数模块
│   ├── authUtil.js             # 认证工具（Ed25519 签名、密钥生成等）
│   ├── refreshToken.js          # Token 刷新工具（自动获取和刷新访问令牌）
│   ├── validateBalance.js       # 余额校验工具（检查账户余额是否充足）
│   └── dingTalk.js              # 钉钉消息推送工具（WebSocket断开、平仓失败等通知）
└── wssApi/                      # WebSocket API 模块
    ├── wssNewOrder.js           # WebSocket 订单管理（自动下单）
    └── wssQueryMarketPrice.js   # WebSocket 市场价格查询
```

## 🚀 快速开始

### 环境要求

- Node.js (建议 v16 或更高版本)
- npm 或 yarn

### 安装步骤

1. **克隆或下载项目**

```bash
cd standxDexScript
```

2. **安装依赖**

```bash
npm install
```

3. **配置项目**

**3.1 配置交易参数**

在 `config.js` 文件中配置交易参数：

```javascript
export const tradingConfig = {
  symbol: 'BTC-USD',        // 交易对
  chain: 'bsc',            // 区块链网络（bsc, eth, polygon 等）
  expiresSeconds: 3600,    // Token 过期时间（秒）
  // ... 其他配置
};
```

**3.2 配置环境变量**

在项目根目录创建 `.env` 文件，并配置以下环境变量：

```env
# 钱包配置（如果不存在会自动生成）
WALLET_ADDRESS=你的钱包地址
PRIVATE_KEY=你的私钥

# Ed25519 密钥对（程序会自动生成）
PRIVATE_KEY_ED25519=
PUBLIC_KEY_ED25519=
REQUEST_ID=

# Token（程序会自动获取并更新）
TOKEN=

# 钉钉机器人Webhook地址（可选，用于接收系统通知）
DINGTALK_WEBHOOK=你的钉钉机器人Webhook地址
```

**重要提示：**
- `chain` 和 `expiresSeconds` 现在在 `config.js` 中配置，不再需要环境变量
- `WALLET_ADDRESS` 和 `PRIVATE_KEY`：如果未配置，程序会自动生成新的钱包并保存到 `.env` 文件
- `PRIVATE_KEY_ED25519`、`PUBLIC_KEY_ED25519`、`REQUEST_ID`：程序会在首次运行时自动生成
- `TOKEN`：程序会在首次运行时自动获取并定期刷新
- `DINGTALK_WEBHOOK`：可选配置，用于接收系统异常通知（WebSocket断开、平仓失败等）

### 运行项目

```bash
npm run limit
```

或者直接运行：

```bash
node index.js
```

## 📖 使用手册

### 主要功能

#### 1. 自动 Token 管理

程序启动时会自动：
- 生成或使用现有的钱包地址和私钥
- 生成 Ed25519 密钥对用于请求签名
- 获取访问令牌（Token）
- 定期刷新 Token（刷新间隔在 `config.js` 中的 `expiresSeconds` 配置）

#### 2. 自动交易功能

程序会：
- 连接到 StandX WebSocket API
- 实时监听市场价格变化
- 根据配置的价格调整比例自动创建买入和卖出限价单
- 监控价格差值，当价格差值超出阈值时自动取消订单并重新下单

#### 3. 自动持仓监控与平仓

程序会：
- 实时检测用户持仓情况
- 当检测到持仓时，自动取消所有挂单
- 自动创建市价平仓订单（与持仓方向相反，数量相等，reduce_only=true）
- 首次下单前不进行持仓检测

#### 4. 动态订单数量计算

订单数量会根据以下公式动态计算：
```
订单数量 = (账户余额 × 杠杆倍数 × 计算比例 ÷ 2) ÷ 当前市场价格
```
- 计算比例可在 `config.js` 中的 `order.calculationRatio` 配置（默认 0.95，即 95%）
- 如果计算失败，会使用配置中的默认订单数量作为兜底

#### 5. 钉钉消息推送（可选）

如果配置了 `DINGTALK_WEBHOOK`，程序会在以下情况自动发送钉钉通知：
- **WebSocket 连接断开**：当 ws-api 连接断开时发送通知
- **WebSocket 连接错误**：当连接出现错误时发送通知
- **平仓失败**：当平仓操作失败时，发送包含失败详情的通知
- **平仓检测异常**：当持仓检测过程中出现异常时发送通知

#### 6. 交易配置

在 `config.js` 文件中可以配置：

```javascript
export const tradingConfig = {
  // 交易对
  symbol: 'BTC-USD',
  
  // 区块链配置
  chain: 'bsc',                 // 区块链网络（bsc, eth, polygon 等）
  expiresSeconds: 3600,         // Token 过期时间（秒）
  
  // 订单配置
  order: {
    quantity: '0.018',           // 订单数量（动态计算失败后的兜底数量）
    defaultQuantity: '0.005',    // 默认订单数量
    leverage: '40',              // 杠杆倍数
    calculationRatio: 0.95,     // 动态计算订单数量的比例（余额 × leverage × calculationRatio ÷ 2）
    timeInForce: 'gtc',          // 订单有效期类型
    reduceOnly: false,           // 是否只减仓
  },
  
  // 价格调整配置
  price: {
    adjustmentRatio: 0.0008,     // 价格调整比例（0.08%）
    diffThreshold: {
      min: 0.06,                 // 最小差值阈值（%）
      max: 0.1,                  // 最大差值阈值（%）
    },
  },
};
```

**配置说明：**
- `symbol`: 要交易的交易对（如 BTC-USD）
- `chain`: 区块链网络（如 bsc, eth, polygon 等）
- `expiresSeconds`: Token 过期时间（秒），用于控制 Token 刷新间隔
- `quantity`: 买入和卖出订单的数量（动态计算失败后的兜底数量）
- `leverage`: 杠杆倍数
- `calculationRatio`: 动态计算订单数量的比例（默认 0.95，即 95%），计算公式：`(余额 × leverage × calculationRatio ÷ 2) ÷ 市场价格`
- `adjustmentRatio`: 下单价格相对于市场价格的调整比例（买入价 = 市场价 - 市场价 × adjustmentRatio，卖出价 = 市场价 + 市场价 × adjustmentRatio）
- `diffThreshold`: 价格差值阈值，当买入/卖出价与市场价的差值百分比小于 min 或大于 max 时，会取消订单并重新下单

### HTTP API 功能

`httpApi/httpApi.js` 提供了以下 HTTP API 接口：

- `createOrder()`: 创建新订单（支持自定义参数）
- `getAccountInfo()`: 获取账户信息
- `getMarketData()`: 获取市场数据
- `getUserAllOrders()`: 查询所有未完成订单
- `cancelAllOrders()`: 取消所有订单
- `queryPositions()`: 查询用户持仓
- `closeAllPositions()`: 市价平仓所有持仓（平仓前会自动取消所有挂单）
- `calculateOrderQuantity()`: 动态计算订单数量

### 钉钉推送功能

`util/dingTalk.js` 提供了以下钉钉消息推送接口：

- `sendDingTalkMsg(content)`: 发送文本消息
- `sendDingTalkMarkdown(title, text)`: 发送 Markdown 格式消息

**自动推送场景：**
- WebSocket 连接断开时自动推送
- WebSocket 连接错误时自动推送
- 平仓操作失败时自动推送（包含失败详情）
- 持仓检测异常时自动推送

### 程序执行流程

1. **初始化阶段**
   - 加载配置文件和环境变量
   - 初始化 Token（如果不存在则获取新 Token）
   - 启动 Token 自动刷新机制

2. **余额检查阶段**
   - 查询账户余额
   - 验证余额是否充足
   - 如果余额不足，程序会提示并退出

3. **连接阶段**
   - 连接到 StandX WebSocket API
   - 进行身份认证

4. **交易阶段**
   - 订阅市场价格流
   - 根据市场价格和配置参数计算买入/卖出价格
   - 动态计算订单数量（基于账户余额、杠杆倍数和市场价格）
   - 创建限价订单
   - 持续监控价格变化，当价格差值超出阈值时重新下单
   - 检测持仓情况，如有持仓则自动平仓

5. **监控阶段**
   - 实时监控 WebSocket 连接状态
   - 监控平仓操作结果
   - 异常情况自动发送钉钉通知（如已配置）

## ⚙️ 配置说明

### 配置文件（config.js）

在 `config.js` 中可以调整以下参数：

- **交易对**：修改 `symbol` 字段（如 'BTC-USD'）
- **区块链网络**：修改 `chain` 字段（如 'bsc', 'eth', 'polygon'）
- **Token 过期时间**：修改 `expiresSeconds` 字段（秒，如 3600 表示 1 小时）
- **订单数量**：修改 `order.quantity`（动态计算失败后的兜底数量）和 `order.defaultQuantity`
- **杠杆倍数**：修改 `order.leverage`
- **计算比例**：修改 `order.calculationRatio`（用于动态计算订单数量，默认 0.95）
- **价格调整比例**：修改 `price.adjustmentRatio`（例如 0.0008 表示 0.08%）
- **价格差值阈值**：修改 `price.diffThreshold.min` 和 `price.diffThreshold.max`

### 环境变量配置（.env）

| 变量名 | 说明 | 是否必需 | 默认行为 |
|--------|------|----------|----------|
| `WALLET_ADDRESS` | 钱包地址 | 否 | 自动生成 |
| `PRIVATE_KEY` | 钱包私钥 | 否 | 自动生成 |
| `PRIVATE_KEY_ED25519` | Ed25519 私钥 | 否 | 自动生成 |
| `PUBLIC_KEY_ED25519` | Ed25519 公钥 | 否 | 自动生成 |
| `REQUEST_ID` | 请求 ID | 否 | 自动生成 |
| `TOKEN` | 访问令牌 | 否 | 自动获取 |
| `DINGTALK_WEBHOOK` | 钉钉机器人Webhook地址 | 否 | 不配置则不发送通知 |

**注意**：
- `chain` 和 `expiresSeconds` 现在在 `config.js` 中配置，不再需要环境变量
- `DINGTALK_WEBHOOK` 为可选配置，配置后可在 WebSocket 断开、平仓失败等异常情况时接收钉钉通知

## 🔒 安全提示

1. **私钥安全**：`.env` 文件包含敏感信息（私钥、Token 等），请勿将其提交到版本控制系统
2. **生产环境**：在生产环境中使用前，请确保：
   - 使用安全的钱包地址和私钥
   - 合理设置杠杆倍数
   - 充分测试交易逻辑
   - 监控程序运行状态

## 📝 依赖说明

主要依赖包：
- `axios`: HTTP 请求库
- `ws`: WebSocket 客户端
- `ethers`: 以太坊交互库
- `dotenv`: 环境变量管理
- `@noble/ed25519`: Ed25519 签名算法
- `@scure/base`: Base58 编码
- `uuid`: UUID 生成

## 🐛 故障排除

### 常见问题

1. **Token 获取失败**
   - 检查网络连接
   - 确认 `config.js` 中的 `chain` 配置正确（如 'bsc', 'eth' 等）
   - 检查钱包地址和私钥是否正确
   - 查看控制台输出的详细错误信息

2. **余额检查失败**
   - 检查账户余额是否充足
   - 确认钱包地址是否正确
   - 查看控制台输出的余额检查详情

3. **WebSocket 连接失败**
   - 检查网络连接
   - 确认 Token 是否有效
   - 查看控制台错误信息

4. **订单创建失败**
   - 检查账户余额是否充足
   - 确认交易对配置正确
   - 检查价格和数量参数是否合理
   - 确认杠杆倍数设置是否合理

## 📄 许可证

ISC

## 👤 作者

StandX DEX Script

---

**免责声明**：本脚本仅供学习和研究使用。使用本脚本进行交易存在风险，请谨慎使用并自行承担风险。

