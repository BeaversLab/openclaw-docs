---
summary: "Gateway、节点和 Canvas 主机如何连接。"
read_when:
  - "You want a concise view of the Gateway networking model"
title: "网络模型"
---

大多数操作通过 Gateway（`openclaw gateway`）进行，这是一个拥有频道连接和 WebSocket 控制平面的单一长时间运行的进程。

## 核心规则

- 建议每台主机运行一个 Gateway。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请使用隔离的配置文件和端口运行多个 Gateway。参见 [Multiple gateways](/zh/gateway/multiple-gateways)。
- 优先使用回环地址：Gateway WS 默认为 `ws://127.0.0.1:18789`。向导默认生成 gateway token，即使是回环地址也是如此。对于 tailnet 访问，请运行 `openclaw gateway --bind tailnet --token ...`，因为非回环绑定需要 token。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway WS。传统的 TCP 网桥已弃用。
- Canvas 主机是运行在 `canvasHost.port`（默认 `18793`）上的 HTTP 文件服务器，为节点 WebView 提供 `/__openclaw__/canvas/`。参见 [Gateway configuration](/zh/gateway/configuration)（`canvasHost`）。
- 远程使用通常是 SSH 隧道或 tailnet VPN。参见 [Remote access](/zh/gateway/remote) 和 [Discovery](/zh/gateway/discovery)。
