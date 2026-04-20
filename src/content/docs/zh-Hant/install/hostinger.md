---
summary: "在 Hostinger 上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

透過 **1-Click** 管理部署或 **VPS** 安裝，在 [Hostinger](https://www.hostinger.com/openclaw) 上執行持久化的 OpenClaw Gateway。

## 先決條件

- Hostinger 帳戶 ([註冊](https://www.hostinger.com/openclaw))
- 大約 5-10 分鐘

## 選項 A：1-Click OpenClaw

最快的入門方式。Hostinger 處理基礎架構、Docker 和自動更新。

<Steps>
  <Step title="購買並啟動">
    1. 從 [Hostinger OpenClaw 頁面](https://www.hostinger.com/openclaw)，選擇 Managed OpenClaw 方案並完成結帳。

    <Note>
    在結帳期間，您可以選擇 **Ready-to-Use AI** 點數，這些點數已預先購買並在 OpenClaw 內立即整合——無需其他供應商的外部帳戶或 API 金鑰。您可以立即開始聊天。或者，在設定期間提供您來自 Anthropic、OpenAI、Google Gemini 或 xAI 的金鑰。
    </Note>

  </Step>

  <Step title="選擇訊息頻道">
    選擇一個或多個要連接的頻道：

    - **WhatsApp** -- 掃描設定精靈中顯示的 QR code。
    - **Telegram** -- 貼上來自 [BotFather](https://t.me/BotFather) 的 bot token。

  </Step>

<Step title="完成安裝">按一下 **Finish** 以部署執行個體。準備就緒後，從 hPanel 中的 **OpenClaw Overview** 存取 OpenClaw 儀表板。</Step>

</Steps>

## 選項 B：VPS 上的 OpenClaw

對您的伺服器擁有更多控制權。Hostinger 透過 Docker 在您的 VPS 上部署 OpenClaw，您可以透過 hPanel 中的 **Docker Manager** 進行管理。

<Steps>
  <Step title="購買 VPS">
    1. 從 [Hostinger OpenClaw 頁面](https://www.hostinger.com/openclaw)，選擇 OpenClaw on VPS 方案並完成結帳。

    <Note>
    您可以在結帳期間選擇 **Ready-to-Use AI** 點數——這些點數已預先購買並在 OpenClaw 內立即整合，因此您無需任何外部帳戶或其他供應商的 API 金鑰即可開始聊天。
    </Note>

  </Step>

  <Step title="Configure OpenClaw">
    VPS 佈建完成後，請填寫組態欄位：

    - **Gateway token** -- 自動生成；請將其儲存以備後用。
    - **WhatsApp number** -- 您的號碼，含國家代碼（選填）。
    - **Telegram bot token** -- 來自 [BotFather](https://t.me/BotFather)（選填）。
    - **API keys** -- 僅在結帳時未選擇即用型 AI 點數時才需要。

  </Step>

<Step title="Start OpenClaw">按一下 **Deploy**。一旦開始運作，請在 hPanel 中按一下 **Open** 以開啟 OpenClaw 儀表板。</Step>

</Steps>

日誌、重啟和更新是直接透過 hPanel 中的 Docker Manager 介面進行管理。若要更新，請在 Docker Manager 中按一下 **Update**，這將會拉取最新的映像檔。

## 驗證您的設定

向您連接的頻道上的助理傳送「Hi」。OpenClaw 將會回覆並引導您完成初始偏好設定。

## 疑難排解

**儀表板無法載入** -- 請等待幾分鐘，讓容器完成佈建。請檢查 hPanel 中的 Docker Manager 日誌。

**Docker 容器持續重啟** -- 請開啟 Docker Manager 日誌，並尋找組態錯誤（遺漏 token、無效的 API 金鑰）。

**Telegram 機器人無回應** -- 請直接將您的配對代碼訊息從 Telegram 作為訊息傳送到您的 OpenClaw 聊天中，以完成連線。

## 後續步驟

- [Channels](/en/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [Gateway configuration](/en/gateway/configuration) -- 所有組態選項
