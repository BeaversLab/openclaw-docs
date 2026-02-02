---
title: "macOS 上的健康检查"
summary: "macOS 应用如何报告 gateway/Baileys 健康状态"
read_when:
  - 排查 mac 应用健康指示
---
# macOS 上的健康检查

如何在菜单栏应用中查看已连接频道是否健康。

## 菜单栏
- 状态点现在反映 Baileys 健康状态：
  - 绿色：已链接 + 最近打开过 socket。
  - 橙色：连接中/重试中。
  - 红色：已登出或探测失败。
- 第二行显示 "linked · auth 12m" 或失败原因。
- 菜单项 "Run Health Check" 触发按需探测。

## 设置
- General 页新增 Health 卡片，显示：已链接的 auth 时长、session-store 路径/数量、最后检查时间、最后错误/状态码，以及 Run Health Check / Reveal Logs 按钮。
- 使用缓存快照使 UI 立即加载，并在离线时优雅降级。
- **Channels 页**显示 WhatsApp/Telegram 的状态与控制（登录二维码、登出、探测、上次断开/错误）。

## 探测如何工作
- 应用通过 `ShellExecutor` 每约 60 秒以及按需运行 `openclaw health --json`。该探测会加载凭据并报告状态，但不会发送消息。
- 分别缓存最后一次成功快照与最后一次错误，以避免界面闪烁；分别显示时间戳。

## 不确定时
- 仍可使用 [Gateway health](/zh/gateway/health) 的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`），并查看 `/tmp/openclaw/openclaw-*.log` 中的 `web-heartbeat` / `web-reconnect`。
