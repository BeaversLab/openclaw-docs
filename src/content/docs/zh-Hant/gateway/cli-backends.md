---
summary: "CLI 後端：透過本機 AI CLI 實現的純文字備援"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "CLI 後端"
---

# CLI 後端（備援執行環境）

當 API 提供商停機、受到速率限制或暫時出現異常時，OpenClaw 可以執行 **本機 AI CLI** 作為 **純文字備援方案**。這是有意的保守設計：

- **已停用工具**（不進行工具呼叫）。
- **文字輸入 → 文字輸出**（可靠）。
- **支援會話**（因此後續對話能保持連貫）。
- **可以傳遞圖片**，前提是 CLI 接受圖片路徑。

這被設計為一種 **安全網** 而非主要途徑。當您想要不依賴外部 API 的「始終可用」文字回應時，請使用它。

## 新手友善的快速入門

您可以使用 Claude Code CLI **而無需任何設定**（捆綁的 Anthropic 外掛會
註冊一個預設後端）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能開箱即用（透過捆綁的 OpenAI 外掛）：

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
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
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
        fallbacks: ["claude-cli/opus-4.6", "claude-cli/opus-4.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/opus-4.6": {},
        "claude-cli/opus-4.5": {},
      },
    },
  },
}
```

注意事項：

- 如果您使用 `agents.defaults.models`（允許清單），則必須包含 `claude-cli/...`。
- 如果主要提供者失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端皆位於：

```
agents.defaults.cliBackends
```

每個條目都以一個 **提供者 ID** 作為鍵值（例如 `claude-cli`、`my-cli`）。
該提供者 ID 會成為您的模型參考的左側部分：

```
<provider>/<model>
```

### 配置範例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
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

1. 根據提供者前綴（`claude-cli/...`）**選擇一個後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. 使用會話 ID（如果支援）來**執行 CLI**，以確保歷史記錄保持一致。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

## 會話

- 如果 CLI 支援會話，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（佔位符 `{sessionId}`），當 ID 需要插入
  至多個旗標時使用。
- 如果 CLI 使用具有不同旗標的 **resume 子指令**，請設定
  `resumeArgs`（在恢復時取代 `args`）以及選擇性設定 `resumeOutput`
  （用於非 JSON 的恢復）。
- `sessionMode`：
  - `always`：始終傳送 session id（如果未儲存則為新的 UUID）。
  - `existing`：只有在之前儲存過 session id 時才傳送。
  - `none`：絕不傳送 session id。

## 圖片（傳遞模式）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 影像寫入暫存檔。如果設定了 `imageArg`，這些路徑將作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加至提示詞（路徑注入），這對於會從純路徑自動載入本地檔案的 CLI 來說已經足夠（Claude Code CLI 的行為）。

## 輸入 / 輸出

- `output: "json"`（預設）會嘗試解析 JSON 並擷取文字與 session id。
- `output: "jsonl"` 會解析 JSONL 串流（Codex CLI `--json`）並擷取最後一則 agent 訊息，若存在則一併擷取 `thread_id`。
- `output: "text"` 會將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）會將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 會透過 stdin 傳送提示詞。
- 如果提示詞非常長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

內建的 Anthropic 外掛程式為 `claude-cli` 註冊了一個預設值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

內建的 OpenAI 外掛程式也為 `codex-cli` 註冊了一個預設值：

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
- `args: ["--prompt", "--output-format", "json"]`
- `resumeArgs: ["--resume", "{sessionId}", "--prompt", "--output-format", "json"]`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

僅在需要時覆蓋（常見情況：絕對 `command` 路徑）。

## 外掛程式擁有的預設值

CLI 後端預設值現在是外掛程式介面的一部分：

- 外掛程式透過 `api.registerCliBackend(...)` 進行註冊。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆蓋外掛程式的預設值。
- 後端特定的設定清理仍然由外掛程式透過選用的
  `normalizeConfig` hook 處理。

## 限制

- **沒有 OpenClaw 工具**（CLI 後端永遠不會收到工具呼叫）。某些 CLI
  可能仍會執行其自己的代理工具。
- **無串流**（收集 CLI 輸出然後再返回）。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 會話**透過文字輸出恢復（無 JSONL），這比最初的 `--json` 執行結構性更低。OpenClaw 會話仍能正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **模型名稱錯誤**：使用 `modelAliases` 將 `provider/model` 對應到 CLI 模型。
- **無會話延續性**：請確保已設定 `sessionArg` 且 `sessionMode` 不為
  `none`（Codex CLI 目前無法以 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 支援檔案路徑）。
