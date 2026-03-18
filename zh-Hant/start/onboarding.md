---
summary: "OpenClaw (macOS 應用程式) 的首次執行設定流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "新手引導 (macOS 應用程式)"
sidebarTitle: "新手引導：macOS 應用程式"
---

# 新手引導 (macOS 應用程式)

本文件描述了**目前**的首次執行設定流程。目標是提供順暢的「第 0 天」體驗：選擇 Gateway 的執行位置，連接身分驗證，執行精靈，並讓 Agent 自行引導。
若要了解新手引導路徑的整體概覽，請參閱[新手引導概覽](/zh-Hant/start/onboarding-overview)。

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
<Step title="歡迎與安全注意事項">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 預設情況下，OpenClaw 是一個個人 Agent：單一受信任操作員邊界。
- 共用/多使用者設定需要鎖定 (分割信任邊界，保持工具存取權限最小化，並遵循 [安全性](/zh-Hant/gateway/security))。
- 本地新手引導現在將新設定預設為 `tools.profile: "coding"`，因此新的本地設定會保留檔案系統/執行時期工具，而不會強制使用無限制的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容來源，請使用強大的現代模型層級，並保持嚴格的工具原則/沙箱機制。

</Step>
<Step title="本地與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 應在哪裡執行？

- **這台 Mac (僅本地)：** 新手引導可以設定身分驗證並在本機寫入認證資訊。
- **遠端 (透過 SSH/Tailnet)：** 新手引導**不會**設定本地身分驗證；認證資訊必須存在於 Gateway 主機上。
- **稍後設定：** 跳過設定並讓應用程式保持未設定狀態。

<Tip>
**Gateway 身分驗證提示：**

- 精靈現在會為回傳連線產生**權杖**，因此本地 WS 用戶端必須進行身分驗證。
- 如果您停用身分驗證，任何本地程序都可以連線；請僅在完全受信任的機器上使用此設定。
- 請使用**權杖**進行多機器存取或非回傳連線綁定。

</Tip>
</Step>
<Step title="Permissions">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

Onboarding 會請求以下所需的 TCC 權限：

- 自動化 (AppleScript)
- 通知
- 輔助功能
- 螢幕錄製
- 麥克風
- 語音辨識
- 相機
- 位置

</Step>
<Step title="CLI">
  <Info>This step is optional</Info>
  應用程式可以透過 npm/pnpm 安裝全域 `openclaw` CLI，讓終端機工作流程和 launchd 任務能直接運作。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  設定完成後，應用程式會開啟專屬的 Onboarding 聊天工作階段，讓 Agent 進行自我介紹並引導後續步驟。這能讓首次執行時的引導與您的對話分開。請參閱 [Bootstrapping](/zh-Hant/start/bootstrapping) 以了解在首次執行 Agent 時 Gateway 主機上會發生什麼事。
</Step>
</Steps>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
