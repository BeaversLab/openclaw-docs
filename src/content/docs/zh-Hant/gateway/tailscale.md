---
summary: "整合 Tailscale Serve/Funnel 用於 Gateway 儀表板"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (Gateway 儀表板)

OpenClaw 可以針對 Gateway 儀表板和 WebSocket 連接埠，自動設定 Tailscale **Serve** (tailnet) 或 **Funnel** (公開)。這讓 Gateway 保持在 loopback 上，同時由 Tailscale 提供 HTTPS、路由以及 (針對 Serve 的) 身分標頭。

## 模式

- `serve`：透過 `tailscale serve` 僅限 Tailnet 的 Serve。Gateway 維持在 `127.0.0.1` 上。
- `funnel`：透過 `tailscale funnel` 提供公開 HTTPS。OpenClaw 需要一個共用密碼。
- `off`：預設值 (無 Tailscale 自動化)。

## 驗證

設定 `gateway.auth.mode` 以控制交握：

- `none` (僅私人入口)
- `token` (設定 `OPENCLAW_GATEWAY_TOKEN` 時的預設值)
- `password` (透過 `OPENCLAW_GATEWAY_PASSWORD` 或設定共用祕密)
- `trusted-proxy` (具備身分感知的反向代理；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))

當 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 為 `true` 時，
Control UI/WebSocket 驗證可以使用 Tailscale 身分標頭
(`tailscale-user-login`)，而不需提供權杖/密碼。OpenClaw 會透過
本機 Tailscale 守護程式 (`tailscale whois`) 解析 `x-forwarded-for` 位址，
並在接受前將其與標頭進行比對，藉此驗證身分。
只有當請求來自 loopback 且附帶 Tailscale 的 `x-forwarded-for`、
`x-forwarded-proto` 和 `x-forwarded-host` 標頭時，
OpenClaw 才會將請求視為 Serve。
HTTP API 端點 (例如 `/v1/*`、`/tools/invoke` 和
`/api/channels/*`) **不** 會使用 Tailscale 身分標頭驗證。
它們仍遵循 gateway 的正常 HTTP 驗證模式：預設為共用祕密驗證，
或是刻意設定的 trusted-proxy / private-ingress `none` 設定。
這種無權杖流程假設 gateway 主機是受信任的。如果不受信任的本機程式碼
可能會在同一台主機上執行，請停用 `gateway.auth.allowTailscale` 並改為要求
權杖/密碼驗證。
若要求明確的共用祕密憑證，請設定 `gateway.auth.allowTailscale: false`
並使用 `gateway.auth.mode: "token"` 或 `"password"`。

## 設定範例

### 僅 Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

開啟： `https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

### 僅 Tailnet (綁定至 Tailnet IP)

當您希望 Gateway 直接監聽 Tailnet IP (不使用 Serve/Funnel) 時，請使用此選項。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

從另一台 Tailnet 裝置連線：

- Control UI： `http://<tailscale-ip>:18789/`
- WebSocket： `ws://<tailscale-ip>:18789`

注意： loopback (`http://127.0.0.1:18789`) 在此模式下將 **無法** 運作。

### 公開網際網路 (Funnel + 共用密碼)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`，而非將密碼寫入磁碟。

## CLI 範例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事項

- Tailscale Serve/Funnel 需要安裝並登入 `tailscale` CLI。
- `tailscale.mode: "funnel"` 會拒絕啟動，除非驗證模式為 `password`，以避免公開暴露。
- 如果您希望 OpenClaw 在關機時還原 `tailscale serve` 或
  `tailscale funnel` 設定，請設定 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接繫結至 Tailnet（無 HTTPS，無 Serve/Funnel）。
- `gateway.bind: "auto"` 偏好回環位址；如果您僅限 Tailnet，請使用 `tailnet`。
- Serve/Funnel 僅公開 **Gateway 控制介面 + WS**。節點透過相同的 Gateway WS 端點連線，因此 Serve 可用於節點存取。

## 瀏覽器控制（遠端 Gateway + 本機瀏覽器）

如果您在一台機器上執行 Gateway，但想在另一台機器上驅動瀏覽器，請在瀏覽器機器上執行 **node host**，並將兩者保持在同一個 tailnet 中。Gateway 會將瀏覽器操作代理到節點；不需要獨立的控制伺服器或 Serve URL。

避免使用 Funnel 進行瀏覽器控制；將節點配對視為操作員存取。

## Tailscale 先決條件與限制

- Serve 需要為您的 tailnet 啟用 HTTPS；如果缺少則 CLI 會提示。
- Serve 會注入 Tailscale 身分標頭；Funnel 則不會。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、已啟用 HTTPS 以及 funnel node 屬性。
- Funnel 在 TLS 上僅支援連接埠 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要開源版本的 Tailscale 應用程式變體。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 指令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 指令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)
