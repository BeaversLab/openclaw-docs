---
summary: "Gateway(网关) 网关、节点和画布主机之间的连接方式。"
read_when:
  - You want a concise view of the Gateway networking model
title: "网络模型"
---

# 网络模型

> 此内容已合并到 [Network](/en/network#core-model) 中。请参阅该页面以获取最新指南。

大多数操作流经 Gateway(网关) (`openclaw gateway`)，这是一个单一长期运行的进程，拥有渠道连接和 WebSocket 控制平面。

## 核心规则

- 建议每个主机运行一个 Gateway(网关)。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请运行多个网关，并使用隔离的配置文件和端口。请参阅[多个网关](/en/gateway/multiple-gateways)。
- 优先使用环回：Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`。向导默认会生成一个 gateway token，即使是环回也是如此。如需 tailnet 访问，请运行 `openclaw gateway --bind tailnet --token ...`，因为非环回绑定需要 token。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway(网关) WS。传统的 TCP 网桥已弃用。
- Canvas 主机由 Gateway(网关) HTTP 服务器在与 Gateway(网关) 相同的端口（默认 `18789`）上提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway(网关) 绑定到环回地址之外时，这些路由由 Gateway(网关) 认证保护。节点客户端使用与其活动的 WS 会话关联的节点范围的 capability URL。请参阅 [Gateway(网关) configuration](/en/gateway/configuration) (`canvasHost`, `gateway`)。
- 远程使用通常是 SSH 隧道或 tailnet VPN。请参阅 [Remote access](/en/gateway/remote) 和 [设备发现](/en/gateway/discovery)。
