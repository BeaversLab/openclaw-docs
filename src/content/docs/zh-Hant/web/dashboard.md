---
summary: "Gateway 儀表板 (控制 UI) 存取與驗證"
read_when:
  - Changing dashboard authentication or exposure modes
title: "儀表板"
---

# 儀表板 (控制 UI)

Gateway 儀表板是預設在 `/` 提供的瀏覽器控制 UI
(可用 `gateway.controlUi.basePath` 覆寫)。

快速開啟 (本機 Gateway)：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

主要參考：

- [控制 UI](/zh-Hant/web/control-ui) 以了解用法與 UI 功能。
- [Tailscale](/zh-Hant/gateway/tailscale) 以進行 Serve/Funnel 自動化。
- [Web 介面](/zh-Hant/web) 以了解綁定模式與安全性說明。

驗證透過 `connect.params.auth` 於 WebSocket 交握時強制執行
(token 或密碼)。請參閱 [Gateway 配置](/zh-Hant/gateway/configuration) 中的 `gateway.auth`。

安全性提示：控制 UI 是一個 **管理介面** (聊天、配置、執行核准)。
請勿將其公開暴露。UI 會將儀表板 URL token 保留在 sessionStorage 中，
供目前的瀏覽器分頁階段與選定的 Gateway URL 使用，並在載入後將其從 URL 中移除。
建議優先使用 localhost、Tailscale Serve 或 SSH 通道。

## 快速路徑 (建議)

- 導入後，CLI 會自動開啟儀表板並列印一個乾淨 (非 token 化) 的連結。
- 隨時重新開啟：`openclaw dashboard` (複製連結，若可能則開啟瀏覽器，若是無介面環境則顯示 SSH 提示)。
- 如果 UI 提示進行驗證，請將 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`) 中的 token 貼上到控制 UI 設定中。

## Token 基礎 (本機 vs 遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **Token 來源**：`gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)；`openclaw dashboard` 可以透過 URL 片段傳遞它以進行一次性引導，而且控制 UI 會將其保留在 sessionStorage 中供目前的瀏覽器分頁階段與選定的 Gateway URL 使用，而非 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理，`openclaw dashboard` 會依設計列印/複製/開啟非 token 化的 URL。這可避免在 shell 紀錄、剪貼簿歷程或瀏覽器啟動引數中暴露外部管理的 token。
- 如果 `gateway.auth.token` 設定為 SecretRef 且在您目前的 shell 中無法解析，`openclaw dashboard` 仍會印出非標記化的 URL 以及可採取動作的認證設定指南。
- **非 localhost**：使用 Tailscale Serve（如果 `gateway.auth.allowTailscale: true`，則控制 UI/WebSocket 無需令牌，假設為受信任的 gateway 主機；HTTP API 仍需令牌/密碼）、使用令牌進行 tailnet 綁定，或 SSH 通道。請參閱 [Web surfaces](/zh-Hant/web)。

## 如果您看到 "unauthorized" / 1008

- 請確保可連線至 gateway（本機：`openclaw status`；遠端：SSH 通道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`）。
- 對於 `AUTH_TOKEN_MISMATCH`，當 gateway 傳回重試提示時，用戶端可能會使用快取的裝置令牌進行一次受信任的重試。如果在該次重試後認證仍失敗，請手動解決令牌漂移。
- 關於令牌漂移修復步驟，請依照 [Token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist) 操作。
- 從 gateway 主機取得或提供令牌：
  - 純文字設定：`openclaw config get gateway.auth.token`
  - SecretRef 管理的設定：解析外部秘密提供者，或在此 shell 中匯出 `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未設定令牌：`openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將令牌貼上到認證欄位，然後連線。
