---
summary: "Nextcloud Talk 支持状态、功能和配置"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk（插件）

状态：通过插件（webhook 机器人）支持。支持私信、房间、回复和 Markdown 消息。

## 需要插件

Nextcloud Talk 作为插件提供，不捆绑在核心安装中。

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/nextcloud-talk
```

如果您在配置/入职期间选择了 Nextcloud Talk 且检测到 git 检出，OpenClaw 将自动提供本地安装路径。

详情：[插件](/zh/en/tools/plugin)

## 快速设置（初学者）

1. 安装 Nextcloud Talk 插件。
2. 在您的 Nextcloud 服务器上，创建一个机器人：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标房间设置中启用该机器人。
4. 配置 OpenClaw：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅限默认账户）
5. 重启网关（或完成入职）。

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

## 说明

- 机器人无法发起私信。用户必须先向机器人发送消息。
- 网关必须能够访问 Webhook URL；如果位于代理之后，请设置 `webhookPublicUrl`。
- 机器人 API 不支持媒体上传；媒体以 URL 形式发送。
- Webhook 负载不区分私信和房间；设置 `apiUser` + `apiPassword` 以启用房间类型查找（否则私信将被视为房间）。

## 访问控制（私信）

- 默认值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者将收到配对码。
- 通过以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID；忽略显示名称。

## 房间（群组）

- 默认值：`channels.nextcloud-talk.groupPolicy = "allowlist"`（提及限制）。
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

- 若不允许任何房间，请保持白名单为空或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能         | 状态        |
| --------------- | ------------- |
| 私信 | 支持     |
| 房间           | 支持     |
| 主题串         | 不支持 |
| 媒体           | 仅限 URL      |
| 表情反应       | 支持     |
| 原生命令 | 不支持 |

## 配置参考 (Nextcloud Talk)

完整配置：[配置](/zh/en/gateway/configuration)

提供商选项：

- `channels.nextcloud-talk.enabled`: 启用/禁用通道启动。
- `channels.nextcloud-talk.baseUrl`: Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`: 机器人共享密钥。
- `channels.nextcloud-talk.botSecretFile`: 常规文件密钥路径。不接受符号链接。
- `channels.nextcloud-talk.apiUser`: 用于房间查找的 API 用户（DM 检测）。
- `channels.nextcloud-talk.apiPassword`: 用于房间查找的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`: API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`: webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`: webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`: webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`: 外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom`: 私信白名单（用户 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom`: 群组白名单（用户 ID）。
- `channels.nextcloud-talk.rooms`: 每个房间的设置和白名单。
- `channels.nextcloud-talk.historyLimit`: 群组历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`: 私信历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`: 每个私信的覆盖设置（historyLimit）。
- `channels.nextcloud-talk.textChunkLimit`: 出站文本块大小（字符数）。
- `channels.nextcloud-talk.chunkMode`: `length`（默认）或 `newline` 以在按长度分块之前按空行（段落边界）分割。
- `channels.nextcloud-talk.blockStreaming`: 禁用此通道的块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`: 块流式传输合并调整。
- `channels.nextcloud-talk.mediaMaxMb`: 入站媒体限制（MB）。
