---
summary: "CLI 後端：透過本機 AI CLI 提供純文字後援"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "CLI 後端"
---

# CLI 後端（後援執行環境）

當 API 供應商停機、遭到速率限制或暫時出現異常行為時，OpenClaw 可以執行 **本機 AI CLI** 作為 **僅限文字的後援機制**。此設計特意採取保守策略：

- **已停用工具**（無工具呼叫）。
- **文字輸入 → 文字輸出**（可靠）。
- **支援對話階段**（因此後續的對話輪次能保持連貫）。
- **可以傳遞圖片**，前提是 CLI 接受圖片路徑。

此設計旨在作為 **安全網** 而非主要路徑。當您想要「總是能用」的文字回應且不依賴外部 API 時，請使用此功能。

## 適合初學者的快速入門

您可以在 **完全無需設定** 的情況下使用 Claude Code CLI（OpenClaw 內建了預設值）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能直接開箱即用：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的閘道是在 launchd/systemd 下執行且 PATH 極小，請直接加入
指令路徑：

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

就這樣。除了 CLI 本身之外，不需要任何金鑰或額外的驗證設定。

## 將其用作後援

將 CLI 後端加入您的後援清單中，使其僅在主要模型失敗時執行：

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
- 如果主要供應商失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端均位於：

```
agents.defaults.cliBackends
```

每個項目都以 **供應商 ID** 為鍵（例如 `claude-cli`、`my-cli`）。
供應商 ID 會成為您的模型參照的左側部分：

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
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet",
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

1. **根據供應商前綴（`claude-cli/...`）選取後端**。
2. **使用相同的 OpenClaw 提示詞 + 工作區內容來建構系統提示詞**。
3. **執行 CLI** 並附上對話階段 ID（若支援），以確保歷史記錄保持一致。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. **依後端持續儲存對話階段 ID**，以便後續追問能重複使用相同的 CLI 對話階段。

## 對話階段

- 如果 CLI 支援對話階段，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（預留位置 `{sessionId}`），當 ID 需要插入
  多個旗標時使用。
- 如果 CLI 使用帶有不同標誌的 **resume 子指令**，請設定
  `resumeArgs`（恢復時取代 `args`）以及可選的 `resumeOutput`
  （用於非 JSON 恢復）。
- `sessionMode`:
  - `always`：總是發送一個 session id（如果沒有儲存則為新的 UUID）。
  - `existing`：只有在之前儲存過時才發送 session id。
  - `none`：從不發送 session id。

## 圖片（直通）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些
路徑將會作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將
檔案路徑附加到提示詞（路徑注入），這對於會從純路徑自動載入本機檔案的 CLI 來說已經足夠
（Claude Code CLI 的行為）。

## 輸入 / 輸出

- `output: "json"`（預設）嘗試解析 JSON 並提取文字與 session id。
- `output: "jsonl"` 解析 JSONL 串流（Codex CLI `--json`）並提取
  最後一個代理程式訊息，以及當存在時的 `thread_id`。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 發送提示詞。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（內建）

OpenClaw 附帶了 `claude-cli` 的預設設定：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 也附帶了 `codex-cli` 的預設設定：

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

- **無 OpenClaw 工具**（CLI 後端永遠不會接收工具呼叫）。某些 CLI
  仍可能執行其自己的代理工具。
- **無串流**（會先收集 CLI 輸出然後再傳回）。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 會話**透過文字輸出恢復（無 JSONL），其結構化程度低於初始 `--json` 執行。OpenClaw 會話仍能正常運作。

## 故障排除

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無會話連續性**：請確保已設定 `sessionArg` 且 `sessionMode` 未設為
  `none`（Codex CLI 目前無法使用 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
