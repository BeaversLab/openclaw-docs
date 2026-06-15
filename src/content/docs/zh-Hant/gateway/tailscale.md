---
summary: "為 Gateway 儀表板整合 Tailscale Serve/Funnel"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

OpenClaw 可以為 Gateway 儀表板和 WebSocket 連接埠自動設定 Tailscale **Serve** (tailnet) 或 **Funnel** (公開)。這使 Gateway 保持綁定至 loopback，同時 Tailscale 提供 HTTPS、路由以及 (針對 Serve) 身分標頭。

## 模式

- `serve`：僅限 Tailnet 的 Serve，透過 `tailscale serve`。Gateway 保持在 `127.0.0.1`。
- `funnel`：透過 `tailscale funnel` 提供公開 HTTPS。OpenClaw 需要共用密碼。
- `off`：預設值（無 Tailscale 自動化）。

狀態和稽核輸出會針對此 OpenClaw Serve/Funnel 模式使用 **Tailscale exposure**。`off` 表示 OpenClaw 未管理 Serve 或 Funnel；並不代表本機 Tailscale daemon 已停止或登出。

## 驗證

設定 `gateway.auth.mode` 以控制交握：

- `none`（僅私有入口）
- `token`（設定 `OPENCLAW_GATEWAY_TOKEN` 時的預設值）
- `password`（透過 `OPENCLAW_GATEWAY_PASSWORD` 或設定共用金鑰）
- `trusted-proxy`（具身份感知的反向 Proxy；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）

當 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 為 `true` 時，
Control UI/WebSocket 驗證可以使用 Tailscale 身份標頭
(`tailscale-user-login`) 而無需提供 token/password。OpenClaw 會透過
本地 Tailscale daemon (`tailscale whois`) 解析 `x-forwarded-for` 位址
來驗證身份，並在接受前將其與標頭進行比對。
只有當請求來自 loopback 並帶有 Tailscale 的
`x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`
標頭時，OpenClaw 才會將該請求視為 Serve。
對於包含瀏覽器裝置身份的 Control UI 操作員工作階段，此經過驗證的 Serve 路徑
也會略過裝置配對往返。它不會繞過瀏覽器裝置身份：無裝置的客戶端仍會被拒絕，
且節點角色或非 Control UI WebSocket 連線仍遵循正常的配對和驗證檢查。
HTTP API 端點 (例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`)
**不會**使用 Tailscale 身份標頭驗證。它們仍遵循 Gateway 的
正常 HTTP 驗證模式：預設為 shared-secret 驗證，或是刻意設定的
trusted-proxy / private-ingress `none` 設定。
此無 token 流程假設 Gateway 主機是受信任的。如果不受信任的本機程式碼
可能會在同一台主機上執行，請停用 `gateway.auth.allowTailscale` 並改為要求
token/password 驗證。
若要要求明確的 shared-secret 憑證，請設定 `gateway.auth.allowTailscale: false`
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

若要透過具名的 Tailscale Service 而非裝置主機名稱來公開 Control UI，
請將 `gateway.tailscale.serviceName` 設定為 Service 名稱：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve", serviceName: "svc:openclaw" },
  },
}
```

使用上述範例時，啟動時會將服務 URL 報告為
`https://openclaw.<tailnet-name>.ts.net/` 而非裝置主機名稱。
Tailscale Services 要求主機必須是您 tailnet 中已批准的標記節點。
在啟用此選項之前，請在 Tailscale 中設定標記並批准服務，否則 `tailscale serve --service=...` 將會在
閘道啟動期間失敗。

### 僅限 Tailnet (綁定至 Tailnet IP)

當您希望閘道直接監聽 Tailnet IP (不使用 Serve/Funnel) 時，請使用此選項。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

從另一台 Tailnet 裝置連線：

- 控制 UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

<Note>Loopback (`http://127.0.0.1:18789`) 在此模式下將**無法**運作。</Note>

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

比起將密碼寫入磁碟，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD`。

## CLI 範例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 注意事項

- Tailscale Serve/Funnel 需要安裝並登入 `tailscale` CLI。
- `tailscale.mode: "funnel"` 將拒絕啟動，除非 auth mode 為 `password`，以避免公開暴露。
- `gateway.tailscale.serviceName` 僅適用於 Serve 模式，並會傳遞給
  `tailscale serve --service=<name>`。其值必須使用 Tailscale 的
  `svc:<dns-label>` 服務名稱格式，例如 `svc:openclaw`。
  Tailscale 要求服務主機必須是已標記的節點，且在 Serve 能夠發佈服務之前，該服務可能需要在管理主控台中獲得批准。
- 如果您希望 OpenClaw 在關閉時還原 `tailscale serve`
  或 `tailscale funnel` 設定，請設定 `gateway.tailscale.resetOnExit`。
- 設定 `gateway.tailscale.preserveFunnel: true` 以在閘道重新啟動期間保持外部設定的
  `tailscale funnel` 路由有效。當啟用且
  閘道以 `mode: "serve"` 執行時，OpenClaw 會在重新套用 Serve 之前檢查 `tailscale funnel status`
  ，並在 Funnel 路由已涵蓋閘道連接埠時跳過它。OpenClaw 管理的僅限 Funnel 密碼原則保持不變。
- `gateway.bind: "tailnet"` 是直接 Tailnet 綁定 (無 HTTPS，無 Serve/Funnel)。
- `gateway.bind: "auto"` 偏好 Loopback；如果您想要僅限 Tailnet，請使用 `tailnet`。
- Serve/Funnel 僅公開 **Gateway 控制介面 + WS**。節點透過相同的 Gateway WS 端點連線，因此 Serve 可用於節點存取。

## 瀏覽器控制 (遠端 Gateway + 本機瀏覽器)

如果您在一台機器上執行 Gateway，但想在另一台機器上操控瀏覽器，請在瀏覽器所在的機器上執行 **節點主機**，並將兩者保持在同一個 tailnet 中。Gateway 會將瀏覽器操作代理至節點；不需要單獨的控制伺服器或 Serve URL。

避免使用 Funnel 進行瀏覽器控制；將節點配對視為操作員存取。

## Tailscale 先決條件 + 限制

- Serve 需要為您的 tailnet 啟用 HTTPS；如果缺少此功能，CLI 會提示您。
- Serve 會注入 Tailscale 身份標頭；Funnel 則不會。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、啟用 HTTPS 以及一個 funnel 節點屬性。
- Funnel 在 TLS 上僅支援連接埠 `443`、`8443` 和 `10000`。
- 在 macOS 上使用 Funnel 需要開源版本的 Tailscale 應用程式變體。

## 深入了解

- Tailscale Serve 概觀：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 指令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概觀：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 指令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相關

- [遠端存取](/zh-Hant/gateway/remote)
- [探索](/zh-Hant/gateway/discovery)
- [驗證](/zh-Hant/gateway/authentication)
