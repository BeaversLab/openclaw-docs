---
summary: "CLI 後端：具備選用 MCP 工具橋接器的本機 AI CLI 備援方案"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 後端"
---

# CLI 後端（備援執行環境）

當 API 提供商停機、受到速率限制或暫時出現異常時，OpenClaw 可以執行 **本機 AI CLI** 作為 **純文字備援方案**。這是有意的保守設計：

- **OpenClaw 工具不會直接注入**，但具有 `bundleMcp: true` 的後端可以透過迴路 MCP 橋接器接收閘道工具。
- **JSONL 串流**，適用於支援此功能的 CLI。
- **支援會話**（因此後續對話能保持連貫）。
- **可以傳遞圖片**，前提是 CLI 接受圖片路徑。

這被設計為一種 **安全網** 而非主要途徑。當您想要不依賴外部 API 的「始終可用」文字回應時，請使用它。

如果您需要具備 ACP 工作階段控制、背景工作、執行緒/對話綁定以及持久外部編碼工作階段的完整套件執行時期，請改用 [ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

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

如果您在閘道主機上將捆綁的 CLI 後端用作**主要訊息提供者**，當您的設定在模型參考中或 `agents.defaults.cliBackends` 之下明確參考該後端時，OpenClaw 現在會自動載入擁有該後端的捆綁外掛程式。

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

- 如果您使用 `agents.defaults.models` (允許清單)，您也必須在其中包含您的 CLI 後端模型。
- 如果主要提供者失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端皆位於：

```
agents.defaults.cliBackends
```

每個條目都以 **提供者 ID** 為鍵值 (例如 `codex-cli`、`my-cli`)。
提供者 ID 會成為您的模型參考左側：

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
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
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

1. 根據提供者前綴 (`codex-cli/...`) **選取後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. 使用會話 ID（如果支援）來**執行 CLI**，以確保歷史記錄保持一致。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>再次支援捆綁的 Anthropic `claude-cli` 後端。Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的許可行為。</Note>

捆綁的 OpenAI `codex-cli` 後端會透過 Codex 的 `model_instructions_file` 設定覆寫 (`-c
model_instructions_file="..."`) 傳遞 OpenClaw 的系統提示詞。Codex 不公開 Claude 風格的 `--append-system-prompt` 標誌，因此 OpenClaw 會將組裝好的提示詞寫入每個全新 Codex CLI 工作階段的暫存檔案。

內建的 Anthropic `claude-cli` 後端透過兩種方式接收 OpenClaw 技能快照：附加在系統提示詞中的精簡 OpenClaw 技能目錄，以及透過 `--plugin-dir` 傳遞的暫時性 Claude Code 外掛程式。該外掛程式僅包含該 Agent/工作階段適用的技能，因此 Claude Code 原生的技能解析器會看到與 OpenClaw 本來會在提示詞中廣告的相同篩選集合。技能環境變數/API 金鑰覆寫仍會由 OpenClaw 套用至執行時的子行程環境。

## 工作階段

- 如果 CLI 支援工作階段，請設定 `sessionArg` (例如 `--session-id`) 或
  `sessionArgs` (佔位符 `{sessionId}`)，當 ID 需要插入至多個旗標時。
- 如果 CLI 使用具有不同旗標的 **resume 子指令**，請設定
  `resumeArgs` (恢復時取代 `args`) 以及選用的 `resumeOutput`
  (用於非 JSON 恢復)。
- `sessionMode`：
  - `always`：總是傳送工作階段 ID (若無儲存則傳送新的 UUID)。
  - `existing`：僅當先前已儲存時才傳送工作階段 ID。
  - `none`：永遠不傳送工作階段 ID。

序列化注意事項：

- `serialize: true` 保持同通道執行的排序。
- 大多數 CLI 會在單一提供者通道上進行序列化。
- 當後端驗證狀態變更時，包括重新登入、Token 輪替或變更的驗證設定檔憑證，OpenClaw 會捨棄已儲存的 CLI 工作階段重複使用。

## 圖片 (傳遞)

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔。如果設定了 `imageArg`，這些
路徑會被當作 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將
檔案路徑附加到提示詞 (路徑插入)，這對於會從純路徑自動載入本機檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"` (預設) 嘗試剖析 JSON 並擷取文字與工作階段 ID。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字並從 `stats` 讀取用量。
- `output: "jsonl"` 會解析 JSONL 串流（例如 Codex CLI `--json`）並在最終代理訊息存在時擷取該訊息以及工作階段識別碼。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）會將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 會透過 stdin 傳送提示詞。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

內建的 OpenAI 外掛程式也會為 `codex-cli` 註冊預設值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

內建的 Google 外掛程式也會為 `google-gemini-cli` 註冊預設值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

先決條件：本機 Gemini CLI 必須已安裝，並在 `PATH`（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）上可作為 `gemini` 使用。

Gemini CLI JSON 備註：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 不存在或為空時，用量會回退到 `stats`。
- `stats.cached` 會正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會根據 `stats.input_tokens - stats.cached` 推算輸入 Token。

僅在需要時覆蓋（常見：絕對 `command` 路徑）。

## 外掛程式擁有的預設值

CLI 後端預設值現在是外掛程式介面的一部分：

- 外掛程式會使用 `api.registerCliBackend(...)` 來註冊它們。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆寫外掛程式預設值。
- 後端特定的設定清理作業透過選用的
  `normalizeConfig` hook 保持由外掛程式擁有。

需要微小提示/訊息相容性填充層的外掛程式可以宣告
雙向文字轉換，而無需取代提供者或 CLI 後端：

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` 重寫傳遞給 CLI 的系統提示和使用者提示。`output`
在 OpenClaw 處理自己的控制標記和通道傳遞之前，重寫串流助理增量和解析的最終文字。

對於發出 Claude Code stream- 相容 JSONL 的 CLI，請在該後端的設定中設定
`jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆蓋層

CLI 後端**不會**直接接收 OpenClaw 工具呼叫，但後端可以選擇透過 `bundleMcp: true` 使用產生的 MCP 設定覆蓋層。

目前的打包行為：

- `claude-cli`：產生的嚴格 MCP 設定檔
- `codex-cli`：`mcp_servers` 的內聯設定覆寫
- `google-gemini-cli`：產生的 Gemini 系統設定檔

啟用打包 MCP 時，OpenClaw 將：

- 產生一個回傳 HTTP MCP 伺服器，向 CLI 程序公開閘道工具
- 使用每個階段令牌 (`OPENCLAW_MCP_TOKEN`) 對橋接器進行驗證
- 將工具存取範圍限定為目前的階段、帳戶和通道內容
- 為目前的工作區載入已啟用的打包 MCP 伺服器
- 將它們與任何現有的後端 MCP 設定/設定形狀合併
- 使用擁有擴充功能中的後端擁有整合模式重寫啟動設定

如果未啟用 MCP 伺服器，當後端選擇打包 MCP 時，OpenClaw 仍會注入嚴格設定，以便背景執行保持隔離。

## 限制

- **沒有直接的 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入
  CLI 後端通訊協定。後端只有在選擇
  `bundleMcp: true` 時才會看到閘道工具。
- **串流處理取決於後端。** 某些後端串流 JSONL；其他則緩衝
  直到結束。
- **結構化輸出** 取決於 CLI 的 JSON 格式。
- **Codex CLI 工作階段**會透過文字輸出（無 JSONL）恢復，這比最初的 `--json` 執行還要不結構化。OpenClaw 工作階段仍然可以正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 來將 `provider/model` 對應到 CLI 模型。
- **無工作階段連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前無法透過 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。
