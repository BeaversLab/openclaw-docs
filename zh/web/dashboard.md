---
title: "Dashboard"
summary: "Gateway 仪表盘（Control UI）访问与认证"
read_when:
  - 修改仪表盘认证或暴露方式
---

# 仪表盘（Control UI）

Gateway 仪表盘是默认在 `/` 提供的浏览器 Control UI
（可用 `gateway.controlUi.basePath` 覆盖）。

本地快速打开：

- http://127.0.0.1:18789/（或 http://localhost:18789/）

关键参考：

- 使用方式与 UI 能力见 [Control UI](/zh/web/control-ui)。
- Serve/Funnel 自动化见 [Tailscale](/zh/gateway/tailscale)。
- 绑定方式与安全说明见 [Web surfaces](/zh/web)。

认证在 WebSocket 握手阶段通过 `connect.params.auth`（token 或密码）强制执行。配置见 [Gateway 配置](/zh/gateway/configuration) 的 `gateway.auth`。

安全说明：Control UI 是 **管理员面**（聊天、配置、exec 审批）。不要对公网暴露。UI 在首次加载后将 token 存入 `localStorage`。优先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路径（推荐）

- Onboarding 后，CLI 会自动用你的 token 打开仪表盘，并打印相同的带 token 链接。
- 随时重新打开：`openclaw dashboard`（复制链接，尽可能打开浏览器，若无 UI 则提示 SSH）。
- token 仅在本地（query 参数）；UI 首次加载后会剥离并存入 localStorage。

## Token 基础（本地 vs 远程）

- **Localhost**：打开 `http://127.0.0.1:18789/`。若出现 “unauthorized”，运行 `openclaw dashboard` 并使用带 token 的链接（`?token=...`）。
- **Token 来源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）；UI 首次加载后会保存。
- **非 localhost**：使用 Tailscale Serve（若 `gateway.auth.allowTailscale: true` 则可免 token）、绑定 tailnet + token，或 SSH 隧道。见 [Web surfaces](/zh/web)。

## 若看到 “unauthorized” / 1008

- 运行 `openclaw dashboard` 获取新的带 token 链接。
- 确认 gateway 可达（本地：`openclaw status`；远程：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/?token=...`）。
- 在仪表盘设置中粘贴与你配置的 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）一致的 token。
