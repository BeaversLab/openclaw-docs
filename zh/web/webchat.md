---
summary: "用于聊天 UI 的 Loopback WebChat 静态主机和 Gateway 网关 WS 用法"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat（Gateway 网关 WebSocket UI）

状态：macOS/iOS SwiftUI 聊天 UI 直接与 Gateway 网关 WebSocket 通信。

## 它是什么

- 用于网关的原生聊天 UI（无嵌入式浏览器，无本地静态服务器）。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复始终返回到 WebChat。

## 快速入门

1. 启动网关。
2. 打开 WebChat UI（macOS/iOS 应用）或控制 UI 聊天选项卡。
3. 确保已配置网关身份验证（默认情况下是必需的，即使在回环上也是如此）。

## 它是如何工作的（行为）

- UI 连接到 Gateway 网关 WebSocket 并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 为保持稳定性而受限：Gateway 网关 可能会截断长文本字段、省略繁重的元数据，并用 `[chat.history omitted: message too large]` 替换超大条目。
- `chat.inject` 将助手备注直接附加到记录并广播到 UI（不运行代理）。
- 中止的运行可以使部分助手输出在 UI 中保持可见。
- 当存在缓冲输出时，Gateway 网关 会将中止的部分助手文本保存到记录单历史记录中，并用中止元数据标记这些条目。
- 历史记录始终从网关获取（无本地文件监视）。
- 如果无法访问网关，WebChat 将变为只读。

## 控制 UI 代理工具面板

- 控制 UI `/agents` 工具面板通过 `tools.catalog` 获取运行时目录，并将每个工具标记为 `core` 或 `plugin:<id>`（对于可选插件工具则标记为 `optional`）。
- 如果 `tools.catalog` 不可用，该面板将回退到内置的静态列表。
- 该面板编辑配置文件和覆盖配置，但有效的运行时访问仍遵循策略优先级（`allow`/`deny`、每个代理以及提供商/渠道覆盖）。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道传输网关 WebSocket。
- 您不需要运行单独的 WebChat 服务器。

## 配置参考 (WebChat)

完整配置：[Configuration](/en/gateway/configuration)

渠道选项：

- 没有专用的 `webchat.*` 块。WebChat 使用网关端点和下面的身份验证设置。

相关的全局选项：

- `gateway.port`, `gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：WebSocket 身份验证（令牌/密码）。
- `gateway.auth.mode: "trusted-proxy"`：针对浏览器客户端的反向代理身份验证（参见 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：远程网关目标。
- `session.*`：会话存储和主密钥默认值。

import zh from "/components/footer/zh.mdx";

<zh />
