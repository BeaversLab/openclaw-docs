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

| 症状                      | 最快检查                                       | 修复                                              |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| 已连接但无私信回复        | `openclaw pairing list whatsapp`               | 批准发送者或切换私信策略/允许列表。               |
| 群组消息被忽略            | 检查配置中的 `requireMention` 和提及模式       | 提及机器人或放宽该群的提及策略。                  |
| 二维码登录因 408 超时     | 检查网关 `HTTPS_PROXY` / `HTTP_PROXY` 环境变量 | 设置一个可访问的代理；仅在绕过时使用 `NO_PROXY`。 |
| 随机断开连接/重新登录循环 | `openclaw channels status --probe` + 日志      | 重新登录并验证凭证目录是否健康。                  |

完整故障排除：[WhatsApp 故障排除](/zh/channels/whatsapp#troubleshooting)

## Telegram

### Telegram 故障特征

| 症状                           | 最快检查                                   | 修复                                                                                           |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `/start` 但没有可用的回复流程  | `openclaw pairing list telegram`           | 批准配对或更改私信策略。                                                                       |
| 机器人在线但群组保持沉默       | 验证提及要求和机器人隐私模式               | 禁用隐私模式以使群组可见，或提及机器人。                                                       |
| 发送失败并伴有网络错误         | 检查日志中是否有 Telegram API 调用失败     | 修复指向 `api.telegram.org` 的 DNS/IPv6/代理路由。                                             |
| 轮询停止或重连缓慢             | 使用 `openclaw logs --follow` 进行轮询诊断 | 升级；如果重启是误报，请调整 `pollingStallThresholdMs`。持续的停止仍然指向代理/DNS/IPv6 问题。 |
| `setMyCommands` 在启动时被拒绝 | 检查日志中是否有 `BOT_COMMANDS_TOO_MUCH`   | 减少插件/技能/自定义 Telegram 命令或禁用原生菜单。                                             |
| 已升级且允许列表阻止了您       | `openclaw security audit` 和配置允许列表   | 运行 `openclaw doctor --fix` 或将 `@username` 替换为数字发送者 ID。                            |

完整故障排除：[Telegram 故障排除](/zh/channels/telegram#troubleshooting)

## Discord

### Discord 故障特征

| 症状                   | 最快检查                           | 修复                                               |
| ---------------------- | ---------------------------------- | -------------------------------------------------- |
| Bot 在线但没有公会回复 | `openclaw channels status --probe` | 允许公会/渠道并验证消息内容意图。                  |
| 群组消息被忽略         | 检查日志中因提及过滤而丢弃的记录   | 提及 Bot 或设置公会/渠道 `requireMention: false`。 |
| 私信回复缺失           | `openclaw pairing list discord`    | 批准私信配对或调整私信策略。                       |

完整故障排除：[Discord 故障排除](/zh/channels/discord#troubleshooting)

## Slack

### Slack 故障特征

| 症状                        | 最快检查                           | 修复                                                                                                                                     |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Socket 模式已连接但没有响应 | `openclaw channels status --probe` | 验证 App token + Bot token 和所需的 scopes；在基于 SecretRef 的配置中注意 `botTokenStatus` / `appTokenStatus = configured_unavailable`。 |
| 私信被拦截                  | `openclaw pairing list slack`      | 批准配对或放宽私信策略。                                                                                                                 |
| 渠道消息被忽略              | 检查 `groupPolicy` 和渠道允许列表  | 允许该渠道或将策略切换为 `open`。                                                                                                        |

完整故障排除：[Slack 故障排除](/zh/channels/slack#troubleshooting)

## iMessage 和 BlueBubbles

### iMessage 和 BlueBubbles 故障特征

| 症状                          | 最快检查                                                                | 修复                                         |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 无入站事件                    | 验证 webhook/服务器可达性和应用权限                                     | 修复 webhook URL 或 BlueBubbles 服务器状态。 |
| 可以在 macOS 上发送但无法接收 | 检查 macOS 关于信息自动化的隐私权限                                     | 重新授予 TCC 权限并重启渠道进程。            |
| 私信发送者被拦截              | `openclaw pairing list imessage` 或 `openclaw pairing list bluebubbles` | 批准配对或更新允许列表。                     |

完整故障排除：

- [iMessage 故障排除](/zh/channels/imessage#troubleshooting)
- [BlueBubbles 故障排除](/zh/channels/bluebubbles#troubleshooting)

## Signal

### Signal 故障特征

| 症状                      | 最快检查                           | 修复                                            |
| ------------------------- | ---------------------------------- | ----------------------------------------------- |
| 守护进程可达但 Bot 无响应 | `openclaw channels status --probe` | 验证 `signal-cli` 守护进程 URL/账户和接收模式。 |
| 私信被拦截                | `openclaw pairing list signal`     | 批准发送者或调整私信策略。                      |
| 群组回复未触发            | 检查群组允许列表和提及模式         | 添加发送者/群组或放宽过滤限制。                 |

完整故障排除：[Signal 故障排除](/zh/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot 故障特征

| 症状                   | 最快检查                               | 修复                                               |
| ---------------------- | -------------------------------------- | -------------------------------------------------- |
| Bot 回复“gone to Mars” | 验证配置中的 `appId` 和 `clientSecret` | 设置凭据或重启网关。                               |
| 无入站消息             | `openclaw channels status --probe`     | 在 QQ 开放平台上验证凭据。                         |
| 语音未转录             | 检查 STT 提供商配置                    | 配置 `channels.qqbot.stt` 或 `tools.media.audio`。 |
| 主动消息未送达         | 检查 QQ 平台交互要求                   | 如果近期没有交互，QQ 可能会阻止机器人发起的消息。  |

完整故障排除：[QQ Bot 故障排除](/zh/channels/qqbot#troubleshooting)

## Matrix

### Matrix 故障特征

| 症状                      | 最快检查                               | 修复                                                                  |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| 已登录但忽略房间消息      | `openclaw channels status --probe`     | 检查 `groupPolicy`、房间白名单和提及门控。                            |
| 私信无法处理              | `openclaw pairing list matrix`         | 批准发送者或调整私信策略。                                            |
| 加密房间失败              | `openclaw matrix verify status`        | 重新验证设备，然后检查 `openclaw matrix verify backup status`。       |
| 备份恢复待处理/损坏       | `openclaw matrix verify backup status` | 运行 `openclaw matrix verify backup restore` 或使用恢复密钥重新运行。 |
| 交叉签名/引导看起来不正确 | `openclaw matrix verify bootstrap`     | 一次性修复密钥存储、交叉签名和备份状态。                              |

完整设置和配置：[Matrix](/zh/channels/matrix)

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [网关故障排除](/zh/gateway/troubleshooting)
