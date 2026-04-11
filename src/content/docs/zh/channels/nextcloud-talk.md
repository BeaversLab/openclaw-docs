---
summary: "Nextcloud Talk 支持状态、功能和配置"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk

状态：捆绑插件（webhook 机器人）。支持私信、房间、表情回应和 markdown 消息。

## 捆绑插件

Nextcloud Talk 作为捆绑插件包含在当前的 OpenClaw 版本中，因此
正常的打包版本无需单独安装。

如果您使用的是旧版本，或者是排除了 Nextcloud Talk 的自定义安装，
请手动安装：

通过 CLI (npm registry) 安装：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

详情：[插件](/en/tools/plugin)

## 快速设置（初学者）

1. 确保 Nextcloud Talk 插件可用。
   - 当前的 OpenClaw 打包版本已包含它。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 在您的 Nextcloud 服务器上，创建一个机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标房间设置中启用该机器人。
4. 配置 OpenClaw：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅限默认账户）
5. 重启 Gateway（或完成设置）。

最小配置：

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## 注意事项

- 机器人无法发起私信。用户必须先向机器人发送消息。
- Webhook URL 必须能被 Gateway(网关) 访问；如果位于代理后面，请设置 `webhookPublicUrl`。
- 机器人 API 不支持媒体上传；媒体以 URL 形式发送。
- Webhook 负载不区分私信和房间；设置 `apiUser` + `apiPassword` 以启用房间类型查找（否则私信将被视为房间）。

## 访问控制（私信）

- 默认：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者将获得配对码。
- 通过以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID；显示名称将被忽略。

## 房间（群组）

- 默认：`channels.nextcloud-talk.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.nextcloud-talk.rooms` 将房间加入白名单：

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- 若不允许任何房间，请将白名单留空或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 状态   |
| -------- | ------ |
| 私信     | 支持   |
| 房间     | 支持   |
| 线程     | 不支持 |
| 媒体     | 仅 URL |
| 表情回应 | 支持   |
| 原生命令 | 不支持 |

## 配置参考（Nextcloud Talk）

完整配置：[Configuration](/en/gateway/configuration)

提供程序选项：

- `channels.nextcloud-talk.enabled`: 启用/禁用渠道启动。
- `channels.nextcloud-talk.baseUrl`: Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`: bot 共享密钥。
- `channels.nextcloud-talk.botSecretFile`: 常规文件密钥路径。拒绝符号链接。
- `channels.nextcloud-talk.apiUser`: 用于房间查找的 API 用户（私信检测）。
- `channels.nextcloud-talk.apiPassword`: 用于房间查找的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`: API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`: webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`: webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`: webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`: 外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`: 私信允许列表（用户 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`: 群组允许列表（用户 ID）。
- `channels.nextcloud-talk.rooms`: 每个房间的设置和允许列表。
- `channels.nextcloud-talk.historyLimit`: 群组历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`: 私信历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`: 每个私信的覆盖设置（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`: 出站文本块大小（字符）。
- `channels.nextcloud-talk.chunkMode`: `length`（默认）或 `newline` 以在按长度分块之前按空行（段落边界）拆分。
- `channels.nextcloud-talk.blockStreaming`：为此渠道禁用分块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`：分块流式传输合并调整。
- `channels.nextcloud-talk.mediaMaxMb`: 入站媒体上限（MB）。

## 相关

- [渠道概述](/en/channels) — 所有支持的渠道
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及控制
- [渠道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
