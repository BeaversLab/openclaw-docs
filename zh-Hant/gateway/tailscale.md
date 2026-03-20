---
summary: "為 Gateway 儀表板整合 Tailscale Serve/Funnel"
read_when:
  - 在 localhost 以外公開 Gateway 控制介面
  - 自動化 tailnet 或公開儀表板存取
title: "Tailscale"
---

# Tailscale (Gateway 儀表板)

OpenClaw 可以針對 Gateway 儀表板和 WebSocket 連接埠自動設定 Tailscale **Serve** (tailnet) 或 **Funnel** (公開)。這讓 Gateway 保持繫結至 loopback，同時由 Tailscale 提供 HTTPS、路由以及 (針對 Serve) 身分標頭。

## 模式

- `serve`：僅限 Tailnet 的 Serve，透過 `tailscale serve`。Gateway 保持在 `127.0.0.1` 上。
- `funnel`：透過 `tailscale funnel` 的公開 HTTPS。OpenClaw 需要一個共享密碼。
- `off`：預設值 (無 Tailscale 自動化)。

## 驗證

設定 `gateway.auth.mode` 以控制交握：

- `token` (當設定 `OPENCLAW_GATEWAY_TOKEN` 時的預設值)
- `password` (透過 `OPENCLAW_GATEWAY_PASSWORD` 或設定檔的共享金鑰)

當 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 為 `true` 時，控制 UI/WebSocket 驗證可以使用 Tailscale 身分標頭 (`tailscale-user-login`) 而無需提供權杖/密碼。OpenClaw 會透過本機 Tailscale daemon (`tailscale whois`) 解析 `x-forwarded-for` 位址並在接受前將其與標頭比對，藉此驗證身分。OpenClaw 僅在請求來自 loopback 且帶有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 標頭時，才將其視為 Serve。HTTP API 端點 (例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`) 仍需要權杖/密碼驗證。這個無權杖流程假設 Gateway 主機是受信任的。如果不受信任的本機程式碼可能會在同一台主機上執行，請停用 `gateway.auth.allowTailscale` 並改為要求權杖/密碼驗證。若要要求明確的憑證，請設定 `gateway.auth.allowTailscale: false` 或強制使用 `gateway.auth.mode: "password"`。

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

開啟： `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath`）

### 僅限 Tailnet（綁定至 Tailnet IP）

當您希望 Gateway 直接監聽 Tailnet IP（不使用 Serve/Funnel）時，請使用此選項。

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

從另一個 Tailnet 裝置連線：

- 控制 UI： `http://<tailscale-ip>:18789/`
- WebSocket： `ws://<tailscale-ip>:18789`

注意：在此模式下，loopback （ `http://127.0.0.1:18789` ）將**無法**運作。

### 公開網際網路 （Funnel + 共用密碼）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

比起將密碼寫入磁碟，建議優先使用 `OPENCLAW_GATEWAY_PASSWORD` 。

## CLI 範例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 備註

- Tailscale Serve/Funnel 需要安裝並登入 `tailscale` CLI。
- 為避免公開暴露，除非驗證模式為 `password` ，否則 `tailscale.mode: "funnel"` 將拒絕啟動。
- 如果您希望 OpenClaw 在關閉時還原 `tailscale serve`
  或 `tailscale funnel` 設定，請設定 `gateway.tailscale.resetOnExit` 。
-  `gateway.bind: "tailnet"` 是直接的 Tailnet 綁定（無 HTTPS，無 Serve/Funnel）。
-  `gateway.bind: "auto"` 偏好 loopback；如果您僅限 Tailnet，請使用 `tailnet` 。
- Serve/Funnel 僅公開 **Gateway 控制 UI + WS**。節點透過相同的 Gateway WS 端點連線，因此 Serve 適用於節點存取。

## 瀏覽器控制（遠端 Gateway + 本機瀏覽器）

如果您在一台機器上執行 Gateway，但想要在另一台機器上驅動瀏覽器，
請在瀏覽器機器上執行 **node host**，並將兩者保持在同一個 tailnet。
Gateway 會將瀏覽器操作代理至節點；不需要獨立的控制伺服器或 Serve URL。

避免使用 Funnel 進行瀏覽器控制；將節點配對視為操作員存取。

## Tailscale 先決條件 + 限制

- Serve 需要為您的 tailnet 啟用 HTTPS；如果缺少，CLI 會提示。
- Serve 會注入 Tailscale 身份標頭；Funnel 則不會。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、啟用 HTTPS 以及 funnel 節點屬性。
- 透過 TLS，Funnel 僅支援連接埠 `443` 、 `8443` 和 `10000` 。
- 在 macOS 上使用 Funnel 需要開放原始碼的 Tailscale 應用程式變體。

## 深入了解

- Tailscale Serve 概覽： [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概述：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

import en from "/components/footer/en.mdx";

<en />
