---
summary: "Nextcloud Talk 支持状态、功能和配置"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

状态：捆绑插件（webhook bot）。支持私信、聊天室、反应和 Markdown 消息。

## 捆绑插件

Nextcloud Talk 作为捆绑插件包含在当前的 OpenClaw 版本中，因此
普通的打包版本不需要单独安装。

如果您使用的是旧版本或排除了 Nextcloud Talk 的自定义安装，
请手动安装：

通过 CLI（npm 注册表）安装：

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

详情：[Plugins](/zh/tools/plugin)

## 快速设置（初学者）

1. 确保 Nextcloud Talk 插件可用。
   - 当前的 OpenClaw 打包版本已将其捆绑。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 在您的 Nextcloud 服务器上，创建一个 bot：

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. 在目标聊天室设置中启用该 bot。
4. 配置 OpenClaw：
   - 配置：`channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - 或环境变量：`NEXTCLOUD_TALK_BOT_SECRET`（仅限默认账户）

   CLI 设置：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   等效的显式字段：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   文件支持的密钥：

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. 重启网关（或完成设置）。

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

- Bot 无法发起私信。用户必须先向 Bot 发送消息。
- Gateway 必须能够访问 Webhook URL；如果位于代理之后，请设置 `webhookPublicUrl`。
- Bot API 不支持媒体上传；媒体以 URL 形式发送。
- Webhook 负载不区分私信和聊天室；设置 `apiUser` + `apiPassword` 以启用聊天室类型查找（否则私信将被视为聊天室）。

## 访问控制（私信）

- 默认值：`channels.nextcloud-talk.dmPolicy = "pairing"`。未知发送者将收到配对码。
- 通过以下方式批准：
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- 公开私信：`channels.nextcloud-talk.dmPolicy="open"` 加上 `channels.nextcloud-talk.allowFrom=["*"]`。
- `allowFrom` 仅匹配 Nextcloud 用户 ID；显示名称将被忽略。

## 聊天室（群组）

- 默认值：`channels.nextcloud-talk.groupPolicy = "allowlist"`（提及受限）。
- 使用 `channels.nextcloud-talk.rooms` 将聊天室加入白名单：

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

- 要拒绝所有聊天室，请保持白名单为空或设置 `channels.nextcloud-talk.groupPolicy="disabled"`。

## 功能

| 功能     | 状态   |
| -------- | ------ |
| 私信     | 支持   |
| 房间     | 支持   |
| 线程     | 不支持 |
| 媒体     | 仅 URL |
| 表情回应 | 支持   |
| 原生命令 | 不支持 |

## 配置参考 (Nextcloud Talk)

完整配置：[Configuration](/zh/gateway/configuration)

提供程序选项：

- `channels.nextcloud-talk.enabled`：启用/禁用渠道启动。
- `channels.nextcloud-talk.baseUrl`：Nextcloud 实例 URL。
- `channels.nextcloud-talk.botSecret`：机器人共享密钥。
- `channels.nextcloud-talk.botSecretFile`：常规文件密钥路径。拒绝符号链接。
- `channels.nextcloud-talk.apiUser`：用于房间查找的 API 用户（私信检测）。
- `channels.nextcloud-talk.apiPassword`：用于房间查找的 API/应用密码。
- `channels.nextcloud-talk.apiPasswordFile`：API 密码文件路径。
- `channels.nextcloud-talk.webhookPort`：webhook 监听端口（默认：8788）。
- `channels.nextcloud-talk.webhookHost`：webhook 主机（默认：0.0.0.0）。
- `channels.nextcloud-talk.webhookPath`：webhook 路径（默认：/nextcloud-talk-webhook）。
- `channels.nextcloud-talk.webhookPublicUrl`：外部可访问的 webhook URL。
- `channels.nextcloud-talk.dmPolicy`：`pairing | allowlist | open | disabled`。
- `channels.nextcloud-talk.allowFrom`：私信允许列表（用户 ID）。`open` 需要 `"*"`。
- `channels.nextcloud-talk.groupPolicy`：`allowlist | open | disabled`。
- `channels.nextcloud-talk.groupAllowFrom`：群组允许列表（用户 ID）。
- `channels.nextcloud-talk.rooms`：按房间设置和允许列表。
- `channels.nextcloud-talk.historyLimit`：群组历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dmHistoryLimit`：私信历史记录限制（0 表示禁用）。
- `channels.nextcloud-talk.dms`：按私信覆盖（历史记录限制）。
- `channels.nextcloud-talk.textChunkLimit`：出站文本块大小（字符）。
- `channels.nextcloud-talk.chunkMode`：`length`（默认）或 `newline`，以便在长度分块之前按空行（段落边界）拆分。
- `channels.nextcloud-talk.blockStreaming`：禁用此渠道的分块流式传输。
- `channels.nextcloud-talk.blockStreamingCoalesce`：分块流式传输合并调优。
- `channels.nextcloud-talk.mediaMaxMb`：入站媒体上限（MB）。

## 相关

- [Channels Overview](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群组聊天行为和提及限制
- [通道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全](/zh/gateway/security) — 访问模型和加固
