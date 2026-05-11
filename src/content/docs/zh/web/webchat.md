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
- `chat.history` 也进行了显示规范化：仅运行时的 OpenClaw 上下文、入站信封包装器、内联交付指令标签（如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌会从可见文本中剥离，并且如果助手条目的整个可见文本仅为精确的静默令牌 `NO_REPLY` / `no_reply`，则这些条目将被省略。
- 带有推理标记的回复载荷 (`isReasoning: true`) 被排除在 WebChat 助手内容、转录重放文本和音频内容块之外，因此仅思考的载荷不会作为可见的助手消息或可播放的音频出现。
- `chat.inject` 将助手备注直接追加到转录记录并向 UI 广播（不运行代理）。
- 中止的运行可以在 UI 中保留部分可见的助手输出。
- 当存在缓冲输出时，Gateway(网关) 会将中止的部分助手文本持久化到记录副本历史中，并用中止元数据标记这些条目。
- 历史记录始终从 gateway 获取（不监听本地文件）。
- 如果 gateway 无法访问，WebChat 将变为只读。

## 控制 UI agents 工具面板

- Control UI `/agents` 工具面板有两个独立的视图：
  - **当前可用** 使用 `tools.effective(sessionKey=...)` 并显示当前会话在运行时实际可以使用的内容，包括核心、插件和渠道拥有的工具。
  - **工具配置** 使用 `tools.catalog` 并专注于配置文件、覆盖和
    目录语义。
- 运行时可用性是会话作用域的。在同一 agent 上切换会话可以更改 **当前可用** 列表。
- 配置编辑器并不代表运行时可用性；有效访问仍遵循策略
  优先级（`allow`/`deny`，按代理和提供商/渠道覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输 gateway WebSocket。
- 您不需要运行单独的 WebChat 服务器。

## 配置参考 (WebChat)

完整配置：[Configuration](/zh/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当转录条目超过此限制时，Gateway(网关) 会截断长文本字段，并可能用占位符替换过大的消息。客户端也可以发送每个请求的 `maxChars` 来为单个 `chat.history` 调用覆盖此默认值。

相关全局选项：

- `gateway.port`, `gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：
  共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`：启用后，浏览器控制 UI 聊天选项卡可以使用 Tailscale
  Serve 身份标头。
- `gateway.auth.mode: "trusted-proxy"`：位于身份感知的**非环回**代理源后面的浏览器客户端的反向代理认证（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主键默认值。

## 相关

- [Control UI](/zh/web/control-ui)
- [Dashboard](/zh/web/dashboard)
