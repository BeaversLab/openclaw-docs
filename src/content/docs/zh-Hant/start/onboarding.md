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
關於 Onboarding 路徑的一般概覽，請參閱 [Onboarding Overview](/en/start/onboarding-overview)。

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
<Step title="歡迎與安全性注意事項">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全性信任模型：

- 預設情況下，OpenClaw 是一個個人代理程式：單一受信任操作員邊界。
- 共用/多使用者設定需要鎖定（分割信任邊界、保持工具存取權限最小化，並遵循 [Security](/en/gateway/security)）。
- 本機 Onboarding 現在預設將新設定為 `tools.profile: "coding"`，以便全新的本機設定保留檔案系統/執行時間工具，而不會強制使用不受限的 `full` 設定檔。
- 如果啟用了 hooks/webhooks 或其他不受信任的內容來源，請使用強大的現代模型層級，並保持嚴格的工具原則/沙箱機制。

</Step>
<Step title="本機與遠端">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 要在哪裡執行？

- **這台 Mac (僅限本機)：**Onboarding 可以設定身分驗證並在本地寫入憑證。
- **遠端 (透過 SSH/Tailnet)：**Onboarding **不會**設定本機身分驗證；憑證必須存在於 Gateway 主機上。
- **稍後設定：**跳過設定並保持應用程式未設定的狀態。

<Tip>
**Gateway 身分驗證提示：**

- 精靈現在即使對於 loopback 也會產生 **token**，因此本機 WS 用戶端必須進行身分驗證。
- 如果您停用身分驗證，任何本機程序都可以連線；僅在完全受信任的機器上使用。
- 請使用 **token** 進行多機器存取或非 loopback 繫結。

</Tip>
</Step>
<Step title="Permissions">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

Onboarding 會請求以下所需的 TCC 權限：

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
  <Info>此步驟為選擇性</Info>
  應用程式可以透過 npm/pnpm 安裝全域 `openclaw` CLI，讓終端機工作流程和 launchd 任務能夠直接運作。
</Step>
<Step title="Onboarding Chat (dedicated session)">
  設定完成後，應用程式會開啟專屬的 Onboarding 聊天工作階段，讓 Agent 能夠自我介紹並引導後續步驟。這能將首次執行的引導與您的正常對話區分開來。請參閱 [Bootstrapping](/en/start/bootstrapping) 以了解第一次執行 Agent 時在 Gateway 主機上會發生什麼事。
</Step>
</Steps>
