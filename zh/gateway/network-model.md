---
summary: "Gateway 网关、节点和画布主机之间的连接方式。"
read_when:
  - You want a concise view of the Gateway networking model
title: "网络模型"
---

大多数操作通过 Gateway 网关 (`openclaw gateway`) 进行，这是一个拥有通道连接和 WebSocket 控制平面的单一长期运行进程。

## 核心规则

- 建议每个主机运行一个 Gateway 网关。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请使用隔离的配置文件和端口运行多个网关。请参阅[多个网关](/zh/gateway/multiple-gateways)。
- 优先使用回环地址：Gateway 网关 WS 默认为 `ws://127.0.0.1:18789`。向导默认会生成 gateway token，即使是回环地址也是如此。要访问 tailnet，请运行 `openclaw gateway --bind tailnet --token ...`，因为非回环地址绑定需要 token。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway 网关 WS。传统的 TCP 网桥已弃用。
- Canvas Canvas主机由 Gateway 网关 HTTP 服务器在与 Gateway 网关 **相同的端口**（默认为 `18789`）上提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway(网关) 绑定到 loopback 之外时，这些路由由 Gateway(网关) 认证保护。节点客户端使用绑定到其活动 WS 会话的节点范围功能 URL。请参阅 [Gateway(网关) 配置](/zh/gateway/configuration) (`canvasHost`, `gateway`)。
- 远程使用通常是 SSH 隧道或 tailnet VPN。请参阅[远程访问](/zh/gateway/remote)和[设备发现](/zh/gateway/discovery)。

import zh from '/components/footer/zh.mdx';

<zh />
