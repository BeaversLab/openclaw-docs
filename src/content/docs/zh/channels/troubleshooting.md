---
summary: "快速的通道级故障排除，包含特定通道的故障特征和修复方法"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "渠道故障排除"
---

当渠道已连接但行为异常时，请使用此页面。

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
- `Connectivity probe: ok`
- `Capability: read-only`、`write-capable` 或 `admin-capable`
- 渠道探测显示传输已连接，并且（在支持的情况下）`works` 或 `audit ok`

## WhatsApp

### WhatsApp 故障特征

| 症状                      | 最快检查                                       | 修复                                                                                 |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| 已连接但无私信回复        | `openclaw pairing list whatsapp`               | 批准发送者或切换私信策略/允许列表。                                                  |
| 群组消息被忽略            | 检查配置中的 `requireMention` 和提及模式       | 提及机器人或放宽该群的提及策略。                                                     |
| 二维码登录因 408 超时     | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量 | 设置一个可访问的代理；仅在绕过时使用 `NO_PROXY`。                                    |
| 随机断开连接/重新登录循环 | `openclaw channels status --probe` + 日志      | 即使当前已连接，最近的重连也会被标记；请观察日志，重启网关，如果持续抖动则重新链接。 |
| 回复延迟几秒/几分钟到达   | `openclaw doctor --fix`                        | Doctor 会停止已验证的过时本地 TUI 客户端，当它们正在降低 Gateway 事件循环性能时。    |

完整故障排除：[WhatsApp 故障排除](WhatsApp/en/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                            | 最快检查                                 | 修复                                                                                                      |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流     | `openclaw pairing list telegram`         | 批准配对或更改私信策略。                                                                                  |
| 机器人在线但群组保持静默        | 验证提及要求和机器人隐私模式             | 禁用隐私模式以实现群组可见性或提及机器人。                                                                |
| 发送失败并伴随网络错误          | 检查日志中的 Telegram API 调用失败       | 修复到 `api.telegram.org` 的 DNS/IPv6/代理路由。                                                          |
| 启动时报告 `getMe returned 401` | 检查配置的令牌来源                       | 重新复制或重新生成 BotFather 令牌并更新 `botToken`、`tokenFile` 或 default-account `TELEGRAM_BOT_TOKEN`。 |
| 轮询停滞或重连缓慢              | `openclaw logs --follow` 用于轮询诊断    | 升级；如果重启是误报，请调整 `pollingStallThresholdMs`。持续的停滞仍然指向代理/DNS/IPv6 问题。            |
| `setMyCommands` 在启动时被拒绝  | 检查日志中的 `BOT_COMMANDS_TOO_MUCH`     | 减少插件/技能/自定义 Telegram 命令或禁用原生菜单。                                                        |
| 已升级且允许列表阻止了您        | `openclaw security audit` 和配置允许列表 | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发送者 ID。                                       |

完整故障排除：[Telegram 故障排除](Telegram/en/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                                 | 最快检查                                                     | 修复                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 机器人在线但没有服务器回复           | `openclaw channels status --probe`                           | 允许服务器/频道并验证消息内容意图。                                                                                                  |
| 群组消息被忽略                       | 检查日志中是否有提及门控丢弃                                 | 提及机器人或设置 guild/渠道 `requireMention: false`。                                                                                |
| 正在输入/使用令牌但没有 Discord 消息 | 会话日志显示带有 `didSendViaMessagingTool: false` 的助手文本 | 模型私下回答了而不是调用消息工具。使用支持工具调用的可靠模型，或者设置 `messages.groupChat.visibleReplies: "automatic"` 以自动发布。 |
| 私信回复丢失                         | `openclaw pairing list discord`                              | 批准私信配对或调整私信策略。                                                                                                         |

完整故障排除：[Discord 故障排除](/zh/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                      | 最快检查                           | 修复                                                                                                                                |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已连接但无响应 | `openclaw channels status --probe` | 验证应用令牌 + 机器人令牌和所需作用域；在基于 SecretRef 的设置中注意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被阻止                | `openclaw pairing list slack`      | 批准配对或放宽私信策略。                                                                                                            |
| 渠道消息被忽略            | 检查 `groupPolicy` 和渠道允许列表  | 允许该渠道或将策略切换至 `open`。                                                                                                   |

完整故障排除：[Slack 故障排除](/zh/channels/slack#troubleshooting)

## iMessage

### iMessage 故障特征

| 症状                           | 最快检查                                              | 修复                                                             |
| ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `imsg` 缺失或在非 macOS 上失败 | `openclaw channels status --probe --channel imessage` | 在 Messages Mac 上运行 OpenClaw 或为 `cliPath` 使用 SSH 包装器。 |
| 在 macOS 上可以发送但无法接收  | 检查 Messages 自动化的 macOS 隐私权限                 | 重新授予 TCC 权限并重启渠道进程。                                |
| 私信发送者被阻止               | `openclaw pairing list imessage`                      | 批准配对或更新允许列表。                                         |

完整故障排除：

- [iMessage 故障排除](/zh/channels/imessage#troubleshooting)

## Signal

### Signal 故障特征

| 症状                       | 最快检查                           | 修复                                            |
| -------------------------- | ---------------------------------- | ----------------------------------------------- |
| 守护进程可达但机器人无响应 | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/帐户和接收模式。 |
| 私信被屏蔽                 | `openclaw pairing list signal`     | 批准发送者或调整私信策略。                      |
| 群组回复未触发             | 检查群组白名单和提及模式           | 添加发送者/群组或放宽限制。                     |

完整故障排除：[Signal 故障排除](Signal/en/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特征

| 症状                   | 最快检查                               | 修复                                               |
| ---------------------- | -------------------------------------- | -------------------------------------------------- |
| Bot 回复“gone to Mars” | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                               |
| 无入站消息             | `openclaw channels status --probe`     | 在 QQ 开放平台上验证凭据。                         |
| 语音未转写             | 检查 STT 提供商配置                    | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主动消息未送达         | 检查 QQ 平台交互要求                   | 如果没有近期交互，QQ 可能会阻止机器人发起的消息。  |

完整故障排除：[QQ Bot 故障排除](/zh/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                  | 最快检查                               | 修复                                                                  |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登录但忽略房间消息  | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间白名单和提及限制。                            |
| 私信未处理            | `openclaw pairing list matrix`         | 批准发送者或调整私信策略。                                            |
| 加密房间失败          | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。       |
| 备份恢复待处理/损坏   | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| 交叉签名/引导显示异常 | `openclaw matrix verify bootstrap`     | 一次性修复密钥存储、交叉签名和备份状态。                              |

完整设置和配置：[Matrix](Matrix/en/channels/matrix)

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [网关故障排除](<Gateway(网关)/en/gateway/troubleshooting>)
