---
summary: "OpenClaw 跨通道、路由、媒體和使用者體驗的各項功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

# 功能

## 亮點

<Columns>
  <Card title="Channels" icon="message-square">
    透過單一 Gateway 整合 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="Plugins" icon="plug">
    使用擴充功能新增 Mattermost 及更多支援。
  </Card>
  <Card title="Routing" icon="route">
    具有隔離工作階段的多代理程式路由。
  </Card>
  <Card title="Media" icon="image">
    圖片、音訊和文件的傳入與傳出。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web Control UI 和 macOS 伴隨應用程式。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    iOS 和 Android 節點，具備配對、語音/聊天以及豐富的裝置指令功能。
  </Card>
</Columns>

## 完整清單

**頻道：**

- WhatsApp、Telegram、Discord、iMessage (內建)
- Mattermost、Matrix、Microsoft Teams、Nostr 等 (外掛程式)
- 群組聊天支援，並透過提及啟用
- 透過允許清單和配對實現的私訊 (DM) 安全性

**Agent：**

- 內建 Agent 執行時，具備工具串流功能
- 多 Agent 路由，針對每個工作區或傳送者提供隔離的工作階段
- 工作階段：直接聊天會合併為共享的 `main`；群組則隔離處理
- 針對長回應的串流和分塊

**驗證和提供者：**

- 35+ 模型供應商（Anthropic、OpenAI、Google 等）
- 透過 OAuth 進行訂閱驗證（例如 OpenAI Codex）
- 支援自訂與自託管的供應商（vLLM、SGLang、Ollama，以及任何 OpenAI 相容或 Anthropic 相容的端點）

**媒體：**

- 圖片、音訊、影片與文件的輸入與輸出
- 語音備忘錄轉錄
- 透過多個供應商進行的文字轉語音

**應用程式與介面：**

- WebChat 與瀏覽器控制 UI
- macOS 選單列伴隨應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置與語音功能
- Android 節點，具備配對、聊天、語音、Canvas、相機與裝置指令功能

**工具與自動化：**

- 瀏覽器自動化、exec 指令、沙盒機制
- 網路搜尋（Brave、Perplexity、Gemini、Grok、Kimi、Firecrawl）
- Cron 排程工作與心跳排程
- 技能、外掛程式與工作流程管線（Lobster）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
