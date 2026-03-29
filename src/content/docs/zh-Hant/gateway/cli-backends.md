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

您可以 **無需任何設定** 使用 Claude Code CLI（OpenClaw 內建了預設值）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能開箱即用：

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

## 將其用作備援

將 CLI 後端加入您的備援清單，使其僅在主要模型失敗時運作：

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

備註：

- 如果您使用 `agents.defaults.models` (allowlist)，必須包含 `claude-cli/...`。
- 如果主要提供商失敗（認證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有的 CLI 後端都在這裡：

```
agents.defaults.cliBackends
```

每個條目都以 **提供商 ID** 作為鍵值（例如 `claude-cli`、`my-cli`）。
提供商 ID 會成為您模型參照的左側：

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

## 運作原理

1. 根據提供商前綴（`claude-cli/...`）**選取後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文 **建構系統提示詞**。
3. **執行 CLI** 時附帶會話 ID（若支援），以保持歷史記錄一致。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 為每個後端 **保存會話 ID**，以便後續對話重複使用相同的 CLI 會話。

## 會話

- 如果 CLI 支援會話，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（預留位置 `{sessionId}`），當 ID 需要插入
  到多個標誌時使用。
- 如果 CLI 使用具有不同旗標的 **resume 子命令**，請設定
  `resumeArgs`（復用時取代 `args`）並可選設定 `resumeOutput`
  （用於非 JSON 復用）。
- `sessionMode`：
  - `always`：總是發送 session id（如果未儲存則發送新的 UUID）。
  - `existing`：僅在先前儲存過時才發送 session id。
  - `none`：永遠不發送 session id。

## 圖片（傳遞）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些
路徑將會作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將
檔案路徑附加到提示詞（路徑注入），這對於能夠從純路徑自動載入本機檔案的 CLI 來說已經足夠
（Claude Code CLI 的行為）。

## 輸入 / 輸出

- `output: "json"`（預設）嘗試解析 JSON 並提取文字 + session id。
- `output: "jsonl"` 解析 JSONL 串流（Codex CLI `--json`）並提取
  最後一條代理程式訊息以及存在的 `thread_id`。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 發送提示詞。
- 如果提示詞很長並且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（內建）

OpenClaw 內建了 `claude-cli` 的預設設定：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 也內建了 `codex-cli` 的預設設定：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

僅在需要時覆蓋（常見：絕對 `command` 路徑）。

## 限制

- **無 OpenClaw 工具**（CLI 後端從不接收工具呼叫）。某些 CLI
  可能仍會執行其自身的代理程式工具。
- **無串流**（收集 CLI 輸出後再傳回）。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 會話**透過文字輸出恢復（無 JSONL），這比初始的 `--json` 執行
  結構化程度更低。OpenClaw 會話仍可正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無會話連續性**：確保已設定 `sessionArg` 且 `sessionMode` 未設定為
  `none`（Codex CLI 目前無法透過 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 支援檔案路徑）。
