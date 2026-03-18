---
summary: "OpenClaw 在通道、路由、媒體和使用者體驗方面的功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

## 亮點

<Columns>
  <Card title="Channels" icon="message-square">
    使用單一閘道整合 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="Plugins" icon="plug">
    使用擴充功能新增 Mattermost 和更多功能。
  </Card>
  <Card title="Routing" icon="route">
    具有隔離工作階段的多代理程式路由。
  </Card>
  <Card title="Media" icon="image">
    圖片、音訊和文件的輸入與輸出。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web 控制介面和 macOS 伴隨應用程式。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    iOS 和 Android 節點，具備配對、語音/聊天和豐富的裝置指令。
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
- 工作階段：直接聊天合併為共享的 `main`；群組則被隔離
- 基於提及啟動的群組聊天支援
- 針對圖片、音訊和文件的媒體支援
- 選用的語音備忘錄轉錄掛鉤
- WebChat 和 macOS 選單列應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置和語音功能
- Android 節點，具備配對、連線分頁、聊天工作階段、語音分頁、Canvas/相機，以及裝置、通知、連絡人/行事曆、動作、相片和 SMS 指令

<Note>舊版 Claude、Codex、Gemini 和 Opencode 路徑已被移除。Pi 是唯一的編碼代理程式 路徑。</Note>

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
