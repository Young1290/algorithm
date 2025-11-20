# Bitcoin 交易计算助手 (Bitcoin Trading Calculator) 🚀

一个集成了 AI 助手和动态策略引擎的比特币交易分析工具。

## ✨ 核心功能

### 🤖 AI 交易助手
- 基于 DeepSeek AI 的智能对话
- 自动识别交易意图并调用相应工具
- 支持中文和英文

### 📊 实时市场数据
- 从 Binance 获取实时价格
- 24小时市场统计 (最高/最低/成交量)
- 支持 BTC、ETH、SOL、BNB 等主流币种

### 🎯 动态策略引擎
生成 5 种不同的交易策略：
1. **10x 杠杆加仓** - 高风险高回报
2. **现货买入** - 低风险长期持有
3. **对冲策略** - 利用波动率赚钱
4. **混合策略** - 平衡风险和收益
5. **止盈建议** - 接近目标时的操作

### 📈 仓位分析工具
- 多笔交易的综合分析
- 平均成本计算
- 止盈/止损盈亏预测
- 逐笔建仓明细

---

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

创建 `.env` 文件并添加 DeepSeek API Key：

```bash
DEEPSEEK_API_KEY=your_api_key_here
```

获取 API Key: https://platform.deepseek.com/api_keys

### 3. 启动应用

```bash
npm start
# 或
npx expo start
```

### 4. 打开应用

- 按 `w` 在浏览器中打开
- 按 `i` 打开 iOS 模拟器
- 按 `a` 打开 Android 模拟器
- 扫描二维码在手机上使用 Expo Go 测试

## 📚 文档

- [策略引擎文档](./docs/STRATEGY_ENGINE.md) - 详细的功能说明
- [使用示例](./docs/USAGE_EXAMPLES.md) - 实际使用场景
- [调试指南](./docs/DEBUG_TOOL_CALLING.md) - 工具调用调试

## 🛠️ 技术栈

- **前端框架**: React Native + Expo
- **AI 模型**: DeepSeek AI
- **路由**: Expo Router
- **状态管理**: React Context
- **国际化**: i18next
- **市场数据**: Binance Public API

## 📁 项目结构

```
bc/
├── app/
│   ├── api/
│   │   └── chat+api.ts          # AI 助手 API
│   ├── lib/
│   │   ├── bitcoin-trading.ts   # 交易计算核心
│   │   └── strategy-engine.ts   # 动态策略引擎
│   └── (tabs)/
│       └── index.tsx             # 主界面
├── docs/
│   ├── STRATEGY_ENGINE.md        # 策略引擎文档
│   └── USAGE_EXAMPLES.md         # 使用示例
└── .env                          # 环境变量配置
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
