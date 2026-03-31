---
summary: "OpenClaw 在通道、路由、媒體和使用者體驗方面的能力。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

# 功能

## 亮點

<Columns>
  <Card title="頻道" icon="message-square">
    使用單一閘道連接 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="外掛程式" icon="plug">
    透過擴充功能新增 Mattermost 等。
  </Card>
  <Card title="路由" icon="route">
    具有隔離會話的多代理程式路由。
  </Card>
  <Card title="媒體" icon="image">
    影像、音訊和文件的輸入與輸出。
  </Card>
  <Card title="應用程式與介面" icon="monitor">
    Web 控制介面與 macOS 伴隨應用程式。
  </Card>
  <Card title="行動裝置節點" icon="smartphone">
    具備配對、語音/聊天及豐富裝置指令的 iOS 與 Android 節點。
  </Card>
</Columns>

## 完整列表

**通道：**

- WhatsApp、Telegram、Discord、iMessage (內建)
- Mattermost、Matrix、Microsoft Teams、Nostr 和更多 (外掛程式)
- 群組聊天支援，具有基於提及的啟動功能
- 透過允許清單和配對保證私訊 (DM) 安全

**代理程式：**

- 內嵌代理程式執行時，支援工具串流
- 多代理程式路由，針對每個工作區或發送者提供隔離會話
- Sessions：直接聊天會合併至共用的 `main`；群組則彼此獨立
- 長回應的串流和分塊

**驗證與提供者：**

- 35+ 模型提供者 (Anthropic、OpenAI、Google 等)
- 透過 OAuth 進行訂閱驗證 (例如 OpenAI Codex)
- 自訂和自託管提供者支援 (vLLM、SGLang、Ollama，以及任何 OpenAI 相容或 Anthropic 相容的端點)

**媒體：**

- 圖片、音訊、視訊和文件的輸入與輸出
- 語音訊息轉錄
- 支援多種提供者的文字轉語音

**應用程式與介面：**

- WebChat 和瀏覽器 Control UI
- macOS 功能表列伴隨應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置和語音功能
- 具有配對、聊天、語音、Canvas、相機和設備指令的 Android 節點

**工具與自動化：**

- 瀏覽器自動化、exec、沙盒
- 網路搜尋 (Brave, Perplexity, Gemini, Grok, Kimi, Firecrawl)
- Cron 排程與心跳調度
- 技能、插件和工作流管道 (Lobster)
