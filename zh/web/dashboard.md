---
summary: "Gateway 仪表板（控制 UI）的访问和认证"
read_when:
  - "Changing dashboard authentication or exposure modes"
title: "仪表板"
---

# 仪表板（控制 UI）

Gateway 仪表板是默认在 `/` 提供的浏览器控制 UI
（可通过 `gateway.controlUi.basePath` 覆盖）。

快速打开（本地 Gateway）：

- http://127.0.0.1:18789/（或 http://localhost:18789/）

关键参考：

- [控制 UI](/zh/web/control-ui) 了解用法和 UI 功能。
- [Tailscale](/zh/gateway/tailscale) 了解 Serve/Funnel 自动化。
- [Web surface](/zh/web) 了解绑定模式和安全说明。

认证通过 `connect.params.auth` 在 WebSocket 握手时强制执行
（令牌或密码）。参见 [Gateway 配置](/zh/gateway/configuration) 中的 `gateway.auth`。

安全说明：控制 UI 是一个**管理 surface**（聊天、配置、执行批准）。
请勿公开暴露。UI 在首次加载后会将令牌存储在 `localStorage` 中。
建议使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- 完成引导后，CLI 现在会自动打开仪表板并附带您的令牌，同时打印相同的令牌化链接。
- 随时重新打开：`openclaw dashboard`（复制链接，如果可能则打开浏览器，如果是无头模式则显示 SSH 提示）。
- 令牌保持在本地（仅查询参数）；UI 在首次加载后将其剥离并保存在 localStorage 中。

## 令牌基础（本地 vs 远程）

- **Localhost**：打开 `http://127.0.0.1:18789/`。如果看到 "unauthorized"，运行 `openclaw dashboard` 并使用令牌化链接（`?token=...`）。
- **令牌来源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）；UI 在首次加载后存储它。
- **非 localhost**：使用 Tailscale Serve（如果 `gateway.auth.allowTailscale: true` 则无令牌）、带令牌的 tailnet 绑定或 SSH 隧道。参见 [Web surface](/zh/web)。

## 如果看到 "unauthorized" / 1008

- 运行 `openclaw dashboard` 获取新的令牌化链接。
- 确保 gateway 可访问（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/?token=...`）。
- 在仪表板设置中，粘贴您在 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中配置的相同令牌。
