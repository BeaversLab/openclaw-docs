---
summary: "OpenClaw (macOS 應用程式) 的首次執行設定流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "Onboarding (macOS 應用程式)"
sidebarTitle: "Onboarding：macOS 應用程式"
---

# Onboarding (macOS 應用程式)

本文件說明 **目前** 的首次執行設定流程。目標是提供順暢的「第 0 天」體驗：選擇 Gateway 的執行位置、連線身分驗證、執行精靈，並讓代理程式自行啟動。
關於 Onboarding 路徑的一般概覽，請參閱 [Onboarding Overview](/zh-Hant/start/onboarding-overview)。

<Steps>
<Step title="批准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="Approve find local networks">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="歡迎與安全須知">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 預設情況下，OpenClaw 是一個個人代理：單一受信任的操作者邊界。
- 共用/多用戶設置需要鎖定（分割信任邊界，保持工具存取最小化，並遵循 [安全性](/zh-Hant/gateway/security)）。
- 本機引導現在將新設定預設為 `tools.profile: "coding"`，以便新的本機設置保留檔案系統/執行時工具，而不會強制使用不受限的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容源，請使用強大的現代模型層級，並保持嚴格的工具策略/沙箱機制。

</Step>
<Step title="本機與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 應在哪裡執行？

- **此 Mac（僅限本機）：** 引導程序可以設定認證並在本機寫入憑證。
- **遠端（透過 SSH/Tailnet）：** 引導程序**不會**設定本機認證；
  憑證必須存在於 Gateway 主機上。
- **稍後設定：** 跳過設定並讓應用程式保持未設定狀態。

<Tip>
**Gateway 認證提示：**

- 精靈現在即使對於迴路也會產生一個 **token**，因此本機 WS 用戶端必須進行認證。
- 如果您停用認證，任何本機程序都可以連線；僅在完全受信任的機器上使用此功能。
- 請使用 **token** 進行多機存取或非迴路綁定。

</Tip>
</Step>
<Step title="權限">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

引導程序請求以下所需的 TCC 權限：

- 自動化（AppleScript）
- 通知
- 輔助使用
- 螢幕錄製
- 麥克風
- 語音辨識
- 相機
- 位置

</Step>
<Step title="CLI">
  <Info>此步驟為選用項</Info>
  此應用程式可以透過 npm、pnpm 或 bun 安裝全域 `openclaw` CLI。
  它優先使用 npm，其次是 pnpm，若僅偵測到 bun 則使用 bun。對於 Gateway 執行時期，Node 仍是推薦的途徑。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  設定完成後，應用程式會開啟一個專用的入門聊天會話，讓代理程式能夠介紹
  自己並引導後續步驟。這能將首次執行的引導與您的一般交談區分開來。
  請參閱 [Bootstrapping](/zh-Hant/start/bootstrapping) 以了解
  在首次執行代理程式時 Gateway 主機上發生的情況。
</Step>
</Steps>
