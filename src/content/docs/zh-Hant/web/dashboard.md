---
summary: "Gateway 儀表板 (控制 UI) 的存取與驗證"
read_when:
  - Changing dashboard authentication or exposure modes
title: "儀表板"
---

# 儀表板 (控制 UI)

Gateway 儀表板是預設在 `/` 提供的瀏覽器控制 UI
（可使用 `gateway.controlUi.basePath` 覆寫）。

快速開啟 (本機 Gateway)：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) （或 [http://localhost:18789/](http://localhost:18789/))

主要參考：

- [Control UI](/en/web/control-ui) 了解使用方式和 UI 功能。
- [Tailscale](/en/gateway/tailscale) 了解 Serve/Funnel 自動化。
- [Web surfaces](/en/web) 了解綁定模式和安全性注意事項。

驗證在 WebSocket 握手時透過 `connect.params.auth`
（token 或密碼）強制執行。請參閱 [Gateway configuration](/en/gateway/configuration) 中的 `gateway.auth`。

安全性提示：控制 UI 是一個 **管理介面** (聊天、組態、執行核准)。請勿公開暴露。UI 會將儀表板 URL Tokens 保留在 sessionStorage 中，供目前的瀏覽器分頁工作階段和選取的 Gateway URL 使用，並在載入後從 URL 中移除它們。建議優先使用 localhost、Tailscale Serve 或 SSH 通道。

## 快速路徑 (推薦)

- 完成入門導覽後，CLI 會自動開啟儀表板並列印一個乾淨 (未包含 Token) 的連結。
- 隨時重新開啟：`openclaw dashboard` （複製連結，若可能則開啟瀏覽器，若為無頭模式則顯示 SSH 提示）。
- 如果 UI 提示進行驗證，請將來自 `gateway.auth.token` （或 `OPENCLAW_GATEWAY_TOKEN`）的 token 貼上到 Control UI 設定中。

## Token 基礎 (本機與遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **Token 來源**：`gateway.auth.token` （或 `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以透過 URL 片段傳遞它以進行一次性引導，而 Control UI 會將其保留在 sessionStorage 中，用於目前的瀏覽器分頁階段和選取的 gateway URL，而非 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理，設計上 `openclaw dashboard` 會列印/複製/開啟未包含 token 的 URL。這可避免在外部管理的 token 暴露於 shell 記錄、剪貼簿歷史或瀏覽器啟動引數中。
- 如果 `gateway.auth.token` 被設定為 SecretRef 且在您目前的 shell 中未解析，`openclaw dashboard` 仍會列印未包含 token 的 URL 以及可操作的驗證設定指引。
- **非 localhost**：使用 Tailscale Serve （若 `gateway.auth.allowTailscale: true` 則 Control UI/WebSocket 無需 token，假設 gateway 主機受信任；HTTP API 仍需 token/密碼）、使用 token 進行 tailnet 綁定，或 SSH 通道。請參閱 [Web surfaces](/en/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到「unauthorized」/ 1008

- 確保可連線至 gateway (本機: `openclaw status`; 遠端: SSH tunnel `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`)。
- 針對 `AUTH_TOKEN_MISMATCH`，當 gateway 傳回重試提示時，用戶端可使用快取的裝置 token 進行一次信任的重試。若重試後驗證仍失敗，請手動解決 token 漂移問題。
- 有關 token 漂移修復步驟，請遵循 [Token drift recovery checklist](/en/cli/devices#token-drift-recovery-checklist)。
- 從 gateway 主機擷取或提供 token：
  - 純文字組態: `openclaw config get gateway.auth.token`
  - 由 SecretRef 管理的組態：解析外部秘密供應商或在此 shell 中匯出 `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未設定 token: `openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將 token 貼上至驗證欄位，然後連線。
