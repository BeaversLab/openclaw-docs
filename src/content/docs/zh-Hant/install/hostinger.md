---
summary: "在 Hostinger 上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

在 [Hostinger](https://www.hostinger.com/openclaw) 上透過 **一鍵式** 託管部署或 **VPS** 安裝來執行永續的 OpenClaw Gateway。

## 先決條件

- Hostinger 帳戶 ([註冊](https://www.hostinger.com/openclaw))
- 大約 5-10 分鐘

## 選項 A：一鍵式 OpenClaw

最快開始使用的方式。Hostinger 負責處理基礎設施、Docker 和自動更新。

<Steps>
  <Step title="購買並啟動">
    1. 從 [Hostinger OpenClaw 頁面](https://www.hostinger.com/openclaw) 選擇託管 OpenClaw 方案並完成結帳。

    <Note>
    在結帳期間，您可以選擇 **即用型 AI** 點數，這些點數已預先購買並即時整合至 OpenClaw 內——無需要來自其他供應商的外部帳戶或 API 金鑰。您可以立即開始聊天。或者，您也可以在設定期間提供來自 Anthropic、OpenAI、Google Gemini 或 xAI 的金鑰。
    </Note>

  </Step>

  <Step title="選擇訊息頻道">
    選擇一個或多個頻道進行連線：

    - **WhatsApp** -- 掃描設定精靈中顯示的 QR code。
    - **Telegram** -- 貼上來自 [BotFather](https://t.me/BotFather) 的機器人權杖。

  </Step>

<Step title="完成安裝">按一下 **完成** 以部署執行個體。準備就緒後，您可以從 hPanel 中的 **OpenClaw 概覽** 存取 OpenClaw 儀表板。</Step>

</Steps>

## 選項 B：VPS 上的 OpenClaw

對您的伺服器有更多控制權。Hostinger 透過 Docker 在您的 VPS 上部署 OpenClaw，您可以透過 hPanel 中的 **Docker Manager** 進行管理。

<Steps>
  <Step title="購買 VPS">
    1. 從 [Hostinger OpenClaw 頁面](https://www.hostinger.com/openclaw) 選擇 VPS 上的 OpenClaw 方案並完成結帳。

    <Note>
    您可以在結帳期間選擇 **即用型 AI** 點數——這些點數已預先購買並即時整合至 OpenClaw 內，因此您無需要來自其他供應商的外部帳戶或 API 金鑰即可開始聊天。
    </Note>

  </Step>

  <Step title="設定 OpenClaw">
    一旦 VPS 佈建完成，請填寫設定欄位：

    - **Gateway token** -- 自動生成；請將其儲存以備後用。
    - **WhatsApp number** -- 您的號碼（含國碼）（選填）。
    - **Telegram bot token** -- 來自 [BotFather](https://t.me/BotFather)（選填）。
    - **API keys** -- 僅在結帳時未選擇「Ready-to-Use AI credits」時才需要。

  </Step>

<Step title="啟動 OpenClaw">點擊 **Deploy**。啟動後，從 hPanel 點擊 **Open** 開啟 OpenClaw 儀表板。</Step>

</Steps>

日誌、重啟和更新直接從 hPanel 中的 Docker Manager 介面進行管理。若要更新，請在 Docker Manager 中按一下 **Update**，這將會拉取最新的映像檔。

## 驗證您的設定

向您連接的頻道上的助手發送 "Hi"。OpenClaw 將會回覆並引導您完成初始偏好設定。

## 故障排除

**儀表板無法載入** -- 請等待幾分鐘，讓容器完成佈建。請檢查 hPanel 中的 Docker Manager 日誌。

**Docker 容器持續重啟** -- 開啟 Docker Manager 日誌並尋找設定錯誤（遺漏 token、無效的 API keys）。

**Telegram 機器人無回應** -- 請直接從 Telegram 將您的配對代碼訊息作為訊息發送至您的 OpenClaw 聊天中，以完成連線。

## 下一步

- [頻道](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 等等
- [Gateway 設定](/zh-Hant/gateway/configuration) -- 所有設定選項

## 相關

- [安裝總覽](/zh-Hant/install)
- [VPS 主機](/zh-Hant/vps)
- [DigitalOcean](/zh-Hant/install/digitalocean)
