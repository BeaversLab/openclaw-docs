---
summary: "針對 Gateway 儀表板整合 Tailscale Serve/Funnel"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (Gateway 儀表板)

OpenClaw 可以針對 Gateway 儀表板和 WebSocket 埠自動設定 Tailscale **Serve** (tailnet) 或 **Funnel** (公開)。這讓 Gateway 綁定在 loopback，同時由 Tailscale 提供 HTTPS、路由和 (針對 Serve) 身份標頭。

## 模式

- `serve`：僅限 Tailnet 的透過 `tailscale serve` 進行 Serve。Gateway 維持在 `127.0.0.1` 上。
- `funnel`：透過 `tailscale funnel` 提供公開 HTTPS。OpenClaw 需要一個共享密碼。
- `off`：預設值 (無 Tailscale 自動化)。

## 驗證

設定 `gateway.auth.mode` 以控制交握：

- `token` （設定 `OPENCLAW_GATEWAY_TOKEN` 時的預設值）
- `password` （透過 `OPENCLAW_GATEWAY_PASSWORD` 或設定共用金鑰）

當 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 為 `true` 時，
Control UI/WebSocket 驗證可以使用 Tailscale 身份標頭
(`tailscale-user-login`)，而無需提供令牌/密碼。OpenClaw 會透過本機 Tailscale
daemon (`tailscale whois`) 解析 `x-forwarded-for` 位址來驗證
身份，並在接受前將其與標頭進行比對。
OpenClaw 僅在請求來自 loopback 並帶有 Tailscale 的 `x-forwarded-for`、
`x-forwarded-proto` 和 `x-forwarded-host` 標頭時，
才將其視為 Serve 請求。
HTTP API 端點 (例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`)
仍需要令牌/密碼驗證。
此無令牌流程假設 Gateway 主機是受信任的。如果不受信任的本機程式碼
可能會在同一台主機上執行，請停用 `gateway.auth.allowTailscale` 並改為要求
令牌/密碼驗證。
若要要求明確的憑證，請設定 `gateway.auth.allowTailscale: false` 或
強制 `gateway.auth.mode: "password"`。

## 設定範例

### 僅限 Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

開啟：`https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

### 僅限 Tailnet (綁定至 Tailnet IP)

當您希望 Gateway 直接監聽 Tailnet IP 時使用此方式 (不使用 Serve/Funnel)。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

從另一個 Tailnet 裝置連線：

- 控制 UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：loopback (`http://127.0.0.1:18789`) 在此模式下將**無法**運作。

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

優先使用 `OPENCLAW_GATEWAY_PASSWORD`，而不要將密碼寫入磁碟。

## CLI 範例

```exec
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事項

- Tailscale Serve/Funnel 需要安裝並登入 `tailscale` CLI。
- `tailscale.mode: "funnel"` 會拒絕啟動，除非驗證模式為 `password` 以避免公開暴露。
- 設定 `gateway.tailscale.resetOnExit` 若您希望 OpenClaw 在關閉時復原 `tailscale serve`
  或 `tailscale funnel` 設定。
- `gateway.bind: "tailnet"` 是直接的 Tailnet 綁定（無 HTTPS，無 Serve/Funnel）。
- `gateway.bind: "auto"` 偏好 loopback；若您僅需 Tailnet，請使用 `tailnet`。
- Serve/Funnel 僅公開 **Gateway 控制介面 + WS**。節點透過相同的
  Gateway WS 端點連線，因此 Serve 可用於節點存取。

## 瀏覽器控制（遠端 Gateway + 本機瀏覽器）

若您在一台機器上執行 Gateway，但想在另一台機器上操作瀏覽器，
請在瀏覽器機器上執行 **node host**，並將兩者保持在同一個 tailnet 中。
Gateway 會將瀏覽器動作代理至節點；無需獨立的控制伺服器或 Serve URL。

避免使用 Funnel 進行瀏覽器控制；將節點配對視為操作員存取。

## Tailscale 先決條件 + 限制

- Serve 需要為您的 tailnet 啟用 HTTPS；如果缺少，CLI 會提示。
- Serve 會注入 Tailscale 身份標頭；Funnel 則不會。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、啟用 HTTPS 以及 funnel 節點屬性。
- Funnel 在 TLS 上僅支援連接埠 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要開原始碼版本的 Tailscale 應用程式。

## 深入了解

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 指令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 指令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)
