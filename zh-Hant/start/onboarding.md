---
summary: "OpenClaw (macOS 應用程式) 的首次執行設定流程"
read_when:
  - 設計 macOS 入門嚮導
  - 實作驗證或身分設定
title: "Onboarding (macOS App)"
sidebarTitle: "Onboarding: macOS App"
---

# 新手引導 (macOS 應用程式)

本文件描述 **目前** 的首次執行設定流程。目標是提供順暢的「第 0 天」體驗：選擇 Gateway 的執行位置、連接驗證、執行嚮導，然後讓代理程式自行引導。
如需入門路徑的總覽，請參閱 [Onboarding Overview](/zh-Hant/start/onboarding-overview)。

<Steps>
<Step title="Approve macOS warning">
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

- 預設情況下，OpenClaw 是一個個人代理：屬於單一信任的操作員邊界。
- 共用/多使用者設定需要鎖定（分割信任邊界，將工具存取降至最低，並遵循[安全性](/zh-Hant/gateway/security)）。
- 本機引導現在會將新設定預設為 `tools.profile: "coding"`，讓全新的本機設定保留檔案系統/執行時間工具，而無需強制使用不受限的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容來源，請使用強大的現代模型層級，並嚴格執行工具政策/沙箱機制。

</Step>
<Step title="本機與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 應在何處執行？

- **本機：** 入門設定可以設定驗證並在本機寫入認證資訊。
- **遠端 (透過 SSH/Tailnet)：** 入門設定**不會**設定本機驗證；
  閘道主機上必須已存在認證資訊。
- **稍後設定：** 跳過設定並讓應用程式保持未設定狀態。

<Tip>
**Gateway 驗證提示：**

- 精靈現在會為迴路 產生 **權杖**，因此本機 WS 用戶端必須通過驗證。
- 如果您停用驗證，任何本機程序都可以連線；請僅在完全信任的機器上使用此設定。
- 請使用 **權杖** 進行多機存取或非迴路綁定。

</Tip>
</Step>
<Step title="Permissions">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

Onboarding 會請求以下所需的 TCC 權限：

- Automation (AppleScript)
- Notifications
- Accessibility
- Screen Recording
- Microphone
- Speech Recognition
- Camera
- Location

</Step>
<Step title="CLI">
  <Info>This step is optional</Info>
  App 可以透過 npm/pnpm 安裝全域 `openclaw` CLI，讓終端機工作流程與 launchd 任務能夠立即運作。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  設定完成後，應用程式會開啟專屬的 Onboarding 聊天工作階段，讓代理程式可以自我介紹並引導後續步驟。這能讓首次執行的引導與您的正常交談保持分離。請參閱 [Bootstrapping](/zh-Hant/start/bootstrapping) 以了解在首次執行代理程式時，閘道主機上會發生什麼事情。
</Step>

</Steps>

import en from "/components/footer/en.mdx";

<en />
