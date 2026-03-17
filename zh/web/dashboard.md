---
summary: "Gateway 网关 仪表板（控制 UI）的访问和身份验证"
read_when:
  - Changing dashboard authentication or exposure modes
title: "仪表板"
---

# 仪表板（控制 UI）

Gateway 网关 仪表板是默认在 `/` 提供的基于浏览器的控制 UI
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway 网关）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

关键参考：

- [Control UI](/zh/web/control-ui) 了解用法和 UI 功能。
- 用于 Serve/Funnel 自动化的 Tailscale(/en/gateway/tailscale)。
- [Web surfaces](/zh/web) 了解绑定模式和安全注意事项。

身份验证在 WebSocket 握手期间通过 `connect.params.auth`（令牌或密码）强制执行。请参阅 [Gateway(网关) 配置](/zh/gateway/configuration) 中的 `gateway.auth`。

安全提示：控制 UI 是一个**管理界面**（聊天、配置、执行审批）。
请勿将其公开暴露。UI 会将仪表板 URL 令牌保留在当前浏览器选项卡会话和所选 Gateway URL 的 sessionStorage 中，并在加载后将其从 URL 中剥离。
建议优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速通道（推荐）

- 完成入门后，CLI 会自动打开仪表板并打印一个干净的（非令牌化）链接。
- 随时重新打开：`openclaw dashboard` （复制链接，如果可能则打开浏览器，如果是无头模式则显示 SSH 提示）。
- 如果 UI 提示进行身份验证，请将 `gateway.auth.token` （或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制 UI 设置中。

## 令牌基础（本地 vs 远程）

- **本地主机**：打开 `http://127.0.0.1:18789/`。
- **令牌来源**：`gateway.auth.token` （或 `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以通过 URL 片段传递它以进行一次性引导，控制 UI 会将其保存在当前浏览器标签页会话和所选网关 URL 的 sessionStorage 中，而不是 localStorage 中。
- 如果 `gateway.auth.token` 由 SecretRef 管理，则 `openclaw dashboard` 按设计会打印/复制/打开一个非令牌化的 URL。这可以避免在外部管理的令牌暴露于 Shell 日志、剪贴板历史记录或浏览器启动参数中。
- 如果 `gateway.auth.token` 被配置为 SecretRef 且在当前的 Shell 中未解析，`openclaw dashboard` 仍然会打印一个非令牌化的 URL 以及可执行的身份验证设置指南。
- **非 localhost**：使用 Tailscale Serve（如果 `gateway.auth.allowTailscale: true`，则 Control UI/WebSocket 无需令牌，假设是受信任的 gateway 主机；HTTP API 仍需要令牌/密码）、带有令牌的 tailnet 绑定或 SSH 隧道。请参阅 [Web surfaces](/zh/web)。

## 如果您看到“unauthorized” / 1008

- 确保网关可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`）。
- 对于 `AUTH_TOKEN_MISMATCH`，当网关返回重试提示时，客户端可以使用缓存的设备令牌执行一次可信重试。如果该次重试后认证仍然失败，请手动解决令牌漂移问题。
- 有关令牌漂移修复步骤，请遵循 [Token drift recovery checklist](/zh/cli/devices#token-drift-recovery-checklist)。
- 从网关主机检索或提供令牌：
  - 纯文本配置：`openclaw config get gateway.auth.token`
  - SecretRef 托管配置：解析外部 secret 提供商或在此 shell 中导出 `OPENCLAW_GATEWAY_TOKEN`，然后重新运行 `openclaw dashboard`
  - 未配置令牌：`openclaw doctor --generate-gateway-token`
- 在仪表板设置中，将令牌粘贴到 auth 字段中，然后连接。

import zh from "/components/footer/zh.mdx";

<zh />
