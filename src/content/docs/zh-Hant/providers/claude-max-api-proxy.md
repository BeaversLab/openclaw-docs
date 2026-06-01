---
summary: "社群代理，將 Claude 訂閱憑證公開為 OpenAI 相容端點"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API 代理"
---

**claude-max-api-proxy** 是一個社群工具，能將您的 Claude Max/Pro 訂閱作為 OpenAI 相容的 API 端點暴露出來。這讓您能在任何支援 OpenAI API 格式的工具中使用您的訂閱。

<Warning>
此路徑僅提供技術相容性。Anthropic 過去曾封鎖部分在 Claude Code 之外
的訂閱使用。您必須自行決定是否使用，並在依賴此途徑前確認
Anthropic 目前的計費規則。

Anthropic 目前的支援文件指出 `claude -p` 屬於 Agent SDK/程式化使用。
自 2026 年 6 月 15 日起，訂閱方案的 `claude -p` 使用量將先
從每月的 Agent SDK 額度中扣除，若已啟用使用額度，之後再以標準 API 費率
從使用額度中扣除。

</Warning>

## 為什麼使用這個？

| 方式            | 計費路徑                                 | 最適合                                 |
| --------------- | ---------------------------------------- | -------------------------------------- |
| Anthropic API   | 透過 Claude Console 或雲端依 Token 付費  | 生產環境應用程式、共用自動化、大量使用 |
| Claude 訂閱代理 | Claude Code / `claude -p` 方案與額度規則 | 使用相容工具進行個人實驗               |

如果您擁有 Claude Max 或 Pro 訂閱並希望搭配
OpenAI 相容工具使用，此代理可能適合某些個人工作流程。這並非
無限量的固定費率路徑。對於生產環境使用，API 金鑰
仍是更清晰的政策與計費途徑。

## 運作方式

```
Your App → claude-max-api-proxy → Claude Code CLI / claude -p → Anthropic
     (OpenAI format)              (converts format)          (uses your login)
```

該代理：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式請求
2. 將其轉換為 Claude Code CLI 指令
3. 以 OpenAI 格式回傳回應（支援串流）

## 開始使用

<Steps>
  <Step title="安裝代理">
    需要 Node.js 20+ 和 Claude Code CLI。

    ```bash
    npm install -g claude-max-api-proxy

    # Verify Claude CLI is authenticated
    claude --version
    ```

  </Step>
  <Step title="啟動伺服器">
    ```bash
    claude-max-api
    # Server runs at http://localhost:3456
    ```
  </Step>
  <Step title="測試代理">
    ```bash
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

  </Step>
  <Step title="設定 OpenClaw">
    將 OpenClaw 指向該代理，作為自訂 OpenAI 相容端點：

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

  </Step>
</Steps>

## 內建目錄

| 模型 ID           | 對應至          |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 進階設定

<AccordionGroup>
  <Accordion title="Proxy-style OpenAI-compatible notes">
    此路徑使用與其他自訂
    `/v1` 後端相同的代理式 OpenAI 相容路徑：

    - 原生僅限 OpenAI 的請求塑形不適用
    - 無 `service_tier`、無 Responses `store`、無提示快取提示，且無
      OpenAI 推理相容負載塑形
    - 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）
      不會在代理 URL 上注入

  </Accordion>

  <Accordion title="Auto-start on macOS with LaunchAgent">
    建立一個 LaunchAgent 以自動執行代理：

    ```bash
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

  </Accordion>
</AccordionGroup>

## 注意事項

- 這是一個**社群工具**，並非由 Anthropic 或 OpenClaw 官方支援
- 需要有效的 Claude Max/Pro 訂閱，並已透過 Claude Code CLI 完成驗證
- 繼承 Claude Code `claude -p` 的計費、使用額度與速率限制行為
- 此代理在本機執行，不會將資料傳送至任何第三方伺服器
- 完全支援串流回應

<Note>若需透過 Claude CLI 或 API 金鑰進行原生 Anthropic 整合，請參閱 [Anthropic provider](/zh-Hant/providers/anthropic)。若需使用 OpenAI/Codex 訂閱，請參閱 [OpenAI provider](/zh-Hant/providers/openai)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Anthropic provider" href="/zh-Hant/providers/anthropic" icon="bolt">
    與 Claude CLI 或 API 金鑰的原生 OpenClaw 整合。
  </Card>
  <Card title="OpenAI provider" href="/zh-Hant/providers/openai" icon="robot">
    用於 OpenAI/Codex 訂閱。
  </Card>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    所有提供者、模型參照與故障轉移行為的總覽。
  </Card>
  <Card title="Configuration" href="/zh-Hant/gateway/configuration" icon="gear">
    完整設定參考。
  </Card>
</CardGroup>
