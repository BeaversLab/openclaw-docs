---
summary: "用于聊天 UI 的 Loopback WebChat 静态主机和 Gateway(网关) 网关 WS 用法"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway(网关) WebSocket 通信。

## 它是什么

- 用于网关的原生聊天 UI（无嵌入式浏览器，无本地静态服务器）。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复始终返回 WebChat。

## 快速开始

1. 启动网关。
2. 打开 WebChat UI (macOS/iOS 应用) 或 Control UI 聊天选项卡。
3. 确保已配置有效的网关身份验证路径（默认为 shared-secret，即使在环回接口上）。

## 工作原理（行为）

- UI 连接到 Gateway(网关) WebSocket 并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 为了稳定性是有界的：Gateway(网关) 可能会截断长文本字段，省略繁重的元数据，并用 `[chat.history omitted: message too large]` 替换过大的条目。
- `chat.history` 遵循现代仅追加会话文件的活动记录分支，因此被放弃的重写分支和被取代的提示词副本不会在 WebChat 中呈现。
- 压缩条目呈现为一个明确的压缩历史记录分隔符。该分隔符说明了压缩的记录作为检查点被保留，并链接到会话检查点控件，操作员在其中获得权限许可时可以从该压缩视图进行分支或还原。
- 控制 UI 会记住由 `chat.history` 返回的支持 Gateway(网关) `sessionId`，并将其包含在后续的 `chat.send` 调用中，因此除非用户启动或重置会话，否则重新连接和页面刷新将继续进行相同的已存储对话。
- 控制 UI 在为同一会话、消息和附件生成新的 `chat.send` 运行 ID 之前，会合并重复的进行中提交；Gateway(网关) 仍会对重复使用同一幂等性键的重复请求进行去重。
- 工作区启动文件和挂起的 `BOOTSTRAP.md` 指令是通过代理系统提示词的项目上下文提供的，而不是复制到 WebChat 用户消息中。引导截断仅添加简明的系统提示词恢复通知；详细的计数和配置旋钮保留在诊断表面上。
- `chat.history` 也经过了显示规范化：仅运行时 OpenClaw 上下文、入站信封包装器、内联交付指令标签（如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄漏的 ASCII/全角模型控制令牌都会从可见文本中剥离，并且其整个可见文本仅包含精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目将被省略。
- 标记为推理的回复有效载荷 (`isReasoning: true`WebChat) 被排除在 WebChat 助手内容、记录重放文本和音频内容块之外，因此仅包含思考的有效载荷不会显示为可见的助手消息或可播放的音频。
- `chat.inject` 会将助手备注直接追加到记录中并将其广播到 UI（不运行 agent）。
- 中止的运行可以在 UI 中保留部分助手输出可见。
- 当存在缓冲输出时，Gateway 会将中止的部分助手文本持久化到记录历史中，并用中止元数据标记这些条目。
- 历史记录始终从 gateway 获取（无本地文件监视）。
- 如果 gateway 不可达，WebChat 将为只读。

### 记录和交付模型

WebChat 有两个独立的数据路径：

- 会话 JSONL 文件是持久的模型/运行时记录。对于正常的代理运行，嵌入的 OpenClaw 运行时通过其会话管理器持久化模型可见的 OpenClaw`user`、`assistant` 和 `toolResult`WebChat 消息。WebChat 不会将任意的投递、状态或帮助文本写入该记录。
- Gateway Gateway(网关)`ReplyPayload`WebChat 事件是实时的交付投影。它们可以针对 WebChat/渠道显示、分块流式传输、指令标签、媒体嵌入、TTS/音频标志和 UI 回退行为进行规范化。它们本身不是规范化的会话日志。
- 需要通过 `tools.message` 获得可见回复的 Harness 仍将 WebChat 用作当前运行的内部源回复接收器。来自该活动 WebChat 运行的无目标 `message.send` 会被投影到同一个聊天中并镜像到会话记录；WebChat 不会成为可重用的出站渠道，也从不继承 `lastChannel`。
- 仅当 Gateway 拥有正常嵌入式代理轮次之外显示的消息时，WebChat 才会注入助手记录条目：WebChatGateway(网关)`chat.inject`WebChat、非代理命令回复、中止的部分输出以及 WebChat 管理的媒体记录补充。
- `chat.history`WebChat 读取存储的会话记录并应用 WebChat 显示投影。如果实时助手文本在运行期间出现但在重新加载历史记录后消失，首先检查原始 JSONL 是否包含助手文本，然后检查 `chat.history` 投影是否将其剥离，最后检查控制 UI 的乐观尾部合并是否用持久化快照替换了本地传递状态。

正常的代理运行最终答案应该是持久的，因为嵌入的运行时会写入助手 `message_end`。任何将投递的最终有效负载镜像到记录的回退机制，必须首先避免复制嵌入运行时已写入的助手轮次。

## 控制 UI 代理工具面板

- 控制 UI `/agents` 工具面板有两个单独的视图：
  - **Available Right Now** 使用 `tools.effective(sessionKey=...)` 并显示当前会话清单的服务器派生只读投影，包括核心、插件、渠道拥有以及已发现的 MCP 服务器工具。
  - **Tool Configuration** 使用 `tools.catalog` 并专注于配置文件、覆盖和目录语义。
- 运行时可用性是会话范围的。在同一代理上切换会话可以更改 **Available Right Now** 列表。如果配置的 MCP 服务器尚未连接或自上次发现以来已更改，该面板将显示通知，而不是从读取路径静默启动 MCP 传输。
- 配置编辑器并不代表运行时可用性；有效访问仍遵循策略优先级（`allow`/`deny`，以及按代理和提供商/渠道覆盖设置）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输网关 WebSocket。
- 您无需运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置：[配置](/zh/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当转录条目超过此限制时，Gateway(网关) 会截断长文本字段，并可能会用占位符替换过大的消息。客户端还可以发送针对每个请求的 `maxChars`，以便为单个 `chat.history` 调用覆盖此默认值。

相关的全局选项：

- `gateway.port`, `gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`Tailscale：启用后，浏览器控制 UI 聊天选项卡可以使用 Tailscale
  提供身份标头。
- `gateway.auth.mode: "trusted-proxy"`：位于支持身份识别的 **非环回** 代理源之后的浏览器客户端的反向代理认证（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主键默认值。

## 相关

- [控制界面](/zh/web/control-ui)
- [仪表板](/zh/web/dashboard)
