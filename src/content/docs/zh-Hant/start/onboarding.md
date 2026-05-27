---
summary: "OpenClaw (macOS 應用程式) 的首次執行設定流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "入門 (macOS 應用程式)"
sidebarTitle: "Onboarding：macOS 應用程式"
---

本文件描述了目前的首次執行設定流程。目標是提供順暢的「第 0 天」體驗：選擇 Gateway 的執行位置、連接認證、執行精靈，並讓代理程式自行啟動。
若要了解入門路徑的概覽，請參閱 [入門概覽](/zh-Hant/start/onboarding-overview)。

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
<Step title="歡迎與安全性提示">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全性信任模型：

- 預設情況下，OpenClaw 是一個個人代理程式：只有一個受信任的操作員邊界。
- 共用/多使用者設定需要鎖定（分割信任邊界，將工具存取權限降至最低，並遵循 [安全性](/zh-Hant/gateway/security)）。
- 本地入門現在會將新設定預設為 `tools.profile: "coding"`，以便全新的本地設定保留檔案系統/執行時期工具，而不強制使用無限制的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容來源，請使用強大的現代模型層級，並維持嚴格的工具原則/沙箱機制。

</Step>
<Step title="本地與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 應在何處執行？

- **此 Mac（僅限本地）：** 入門可以設定認證並在本地寫入憑證。
- **遠端（透過 SSH/Tailnet）：** 入門**不會**設定本地認證；
  憑證必須存在於 gateway 主機上。遠端 gateway 權杖欄位會儲存 macOS 應用程式用於連線至該 Gateway 的權杖；現有的非明文 `gateway.remote.token` 值會保留，直到您將其
  取代為止。
- **稍後設定：** 略過設定並讓應用程式保持未設定的狀態。

<Tip>
**Gateway 認證提示：**

- 精靈現在即使對於回環也會產生一個 **權杖**，因此本地 WS 用戶端必須進行驗證。
- 如果您停用認證，任何本地程序都可以連線；請僅在完全受信任的機器上使用。
- 請使用 **權杖** 進行多機存取或非回環的綁定。

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
  應用程式可以透過 npm、pnpm 或 bun 安裝全域 `openclaw` CLI。
  它優先選擇 npm，然後是 pnpm，如果只偵測到 bun 則使用 bun。對於 Gateway 執行時期，Node 仍是推薦路徑。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  設定完成後，應用程式會開啟一個專屬的 onboarding 聊天工作階段，讓 Agent 進行自我介紹並引導後續步驟。這能讓首次執行的引導與您的正常交談分開。關於第一次執行 Agent 時 Gateway 主機上發生的事，請參閱 [Bootstrapping](/zh-Hant/start/bootstrapping)。
</Step>
</Steps>

## 相關

- [Onboarding overview](/zh-Hant/start/onboarding-overview)
- [Getting started](/zh-Hant/start/getting-started)
