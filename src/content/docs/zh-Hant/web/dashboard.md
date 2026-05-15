---
summary: "Gateway 儀表板 (控制 UI) 的存取與驗證"
read_when:
  - Changing dashboard authentication or exposure modes
title: "儀表板"
---

Gateway Dashboard 是預設在 `/` 提供的瀏覽器控制 UI
（可使用 `gateway.controlUi.basePath` 覆寫）。

快速開啟（本機 Gateway）：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))
- 使用 `gateway.tls.enabled: true` 時，請使用 `https://127.0.0.1:18789/` 和
  `wss://127.0.0.1:18789` 作為 WebSocket 端點。

主要參考：

- 請參閱 [Control UI](/zh-Hant/web/control-ui) 以了解使用方式和 UI 功能。
- 請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以了解 Serve/Funnel 自動化。
- 請參閱 [Web surfaces](/zh-Hant/web) 以了解綁定模式與安全性注意事項。

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
- 如果剪貼板和瀏覽器傳遞失敗，`openclaw dashboard` 仍會印出
  乾淨的 URL，並告訴您使用 `OPENCLAW_GATEWAY_TOKEN` 或
  `gateway.auth.token` 中的權杖作為 URL 片段金鑰 `token`；它不會在日誌中印出
  權杖值。
- 如果 UI 提示進行共享金鑰驗證，請將設定的權杖或
  密碼貼上到 Control UI 設定中。

## 驗證基礎 (本地 vs 遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **Gateway TLS**：當 `gateway.tls.enabled: true` 時，dashboard/status 連結使用
  `https://`，而 Control UI WebSocket 連結則使用 `wss://`。
- **Shared-secret token source**：`gateway.auth.token` (或
  `OPENCLAW_GATEWAY_TOKEN`)；`openclaw dashboard` 可以透過 URL 片段傳遞它
  以進行一次性引導，並且 Control UI 會將其保留在 sessionStorage 中，用於
  目前的瀏覽器分頁階段和選定的 gateway URL，而不是 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理的，`openclaw dashboard`
  依設計會列印/複製/開啟不含權杖的 URL。這可避免在 shell 日誌、剪貼板歷史記錄或瀏覽器啟動
  引數中暴露外部管理的權杖。
- 如果 `gateway.auth.token` 被設定為 SecretRef 且在您
  目前的 shell 中尚未解析，`openclaw dashboard` 仍會印出不含權杖的 URL 以及
  可執行的驗證設定指引。
- **Shared-secret password**：使用設定的 `gateway.auth.password` (或
  `OPENCLAW_GATEWAY_PASSWORD`)。Dashboard 不會在重新
  載入之間保存密碼。
- **身分承載模式**：當為 `gateway.auth.allowTailscale: true` 時，Tailscale Serve 可以透過身分標頭滿足控制 UI/WebSocket 驗證，而具備身分感知的非 loopback 反向代理可以滿足 `gateway.auth.mode: "trusted-proxy"`。在這些模式下，儀表板不需要為 WebSocket 貼上共用密鑰。
- **非本地主機**：使用 Tailscale Serve、非 loopback 共用密鑰綁定、具有 `gateway.auth.mode: "trusted-proxy"` 的非 loopback 身分感知反向代理，或 SSH 隧道。HTTP API 仍使用共用密鑰驗證，除非您刻意執行 private-ingress `gateway.auth.mode: "none"` 或 trusted-proxy HTTP 驗證。請參閱 [Web surfaces](/zh-Hant/web)。

<a id="if-you-see-unauthorized-1008"></a>

## 如果您看到「未授權」/ 1008

- 確保可連線至閘道（本機：`openclaw status`；遠端：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`）。
- 對於 `AUTH_TOKEN_MISMATCH`，當閘道傳回重試提示時，用戶端可以使用快取的裝置令牌進行一次受信任的重試。該快取令牌重試會重複使用令牌的快取已核准範圍；明確的 `deviceToken` / 明確的 `scopes` 呼叫者會保留其要求的範圍集。如果在該次重試後驗證仍然失敗，請手動解決令牌漂移問題。
- 在該重試路徑之外，連線驗證優先順序依次為：明確的共用令牌/密碼、明確的 `deviceToken`、儲存的裝置令牌，然後是啟動令牌。
- 在非同步 Tailscale Serve 控制 UI 路徑上，失敗的驗證限制器會將相同 `{scope, ip}` 的失敗嘗試序列化，因此第二個並發的錯誤重試可能已經顯示 `retry later`。
- 如需令牌漂移修復步驟，請遵循 [令牌漂移修復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。
- 從閘道主機擷取或提供共用密鑰：
  - 令牌：`openclaw config get gateway.auth.token`
  - 密碼：解析已設定的 `gateway.auth.password` 或
    `OPENCLAW_GATEWAY_PASSWORD`
  - SecretRef 管理的令牌：解析外部秘密提供者或在此 shell 中匯出
    `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未配置共享金鑰：`openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將 token 或密碼貼上到驗證欄位中，然後連線。
- UI 語言選擇器位於 **Overview -> Gateway Access -> Language**。它是存取卡片的一部分，而不是「外觀」區塊的一部分。

## 相關

- [Control UI](/zh-Hant/web/control-ui)
- [WebChat](/zh-Hant/web/webchat)
