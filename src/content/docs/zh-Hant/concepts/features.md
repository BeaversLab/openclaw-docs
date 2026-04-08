---
summary: "OpenClaw 在通道、路由、媒體和使用者體驗方面的能力。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

# 功能

## 亮點

<Columns>
  <Card title="Channels" icon="message-square">
    單一 Gateway 即可支援 Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等更多平台。
  </Card>
  <Card title="Plugins" icon="plug">
    內建外掛程式在一般目前版本中無需額外安裝，即可新增 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等更多支援。
  </Card>
  <Card title="路由" icon="route">
    具有隔離會話的多代理程式路由。
  </Card>
  <Card title="Media" icon="image">
    圖片、音訊、影片、文件以及圖片/影片生成。
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

- 內建頻道包括 Discord、Google Chat、iMessage (舊版)、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 內建外掛程式頻道包括 BlueBubbles for iMessage、Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可選的獨立安裝頻道外掛程式包括 Voice Call 和第三方套件（如 WeChat）
- 第三方頻道外掛程式可進一步擴充 Gateway 功能，例如 WeChat
- 群組聊天支援，並透過提及啟動
- 透過允許清單和配對實現私訊安全

**Agent（代理程式）：**

- 內建 Agent 執行環境，支援工具串流
- 多 Agent 路由，每個工作區或傳送者擁有獨立工作階段
- 工作階段：直接聊天會合併至共用的 `main`；群組則保持獨立
- 長回應的串流與分塊傳輸

**驗證與供應商：**

- 35+ 模型供應商（Anthropic、OpenAI、Google 等）
- 透過 OAuth 進行訂閱驗證（例如 OpenAI Codex）
- 自訂與自託管供應商支援（vLLM、SGLang、Ollama，以及任何 OpenAI 相容或 Anthropic 相容的端點）

**媒體：**

- 圖片、音訊、影片與文件的輸入和輸出
- 共用的圖片生成與影片生成功能介面
- 語音訊息轉錄
- 支援多種供應商的文字轉語音

**應用程式與介面：**

- WebChat 與瀏覽器控制介面
- macOS 選單列伴隨應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置和語音功能
- 具備配對、聊天、語音、Canvas、相機和裝置指令的 Android 節點

**工具與自動化：**

- 瀏覽器自動化、執行、沙盒化
- 網路搜尋（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 工作和心跳排程
- 技能、外掛和工作流程管線（Lobster）
