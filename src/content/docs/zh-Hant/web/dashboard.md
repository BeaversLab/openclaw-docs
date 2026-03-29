---
summary: "Gateway 儀表板 (控制 UI) 的存取與驗證"
read_when:
  - Changing dashboard authentication or exposure modes
title: "儀表板"
---

# 儀表板 (控制 UI)

Gateway 儀表板是預設在 `/` 提供的瀏覽器控制 UI
(可使用 `gateway.controlUi.basePath` 覆寫)。

快速開啟 (本機 Gateway)：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

主要參考：

- [控制 UI](/en/web/control-ui) 了解使用方式與 UI 功能。
- [Tailscale](/en/gateway/tailscale) 用於 Serve/Funnel 自動化。
- [Web 介面](/en/web) 了解綁定模式與安全性注意事項。

驗證會透過 `connect.params.auth` (Token 或密碼) 在 WebSocket 握手時強制執行。請參閱 [Gateway 組態](/en/gateway/configuration) 中的 `gateway.auth`。

安全性提示：控制 UI 是一個 **管理介面** (聊天、組態、執行核准)。請勿公開暴露。UI 會將儀表板 URL Tokens 保留在 sessionStorage 中，供目前的瀏覽器分頁工作階段和選取的 Gateway URL 使用，並在載入後從 URL 中移除它們。建議優先使用 localhost、Tailscale Serve 或 SSH 通道。

## 快速路徑 (推薦)

- 完成入門導覽後，CLI 會自動開啟儀表板並列印一個乾淨 (未包含 Token) 的連結。
- 隨時重新開啟：`openclaw dashboard` (複製連結，若可能則開啟瀏覽器，若是無介面環境則顯示 SSH 提示)。
- 如果 UI 提示進行驗證，請將 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`) 中的 Token 貼上到控制 UI 設定中。

## Token 基礎 (本機與遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **Token 來源**：`gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)；`openclaw dashboard` 可以透過 URL 片段傳遞它以進行一次性啟動程序，並且控制 UI 會將其保留在 sessionStorage 中供目前的瀏覽器分頁工作階段和選取的 Gateway URL 使用，而不是 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理的，`openclaw dashboard` 會依照設計列印/複製/開啟未包含 Token 的 URL。這可避免在外部管理的 Tokens 暴露於 Shell 記錄、剪貼簿歷史或瀏覽器啟動引數中。
- 如果 `gateway.auth.token` 被配置為 SecretRef 且在您目前的 shell 中未解析，`openclaw dashboard` 仍會印出未標記化的 URL 以及可操作的認證設定指引。
- **非本機**：使用 Tailscale Serve (若是 `gateway.auth.allowTailscale: true`，則 Control UI/WebSocket 無需 token，假設為受信任的 gateway 主機；HTTP API 仍需要 token/密碼)、使用 token 進行 tailnet 綁定，或是 SSH 隧道。請參閱 [Web surfaces](/en/web)。

## 如果您看到 "unauthorized" / 1008

- 確保 gateway 可連線 (本機: `openclaw status`；遠端: SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`)。
- 對於 `AUTH_TOKEN_MISMATCH`，當 gateway 傳回重試提示時，客戶端可能會使用快取的裝置 token 進行一次受信任的重試。如果重試後認證仍然失敗，請手動解決 token 偏移問題。
- 如需 token 偏移修復步驟，請遵循 [Token drift recovery checklist](/en/cli/devices#token-drift-recovery-checklist)。
- 從 gateway 主機擷取或提供 token：
  - 純文字組態: `openclaw config get gateway.auth.token`
  - SecretRef 管理的組態：解析外部 secret 提供者或在此 shell 中匯出 `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未設定 token: `openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將 token 貼上到認證欄位，然後連線。
