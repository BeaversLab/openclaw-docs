---
summary: "CLI 後端：透過本機 AI CLI 僅限文字的後備方案"
read_when:
  - 當 API 提供商失敗時，您需要一個可靠的後備方案
  - 您正在執行 Claude Code CLI 或其他本機 AI CLI，並希望重複使用它們
  - 您需要一個僅限文字、無工具的路徑，但仍支援會話和圖片
title: "CLI 後端"
---

# CLI 後端 (後備執行時)

當 API 提供商停機、速率受限或暫時運作異常時，OpenClaw 可以執行 **本機 AI CLI** 作為 **僅限文字的後備方案**。這是經過審慎考慮的保守設計：

- **工具已停用** (無工具呼叫)。
- **文字輸入 → 文字輸出** (可靠)。
- **支援會話** (因此後續對話能保持連貫)。
- **圖片可以傳遞**，如果 CLI 接受圖片路徑的話。

此設計旨在作為 **安全網** 而非主要路徑。當您希望在不依賴外部 API 的情況下獲得「必定能運作」的文字回應時，請使用它。

## 適合初學者的快速入門

您可以 **無需任何設定** 即可使用 Claude Code CLI (OpenClaw 內建了預設值)：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能直接使用：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的閘道在 launchd/systemd 下執行且 PATH 最小化，請僅新增指令路徑：

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

就這樣。除了 CLI 本身外，不需要金鑰或額外的驗證設定。

## 將其作為後備方案使用

將 CLI 後端新增至您的後備清單，使其僅在主要模型失敗時執行：

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

- 如果您使用 `agents.defaults.models` (允許清單)，則必須包含 `claude-cli/...`。
- 如果主要提供商失敗 (驗證、速率限制、逾時)，OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端都位於：

```
agents.defaults.cliBackends
```

每個條目都由 **提供商 ID** 索引 (例如 `claude-cli`、`my-cli`)。
提供商 ID 會成為您的模型參照的左側：

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

1. **根據提供商前綴 (`claude-cli/...`) 選擇後端**。
2. **使用相同的 OpenClaw 提示 + 工作區情境建構系統提示**。
3. **執行 CLI** 並附上會話 ID (如果支援)，以便歷史記錄保持一致。
4. **解析輸出** (JSON 或純文字) 並傳回最終文字。
5. **依後端保存會話 ID**，以便後續對話重複使用相同的 CLI 會話。

## 會話

- 如果 CLI 支援 sessions，請設定 `sessionArg` (例如 `--session-id`) 或
  `sessionArgs` (佔位符 `{sessionId}`)，當 ID 需要被插入
  到多個 flags 時。
- 如果 CLI 使用具有不同 flags 的 **resume subcommand**，請設定
  `resumeArgs` (在恢復時取代 `args`) 以及選擇性地設定 `resumeOutput`
  (用於非 JSON 的恢復)。
- `sessionMode`：
  - `always`：總是發送 session id (如果沒有儲存則使用新的 UUID)。
  - `existing`：僅在之前有儲存時才發送 session id。
  - `none`：永不發送 session id。

## 圖片 (傳遞)

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些
路徑將作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將
檔案路徑附加到提示詞 (path injection)，這對於能從純路徑自動
載入本地檔案的 CLI 已經足夠 (Claude Code CLI 的行為)。

## 輸入 / 輸出

- `output: "json"` (預設) 嘗試解析 JSON 並提取文字 + session id。
- `output: "jsonl"` 解析 JSONL 串流 (Codex CLI `--json`) 並提取
  最後一個代理程式訊息以及存在的 `thread_id`。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"` (預設) 將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 發送提示詞。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則使用 stdin。

## 預設值 (內建)

OpenClaw 內建了 `claude-cli` 的預設值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 也內建了 `codex-cli` 的預設值：

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

- **無 OpenClaw 工具**（CLI 後端永不接收工具呼叫）。某些 CLI 可能仍會執行自己的代理程式工具。
- **無串流**（CLI 輸出會被收集後再回傳）。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 工作階段**透過文字輸出恢復（無 JSONL），這比初始 `--json` 執行結構性更低。OpenClaw 工作階段仍可正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無工作階段連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前無法以 JSON 輸出恢復）。
- **忽略圖片**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。

import en from "/components/footer/en.mdx";

<en />
