---
summary: "通过渠道级别的故障特征和修复方案快速进行渠道故障排除"
read_when:
  - 渠道传输显示已连接但回复失败
  - 在深入查看提供商文档之前，你需要进行特定于渠道的检查
title: "Channel Troubleshooting"
---

# Channel 故障排除

当渠道已连接但行为异常时，请使用此页面。

## Command ladder

首先按顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康基线：

- `Runtime: running`
- `RPC probe: ok`
- 渠道探测显示已连接/就绪

## WhatsApp

### WhatsApp 故障特征

| 症状                         | 最快检查                                       | 修复                                                     |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| 已连接但没有私信回复     | `openclaw pairing list whatsapp`                    | 批准发送者或切换私信策略/允许列表。           |
| 群组消息被忽略          | 检查配置中的 `requireMention` + 提及模式 | 提及机器人或放宽该群的提及策略。 |
| 随机断开连接/重新登录循环 | `openclaw channels status --probe` + 日志           | 重新登录并验证凭据目录是否健康。   |

完整故障排除：[/channels/whatsapp#故障排除-quick](/zh/channels/whatsapp#troubleshooting-quick)

## Telegram

### Telegram 故障特征

| 症状                             | 最快检查                                   | 修复                                                                         |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流   | `openclaw pairing list telegram`                | 批准配对或更改私信策略。                                        |
| 机器人在线但群组保持静默   | 验证提及要求和机器人隐私模式 | 禁用隐私模式以使群组可见，或提及机器人。                   |
| 发送失败并伴随网络错误   | 检查日志中的 Telegram API 调用失败     | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                           |
| `setMyCommands` 在启动时被拒绝 | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`        | 减少插件/技能/自定义 Telegram 命令或禁用本机菜单。       |
| 已升级且允许列表阻止了你   | `openclaw security audit` 和配置允许列表 | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发送者 ID。 |

完整故障排除：[/channels/telegram#故障排除](/zh/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                         | 最快检查                       | 修复                                                       |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| 机器人在线但没有公会回复 | `openclaw channels status --probe`  | 允许公会/频道并验证消息内容意图。    |
| 群组消息被忽略          | 检查日志中是否有提及过滤丢弃 | 提及 bot 或设置 guild/渠道 `requireMention: false`。 |
| 私信回复丢失              | `openclaw pairing list discord`     | 批准私信配对或调整私信策略。                   |

完整故障排除：[/channels/discord#故障排除](/zh/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                                | 最快检查                             | 修复                                               |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Socket 模式已连接但无响应 | `openclaw channels status --probe`        | 验证 App token + Bot token 和所需的权限范围。 |
| 私信被阻止                            | `openclaw pairing list slack`             | 批准配对或放宽私信策略。               |
| 渠道消息被忽略                | 检查 `groupPolicy` 和渠道允许列表 | 允许该渠道或将策略切换为 `open`。     |

完整故障排除：[/channels/slack#故障排除](/zh/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                          | 最快检查                                                           | 修复                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| 无入站事件                | 验证 webhook/服务器可达性和应用权限                  | 修复 webhook URL 或 BlueBubbles 服务器状态。          |
| 在 macOS 上可以发送但无法接收 | 检查 macOS 针对信息自动化的隐私权限                 | 重新授予 TCC 权限并重启渠道进程。 |
| 私信发送者被阻止                | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新允许列表。                  |

完整故障排除：

- [/channels/imessage#故障排除-macos-privacy-and-security-tcc](/zh/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#故障排除](/zh/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                         | 最快检查                              | 修复                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 守护进程可达但 Bot 无响应 | `openclaw channels status --probe`         | 验证 `signal-cli` 守护进程 URL/账户和接收模式。 |
| 私信被阻止                      | `openclaw pairing list signal`             | 批准发送者或调整私信策略。                      |
| 群组回复未触发    | 检查群组允许列表和提及模式 | 添加发送者/群组或放宽过滤。                       |

完整故障排除：[/channels/signal#故障排除](/zh/channels/signal#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                             | 最快检查                                | 修复                                             |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| 已登录但忽略房间消息 | `openclaw channels status --probe`           | 检查 `groupPolicy` 和房间允许列表。         |
| 私信无法处理                  | `openclaw pairing list matrix`               | 批准发送者或调整私信策略。             |
| 加密房间失败                | 验证加密模块和加密设置 | 启用加密支持并重新加入/同步房间。 |

完整故障排除：[/channels/matrix#故障排除](/zh/channels/matrix#troubleshooting)

import en from "/components/footer/en.mdx";

<en />
