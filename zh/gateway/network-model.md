---
summary: "Gateway、节点和 Canvas 主机如何连接。"
read_when:
  - 你需要了解 Gateway 网络模型的简明视图
title: "网络模型"
---

大多数操作通过 Gateway (`openclaw gateway`) 流转，这是一个单一长期运行的进程，拥有渠道连接和 WebSocket 控制平面。

## 核心规则

- 建议每台主机运行一个 Gateway。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请使用隔离的配置文件和端口运行多个 Gateway。请参阅[多个 Gateway](/zh/gateway/multiple-gateways)。
- 优先使用环回：Gateway WS 默认为 `ws://127.0.0.1:18789`。向导默认会生成 Gateway 令牌，即使是环回也是如此。对于 tailnet 访问，请运行 `openclaw gateway --bind tailnet --token ...`，因为非环回绑定需要令牌。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway 网关 WS。传统的 TCP 网桥已弃用。
- Canvas 主机由 Gateway HTTP 服务器在与 Gateway **相同端口**（默认 `18789`）上提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway 绑定到环回之外时，这些路由受 Gateway 认证保护。节点客户端使用绑定到其活动 WS 会话的节点范围能力 URL。请参阅[Gateway 配置](/zh/gateway/configuration)(`canvasHost`, `gateway`)。
- 远程使用通常是 SSH 隧道或 tailnet VPN。请参阅[远程访问](/zh/gateway/remote)和[设备发现](/zh/gateway/discovery)。

import en from "/components/footer/en.mdx";

<en />
