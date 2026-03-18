---
summary: "Gateway 儀表板 (控制 UI) 存取與驗證"
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

- [控制 UI](/zh-Hant/web/control-ui) 以了解用法與 UI 功能。
- [Tailscale](/zh-Hant/gateway/tailscale) 以了解 Serve/Funnel 自動化。
- [Web surfaces](/zh-Hant/web) 以了解繫結模式與安全注意事項。

驗證會在 WebSocket 握手時透過 `connect.params.auth` 強制執行
(權杖或密碼)。請參閱 [Gateway 配置](/zh-Hant/gateway/configuration) 中的 `gateway.auth`。

安全注意事項：控制 UI 是一個 **管理介面** (聊天、配置、執行核准)。
請勿將其公開對外。UI 會將儀表板 URL 權杖保留在 sessionStorage 中
針對目前的瀏覽器分頁工作階段和選定的 Gateway URL，並在載入後從 URL 中移除它們。
建議優先使用 localhost、Tailscale Serve 或 SSH 隧道。

## 快速路徑 (推薦)

- 完成入門導覽後，CLI 會自動開啟儀表板並列印乾淨的 (非權杖化) 連結。
- 隨時重新開啟： `openclaw dashboard` (複製連結，若可能則開啟瀏覽器，若是無介面環境則顯示 SSH 提示)。
- 如果 UI 提示輸入驗證，請將 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`) 中的權杖貼上到控制 UI 設定中。

## 權杖基礎 (本機與遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **權杖來源**： `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)； `openclaw dashboard` 可以透過 URL 片段傳遞權杖以進行一次性引導，而控制 UI 會將其保留在 sessionStorage 中針對目前的瀏覽器分頁工作階段和選定的 Gateway URL，而不是 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理的， `openclaw dashboard` 會依照設計列印/複製/開啟非權杖化的 URL。這可避免在外部管理的權杖暴露於 Shell 記錄、剪貼簿歷程或瀏覽器啟動引數中。
- 如果 `gateway.auth.token` 被配置為 SecretRef 且在您目前的 shell 中未解析，`openclaw dashboard` 仍會列印出未標記化的 URL 以及可執行的認證設定指引。
- **非本機 (localhost)**：使用 Tailscale Serve（若 `gateway.auth.allowTailscale: true`，則控制 UI/WebSocket 不需權杖，假設信任的 gateway 主機；HTTP API 仍需權杖/密碼）、使用權杖進行 tailnet 綁定，或 SSH 通道。請參閱 [Web surfaces](/zh-Hant/web)。

## 如果您看到「unauthorized」/ 1008

- 請確保可連線至 gateway（本機：`openclaw status`；遠端：建立 SSH 通道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`）。
- 對於 `AUTH_TOKEN_MISMATCH`，當 gateway 傳回重試提示時，客戶端可能會使用快取的裝置權杖進行一次受信任的重試。如果重試後認證仍然失敗，請手動解決權杖漂移問題。
- 有關權杖漂移修復步驟，請遵循 [Token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist)。
- 從 gateway 主機擷取或提供權杖：
  - 明文配置：`openclaw config get gateway.auth.token`
  - SecretRef 管理的配置：解析外部秘密提供者，或在此 shell 中匯出 `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未設定權杖：`openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將權杖貼入認證欄位，然後連線。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
