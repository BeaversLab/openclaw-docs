---
summary: "CLI 後端：透過本機 AI CLI 進行僅文字後援"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "CLI 後端"
---

# CLI 後端（後援執行時）

當 API 提供者停機、受到速率限制或暫時運作異常時，OpenClaw 可以將 **本機 AI CLI** 作為 **僅文字後援** 來執行。這是有意為之的保守設計：

- **工具已停用**（無工具呼叫）。
- **文字輸入 → 文字輸出**（可靠）。
- **支援對話階段**（因此後續對話能保持連貫）。
- **圖片可以傳遞**，前提是該 CLI 接受圖片路徑。

這被設計為一個**安全網**，而非主要途徑。當您想要不依賴外部 API 且「始終有效」的文字回應時，請使用它。

## 適合初學者的快速入門

您可以在**完全不需設定**的情況下使用 Claude Code CLI（OpenClaw 內建了預設值）：

```exec
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能直接使用：

```exec
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的 gateway 在 launchd/systemd 下運行且 PATH 最小化，僅加入
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

這樣就行了。不需要金鑰，除了 CLI 本身外也不需要額外的認證設定。

## 將其作為後備使用

將 CLI 後端加入您的後備清單，這樣它只會在主要模型失敗時運作：

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

- 如果您使用 `agents.defaults.models` (allowlist)，必須包含 `claude-cli/...`。
- 如果主要提供者失敗（認證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端都在：

```
agents.defaults.cliBackends
```

每個條目都以 **提供者 ID** 為鍵（例如 `claude-cli`、`my-cli`）。
提供者 ID 會成為您的模型參照的左側：

```
<provider>/<model>
```

### 設定範例

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

## 運作方式

1. **根據提供者前綴（`claude-cli/...`）選擇後端。**
2. **建構系統提示詞**，使用相同的 OpenClaw 提示詞 + 工作區上下文。
3. **執行 CLI** 並附帶會話 ID（如果支援），以便保持歷史記錄一致。
4. **解析輸出**（JSON 或純文字）並返回最終文字。
5. **為每個後端持久化會話 ID**，以便後續提問重用同一個 CLI 會話。

## 會話

- 如果 CLI 支援會話 (sessions)，請設定 `sessionArg` (例如 `--session-id`) 或
  `sessionArgs` (預留位置 `{sessionId}`)，當識別碼 (ID) 需要插入
  至多個旗標時。
- 如果 CLI 使用具有不同旗標的 **resume 子指令**，請設定
  `resumeArgs`（恢復時取代 `args`）以及選擇性設定 `resumeOutput`
  （用於非 JSON 恢復）。
- `sessionMode`：
  - `always`：總是發送 session id（若未儲存則為新的 UUID）。
  - `existing`：僅在先前有儲存時才發送 session id。
  - `none`: 絕不發送 session id。

## 圖片（傳遞）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔。如果設定了 `imageArg`，這些路徑會作為 CLI 引數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示詞（路徑注入），這對於能從純路徑自動載入本機檔案的 CLI 來說就足夠了（Claude Code CLI 的行為）。

## 輸入 / 輸出

- `output: "json"`（預設）會嘗試解析 JSON 並擷取文字與 session id。
- `output: "jsonl"` 會解析 JSONL 串流（Codex CLI `--json`）並提取最後一個代理訊息，如果存在的話還包含 `thread_id`。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）將提示作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 發送提示。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（內建）

OpenClaw 附帶了 `claude-cli` 的預設值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 也為 `codex-cli` 提供了預設值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

僅在需要時覆寫（常見：絕對 `command` 路徑）。

## 限制

- **沒有 OpenClaw 工具**（CLI 後端從未接收工具呼叫）。某些 CLI
  可能仍會執行其自己的代理工具。
- **無串流**（先收集 CLI 輸出然後再回傳）。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI sessions** 透過文字輸出恢復（沒有 JSONL），這比最初的 `--json` 執行還要不結構化。OpenClaw sessions 仍然正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 來對應 `provider/model` → CLI 模型。
- **無會話連續性**：請確保已設定 `sessionArg` 且未設定 `sessionMode`
  `none`（Codex CLI 目前無法透過 JSON 輸出恢復）。
- **忽略圖片**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。
