---
summary: "macOS 应用如何报告网关/Baileys 健康状态"
read_when:
  - Debugging mac app health indicators
title: "健康检查"
---

# macOS 上的健康检查

如何通过菜单栏应用查看关联的频道是否健康。

## 菜单栏

- 状态圆点现在反映 Baileys 的健康状态：
  - 绿色：已关联 + socket 近期已打开。
  - 橙色：正在连接/重试。
  - 红色：已注销或探测失败。
- 第二行显示“linked · auth 12m”或显示失败原因。
- "Run Health Check" 菜单项会触发按需探测。

## 设置

- “通用”选项卡增加了一个健康卡片，显示：关联的 auth 有效期、session-store 路径/数量、上次检查时间、上次错误/状态码，以及运行健康检查/显示日志的按钮。
- 使用缓存的快照，以便 UI 瞬间加载，并在离线时优雅降级。
- **频道选项卡** 显示 WhatsApp/Telegram 的频道状态 + 控件（登录 QR、注销、探测、上次断开连接/错误）。

## 探测的工作原理

- 应用每隔约 60 秒以及按需通过 `ShellExecutor` 运行 `openclaw health --json`。该探测器加载凭据并报告状态，而不发送消息。
- 分别缓存最后一次良好的快照和最后一次错误，以避免闪烁；显示每个的时间戳。

## 如有疑问

- 您仍然可以在 [Gateway health](/en/gateway/health) 中使用 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`）并监视 `/tmp/openclaw/openclaw-*.log` 以查找 `web-heartbeat` / `web-reconnect`。

import zh from '/components/footer/zh.mdx';

<zh />
