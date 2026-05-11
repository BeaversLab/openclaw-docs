---
summary: "Gateway 儀表板 (控制 UI) 的存取與驗證"
read_when:
  - Changing dashboard authentication or exposure modes
title: "儀表板"
---

Gateway Dashboard 是預設在 `/` 提供的瀏覽器控制 UI
（可使用 `gateway.controlUi.basePath` 覆寫）。

快速開啟（本機 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/））
- 使用 `gateway.tls.enabled: true` 時，請使用 `https://127.0.0.1:18789/` 和
  `wss://127.0.0.1:18789` 作為 WebSocket 端點。

主要參考：

- [Control UI](/zh-Hant/web/control-ui) 了解使用方式和 UI 功能。
- [Tailscale](/zh-Hant/gateway/tailscale) 用於 Serve/Funnel 自動化。
- [Web surfaces](/zh-Hant/web) 了解綁定模式和安全性說明。

驗證會透過設定的 gateway auth path 在 WebSocket 握手時強制執行：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 當 `gateway.auth.allowTailscale: true` 時的 Tailscale Serve 身份標頭
- 當 `gateway.auth.mode: "trusted-proxy"` 時的 trusted-proxy 身份標頭

請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `gateway.auth`。

安全提示：Control UI 是一個 **admin surface**（聊天、配置、執行核准）。請勿公開對外。UI 將儀表板 URL token 保留在目前瀏覽器分頁階段和選定的 gateway URL 的 sessionStorage 中，並在載入後將其從 URL 中移除。建議優先使用 localhost、Tailscale Serve 或 SSH tunnel。

## 快速路徑 (建議)

- Onboarding 完成後，CLI 會自動開啟儀表板並列印乾淨的 (無 token) 連結。
- 隨時重新開啟：`openclaw dashboard`（複製連結，若可能則開啟瀏覽器，若是無頭模式則顯示 SSH 提示）。
- 如果 UI 提示進行 shared-secret 驗證，請將設定的 token 或密碼貼上到 Control UI 設定中。

## 驗證基礎 (本機 vs 遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **Gateway TLS**：當啟用 `gateway.tls.enabled: true` 時，dashboard/status 連結使用
  `https://`，而 Control UI WebSocket 連結使用 `wss://`。
- **Shared-secret token source**：`gateway.auth.token`（或
  `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可以透過 URL 片段傳遞以進行一次性啟動，且 Control UI 會將其保留在 sessionStorage 中，用於目前瀏覽器分頁階段和選取的 Gateway URL，而不是 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理的，依設計 `openclaw dashboard`
  會列印/複製/開啟不含 token 的 URL。這可避免在 shell 記錄、剪貼簿歷史或瀏覽器啟動引數中暴露外部管理的 token。
- 如果 `gateway.auth.token` 設定為 SecretRef 且在您目前的 shell 中尚未解析，`openclaw dashboard` 仍會列印不含 token 的 URL，並附上可執行的認證設定指引。
- **共享密碼密碼**：使用設定的 `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_PASSWORD`）。儀表板不會在重新載入後保留密碼。
- **承載身分模式**：當 `gateway.auth.allowTailscale: true` 時，Tailscale Serve 可以透過身分標頭滿足 Control UI/WebSocket
  驗證，而非本機的身分感知反向代理可以滿足
  `gateway.auth.mode: "trusted-proxy"`。在這些模式下，儀表板不需要
  為 WebSocket 貼上共享密碼。
- **非本機主機**：使用 Tailscale Serve、非本機共享密碼綁定、
  具有 `gateway.auth.mode: "trusted-proxy"` 的非本機身分感知反向代理，
  或 SSH 通道。除非您故意執行私人入口
  `gateway.auth.mode: "none"` 或受信任代理 HTTP 驗證，否則 HTTP API 仍使用
  共享密碼驗證。請參閱
  [Web surfaces](/zh-Hant/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到「未授權」 / 1008

- 確保可連線到閘道（本機：`openclaw status`；遠端：SSH 通道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`）。
- 對於 `AUTH_TOKEN_MISMATCH`，當閘道傳回重試提示時，用戶端可以使用快取的裝置權杖進行一次受信任的重試。該快取權杖重試會重複使用權杖的快取已核准範圍；明確的 `deviceToken` / 明確的 `scopes` 呼叫者會保留其要求的範圍集。如果該次重試後驗證仍然失敗，請手動解決權杖漂移問題。
- 在該重試路徑之外，連線驗證優先順序為先明確共享權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
- 在非同步 Tailscale Serve Control UI 路徑上，針對同一個
  `{scope, ip}` 的失敗嘗試會在失敗驗證限制器記錄它們之前進行序列化，因此
  第二個並發的錯誤重試可能已經顯示 `retry later`。
- 如需權杖漂移修復步驟，請遵循 [Token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist)。
- 從閘道主機擷取或提供共享密碼：
  - 權杖： `openclaw config get gateway.auth.token`
  - 密碼：解析設定的 `gateway.auth.password` 或
    `OPENCLAW_GATEWAY_PASSWORD`
  - 由 SecretRef 管理的 token：解析外部 secret provider 或在此 shell 中匯出
    `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未設定共享 secret：`openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將 token 或密碼貼上到認證欄位中，
  然後進行連線。
- UI 語言選擇器位於 **Overview -> Gateway Access -> Language**。
  它是存取卡的一部分，而非「外觀」區段。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [WebChat](/zh-Hant/web/webchat)
