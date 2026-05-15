---
summary: "整合 Tailscale Serve/Funnel 用於 Gateway 儀表板"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

OpenClaw 可以為 Gateway 儀表板和 WebSocket 連接埠自動設定 Tailscale **Serve** (tailnet) 或 **Funnel** (公開)。這使 Gateway 保持綁定至 loopback，同時 Tailscale 提供 HTTPS、路由以及 (針對 Serve) 身分標頭。

## 模式

- `serve`：僅限 Tailnet 的 Serve，透過 `tailscale serve`。Gateway 維持在 `127.0.0.1`。
- `funnel`：透過 `tailscale funnel` 提供公開 HTTPS。OpenClaw 需要共用密碼。
- `off`：預設 (無 Tailscale 自動化)。

狀態和稽核輸出會針對此 OpenClaw Serve/Funnel 模式使用 **Tailscale exposure**。`off` 表示 OpenClaw 並未管理 Serve 或 Funnel；這並不代表本機 Tailscale daemon 已停止或登出。

## 驗證

設定 `gateway.auth.mode` 以控制交握：

- `none` (僅限私有 ingress)
- `token` (設定 `OPENCLAW_GATEWAY_TOKEN` 時的預設值)
- `password` (透過 `OPENCLAW_GATEWAY_PASSWORD` 或設定進行共用秘密驗證)
- `trusted-proxy` (身分感知反向代理; 參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))

當 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 為 `true` 時，
控制 UI/WebSocket 驗證可以使用 Tailscale 身分標頭
(`tailscale-user-login`)，而無需提供權杖/密碼。OpenClaw 會透過本機 Tailscale
守護程式 (`tailscale whois`) 解析 `x-forwarded-for` 位址來驗證
身分，並在接收前將其與標頭比對。
僅當請求來自 loopback 並帶有 Tailscale 的 `x-forwarded-for`、
`x-forwarded-proto` 和 `x-forwarded-host` 標頭時，
OpenClaw 才會將該請求視為 Serve。
對於包含瀏覽器裝置身分的控制 UI 操作員工作階段，此驗證過的
Serve 路徑也會略過裝置配對往返。它不會繞過瀏覽器裝置身分：
無裝置的用戶端仍會被拒絕，而節點角色或非控制 UI 的
WebSocket 連線仍遵循正常的配對和驗證檢查。
HTTP API 端點 (例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`)
**不會**使用 Tailscale 身分標頭驗證。它們仍遵循閘道的
正常 HTTP 驗證模式：預設為共享金鑰驗證，或是刻意
設定的 trusted-proxy / private-ingress `none` 設定。
此無權杖流程假設閘道主機是受信任的。如果不受信任的本機程式碼
可能會在同一台主機上執行，請停用 `gateway.auth.allowTailscale` 並改為
要求權杖/密碼驗證。
若要要求明確的共享金鑰憑證，請設定 `gateway.auth.allowTailscale: false`
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

開啟：`https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

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

- Control UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

<Note>Loopback (`http://127.0.0.1:18789`) 在此模式下 **無法** 運作。</Note>

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

優先使用 `OPENCLAW_GATEWAY_PASSWORD` 而非將密碼寫入磁碟。

## CLI 範例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事項

- Tailscale Serve/Funnel 需要安裝並登入 `tailscale` CLI。
- `tailscale.mode: "funnel"` 會拒絕啟動，除非驗證模式為 `password` 以避免公開暴露。
- 如果您希望 OpenClaw 在關閉時還原 `tailscale serve` 或 `tailscale funnel` 設定，請設定 `gateway.tailscale.resetOnExit`。
- 設定 `gateway.tailscale.preserveFunnel: true` 以保持外部設定的
  `tailscale funnel` 路由在閘道重新啟動後仍有效。啟用後且
  閘道以 `mode: "serve"` 模式執行時，OpenClaw 會在重新套用 Serve
  前檢查 `tailscale funnel status`，若 Funnel 路由已覆蓋該
  閘道連接埠則會跳過。由 OpenClaw 管理的 Funnel 僅限密碼政策保持不變。
- `gateway.bind: "tailnet"` 是直接繫結至 Tailnet（無 HTTPS，無 Serve/Funnel）。
- `gateway.bind: "auto"` 偏好 loopback；如果您只想使用 Tailnet，請使用 `tailnet`。
- Serve/Funnel 僅公開 **Gateway 控制介面 + WS**。節點透過相同的
  Gateway WS 端點連線，因此 Serve 可用於節點存取。

## 瀏覽器控制 (遠端 Gateway + 本機瀏覽器)

如果您在一台機器上執行 Gateway，但想在另一台機器上驅動瀏覽器，
請在瀏覽器機器上執行 **node host** 並將兩者保持在同一 tailnet 上。
Gateway 會將瀏覽器操作代理至節點；不需要獨立的控制伺服器或 Serve URL。

避免使用 Funnel 進行瀏覽器控制；將節點配對視為操作員存取。

## Tailscale 先決條件 + 限制

- Serve 需要為您的 tailnet 啟用 HTTPS；如果缺少則 CLI 會提示。
- Serve 會注入 Tailscale 身份標頭；Funnel 則不會。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、啟用 HTTPS 以及 funnel 節點屬性。
- Funnel 在 TLS 上僅支援連接埠 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要開源版本的 Tailscale 應用程式變體。

## 了解更多

- Tailscale Serve 概述：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 指令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 指令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相關

- [遠端存取](/zh-Hant/gateway/remote)
- [探索](/zh-Hant/gateway/discovery)
- [驗證](/zh-Hant/gateway/authentication)
