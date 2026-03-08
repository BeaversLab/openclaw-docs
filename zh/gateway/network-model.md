---
summary: "Gateway、nodes 和 canvas host 如何连接。"
read_when:
  - 您想要简洁了解 Gateway 网络模型
title: "Network model"
---

大多数操作通过 Gateway（`openclaw gateway`）流动，这是一个拥有 channel connections 和 WebSocket control plane 的单个长期运行进程。

## Core rules

- 建议每个 host 运行一个 Gateway。它是唯一允许拥有 WhatsApp Web session 的进程。对于 rescue bots 或严格隔离，运行多个带有隔离 profiles 和 ports 的 gateways。参见 [Multiple gateways](/zh/gateway/multiple-gateways)。
- Loopback 优先：Gateway WS 默认为 `ws://127.0.0.1:18789`。向导默认生成 gateway token，即使是 loopback。对于 tailnet 访问，运行 `openclaw gateway --bind tailnet --token ...`，因为非 loopback binds 需要 tokens。
- Nodes 根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway WS。Legacy TCP bridge 已弃用。
- Canvas host 是 `canvasHost.port`（默认 `18793`）上的 HTTP 文件服务器，为 node WebViews 提供 `/__openclaw__/canvas/`。参见 [Gateway configuration](/zh/gateway/configuration)（`canvasHost`）。
- 远程使用通常是 SSH tunnel 或 tailnet VPN。参见 [Remote access](/zh/gateway/remote) 和 [Discovery](/zh/gateway/discovery)。
