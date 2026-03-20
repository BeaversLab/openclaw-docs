---
summary: "OpenClaw 在通道、路由、媒體和使用者體驗方面的功能。"
read_when:
  - 您想要一份 OpenClaw 支援功能的完整清單
title: "功能"
---

## 亮點

<Columns>
  <Card title="通道" icon="message-square">
    使用單一閘道整合 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="外掛程式" icon="plug">
    透過擴充功能新增 Mattermost 等更多支援。
  </Card>
  <Card title="路由" icon="route">
    具有隔離會話的多代理路由。
  </Card>
  <Card title="媒體" icon="image">
    圖片、音訊和文件的輸入與輸出。
  </Card>
  <Card title="應用程式與使用者介面" icon="monitor">
    Web Control UI 和 macOS 配套應用程式。
  </Card>
  <Card title="行動節點" icon="smartphone">
    iOS 和 Android 節點，具備配對、語音/聊天以及豐富的裝置指令。
  </Card>
</Columns>

## 完整清單

- 透過 WhatsApp Web (Baileys) 進行 WhatsApp 整合
- Telegram 機器人支援 (grammY)
- Discord 機器人支援 (channels.discord.js)
- Mattermost 機器人支援 (外掛程式)
- 透過本機 imsg CLI 進行 iMessage 整合 (macOS)
- 用於 RPC 模式下 Pi 的代理程式橋接器，具備工具串流功能
- 針對長回應的串流和分塊
- 針對每個工作區或傳送者的隔離工作階段之多代理程式路由
- 透過 OAuth 進行 Anthropic 和 OpenAI 的訂閱驗證
- 會話：直接聊天合併為共享的 `main`；群組則是隔離的
- 基於提及啟動的群組聊天支援
- 針對圖片、音訊和文件的媒體支援
- 選用的語音備忘錄轉錄掛鉤
- WebChat 和 macOS 選單列應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置和語音功能
- Android 節點，具備配對、連線分頁、聊天工作階段、語音分頁、Canvas/相機，以及裝置、通知、連絡人/行事曆、動作、相片和 SMS 指令

<Note>舊版的 Claude、Codex、Gemini 和 Opencode 路徑已被移除。Pi 是唯一 的編碼代理路徑。</Note>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
