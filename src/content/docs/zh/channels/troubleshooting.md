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
- 渠道探测显示传输层已连接，并且在支持的情况下，显示 `works` 或 `audit ok`

## WhatsApp

### WhatsApp 故障特征

| 症状                      | 最快检查                                  | 修复                                |
| ------------------------- | ----------------------------------------- | ----------------------------------- |
| 已连接但无私信回复        | `openclaw pairing list whatsapp`          | 批准发送者或切换私信策略/允许列表。 |
| 群组消息被忽略            | 检查 `requireMention` + 配置中的提及模式  | 提及机器人或放宽该群的提及策略。    |
| 随机断开连接/重新登录循环 | `openclaw channels status --probe` + 日志 | 重新登录并验证凭证目录是否正常。    |

完整故障排除：[/channels/whatsapp#故障排除](/zh/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                           | 最快检查                                 | 修复                                                                |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| `/start` 但没有可用的回复流    | `openclaw pairing list telegram`         | 批准配对或更改私信策略。                                            |
| 机器人在线但群组保持沉默       | 验证提及要求和机器人隐私模式             | 禁用群组可见性的隐私模式或提及机器人。                              |
| 发送失败并伴随网络错误         | 检查日志以查找 Telegram API 调用失败     | 修复 `api.telegram.org` 的 DNS/IPv6/代理路由。                      |
| `setMyCommands` 在启动时被拒绝 | 检查 `BOT_COMMANDS_TOO_MUCH` 的日志      | 减少插件/技能/自定义 Telegram 指令或禁用原生菜单。                  |
| 升级后允许列表阻止了您         | `openclaw security audit` 和配置允许列表 | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发送者 ID。 |

完整故障排除：[/channels/telegram#故障排除](/zh/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                   | 最快检查                           | 修复                                                  |
| ---------------------- | ---------------------------------- | ----------------------------------------------------- |
| 机器人在线但无公会回复 | `openclaw channels status --probe` | 允许公会/渠道并验证消息内容意图。                     |
| 群组消息被忽略         | 检查日志中是否有提及拦截导致的丢弃 | 提及机器人或设置服务器/频道 `requireMention: false`。 |
| 私信回复缺失           | `openclaw pairing list discord`    | 批准私信配对或调整私信策略。                          |

完整故障排除：[/channels/discord#故障排除](/zh/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                      | 最快检查                           | 修复                                                                                                                              |
| ------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已连接但无响应 | `openclaw channels status --probe` | 验证应用令牌 + 机器人令牌和所需范围；在 SecretRef 支持的设置中注意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被阻止                | `openclaw pairing list slack`      | 批准配对或放宽私信策略。                                                                                                          |
| 渠道消息被忽略            | 检查 `groupPolicy` 和渠道允许列表  | 允许该渠道或将策略切换为 `open`。                                                                                                 |

完整故障排除：[/channels/slack#故障排除](/zh/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                        | 最快检查                                                                | 修复                                         |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 无入站事件                  | 验证 webhook/服务器可达性和应用权限                                     | 修复 webhook URL 或 BlueBubbles 服务器状态。 |
| 在 macOS 上能发送但无法接收 | 检查“信息”自动化的 macOS 隐私权限                                       | 重新授予 TCC 权限并重启渠道进程。            |
| 私信发送者被阻止            | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新允许列表。                     |

完整故障排除：

- [/channels/imessage#故障排除](/zh/channels/imessage#troubleshooting)
- [/channels/bluebubbles#故障排除](/zh/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                       | 最快检查                           | 修复                                            |
| -------------------------- | ---------------------------------- | ----------------------------------------------- |
| 守护进程可达但机器人无响应 | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/帐户和接收模式。 |
| 私信被阻止                 | `openclaw pairing list signal`     | 批准发送者或调整私信策略。                      |
| 群组回复未触发             | 检查群组允许列表和提及模式         | 添加发送者/群组或放宽限制。                     |

完整故障排除：[/channels/signal#故障排除](/zh/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特征

| 症状                   | 最快检查                               | 修复                                                |
| ---------------------- | -------------------------------------- | --------------------------------------------------- |
| Bot 回复“gone to Mars” | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                                |
| 没有收到传入消息       | `openclaw channels status --probe`     | 在 QQ 开放平台上验证凭据。                          |
| 语音未转写             | 检查 STT 提供商配置                    | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。  |
| 主动消息未送达         | 检查 QQ 平台的交互要求                 | 如果没有最近的交互，QQ 可能会阻止机器人发起的消息。 |

完整故障排除：[/channels/qqbot#故障排除](/zh/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                      | 最快检查                               | 修复                                                                  |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登录但忽略房间消息      | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间允许列表以及提及限制。                        |
| 私信无法处理              | `openclaw pairing list matrix`         | 批准发送者或调整私信策略。                                            |
| 加密房间失败              | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。       |
| 备份恢复待处理/已损坏     | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| 交叉签名/引导看起来不正确 | `openclaw matrix verify bootstrap`     | 一次性修复密钥存储、交叉签名和备份状态。                              |

完整设置和配置：[Matrix](/zh/channels/matrix)
