# OpenClaw 文档 🦞

简体中文 | [English](README.md) | [Français](README.fr.md) | [Español](README.es.md)

本仓库包含 [OpenClaw](https://github.com/openclaw/openclaw) 的官方文档。OpenClaw 是一个自托管网关，可将 WhatsApp、Telegram、Discord 和 iMessage 等即时通讯平台连接到 AI 编程智能体。

## 🌐 语言

文档提供多种语言版本：

- [English (英语)](./en/index.md)
- [简体中文](./zh/index.md)
- [Français (法语)](./fr/index.md)
- [Español (西班牙语)](./es/index.md)

## 🚀 快速入门

如果您正在寻找如何使用 OpenClaw，请访问我们的[快速入门指南](https://docs.openclaw.io/zh/start/getting-started)或阅读[中文主页](./zh/index.md)。

## 🛠 参与贡献

我们欢迎各种贡献！如果您发现错别字、过时信息，或想添加新指南：

1. Fork 本仓库。
2. 创建一个新分支。
3. 在相关的语言目录（`en/`、`zh/`、`fr/`、`es/`）中进行修改。
4. 确保您的修改符合 [Prettier](https://prettier.io/) 配置：
   ```bash
   pnpm run format
   ```
5. 提交 Pull Request。

### 翻译同步

本项目使用自定义脚本管理翻译。如果您向英文版本添加了新页面，可以使用以下命令同步到其他语言：

```bash
pnpm run lang:sync
```

## 📜 许可证

本文档采用 [MIT 许可证](./LICENSE)。
