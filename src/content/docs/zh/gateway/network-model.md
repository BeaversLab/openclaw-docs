---
summary: "Gateway(网关) 网关、节点和画布主机之间的连接方式。"
read_when:
  - You want a concise view of the Gateway networking model
title: "网络模型"
---

> 此内容已合并到 [Network](/zh/network#core-model) 中。请参阅该页面以获取最新指南。

大多数操作通过 Gateway(网关) (`openclaw gateway`) 进行，这是一个拥有渠道连接和 WebSocket 控制平面的单一长期运行进程。

## 核心规则

- 建议每台主机运行一个 Gateway(网关)。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请运行多个具有隔离配置文件和端口的网关。参见 [Multiple gateways](/zh/gateway/multiple-gateways)。
- 环回优先：Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`。向导默认创建共享密钥认证，通常即使对于环回也会生成令牌。对于非环回访问，请使用有效的网关认证路径：共享密钥令牌/密码认证，或正确配置的非环回 `trusted-proxy` 部署。Tailnet/移动设置通常通过 Tailscale Serve 或另一个 `wss://` 端点效果最佳，而不是原始的 tailnet `ws://`。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway(网关) WS。传统的 TCP 网桥已被移除。
- Canvas 主机由与 Gateway(网关) (默认 `18789`) **相同端口** 上的 Gateway(网关) HTTP 服务器提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway(网关) 绑定超出环回范围时，这些路由受 Gateway(网关) 认证保护。节点客户端使用绑定到其活动 WS 会话的节点作用域功能 URL。参见 [Gateway(网关) configuration](/zh/gateway/configuration) (`canvasHost`, `gateway`)。
- 远程使用通常是 SSH 隧道或 tailnet VPN。参见 [Remote access](/zh/gateway/remote) 和 [设备发现](/zh/gateway/discovery)。

## 相关

- [Remote access](/zh/gateway/remote)
- [Trusted proxy auth](/zh/gateway/trusted-proxy-auth)
- [Gateway(网关) protocol](/zh/gateway/protocol)
