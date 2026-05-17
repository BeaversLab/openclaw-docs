---
summary: "Gateway(网关) 网关 仪表板（控制 UI）的访问和身份验证"
read_when:
  - Changing dashboard authentication or exposure modes
title: "仪表板"
---

Gateway(网关) 仪表板是默认在 `/` 提供的浏览器控制 UI
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway(网关)）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))
- 使用 `gateway.tls.enabled: true` 时，请使用 `https://127.0.0.1:18789/` 和
  `wss://127.0.0.1:18789` 作为 WebSocket 端点。

关键参考：

- [Control UI](/zh/web/control-ui) 以了解用法和 UI 功能。
- [Tailscale](Tailscale/en/gateway/tailscale) 以了解 Serve/Funnel 自动化。
- [Web surfaces](/zh/web) 以了解绑定模式和安全注意事项。

身份验证通过配置的网关身份验证路径在 WebSocket 握手时强制执行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时的 Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的受信任代理身份标头

请参阅 Gateway(网关) 配置中的 `gateway.auth` (/en/gateway/configuration)。

安全说明：控制 UI 是一个**管理表面**（聊天、配置、执行批准）。请勿将其公开暴露。UI 会将仪表板 URL 令牌保留在当前浏览器标签页会话和所选网关 URL 的 sessionStorage 中，并在加载后将其从 URL 中移除。建议优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- 新手引导完成后，CLI 会自动打开仪表板并打印一个干净的（无令牌的）链接。
- 随时重新打开：`openclaw dashboard`（复制链接，如果可能则打开浏览器，如果是无头模式则显示 SSH 提示）。
- 如果剪贴板和浏览器传递失败，`openclaw dashboard` 仍然会打印
  清理后的 URL，并提示您使用来自 `OPENCLAW_GATEWAY_TOKEN` 或
  `gateway.auth.token` 的令牌作为 URL 片段键 `token`；它不会在日志中打印令牌
  值。
- 如果 UI 提示进行共享密钥身份验证，请将配置的令牌或
  密码粘贴到 Control UI 设置中。

## Auth basics (local vs remote)

- **Localhost**：打开 `http://127.0.0.1:18789/`。
- **Gateway(网关) TLS**：当 `gateway.tls.enabled: true` 时，仪表盘/状态链接使用
  `https://`，Control UI WebSocket 链接使用 `wss://`。
- **Shared-secret token source**：`gateway.auth.token`（或
  `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL 片段传递它
  以进行一次性引导，Control UI 会将其保存在当前浏览器标签页会话和选定的网关 URL 的 sessionStorage 中，而不是 localStorage 中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，设计上 `openclaw dashboard`
  会打印/复制/打开不带令牌的 URL。这可以避免在外部
  管理的令牌暴露在 Shell 日志、剪贴板历史记录或浏览器启动参数中。
- 如果 `gateway.auth.token` 被配置为 SecretRef 且在您当前的
  Shell 中未解析，`openclaw dashboard` 仍然会打印不带令牌的 URL 以及
  可操作的身份验证设置指南。
- **Shared-secret password**：使用配置的 `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_PASSWORD`）。仪表盘不会在重新加载后保留密码。
- **承载身份的模式**：当处于 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 可以通过身份标头满足控制 UI/WebSocket 认证，而非回环的感知身份反向代理可以满足 `gateway.auth.mode: "trusted-proxy"`。在这些模式下，仪表板不需要为 WebSocket 粘贴共享密钥。
- **非 localhost**：使用 Tailscale Serve、非环回 shared-secret 绑定、
  带有 `gateway.auth.mode: "trusted-proxy"` 的非环回身份感知反向代理，
  或 SSH 隧道。HTTP API 仍使用 shared-secret 认证，除非您
  故意运行 private-ingress `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 认证。
  请参阅 [Web surfaces](/zh/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到“unauthorized” / 1008

- 确保网关可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可能会使用缓存的设备令牌执行一次可信重试。该缓存令牌重试会重用令牌的缓存批准范围；显式 `deviceToken` / 显式 `scopes` 调用者会保留其请求的范围集。如果该重试后认证仍然失败，请手动解决令牌偏差。
- 对于 `AUTH_SCOPE_MISMATCH`，设备令牌已被识别但不携带仪表板请求的作用域；请重新配对或批准请求的作用域合约，而不是轮换共享网关令牌。
- 在该重试路径之外，连接认证优先级依次为：显式共享令牌/密码、显式 `deviceToken`、存储的设备令牌，然后是引导令牌。
- 在异步 Tailscale Serve 控制界面路径中，针对同一 `{scope, ip}` 的失败尝试会在失败认证限制器记录它们之前进行序列化，因此第二次并发的不良重试已经可以显示 `retry later`。
- 有关令牌漂移修复步骤，请参阅[令牌漂移恢复清单](/zh/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供共享密钥：
  - Token: `openclaw config get gateway.auth.token`
  - Password: resolve the configured `gateway.auth.password` or
    `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef-managed token: resolve the external secret 提供商 or export
    `OPENCLAW_GATEWAY_TOKEN` in this shell, then rerun `openclaw dashboard`
  - No shared secret configured: `openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将令牌或密码粘贴到身份验证字段中，然后连接。
- UI 语言选择器位于 **概览 -> Gateway(网关) 访问 -> 语言**。它是访问卡片的一部分，而不是外观部分。

## 相关

- [控制 UI](/zh/web/control-ui)
- [WebChat](/zh/web/webchat)
