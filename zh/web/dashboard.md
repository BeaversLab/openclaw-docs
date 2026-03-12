---
summary: "Gateway 仪表板（控制 UI）访问与身份验证"
read_when:
  - Changing dashboard authentication or exposure modes
title: "仪表板"
---

# 仪表板（控制 UI）

Gateway 仪表板是默认在 `/` 提供的浏览器控制 UI
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

关键参考：

- 有关使用和 UI 功能，请参阅[控制 UI](/zh/en/web/control-ui)。
- 有关 Serve/Funnel 自动化，请参阅[Tailscale](/zh/en/gateway/tailscale)。
- 有关绑定模式和注意事项，请参阅 [Web 表面](/zh/en/web)。

身份验证通过 `connect.params.auth`（令牌或密码）在 WebSocket 握手时强制执行。请参阅 [Gateway 配置](/zh/en/gateway/configuration)中的 `gateway.auth`。

安全提示：控制 UI 是一个**管理界面**（聊天、配置、执行审批）。
请勿将其公开暴露。UI 会将仪表板 URL 令牌保留在当前浏览器选项卡会话和所选 Gateway URL 的 sessionStorage 中，并在加载后将其从 URL 中剥离。
建议优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速通道（推荐）

- 完成入门后，CLI 会自动打开仪表板并打印一个干净的（非令牌化）链接。
- 随时重新打开：`openclaw dashboard`（复制链接，如果可能则打开浏览器，如果是无头模式则显示 SSH 提示）。
- 如果 UI 提示进行身份验证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制 UI 设置中。

## 令牌基础（本地 vs 远程）

- **Localhost**：打开 `http://127.0.0.1:18789/`。
- **令牌来源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL 片段传递它以进行一次性引导，并且控制 UI 会将其保留在当前浏览器选项卡会话和所选 Gateway URL 的 sessionStorage 中，而不是 localStorage 中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，`openclaw dashboard` 会按设计打印/复制/打开一个非令牌化的 URL。这可以避免在外部管理的令牌暴露在 Shell 日志、剪贴板历史记录或浏览器启动参数中。
- 如果 `gateway.auth.token` 被配置为 SecretRef 且在当前 shell 中未解析，`openclaw dashboard` 仍会打印一个非标记化的 URL 以及可操作的认证设置指南。
- **非 localhost**：使用 Tailscale Serve（如果 `gateway.auth.allowTailscale: true`，则 Control UI/WebSocket 无需令牌，假定网关主机受信任；HTTP API 仍需令牌/密码）、使用令牌进行 tailnet 绑定，或使用 SSH 隧道。请参阅 [Web surfaces](/zh/en/web)。

## 如果您看到“unauthorized” / 1008

- 确保网关可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可能会使用缓存的设备令牌执行一次受信任的重试。如果重试后认证仍然失败，请手动解决令牌偏差问题。
- 有关令牌偏差修复步骤，请遵循 [Token drift recovery checklist](/zh/en/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供令牌：
  - 明文配置：`openclaw config get gateway.auth.token`
  - SecretRef 托管配置：解析外部秘密提供程序或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 未配置令牌：`openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将令牌粘贴到认证字段，然后连接。
