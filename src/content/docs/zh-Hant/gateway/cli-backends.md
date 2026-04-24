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

如果您想要一個具備 ACP 會話控制、背景任務、執行緒/對話綁定以及持續外部編碼會話的完整運行時環境，請改用 [ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

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
3. **執行 CLI** 時附帶會話 ID (如果支援)，以確保歷史記錄保持一致。
   內建的 `claude-cli` 後端會為每個 OpenClaw 會話維持一個 Claude stdio 程序，並透過 stream- stdin 發送後續輪次。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>內建的 Anthropic `claude-cli` 後端再次獲得支援。Anthropic 人員 告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布 新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的核准行為。</Note>

內建的 OpenAI `codex-cli` 後端會透過 Codex 的 `model_instructions_file` 設定覆寫 (`-c
model_instructions_file="..."`) 傳遞 OpenClaw 的系統提示詞。Codex 未公開 Claude 風格的 `--append-system-prompt` 標誌，因此 OpenClaw 會為每個新的 Codex CLI 會話將組合後的提示詞寫入暫存檔案。

內建的 Anthropic `claude-cli` 後端透過兩種方式接收 OpenClaw 技能快照：附加於系統提示詞中的精簡 OpenClaw 技能目錄，以及透過 `--plugin-dir` 傳遞的暫時性 Claude Code 外掛。該外掛僅包含該代理程式/會話的合格技能，因此 Claude Code 的原生技能解析器會看到與 OpenClaw 在提示詞中廣告相同的過濾集合。技能環境變數/API 金鑰覆寫仍由 OpenClaw 套用至執行的子程序環境。

## 工作階段

- 如果 CLI 支援會話，請設定 `sessionArg` (例如 `--session-id`) 或
  `sessionArgs` (預留位置 `{sessionId}`)，當 ID 需要插入
  多個標誌時。
- 如果 CLI 使用具有不同標誌的 **resume 子指令**，請設定
  `resumeArgs` (恢復時取代 `args`) 並選擇性地設定 `resumeOutput`
  (用於非 JSON 恢復)。
- `sessionMode`：
  - `always`：始終發送會話 ID (若無儲存則為新 UUID)。
  - `existing`：僅在之前儲存了會話 ID 時才發送它。
  - `none`：絕不發送會話 ID。
- `claude-cli` 預設為 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此後續輪次會在程序運作時重用現有的 Claude 程序。Warm stdio 現在是預設值，包括省略傳輸欄位的自訂配置。如果 Gateway 重新啟動或閒置程序退出，OpenClaw 會從儲存的 Claude 會話 ID 恢復。儲存的會話 ID 會在恢復前針對現有的可讀專案記錄進行驗證，因此幻影綁定會被 `reason=transcript-missing` 清除，而不是在 `--resume` 下靜默啟動新的 Claude CLI 會話。
- 儲存的 CLI 會話是提供者所有的連續性。隱含的每日會話重設不會中斷它們；`/reset` 和明確的 `session.reset` 政策仍然會中斷它們。

序列化注意事項：

- `serialize: true` 保持同一通道的執行順序。
- 大多數 CLI 在單一提供者通道上序列化。
- 當選定的驗證身分變更時，OpenClaw 會捨棄儲存的 CLI 會話重用，包括變更的驗證設定檔 ID、靜態 API 金鑰、靜態權杖，或當 CLI 公開時的 OAuth 帳戶身分。OAuth 存取權杖和重新整理權杖的輪換不會中斷儲存的 CLI 會話。如果 CLI 未公開穩定的 OAuth 帳戶 ID，OpenClaw 會讓該 CLI 執行恢復權限。

## 圖片 (直通)

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些路徑將作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示詞 (路徑注入)，這對於能從純路徑自動載入本機檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"` (預設) 嘗試解析 JSON 並提取文字和會話 ID。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字，並從 `stats` 讀取使用量。
- `output: "jsonl"` 會解析 JSONL 串流（例如 Codex CLI `--json`），並在最終代理訊息和會話識別符存在的情況下將其提取出來。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"` （預設）將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 發送提示詞。
- 如果提示詞非常長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

內建的 OpenAI 外掛程式也會為 `codex-cli` 註冊預設值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
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

先決條件：必須安裝本機 Gemini CLI，並且在 `PATH` （`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）上可作為 `gemini` 使用。

Gemini CLI JSON 說明：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 不存在或為空時，使用方式會回退到 `stats`。
- `stats.cached` 會被正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆寫（常見：絕對 `command` 路徑）。

## 外掛程式擁有的預設值

CLI 後端預設值現在是外掛程式介面的一部分：

- 外掛程式使用 `api.registerCliBackend(...)` 註冊它們。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆寫外掛程式的預設值。
- 後端專屬的設定清理工作，透過選用的 `normalizeConfig` hook，仍然由外掛程式擁有。

需要微小提示/訊息相容性墊片的外掛程式，可以宣告雙向文字轉換，而不需要替換提供者或 CLI 後端：

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

`input` 會重寫傳遞給 CLI 的系統提示和使用者提示。`output` 會重寫串流助理增量資料和解析的最終文字，然後再由 OpenClaw 處理自己的控制標記和通道傳遞。

對於發出 Claude Code stream- 相容 JSONL 的 CLI，請在該後端的設定中設定 `jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆蓋層

CLI 後端並**不**會直接接收 OpenClaw 工具呼叫，但後端可以透過 `bundleMcp: true` 選擇加入生成的 MCP 設定覆蓋層。

目前的打包行為：

- `claude-cli`：生成的嚴格 MCP 設定檔
- `codex-cli`：`mcp_servers` 的內聯設定覆寫
- `google-gemini-cli`：生成的 Gemini 系統設定檔

當啟用打包 MCP 時，OpenClaw 會：

- 產生一個回環 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每個會話的權杖 (`OPENCLAW_MCP_TOKEN`) 對橋接器進行身份驗證
- 將工具存取範圍限定在目前的工作階段、帳戶和通道內容
- 為目前的工作區載入已啟用的打包 MCP 伺服器
- 將它們與任何現有的後端 MCP 設定/設定形狀合併
- 使用來自擁有擴充功能之後端擁有的整合模式來重寫啟動設定

如果未啟用 MCP 伺服器，當後端選擇加入打包 MCP 時，OpenClaw 仍會注入嚴格設定，以保持背景執行的隔離性。

## 限制

- **沒有直接的 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入到 CLI 後端通訊協定中。只有在後端選擇加入 `bundleMcp: true` 時，才能看到閘道工具。
- **串流傳輸依後端而異。** 某些後端會串流 JSONL；其他的則會緩衝直到結束。
- **結構化輸出** 取決於 CLI 的 JSON 格式。
- **Codex CLI 會話**透過文字輸出（無 JSONL）恢復，這比初始的 `--json` 執行結構化程度更低。OpenClaw 會話仍然正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **模型名稱錯誤**：使用 `modelAliases` 將 `provider/model` 映射至 CLI 模型。
- **無會話連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是
  `none`（Codex CLI 目前無法以 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並確認 CLI 支援檔案路徑）。
