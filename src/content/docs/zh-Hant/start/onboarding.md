---
summary: "OpenClaw (macOS 應用程式) 的首次執行設定流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "入門 (macOS 應用程式)"
sidebarTitle: "Onboarding：macOS 應用程式"
---

本文描述了**目前**的首次執行設定流程。目標是提供流暢的「第 0 天」體驗：選擇 Gateway 的執行位置、連接驗證、執行精靈，然後讓代理程式自行引導。
如需關於入門路徑的一般概覽，請參閱 [Onboarding Overview](/zh-Hant/start/onboarding-overview)。

<Steps>
<Step title="核准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="Approve find local networks">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="歡迎與安全性注意事項">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全性信任模型：

- 預設情況下，OpenClaw 是個人代理程式：單一信任的操作員邊界。
- 共用/多使用者設定需要鎖定（分隔信任邊界、保持工具存取權限最小化，並遵循[安全性](/zh-Hant/gateway/security)）。
- 本機入門現在會將新設定預設為 `tools.profile: "coding"`，讓全新的本機設定保留檔案系統/執行階段工具，而不強制使用不受限的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容來源，請使用強大的現代模型層級，並保持嚴格的工具原則/沙箱機制。

</Step>
<Step title="本機與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 在何處執行？

- **此 Mac (僅限本機)：** 入門程序可以在本機設定驗證並寫入憑證。
- **遠端 (透過 SSH/Tailnet)：** 入門程序**不會**設定本機驗證；憑證必須存在於 gateway 主機上。
- **稍後設定：** 略過設定並讓應用程式保持未設定狀態。

<Tip>
**Gateway 驗證提示：**

- 精靈現在即使對於回環也會產生一個 **token**，因此本機 WS 用戶端必須進行驗證。
- 如果您停用驗證，任何本機程序都可以連線；請僅在完全受信任的機器上使用。
- 請使用 **token** 進行多機存取或非回環綁定。

</Tip>
</Step>
<Step title="權限">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

Onboarding 會請求所需的 TCC 權限，範圍包括：

- 自動化 (AppleScript)
- 通知
- 輔助使用
- 螢幕錄製
- 麥克風
- 語音辨識
- 相機
- 位置

</Step>
<Step title="CLI">
  <Info>此步驟為選用</Info>
  應用程式可透過 npm、pnpm 或 bun 安裝全域 `openclaw` CLI。
  它會優先使用 npm，其次是 pnpm，若僅偵測到 bun 則使用 bun。對於 Gateway 執行時，Node 仍是推薦的路徑。
</Step>
<Step title="入門聊天 (專屬工作階段)">
  設定完成後，應用程式會開啟專屬的入門聊天工作階段，讓代理程式能夠自我介紹並引導後續步驟。這能讓首次執行的指引與您的一般對話保持分開。如需關於第一次執行代理程式時 gateway 主機上發生什麼的資訊，請參閱 [Bootstrapping](/zh-Hant/start/bootstrapping)。
</Step>
</Steps>

## 相關

- [Onboarding 概覽](/zh-Hant/start/onboarding-overview)
- [開始使用](/zh-Hant/start/getting-started)
