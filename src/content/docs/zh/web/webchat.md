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
- 当可见的助手消息在 `chat.history` 中被截断时，Control UI 可以打开侧边阅读器并通过 `chat.message.get` 按需获取完整的显示规范化条目，而不会增加默认历史记录负载。
- `chat.history` 跟踪现代仅追加会话文件的活跃对话记录分支，因此被废弃的重写分支和被取代的提示词副本不会在 WebChat 中渲染。
- 压缩条目显示为明确的压缩历史记录分隔线。该分隔线说明压缩的对话记录已作为检查点保存，并链接到会话检查点控制，只要操作员的权限允许，他们就可以从该压缩视图进行分支或恢复。
- Control UI 会记住由 `chat.history` 返回的底层 Gateway(网关) `sessionId`，并将其包含在后续的 `chat.send` 调用中，因此重连和页面刷新会继续同一存储的对话，除非用户启动或重置会话。
- Control UI 在为同一会话、消息和附件生成新的 `chat.send` 运行 ID 之前，会合并重复的进行中提交；Gateway(网关) 仍会对重用相同幂等性密钥的重复请求进行去重。
- 工作区启动文件和待处理的 `BOOTSTRAP.md` 指令通过代理系统提示词的项目上下文提供，而不是复制到 WebChat 用户消息中。引导截断仅添加一条简洁的系统提示词恢复通知；详细计数和配置调整保留在诊断界面上。
- `chat.history`OpenClaw 也经过显示标准化处理：仅运行时 OpenClaw 上下文、
  入站信封包装器、内联交付指令标记（如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、
  纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 以及截断的工具调用块），以及
  泄漏的 ASCII/全角模型控制标记会从可见文本中剥离，
  且如果助手条目的全部可见文本仅为确切的静默
  标记 `NO_REPLY` / `no_reply`，则这些条目将被省略。
- 带有推理标记的回复载荷（`isReasoning: true`WebChat）会被排除在 WebChat 助手内容、记录回放文本和音频内容块之外，因此仅包含思考的载荷不会显示为可见的助手消息或可播放的音频。
- `chat.inject` 会将助手备注直接追加到记录中，并将其广播到 UI（不运行代理）。
- 中止的运行可以在 UI 中保留部分可见的助手输出。
- 当存在缓冲输出时，Gateway 会将中止的部分助手文本持久化到记录历史中，并使用中止元数据标记这些条目。
- 历史记录始终从 gateway 获取（不监视本地文件）。
- 如果 gateway 无法访问，WebChat 将变为只读。

### 记录和交付模型

WebChat 有两个独立的数据路径：

- 会话 JSONL 文件是持久的模型/运行时记录。对于正常的代理运行，嵌入式 OpenClaw 运行时通过其会话管理器持久化模型可见的 OpenClaw`user`、`assistant` 和 `toolResult`WebChat 消息。WebChat 不会将任意交付、状态或辅助文本写入该记录中。
- Gateway(网关) Gateway(网关)`ReplyPayload`WebChat 事件是实时传递投影。它们可以针对 WebChat/渠道显示、分块流式传输、指令标签、媒体嵌入、TTS/音频标志和 UI 回退行为进行规范化。它们本身并不是规范的会话日志。
- 需要通过 `tools.message`WebChat 进行可见回复的 Harness 仍将 WebChat 用作当前运行的内部源回复接收器。来自该活动 WebChat 运行的无目标 `message.send`WebChatWebChat 会被投影到同一聊天中并镜像到会话记录；WebChat 不会成为可重用的出站渠道，也永远不会继承 `lastChannel`。
- 只有当 Gateway(网关) 在正常的嵌入式 Agent 轮次之外拥有显示的消息时，WebChat 才会注入助手记录条目：WebChatGateway(网关)`chat.inject`WebChat、非 Agent 命令回复、中止的部分输出以及 WebChat 管理的媒体记录补充。
- `chat.history`WebChat 读取存储的会话记录并应用 WebChat 显示投影。如果在运行期间出现实时助手文本但在历史记录重新加载后消失，请首先检查原始 JSONL 是否包含助手文本，然后检查 `chat.history` 投影是否将其剥离，最后检查 Control UI 乐观尾部合并是否用持久化快照替换了本地传递状态。
- `chat.message.get` 使用与 `chat.history` 相同的记录分支和显示投影规则（包括活动 Agent 作用域），但通过 `messageId` 定位一条记录条目，并在无法返回完整内容时返回真实的不可用原因。

正常的 Agent 运行最终答案应该是持久的，因为嵌入式运行时会写入助手 `message_end`。任何将传递的最终负载镜像到记录的回退都必须首先避免重复嵌入式运行时已写入的助手轮次。

## Control UI agents tools panel

- 控制 UI `/agents` 工具面板有两个独立的视图：
  - **当前可用** 使用 `tools.effective(sessionKey=...)` 并显示由服务器派生的
    当前会话清单的只读投影，包括核心、插件、渠道拥有
    以及已发现的 MCP 服务器工具。
  - **工具配置** 使用 `tools.catalog` 并专注于配置文件、覆盖
    和目录语义。
- 运行时可用性限定于会话范围。在同一代理上切换会话可能会更改
  **当前可用** 列表。如果配置的 MCP 服务器尚未连接，或自上次发现以来已发生更改，
  面板将显示一条通知，而不是从读取路径静默启动 MCP 传输。
- 配置编辑器并不隐含运行时可用性；有效访问仍遵循策略
  优先级 (`allow`/`deny`，以及每个代理和提供商/渠道覆盖)。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输 Gateway WebSocket。
- 您不需要运行单独的 WebChat 服务器。

## 配置参考 (WebChat)

完整配置：[Configuration](/zh/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当转录条目超过此限制时，Gateway(网关) 会截断长文本字段，并可能用占位符替换过大的消息。客户端还可以发送每个请求的 `maxChars`，以便为单个 `chat.history` 调用覆盖此默认值。

相关的全局选项：

- `gateway.port`，`gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`，`gateway.auth.token`，`gateway.auth.password`：
  共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`：启用时，浏览器控制 UI 聊天选项卡可以使用 Tailscale
  Serve 身份标头。
- `gateway.auth.mode: "trusted-proxy"`：位于具有身份感知功能的**非环回**代理源之后的浏览器客户端的反向代理身份验证（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主键默认值。

## 相关

- [Control UI](/zh/web/control-ui)
- [Dashboard](/zh/web/dashboard)
