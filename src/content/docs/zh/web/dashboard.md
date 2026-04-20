---
summary: "Gateway(网关) 网关 仪表板（控制 UI）的访问和身份验证"
read_when:
  - Changing dashboard authentication or exposure modes
title: "仪表板"
---

# 仪表板（控制 UI）

Gateway(网关) 仪表板是默认在 `/` 提供的浏览器控制 UI
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway(网关) 网关）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/))

关键参考：

- 有关使用和 UI 功能，请参阅[控制 UI](/zh/web/control-ui)。
- 有关 Serve/Funnel 自动化，请参阅[Tailscale](/zh/gateway/tailscale)。
- 有关绑定模式和安全说明，请参阅[Web 表面](/zh/web)。

身份验证通过配置的网关身份验证路径在 WebSocket 握手时强制执行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时的 Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的 trusted-proxy 身份标头

请参阅[Gateway(网关) 配置](/zh/gateway/configuration)中的 `gateway.auth`。

安全说明：控制 UI 是一个**管理表面**（聊天、配置、执行批准）。请勿将其公开暴露。UI 会将仪表板 URL 令牌保留在当前浏览器标签页会话和所选网关 URL 的 sessionStorage 中，并在加载后将其从 URL 中移除。建议优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- 新手引导完成后，CLI 会自动打开仪表板并打印一个干净的（无令牌的）链接。
- 随时重新打开：`openclaw dashboard`（复制链接，如果可能则打开浏览器，如果是无头模式则显示 SSH 提示）。
- 如果 UI 提示进行共享密钥身份验证，请将配置的令牌或密码粘贴到控制 UI 设置中。

## 身份验证基础（本地 vs 远程）

- **Localhost**：打开 `http://127.0.0.1:18789/`。
- **共享密钥令牌源**：`gateway.auth.token`（或
  `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL 片段传递它
  以进行一次性引导，并且控制 UI 会将其保留在 sessionStorage 中用于
  当前浏览器标签页会话和所选网关 URL，而不是 localStorage。
- 如果 `gateway.auth.token` 由 SecretRef 管理，则 `openclaw dashboard`
  按设计打印/复制/打开一个无令牌的 URL。这可以避免在外部
  管理的令牌暴露在 shell 日志、剪贴板历史记录或浏览器启动参数中。
- 如果 `gateway.auth.token` 被配置为 SecretRef 并且在您
  当前的 shell 中未解析，`openclaw dashboard` 仍然会打印一个无令牌的 URL 以及
  可操作的身份验证设置指南。
- **共享密钥密码**：使用配置的 `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_PASSWORD`）。仪表板不会在重新加载之间持久化密码。
- **身份验证模式**：当配置 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 可以通过身份标头满足控制 UI/WebSocket 身份验证，而非环回的具有身份感知能力的反向代理可以满足
  `gateway.auth.mode: "trusted-proxy"`。在这些模式下，仪表板不需要为 WebSocket 粘贴共享密钥。
- **非本地主机**：使用 Tailscale Serve、非环回共享密钥绑定、带有
  `gateway.auth.mode: "trusted-proxy"` 的非环回具有身份感知能力的反向代理，或 SSH 隧道。除非您有意运行 private-ingress
  `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 身份验证，否则 HTTP API 仍使用共享密钥身份验证。请参阅
  [Web surfaces](/zh/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到“unauthorized”（未授权）/ 1008

- 确保网关可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可能会使用缓存的设备令牌执行一次受信任的重试。该缓存令牌重试会重用令牌的缓存已批准范围；显式 `deviceToken` / 显式 `scopes` 调用者会保留其请求的范围集。如果该重试后身份验证仍然失败，请手动解决令牌偏差问题。
- 在该重试路径之外，连接身份验证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，接着是存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 控制 UI 路径上，针对同一
  `{scope, ip}` 的失败尝试会在失败身份验证限制器记录它们之前进行序列化，因此第二个并发的不良重试可能已经显示 `retry later`。
- 有关令牌偏差修复步骤，请遵循[令牌偏差恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供共享密钥：
  - 令牌：`openclaw config get gateway.auth.token`
  - 密码：解析配置的 `gateway.auth.password` 或
    `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef 托管令牌：解析外部 secret 提供商或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 未配置共享密钥：`openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将令牌或密码粘贴到身份验证字段中，然后连接。
- UI 语言选择器位于 **概览 -> Gateway(网关) 访问 -> 语言** 中。它是访问卡片的一部分，而不是“外观”部分。
