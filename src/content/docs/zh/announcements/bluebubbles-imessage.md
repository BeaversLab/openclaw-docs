---
summary: "BlueBubblesOpenClawiMessageiMessageBlueBubbles 支持已从 OpenClaw 中移除。对于新的和迁移的 iMessage 设置，请使用捆绑的 iMessage 插件配合 imsg。"
read_when:
  - You used the old BlueBubbles channel and need to move to iMessage
  - You are choosing the supported OpenClaw iMessage setup
  - You need a short explanation of the BlueBubbles removal
title: "BlueBubblesiMessageBlueBubbles 移除与 imsg iMessage 路径"
---

# BlueBubbles 移除及 imsg iMessage 路径

OpenClaw 不再附带 BlueBubbles 渠道。iMessage 支持现在通过内置的 `imessage` 插件运行，该插件在本地或通过 SSH 包装器启动 [`imsg`](https://github.com/steipete/imsg)，并通过 stdin/stdout 进行 JSON-RPC 通信。

如果您的配置仍包含 `channels.bluebubbles`，请将其迁移到 `channels.imessage`。旧的 `/channels/bluebubbles` 文档 URL 会重定向到 [从 BlueBubbles 迁移](/zh/channels/imessage-from-bluebubbles)，其中包含完整的配置转换表和切换清单。

## 有什么变化

- 受支持的 BlueBubbles BlueBubbles 路径中没有 OpenClaw HTTP 服务器、webhook 路由、REST 密码或 iMessage 插件运行时。
- OpenClaw 通过登录了 Messages.app 的 Mac 上的 `imsg` 读取和监视信息。
- 基本的发送、接收、历史记录和媒体功能使用正常的 `imsg`macOS 接口和 macOS 权限。
- 线程回复、点回、编辑、撤回、特效、已读回执、正在输入指示器和群组管理等高级操作需要 `imsg launch`API 并提供私有 API 桥接。
- Linux 和 Windows 网关仍可通过将 `channels.imessage.cliPath` 设置为在已登录 Mac 上运行 `imsg` 的 SSH 包装器来使用 iMessage。

## 操作步骤

1. 在消息 Mac 上安装并验证 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   imsg rpc --help
   ```

2. 授予运行 `imsg` 和 OpenClaw 的进程上下文完全磁盘访问和自动化权限。

3. 转换旧配置：

   ```json5
   {
     channels: {
       imessage: {
         enabled: true,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"],
         groupPolicy: "allowlist",
         groupAllowFrom: ["+15555550123"],
         groups: {
           "*": { requireMention: true },
         },
         includeAttachments: true,
       },
     },
   }
   ```

4. 重启网关并验证：

   ```bash
   openclaw channels status --probe
   ```

5. 在删除旧的 API 服务器之前，请测试私信、群组、附件以及您依赖的任何专用 BlueBubbles 操作。

## 迁移说明

- `channels.bluebubbles.serverUrl` 和 `channels.bluebubbles.password`iMessage 没有 iMessage 等效项。
- `channels.bluebubbles.allowFrom`、`groupAllowFrom`、`groups`、`includeAttachments`iMessage、附件根目录、媒体大小限制、分块和操作开关具有 iMessage 等效项。
- `channels.imessage.includeAttachments` 默认仍然是关闭的。如果您希望传入的照片、语音备忘录、视频或文件能够到达代理，请显式地设置它。
- 对于 `groupPolicy: "allowlist"`，请复制旧的 `groups` 块，包括任何 `"*"` 通配符条目。群组发件人允许列表和群组注册表是独立的关卡。
- 匹配 `channel: "bluebubbles"` 的 ACP 绑定必须更改为 `channel: "imessage"`。
- 旧的 BlueBubbles 会话密钥不会成为 iMessage 会话密钥。配对批准会按句柄（handle）保留，但 BlueBubbles 会话密钥下的对话历史不会保留。

## 另请参阅

- [从 BlueBubbles 迁移](/zh/channels/imessage-from-bluebubbles)
- [iMessage](/zh/channels/imessage)
- [配置参考 - iMessage](/zh/gateway/config-channels#imessage)
