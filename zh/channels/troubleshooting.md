---
summary: "快速的通道级故障排除，包含特定通道的故障特征和修复方法"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "通道故障排除"
---

# 频道故障排除

当频道已连接但行为异常时，请使用此页面。

## 命令阶梯

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
- 频道探测显示已连接/就绪

## WhatsApp

### WhatsApp 故障特征

| 症状                           | 最快检查                                             | 修复                                                     |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------- |
| 已连接但无私信回复             | `openclaw pairing list whatsapp`                       | 批准发送者或切换私信策略/允许列表。                      |
| 群组消息被忽略                 | 检查配置中的 `requireMention` + 提及模式 | 提及机器人或放宽该群的提及策略。                         |
| 随机断开连接/重新登录循环      | `openclaw channels status --probe` + 日志               | 重新登录并验证凭据目录是否健康。                         |

完整故障排除：[/channels/whatsapp#故障排除-quick](/zh/en/channels/whatsapp#故障排除-quick)

## Telegram

### Telegram 故障特征

| 症状                             | 最快检查                                   | 修复                                                                         |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流   | `openclaw pairing list telegram`                | 批准配对或更改私信策略。                                        |
| 机器人在线但群组保持静默   | 验证提及要求和机器人隐私模式 | 禁用隐私模式以获得群组可见性或提及机器人。                   |
| 发送失败并伴随网络错误   | 检查日志中的 Telegram API 调用失败     | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                           |
| `setMyCommands` 在启动时被拒绝 | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`        | 减少插件/技能/自定义 Telegram 命令或禁用原生菜单。       |
| 升级后白名单阻止您   | `openclaw security audit` 和配置白名单 | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发送者 ID。 |

完整故障排除：[/channels/telegram#故障排除](/zh/en/channels/telegram#故障排除)

## Discord

### Discord 故障特征

| 症状                         | 最快检查                       | 修复                                                       |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| 机器人在线但没有群组回复 | `openclaw channels status --probe`  | 允许群组/频道并验证消息内容意图。    |
| 群组消息被忽略          | 检查日志中提及过滤的丢弃 | 提及机器人或设置群组/频道 `requireMention: false`。 |
| 缺少私信回复              | `openclaw pairing list discord`     | 批准私信配对或调整私信策略。                   |

完整故障排除：[/channels/discord#故障排除](/zh/en/channels/discord#故障排除)

## Slack

### Slack 故障特征

| 症状                                     | 最快的检查                                 | 修复                                                         |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Socket 模式已连接但无响应              | `openclaw channels status --probe`        | 验证 app token + bot token 和所需的 scopes。                  |
| 私信（私信）被阻止                       | `openclaw pairing list slack`             | 批准配对或放宽私信策略。                                     |
| 频道消息被忽略                         | 检查 `groupPolicy` 和频道白名单 | 允许该频道或将策略切换为 `open`。     |

完整故障排查：[/channels/slack#故障排除](/zh/en/channels/slack#故障排除)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                                 | 最快的检查                                                                 | 修复                                                     |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| 没有传入事件                       | 验证 webhook/服务器的可达性和应用权限                                        | 修复 webhook URL 或 BlueBubbles 服务器状态。             |
| 在 macOS 上可发送但无法接收       | 检查“信息”自动化的 macOS 隐私权限                                            | 重新授予 TCC 权限并重启频道进程。                        |
| 私信发送者被阻止                  | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新白名单。                                   |

完整故障排查：

- [/channels/imessage#故障排除-macos-privacy-and-security-tcc](/zh/en/channels/imessage#故障排除-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#故障排除](/zh/en/channels/bluebubbles#故障排除)

## Signal

### Signal 故障特征

| 症状                           | 最快检查                                   | 修复                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| 后台可达但机器人无响应           | `openclaw channels status --probe`         | 验证 `signal-cli` 后台 URL/账户和接收模式。 |
| 私信（私信）被拦截                 | `openclaw pairing list signal`             | 批准发送者或调整私信策略。                                |
| 群组回复未触发                   | 检查群组允许列表和提及模式                  | 添加发送者/群组或放宽限制。                               |

完整故障排除：[/channels/signal#故障排除](/zh/en/channels/signal#故障排除)

## Matrix

### Matrix 故障特征

| 症状                               | 最快检查                                     | 修复                                              |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| 已登录但忽略房间消息               | `openclaw channels status --probe`           | 检查 `groupPolicy` 和房间允许列表。          |
| 私信（私信）未处理                  | `openclaw pairing list matrix`               | 批准发送者或调整私信策略。                          |
| 加密房间失败                       | 验证加密模块和加密设置                       | 启用加密支持并重新加入/同步房间。                    |

完整故障排除：[/channels/matrix#故障排除](/zh/en/channels/matrix#故障排除)

import zh from '/components/footer/zh.mdx';

<zh />
