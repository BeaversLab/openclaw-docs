---
summary: "Gateway 儀表板 (控制 UI) 的存取與驗證"
read_when:
  - 變更儀表板驗證或公開模式
title: "儀表板"
---

# 儀表板 (控制 UI)

Gateway 儀表板是預設在 `/` 提供服務的瀏覽器控制 UI
（可使用 `gateway.controlUi.basePath` 覆寫）。

快速開啟 (本機 Gateway)：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/）]

主要參考：

- 請參閱 [控制 UI](/zh-Hant/web/control-ui) 以了解使用方式與 UI 功能。
- 請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以了解 Serve/Funnel 自動化。
- 請參閱 [Web 介面](/zh-Hant/web) 以了解綁定模式與安全性注意事項。

驗證是在 WebSocket 交握時透過 `connect.params.auth`
（權杖或密碼）強制執行的。請參閱 [Gateway 設定](/zh-Hant/gateway/configuration) 中的 `gateway.auth`。

安全性說明：控制 UI 是一個 **管理介面**（聊天、設定、執行核准）。
請勿將其公開。UI 會將儀表板 URL 權杖保留在 sessionStorage 中
供目前瀏覽器分頁階段與選定的 Gateway URL 使用，並在載入後從 URL 中移除。
建議優先使用 localhost、Tailscale Serve 或 SSH 通道。

## 快速路徑 (推薦)

- 完成入門導覽後，CLI 會自動開啟儀表板並列印乾淨的 (非權杖化) 連結。
- 隨時重新開啟：`openclaw dashboard`（複製連結，若可能則開啟瀏覽器，若為無介面模式則顯示 SSH 提示）。
- 如果 UI 提示進行驗證，請將 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的權杖貼上至控制 UI 設定中。

## 權杖基礎 (本機與遠端)

- **Localhost**：開啟 `http://127.0.0.1:18789/`。
- **權杖來源**：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）；`openclaw dashboard` 可透過 URL 片段傳遞權杖以進行一次性引導，而控制 UI 會將其保留在 sessionStorage 中供目前瀏覽器分頁階段與選定的 Gateway URL 使用，而非 localStorage。
- 如果 `gateway.auth.token` 是由 SecretRef 管理，`openclaw dashboard` 依設計會列印/複製/開啟不帶權杖的 URL。這可避免在外部管理的權杖暴露於 Shell 記錄、剪貼簿歷史或瀏覽器啟動引數中。
- 如果 `gateway.auth.token` 設定為 SecretRef 且在您目前的 Shell 中尚未解析，`openclaw dashboard` 仍會列印出不帶權杖的 URL 以及可執行的驗證設定指引。
- **非 localhost**：使用 Tailscale Serve（如果 `gateway.auth.allowTailscale: true` 則控制介面/WebSocket 無需令牌，假設閘道主機受信任；HTTP API 仍需要令牌/密碼）、使用令牌進行 tailnet 繫結，或 SSH 隧道。請參閱 [Web surfaces](/zh-Hant/web)。

## 如果您看到 "unauthorized" / 1008

- 確保可以存取閘道（本地：`openclaw status`；遠端：SSH 隧道 `ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`）。
- 對於 `AUTH_TOKEN_MISMATCH`，當閘道返回重試提示時，客戶端可以使用快取的裝置令牌進行一次受信任的重試。如果重試後驗證仍然失敗，請手動解決令牌漂移問題。
- 如需令牌漂移修復步驟，請依照 [Token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist)。
- 從 gateway 主機擷取或提供權杖：
  - 純文字配置：`openclaw config get gateway.auth.token`
  - SecretRef 管理的配置：解決外部秘密提供者問題或在此 shell 中匯出 `OPENCLAW_GATEWAY_TOKEN`，然後重新執行 `openclaw dashboard`
  - 未配置令牌：`openclaw doctor --generate-gateway-token`
- 在儀表板設定中，將權杖貼入認證欄位，然後連線。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
