---
summary: "CLI 後端：本地 AI CLI 備援機制與選用 MCP 工具橋接"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 後端"
---

# CLI 後端（備援執行環境）

當 API 提供商停機、受到速率限制或暫時出現異常時，OpenClaw 可以執行 **本機 AI CLI** 作為 **純文字備援方案**。這是有意的保守設計：

- **OpenClaw 工具不會直接被注入**，但具有 `bundleMcp: true` 的後端可以透過回送 MCP 橋接器接收閘道工具。
- **JSONL 串流**，適用於支援此功能的 CLI。
- **支援會話**（因此後續對話能保持連貫）。
- **可以傳遞圖片**，前提是 CLI 接受圖片路徑。

這被設計為一種 **安全網** 而非主要途徑。當您想要不依賴外部 API 的「始終可用」文字回應時，請使用它。

如果您需要具備 ACP 會話控制、背景任務、執行緒/對話綁定以及持久外部編碼會話的完整線束運行時，請改用 [ACP Agents](/en/tools/acp-agents)。CLI 後端並非 ACP。

## 新手友善的快速入門

您可以在**不需要任何配置**的情況下使用 Codex CLI（內建的 OpenAI 外掛程式會註冊預設後端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的 Gateway 在 launchd/systemd 下運行且 PATH 極小，僅需加入
命令路徑：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
      },
    },
  },
}
```

僅此而已。除了 CLI 本身外，不需要金鑰或額外的認證設定。

如果您將捆綁的 CLI 後端作為閘道主機上的 **主要訊息提供者**，OpenClaw 現在會在您的設定
於模型參照中或
`agents.defaults.cliBackends` 下明確參照該後端時，自動載入擁有的捆綁外掛。

## 將其作為後備使用

將 CLI 後端新增到您的後備清單中，使其僅在主要模型失敗時執行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.4"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.4": {},
      },
    },
  },
}
```

注意事項：

- 如果您使用 `agents.defaults.models` (允許清單)，您必須將您的 CLI 後端模型也包含在其中。
- 如果主要提供者失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端皆位於：

```
agents.defaults.cliBackends
```

每個條目都以一個 **provider id**（例如 `codex-cli`、`my-cli`）為鍵。
Provider id 會成為您的模型參照（model ref）的左側：

```
<provider>/<model>
```

### 配置範例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true,
        },
      },
    },
  },
}
```

## 運作原理

1. 根據提供者前綴（`codex-cli/...`）**選擇後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. 使用會話 ID（如果支援）來**執行 CLI**，以確保歷史記錄保持一致。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>隨附的 Anthropic `claude-cli` 後端再次受到支援。Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的官方許可。</Note>

## Sessions

- 如果 CLI 支援 sessions，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（佔位符 `{sessionId}`），當 ID 需要插入到多個旗標（flags）時。
- 如果 CLI 使用具有不同旗標的 **resume 子命令**，請設定
  `resumeArgs`（恢復時取代 `args`）以及選擇性地設定 `resumeOutput`
  （用於非 JSON 的恢復）。
- `sessionMode`：
  - `always`：總是發送 session id（若未儲存則發送新的 UUID）。
  - `existing`：僅在之前已儲存時才發送 session id。
  - `none`：從不發送 session id。

序列化備註：

- `serialize: true` 保持同通道執行的順序。
- 大多數 CLI 在單一供應商通道上進行序列化。
- 當後端認證狀態變更時，包括重新登入、Token 輪替或變更認證設定檔憑證，OpenClaw 會捨棄已儲存的 CLI session 重用。

## 圖片（直通模式）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔。如果設定了 `imageArg`，這些路徑將作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示詞（路徑注入），這對於能從普通路徑自動載入本地檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"`（預設值）會嘗試解析 JSON 並擷取文字與 session ID。
- 對於 Gemini CLI 的 JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字，並從 `stats` 讀取使用量。
- `output: "jsonl"` 會解析 JSONL 串流（例如 Codex CLI 的 `--json`），並在存在時擷取最終的代理訊息以及 session 識別碼。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設值）會將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 會透過 stdin 傳送提示詞。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

內建的 OpenAI 外掛程式也會為 `codex-cli` 註冊一個預設值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

內建的 Google 外掛程式也會為 `google-gemini-cli` 註冊一個預設值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

先決條件：本機 Gemini CLI 必須已安裝，並可在 `PATH` 上作為 `gemini` 使用（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）。

Gemini CLI JSON 說明：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 不存在或為空時，用法會回退至 `stats`。
- `stats.cached` 會被正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆寫（常見：絕對 `command` 路徑）。

## 外掛擁有的預設值

CLI 後端預設值現屬於外掛表面的一部分：

- 外掛使用 `api.registerCliBackend(...)` 註冊它們。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍會覆寫外掛預設值。
- 特定於後端的設定清理作業仍透過可選的 `normalizeConfig` 掛鉤由外掛擁有。

## 捆綁 MCP 覆蓋層

CLI 後端**不**會直接接收 OpenClaw 工具調用，但後端可以選擇使用 `bundleMcp: true` 採用生成的 MCP 配置覆蓋層。

目前的捆綁行為：

- `claude-cli`：生成的嚴格 MCP 配置檔案
- `codex-cli`：`mcp_servers` 的內聯配置覆寫
- `google-gemini-cli`：生成的 Gemini 系統設定檔案

啟用捆綁 MCP 時，OpenClaw 會：

- 生成一個回傳 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每個階段權杖驗證橋接器（`OPENCLAW_MCP_TOKEN`）
- 將工具存取範圍限定在當前階段、帳戶和頻道上下文
- 為當前工作區載入已啟用的捆綁-MCP 伺服器
- 將它們與任何現有的後端 MCP 配置/設定形狀合併
- 使用來自擁有擴充套件的後端擁有的整合模式重寫啟動配置

如果未啟用任何 MCP 伺服器，當後端選擇採用捆綁 MCP 時，OpenClaw 仍會注入嚴格配置，以便背景執行保持隔離。

## 限制

- **不直接呼叫 OpenClaw 工具。** OpenClaw 不會將工具呼叫注入到
  CLI 後端通訊協定中。後端只有在選擇加入
  `bundleMcp: true` 時才能看到閘道工具。
- **串流取決於後端。** 某些後端會串流 JSONL；其他則會緩衝
  直到退出。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 會話**透過文字輸出（無 JSONL）恢復，這比初始的 `--json` 執行結構性更低。OpenClaw 會話仍然正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **模型名稱錯誤**：使用 `modelAliases` 將 `provider/model` 對應到 CLI 模型。
- **無會話連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是
  `none`（Codex CLI 目前無法透過 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。
