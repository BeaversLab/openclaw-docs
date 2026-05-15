---
summary: "CLI 後端：本地 AI CLI 備援與選用 MCP 工具橋接"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 後端"
---

當 API 提供商斷線、受到速率限制或暫時異常時，OpenClaw 可以將 **本機 AI CLI** 作為 **僅文字備援** 來執行。此設計意趨保守：

- **OpenClaw 工具不會被直接注入**，但具有 `bundleMcp: true` 的後端可以透過迴路 MCP 橋接接收閘道工具。
- 針對支援的 CLI 提供 **JSONL 串流**。
- **支援會話** (因此後續回應能保持連貫)。
- 若 CLI 接受圖片路徑，**圖片可以被傳遞**。

此設計旨在作為一個**安全網**，而非主要途徑。當您希望在不依賴外部 API 的情況下獲得「始終可用」的文字回應時，請使用此功能。

如果您需要具有 ACP 會話控制、背景任務、執行緒/對話綁定以及持久外部編碼會話的完整運行時環境，請改用 [ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

<Tip>正在建立新的後端外掛嗎？請使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)。此頁面專供設定和操作已註冊後端的使用者使用。</Tip>

## 新手友善的快速入門

您可以在**不需要任何配置**的情況下使用 Codex CLI（內建的 OpenAI 外掛程式會註冊預設後端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
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

就這樣。除了 CLI 本身之外，不需要金鑰或額外的 auth 設定。

如果您在閘道主機上使用內建的 CLI 後端作為**主要訊息提供者**，當您的設定在模型參照或 `agents.defaults.cliBackends` 下明確參照該後端時，OpenClaw 現在會自動載入擁有該後端的內建外掛。

## 將其作為後備使用

將 CLI 後端新增到您的後備清單中，使其僅在主要模型失敗時執行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

注意事項：

- 如果您使用 `agents.defaults.models` (允許清單)，您也必須將您的 CLI 後端模型包含在內。
- 如果主要提供者失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端皆位於：

```
agents.defaults.cliBackends
```

每個條目都以**提供者 ID** 為鍵 (例如 `codex-cli`、`my-cli`)。
提供者 ID 會成為您模型參照的左側部分：

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
          // For CLIs with a dedicated prompt-file flag:
          // systemPromptFileArg: "--system-file",
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          // Opt in only if this backend may reseed safe invalidated sessions
          // from bounded raw OpenClaw transcript history before compaction.
          reseedFromRawTranscriptWhenUncompacted: true,
          serialize: true,
        },
      },
    },
  },
}
```

## 運作原理

1. **選擇後端**依據提供者前綴 (`codex-cli/...`)。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. **執行 CLI** 並附帶會話 ID (如果支援)，以便保持歷史記錄一致。
   內建的 `claude-cli` 後端會為每個 OpenClaw 會話保持一個 Claude stdio 程序運作，並透過 stream- stdin 發送後續輪次。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>內建的 Anthropic `claude-cli` 後端再次獲得支援。Anthropic 人員 告知我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布 新政策，否則 OpenClaw 視 `claude -p` 的使用為此整合的認可行為。</Note>

內建的 OpenAI `codex-cli` 後端透過 Codex 的 `model_instructions_file` 設定覆寫 (`-c
model_instructions_file="..."`) 傳遞 OpenClaw 的系統提示詞。Codex 未公開 Claude 風格的
`--append-system-prompt` 標誌，因此 OpenClaw 會將組裝好的提示詞寫入每個新的 Codex CLI 會話的暫存檔案中。

內建的 Anthropic `claude-cli` 後端透過兩種方式接收 OpenClaw 技能快照：附加於系統提示中的簡潔 OpenClaw 技能目錄，以及透過 `--plugin-dir` 傳遞的暫時性 Claude Code 外掛程式。此外掛程式僅包含該代理/Session 的合資格技能，因此 Claude Code 原生的技能解析器會看到與 OpenClaw 在提示中原本宣傳的相同過濾集合。技能環境變數/API 金鑰覆寫仍由 OpenClaw 套用至該次執行的子流程環境中。

Claude CLI 也有自己的非互動權限模式。OpenClaw 將其對應至現有的執行策略，而非新增 Claude 特定的組態：當有效請求的執行策略為 YOLO (`tools.exec.security: "full"` 和 `tools.exec.ask: "off"`) 時，OpenClaw 會新增 `--permission-mode bypassPermissions`。針對該代理，個別代理的 `agents.list[].tools.exec` 設定會覆寫全域的 `tools.exec`。若要強制使用不同的 Claude 模式，請在 `agents.defaults.cliBackends.claude-cli.args` 下設定明確的原始後端引數（例如 `--permission-mode default` 或 `--permission-mode acceptEdits`）以及對應的 `resumeArgs`。

內建的 Anthropic `claude-cli` 後端也會將 OpenClaw 的 `/think` 等級對應至 Claude Code 原生的 `--effort` 旗標（針對非關閉等級）。`minimal` 和 `low` 會對應至 `low`，`adaptive` 和 `medium` 會對應至 `medium`，而 `high`、`xhigh` 和 `max` 則直接對應。其他 CLI 後端需要其擁有的外掛程式宣告對等的 argv 對應器，`/think` 才能影響產生的 CLI。

在 OpenClaw 使用內建的 `claude-cli` 後端之前，Claude Code 本身必須已經在同一台主機上登入：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

僅當 `claude` 二進位檔案尚未位於 `PATH` 時，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## Sessions

- 如果 CLI 支援 session，請設定 `sessionArg` (例如 `--session-id`) 或
  `sessionArgs` (placeholder `{sessionId}`)，當 ID 需要插入
  至多個 flags 時。
- 如果 CLI 使用具有不同 flags 的 **resume 子指令**，請設定
  `resumeArgs` (resume 時取代 `args`) 以及可選的 `resumeOutput`
  (用於非 JSON resume)。
- `sessionMode`：
  - `always`：總是發送 session id (若無儲存則使用新 UUID)。
  - `existing`：僅在先前已儲存時才發送 session id。
  - `none`：永不發送 session id。
- `claude-cli` 預設為 `liveSession: "claude-stdio"`、`output: "jsonl"`
  與 `input: "stdin"`，因此後續的輪次會在其活躍時重用即時的 Claude 處理程序。Warm stdio 現在是預設值，包括對於省略 transport 欄位的自訂設定。如果 Gateway 重新啟動或閒置處理程序退出，OpenClaw 會從儲存的 Claude session id 恢復。儲存的 session id 會在恢復前針對現有的可讀取專案文字紀錄進行驗證，因此虛幻綁定會使用 `reason=transcript-missing` 清除，
  而不是無聲地啟動新的 Claude CLI session 於 `--resume` 之下。
- Claude 即時 session 保持有限的 JSONL 輸出防護。預設值允許每輪最多
  8 MiB 和 20,000 行原始 JSONL 行。重度使用工具的 Claude 輪次可以針對各個後端提高它們，透過
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines`；OpenClaw 會將這些設定限制在 64 MiB 和 100,000
  行。
- 儲存的 CLI sessions 是提供者擁有的連續性。隱含的每日 session 重置不會中斷它們；`/reset` 和明確的 `session.reset` 政策仍然會。
- 全新的 CLI 會話通常僅從 OpenClaw 的壓縮摘要以及壓縮後的尾部重新播種。為了恢復在壓縮之前失效的短會話，後端可以透過 `reseedFromRawTranscriptWhenUncompacted: true` 來選擇加入。OpenClaw 仍會將原始記錄重新播種限制在一定範圍內，並僅允許安全的失效情況，例如遺失 CLI 記錄、系統提示詞/MCP 變更或會話過期重試；認證設定檔或憑證週期的變更絕不會重新播種原始記錄歷史。

序列化注意事項：

- `serialize: true` 保持同通道運作的順序。
- 大多數 CLI 在單一提供者通道上序列化。
- 當選取的認證身分變更時，OpenClaw 會捨棄已儲存的 CLI 會話重用，包括變更的認證設定檔 ID、靜態 API 金鑰、靜態權杖，或是當 CLI 公開時的 OAuth 帳號身分。OAuth 存取權杖和重新整理權杖的輪替不會中斷已儲存的 CLI 會話。如果 CLI 未公開穩定的 OAuth 帳號 ID，OpenClaw 會讓該 CLI 強制執行恢復權限。

## 來自 claude-cli 會話的後續前奏

當 `claude-cli` 嘗試在 [`agents.defaults.model.fallbacks`](/zh-Hant/concepts/model-failover) 中故障轉移至非 CLI 候選者時，OpenClaw 會使用從 `~/.claude/projects/` 處的 Claude Code 本地 JSONL 記錄中收割的上下文前奏來播種下一次嘗試。如果沒有這個種子，後備提供者將從頭開始，因為 OpenClaw 自身的會話記錄對於 `claude-cli` 運作來說是空的。

- 該前奏優先使用最新的 `/compact` 摘要或 `compact_boundary` 標記，然後附加最近邊界後的回合，直至字元預算上限。邊界前的回合會被捨棄，因為摘要已經代表了它們。
- 工具區塊會被合併以壓縮 `(tool call: name)` 和 `(tool result: …)` 提示，以確保提示預算的誠實性。如果摘要溢出，會被標記為 `(truncated)`。
- 同提供者從 `claude-cli` 到 `claude-cli` 的後備依賴 Claude 自身的 `--resume` 並跳過前奏。
- 該種子重用現有的 Claude 會話檔案路徑驗證，因此無法讀取任意路徑。

## 圖像（直通）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些路徑將作為 CLI 參數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示詞中 (路徑注入)，這對於能自動從純路徑載入本地檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"` (預設) 嘗試解析 JSON 並擷取文字 + session id。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字，並從 `stats` 讀取使用量。
- `output: "jsonl"` 會解析 JSONL 串流 (例如 Codex CLI `--json`)，並在存在時擷取最終的代理程式訊息以及 session 識別碼。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"` (預設) 將提示詞作為最後一個 CLI 參數傳遞。
- `input: "stdin"` 透過 stdin 傳送提示詞。
- 如果提示詞很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值 (外掛程式擁有)

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

先決條件：必須安裝本機 Gemini CLI 並在 `PATH` (`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`) 上可作為 `gemini` 使用。

Gemini CLI JSON 說明：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 缺失或為空時，使用情況會回退到 `stats`。
- `stats.cached` 會被正規化為 OpenClaw 的 `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆蓋（常見：絕對 `command` 路徑）。

## 外掛擁有的預設值

CLI 後端預設值現在是外掛介面的一部分：

- 外掛使用 `api.registerCliBackend(...)` 註冊它們。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆蓋外掛預設值。
- 後端特定的設定清理保持由外掛擁有，透過可選的 `normalizeConfig` hook。

需要小型提示/訊息相容性墊片的外掛可以宣告雙向文字轉換，而無需取代提供者或 CLI 後端：

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

`input` 重寫傳遞給 CLI 的系統提示和使用者提示。`output` 在 OpenClaw 處理自己的控制標記和通道傳遞之前，重寫串流助理增量和解析的最終文字。

對於發出 Claude Code stream- 相容 JSONL 的 CLI，請在該後端的設定上設定 `jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆蓋層

CLI 後端**不**會直接接收 OpenClaw 工具呼叫，但後端可以透過 `bundleMcp: true` 選擇加入生成的 MCP 設定覆蓋層。

當前的打包行為：

- `claude-cli`：生成的嚴格 MCP 設定檔
- `codex-cli`：`mcp_servers` 的內聯設定覆蓋；生成的 OpenClaw 回送伺服器會標記 Codex 的每伺服器工具批准模式，因此 MCP 呼叫不會因本機批准提示而停滯
- `google-gemini-cli`：生成的 Gemini 系統設定檔

當啟用打包 MCP 時，OpenClaw：

- 生成一個回送 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每個會話的 token (`OPENCLAW_MCP_TOKEN`) 對橋接器進行身份驗證
- 將工具存取權限限縮在目前的工作階段、帳戶和頻道內容中
- 為目前的工作區載入已啟用的 bundle-MCP 伺服器
- 將它們與任何既有的後端 MCP 設定/設定值結構合併
- 使用來自有擁有權擴充功能的後端擁有整合模式來重寫啟動設定

如果沒有啟用 MCP 伺服器，當後端選擇加入 bundle MCP 時，OpenClaw 仍會注入嚴格的設定，以便背景執行保持隔離。

工作階段範圍的套件組合 MCP 執行時期會被快取以在工作階段內重複使用，然後在閒置 `mcp.sessionIdleTtlMs` 毫秒後被回收（預設 10 分鐘；設定 `0` 以停用）。一次性嵌入式執行（例如驗證探測、代稱生成和執行結束時的主動記憶回憶請求清理）會進行清理，以確保 stdio 子行程和可串流 HTTP/SSE 串流不會在執行結束後繼續存在。

## 限制

- **無直接 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入 CLI 後端協定。後端只有在選擇加入 `bundleMcp: true` 時才能看到閘道工具。
- **串流傳輸視後端而定。** 某些後端會串流傳輸 JSONL；其他則會緩衝直到結束。
- **結構化輸出**取決於 CLI 的 JSON 格式。
- **Codex CLI 工作階段**透過文字輸出繼續（無 JSONL），這比初始的 `--json` 執行結構化程度更低。OpenClaw 工作階段仍可正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應到 CLI 模型。
- **無工作階段連續性**：請確保已設定 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前無法以 JSON 輸出繼續）。
- **圖片被忽略**：設定 `imageArg`（並確認 CLI 支援檔案路徑）。

## 相關

- [Gateway 操作手冊](/zh-Hant/gateway)
- [本機模型](/zh-Hant/gateway/local-models)
