---
summary: "社區代理工具，將 Claude 訂閱憑證暴露為 OpenAI 相容端點"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API 代理"
---

# Claude Max API 代理

**claude-max-api-proxy** 是一個社群工具，將您的 Claude Max/Pro 訂閱暴露為 OpenAI 相容的 API 端點。這允許您將訂閱用於任何支援 OpenAI API 格式的工具。

<Warning>此路徑僅提供技術相容性。Anthropic 過去曾封鎖 Claude Code 之外的某些訂閱使用。您必須自行決定是否使用，並在依賴前驗證 Anthropic 的最新條款。</Warning>

## 為何使用此工具？

| 方式            | 成本                                           | 最適用於                 |
| --------------- | ---------------------------------------------- | ------------------------ |
| Anthropic API   | 按 Token 付費（Opus 輸入約 $15/M，輸出 $75/M） | 生產應用程式、高流量     |
| Claude Max 訂閱 | 每月 $200 固定費                               | 個人使用、開發、無限使用 |

如果您擁有 Claude Max 訂閱並希望將其與相容 OpenAI 的工具一起使用，此代理伺服器可能會降低部分工作流程的成本。對於生產環境使用，API 金鑰仍然是更明確的政策途徑。

## 運作原理

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

此代理伺服器：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式的請求
2. 將其轉換為 Claude Code CLI 指令
3. 以 OpenAI 格式回傳回應（支援串流）

## 安裝

```exec
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version
```

## 使用方式

### 啟動伺服器

```exec
claude-max-api
# Server runs at http://localhost:3456
```

### 測試

```exec
# Health check
curl http://localhost:3456/health

# List models
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 搭配 OpenClaw

您可以將 OpenClaw 指向此代理伺服器，作為自訂的相容 OpenAI 端點：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}
```

## 可用模型

| 模型 ID           | 對應至          |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 在 macOS 上自動啟動

建立一個 LaunchAgent 以自動執行代理伺服器：

```exec
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## 連結

- **npm：** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **Issues:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 備註

- 這是一個**社群工具**，並非由 Anthropic 或 OpenClaw 官方支援
- 需要具備有效的 Claude Max/Pro 訂閱並已透過 Claude Code CLI 完成驗證
- 此代理伺服器在本機執行，不會將資料傳送至任何第三方伺服器
- 完全支援串流回應

## 相關連結

- [Anthropic provider](/zh-Hant/providers/anthropic) - 原生 OpenClaw 整合，支援 Claude 設定權杖或 API 金鑰
- [OpenAI provider](/zh-Hant/providers/openai) - 適用於 OpenAI/Codex 訂閱
