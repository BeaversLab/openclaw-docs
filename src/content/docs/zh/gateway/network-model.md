---
summary: "Gateway(网关) 网关、节点和画布主机之间的连接方式。"
read_when:
  - You want a concise view of the Gateway networking model
title: "网络模型"
---

# 网络模型

> 此内容已合并到 [Network](/en/network#core-model)。请查看该页面以获取最新指南。

大多数操作流经 Gateway(网关) (`openclaw gateway`)，这是一个单一长期运行的进程，拥有渠道连接和 WebSocket 控制平面。

## 核心规则

- 建议每个主机运行一个 Gateway(网关)。它是唯一允许拥有 WhatsApp Web 会话的进程。对于救援机器人或严格隔离，请运行多个具有隔离配置文件和端口的 Gateway(网关)。参见 [Multiple gateways](/en/gateway/multiple-gateways)。
- 优先使用环回：Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`。向导默认创建共享密钥身份验证，通常还会生成令牌，即使是环回也是如此。对于非环回访问，请使用有效的 Gateway(网关) 身份验证路径：共享密钥令牌/密码身份验证，或正确配置的非环回 `trusted-proxy` 部署。Tailnet/移动设置通常通过 Tailscale Serve 或另一个 `wss://` 端点效果最佳，而不是直接使用原始 tailnet `ws://`。
- 节点根据需要通过 LAN、tailnet 或 SSH 连接到 Gateway(网关) WS。旧的 TCP 网桥已被移除。
- Canvas 主机由与 Gateway(网关) 位于 **同一端口**（默认为 `18789`）上的 Gateway(网关) HTTP 服务器提供服务：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    当配置了 `gateway.auth` 且 Gateway(网关) 绑定到环回之外时，这些路由受 Gateway(网关) 身份验证保护。节点客户端使用与其活动 WS 会话关联的节点范围功能 URL。参见 [Gateway(网关) configuration](/en/gateway/configuration) (`canvasHost`, `gateway`)。
- 远程使用通常是 SSH 隧道或 tailnet VPN。参见 [Remote access](/en/gateway/remote) 和 [设备发现](/en/gateway/discovery)。
