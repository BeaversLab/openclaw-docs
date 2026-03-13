---
summary: “网关、节点和 Canvas 主机如何连接。”
read_when:
  - You want a concise view of the Gateway networking model
title: “网络模型”
---

大多数操作通过网关 (`openclaw gateway`) 进行，这是一个拥有通道连接和 WebSocket 控制平面的单一长期运行进程。

## 核心规则

- 建议每个主机运行一个网关。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请运行多个具有独立配置文件和端口的网关。请参阅[多网关](/zh/en/gateway/multiple-gateways)。
- 优先使用环回：网关 WS 默认为 `ws://127.0.0.1:18789`。向导默认会生成网关令牌，即使是环回也是如此。如需 tailnet 访问，请运行 `openclaw gateway --bind tailnet --token ...`，因为非环回绑定需要令牌。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到网关 WS。传统的 TCP 网桥已弃用。
- Canvas 主机由网关 HTTP 服务器在与网关**相同的端口**（默认 `18789`）上提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且网关绑定超出环回范围时，这些路由受网关身份验证保护。节点客户端使用与其活动 WS 会话关联的节点范围能力 URL。请参阅[网关配置](/zh/en/gateway/configuration) (`canvasHost`, `gateway`)。
- 远程使用通常通过 SSH 隧道或 tailnet VPN。请参阅[远程访问](/zh/en/gateway/remote)和[发现](/zh/en/gateway/discovery)。

import zh from '/components/footer/zh.mdx';

<zh />
