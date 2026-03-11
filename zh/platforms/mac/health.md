---
summary: "macOS 应用如何报告 gateway/Baileys 健康状态"
read_when:
  - "Debugging mac app health indicators"
title: "健康检查"
---

# macOS 上的健康检查

如何从菜单栏应用查看链接的频道是否健康。

## 菜单栏

- 状态点现在反映 Baileys 健康状况：
  - 绿色：已链接 + 套接最近已打开。
  - 橙色：正在连接/重试。
  - 红色：已登出或探测失败。
- 副标题行显示"已链接 · 认证 12m"或显示失败原因。
- "运行健康检查"菜单项触发按需探测。

## 设置

- "常规"选项卡增加了一个"健康"卡片，显示：链接的认证时间、会话存储路径/计数、上次检查时间、上次错误/状态代码，以及"运行健康检查"/"显示日志"的按钮。
- 使用缓存的快照，以便 UI 瞬间加载并在离线时优雅地降级。
- **频道选项卡**显示 WhatsApp/Telegram 的频道状态 + 控件（登录 QR、登出、探测、上次断开连接/错误）。

## 探测如何工作

- 应用每约 60 秒并通过 `ShellExecutor` 运行 `openclaw health --json` 一次，以及按需运行。探测会加载凭证并报告状态，而不发送消息。"
- 分别缓存最后的好快照和最后的错误以避免闪烁；显示每个的时间戳。

## 有疑问时

- 你仍然可以使用 [Gateway health](/zh/gateway/health) 中的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`）并为 `web-heartbeat`/`web-reconnect` 跟踪 `/tmp/openclaw/openclaw-*.log`。"
