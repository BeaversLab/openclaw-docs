---
summary: "OpenClaw 在通道、路由、媒體和使用者體驗方面的能力。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

## 亮點

<Columns>
  <Card title="頻道" icon="message-square" href="/zh-Hant/channels">
    透過單一 Gateway 使用 Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等更多平台。
  </Card>
  <Card title="外掛程式" icon="plug" href="/zh-Hant/tools/plugin">
    隨附的外掛程式增加了 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等功能，在一般正式版本中無需額外安裝。
  </Card>
  <Card title="路由" icon="route" href="/zh-Hant/concepts/multi-agent">
    具備隔離會話的多代理程式路由。
  </Card>
  <Card title="媒體" icon="image" href="/zh-Hant/nodes/images">
    圖片、音訊、影片、文件以及圖片/影片生成。
  </Card>
  <Card title="應用程式與 UI" icon="monitor" href="/zh-Hant/web/control-ui">
    Web 控制介面與 macOS 伴隨應用程式。
  </Card>
  <Card title="行動節點" icon="smartphone" href="/zh-Hant/nodes">
    具備配對、語音/聊天以及豐富裝置指令的 iOS 與 Android 節點。
  </Card>
</Columns>

## 完整列表

**頻道：**

- 內建頻道包括 Discord、Google Chat、iMessage、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 隨附的外掛頻道包括 Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可選的額外安裝頻道外掛程式包括語音通話以及第三方套件，例如 WeChat
- 第三方頻道外掛程式可以進一步擴充 Gateway，例如 WeChat
- 群組聊天支援，並透過提及來啟動
- 透過允許清單和配對保障私訊安全

**代理程式：**

- 內建代理程式執行環境，支援工具串流
- Multi-agent 路由，每個工作區或發送者具有獨立的會話
- Sessions：直接聊天合併到共享的 `main` 中；群組則被隔離
- 長回應的串流和分塊處理

**驗證和供應商：**

- 35+ 模型供應商（Anthropic、OpenAI、Google 等）
- 透過 OAuth 的訂閱驗證（例如 OpenAI Codex）
- 自訂和自託管供應商支援（vLLM、SGLang、Ollama，以及任何 OpenAI 相容或 Anthropic 相容的端點）

**媒體：**

- 輸入和輸出圖片、音訊、影片和文件
- 共用的圖片生成和影片生成能力介面
- 語音備忘錄轉錄
- 支援多種供應商的文字轉語音

**應用程式和介面：**

- WebChat 和瀏覽器控制 UI
- macOS 選單列伴隨應用程式
- iOS 節點，具備配對、Canvas、相機、螢幕錄製、位置和語音功能
- Android 節點，具備配對、聊天、語音、Canvas、相機和裝置指令

**工具和自動化：**

- 瀏覽器自動化、exec、沙箱
- 網路搜尋（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 工作和心跳排程
- 技能、外掛和工作流程管道（Lobster）

## 相關

<CardGroup cols={2}>
  <Card title="實驗性功能" href="/zh-Hant/concepts/experimental-features" icon="flask">
    尚未發布至預設介面的選用功能。
  </Card>
  <Card title="Agent 執行時期" href="/zh-Hant/concepts/agent" icon="robot">
    Agent 執行時期模型以及執行是如何分派的。
  </Card>
  <Card title="頻道" href="/zh-Hant/channels" icon="message-square">
    從單一 Gateway 連接 Telegram、WhatsApp、Discord、Slack 等更多服務。
  </Card>
  <Card title="外掛" href="/zh-Hant/tools/plugin" icon="plug">
    擴充 OpenClaw 的隨附及第三方外掛。
  </Card>
</CardGroup>
