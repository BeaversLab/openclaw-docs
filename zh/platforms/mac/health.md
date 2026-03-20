---
summary: "macOS 应用如何报告 Gateway/Baileys 健康状态"
read_when:
  - 调试 mac 应用健康指标
title: "Health Checks (macOS)"
---

# macOS 上的健康检查

如何通过菜单栏应用查看关联的频道是否健康。

## 菜单栏

- 状态圆点现在反映 Baileys 的健康状态：
  - 绿色：已关联 + socket 最近已打开。
  - 橙色：正在连接/重试。
  - 红色：已登出或探测失败。
- 第二行显示 "linked · auth 12m" 或显示失败原因。
- "运行健康检查" 菜单项触发按需探测。

## 设置

- "通用" 选项卡新增了一个 "健康" 卡片，显示：已关联身份验证时长、会话存储路径/数量、上次检查时间、上次错误/状态码，以及 "运行健康检查" / "显示日志" 按钮。
- 使用缓存的快照，以便 UI 瞬间加载，并在离线时优雅回退。
- **渠道 (Channels)** 标签页显示 WhatsApp/Telegram 的渠道状态和控制选项（登录二维码、退出、探测、上次断开连接/错误）。

## 探测如何工作

- App runs `openclaw health --json` via `ShellExecutor` 每 ~60 秒运行一次，也可按需运行。探测会加载凭据并报告状态，而不发送消息。
- 分别缓存最后一次良好的快照和最后一次错误，以避免闪烁；显示每个的时间戳。

## 遇到问题时

- 您仍然可以使用 [Gateway health](/zh/gateway/health) 中的 CLI 流程 (`openclaw status`, `openclaw status --deep`, `openclaw health --json`) 并查看 `/tmp/openclaw/openclaw-*.log` 中的 `web-heartbeat` / `web-reconnect`。

import en from "/components/footer/en.mdx";

<en />
