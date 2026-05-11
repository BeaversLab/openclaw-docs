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

此設計旨在作為 **安全網** 而非主要路徑。當您想要「始終可用」的文字回應而不依賴外部 API 時，可使用此功能。

如果您需要具備 ACP 會話控制、背景任務、執行緒/對話綁定以及持續外部編碼會話的完整套件執行時，請改用 [ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

## 新手友善快速入門

您可以 **無需任何設定** 使用 Codex CLI (內建的 OpenAI 外掛會註冊預設後端)：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果您的閘道在 launchd/systemd 下執行且 PATH 很精簡，請僅加入指令路徑：

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

僅此而已。除了 CLI 本身之外，不需要金鑰或額外的驗證設定。

如果您在閘道主機上將內建的 CLI 後端作為 **主要訊息提供者**，當您的設定在模型參照中或 `agents.defaults.cliBackends` 下明確引用該後端時，OpenClaw 現在會自動載入擁有該後端的內建外掛。

## 作為備援使用

將 CLI 後端加入您的備援清單，使其僅在主要模型失敗時執行：

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

備註：

- 如果您使用 `agents.defaults.models` (允許清單)，您必須將您的 CLI 後端模型也加入其中。
- 如果主要提供商失敗 (驗證、速率限制、逾時)，OpenClaw 將接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端位於：

```
agents.defaults.cliBackends
```

每個條目都以 **提供者 ID** 為鍵值 (例如 `codex-cli`、`my-cli`)。
提供者 ID 會成為您模型參照的左側：

```
<provider>/<model>
```

### 設定範例

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
          serialize: true,
        },
      },
    },
  },
}
```

## 運作原理

1. 根據提供者前綴 (`codex-cli/...`) **選取後端**。
2. **建構系統提示詞**，使用相同的 OpenClaw 提示詞與工作區上下文。
3. **執行 CLI** 並附帶會話 ID (若支援)，以確保歷史記錄保持一致。
   內建的 `claude-cli` 後端會為每個 OpenClaw 會話維持一個 Claude stdio 處理程序存活，並透過 stream- stdin 傳送後續的輪次。
4. **解析輸出** (JSON 或純文字) 並傳回最終文字。
5. **為每個後端保存會話 ID**，以便後續回應重複使用相同的 CLI 會話。

<Note>內建的 Anthropic `claude-cli` 後端已再次獲得支援。Anthropic 人員 告知我們，OpenClaw 風格的 Claude CLI 使用方式已再次被允許，因此除非 Anthropic 發佈 新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的官方核准行為。</Note>

內建的 OpenAI `codex-cli` 後端會透過 Codex 的 `model_instructions_file` 設定覆寫 (`-c
model_instructions_file="..."`) 傳遞 OpenClaw 的系統提示詞。Codex 未公開 Claude 風格的
`--append-system-prompt` 標誌，因此 OpenClaw 會將組裝好的提示詞寫入暫存檔案，用於每個全新的 Codex CLI 會話。

內建的 Anthropic `claude-cli` 後端透過兩種方式接收 OpenClaw 技能快照：附加於系統提示詞中的精簡 OpenClaw 技能目錄，以及透過 `--plugin-dir` 傳遞的暫時性 Claude Code 外掛程式。該外掛程式
僅包含該代理程式/會話的可用技能，因此 Claude Code 的原生技能解析器看到的篩選後集合，與 OpenClaw 本來會在提示詞中
通告的集合相同。技能環境/API 金鑰覆寫仍由 OpenClaw 套用至該次執行的子處理程序環境。

Claude CLI 也有自己的非互動式權限模式。OpenClaw 將其對應到現有的執行策略，而不是新增專屬於 Claude 的配置：當有效請求的執行策略是 YOLO（`tools.exec.security: "full"` 和
`tools.exec.ask: "off"`）時，OpenClaw 會新增 `--permission-mode bypassPermissions`。
針對特定代理的 `agents.list[].tools.exec` 設定會覆寫該代理的全域 `tools.exec`。
若要強制使用不同的 Claude 模式，請在 `agents.defaults.cliBackends.claude-cli.args` 和相符的 `resumeArgs` 下設定明確的原始後端參數，例如 `--permission-mode default` 或 `--permission-mode acceptEdits`。

在 OpenClaw 能使用內建的 `claude-cli` 後端之前，Claude Code 本身必須已經在同一台主機上登入：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

僅當 `claude` 二進位檔案尚未位於 `PATH` 上時，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 工作階段

- 如果 CLI 支援工作階段，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（佔位符 `{sessionId}`），以便在需要將 ID 插入多個標誌時使用。
- 如果 CLI 使用具有不同標誌的 **resume 子指令**，請設定
  `resumeArgs`（恢復時取代 `args`）以及可選的 `resumeOutput`
  （用於非 JSON 恢復）。
- `sessionMode`：
  - `always`：一律傳送工作階段 ID（若未儲存則使用新的 UUID）。
  - `existing`：僅當先前已儲存工作階段 ID 時才傳送。
  - `none`：絕不傳送工作階段 ID。
- `claude-cli` 預設為 `liveSession: "claude-stdio"`、`output: "jsonl"` 和
  `input: "stdin"`，因此後續輪次會在程序處於活動狀態時重用即時 Claude 程序。溫啟 stdio 現在是預設值，包括對於省略傳輸欄位的自訂設定也是如此。如果 Gateway 重新啟動或閒置程序退出，OpenClaw 會從儲存的 Claude session id 恢復。儲存的 session id 會在恢復前針對現有的可讀取專案文字記錄進行驗證，因此虛幻綁定會透過 `reason=transcript-missing` 清除，而不是在 `--resume` 下靜默啟動一個新的 Claude CLI session。
- 儲存的 CLI session 是提供者擁有的連續性。隱含的每日 session 重置不會中斷它們；`/reset` 和明確的 `session.reset` 政策仍然會。

序列化備註：

- `serialize: true` 會對同通道執行進行排序。
- 大多數 CLI 在一個提供者通道上序列化。
- 當選取的驗證身分變更時，包括變更的驗證設定檔 id、靜態 API 金鑰、靜態權杖，或當 CLI 公開時的 OAuth 帳戶身分，OpenClaw 會捨棄儲存的 CLI session 重用。OAuth 存取和更新權杖輪替不會切斷儲存的 CLI session。如果 CLI 不公開穩定的 OAuth 帳戶 id，OpenClaw 會讓該 CLI 執行恢復權限。

## 圖像 (穿透傳遞)

如果您的 CLI 接受圖像路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖像寫入暫存檔案。如果設定了 `imageArg`，這些路徑會作為 CLI 引數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示 (路徑注入)，這對於從純路徑自動載入本機檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"` (預設) 嘗試解析 JSON 並擷取文字 + session id。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字，並從 `stats` 讀取使用量。
- `output: "jsonl"` 解析 JSONL 串流 (例如 Codex CLI `--json`) 並擷取最終代理訊息以及 session 識別符 (如果存在的話)。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"` （預設）將提示作為最後一個 CLI 引數傳遞。
- `input: "stdin"` 透過 stdin 發送提示。
- 如果提示很長且設定了 `maxPromptArgChars`，則使用 stdin。

## 預設值（外掛擁有）

內建的 OpenAI 外掛也註冊了 `codex-cli` 的預設值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

內建的 Google 外掛也註冊了 `google-gemini-cli` 的預設值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

先決條件：必須安裝本機 Gemini CLI 並且在 `PATH` （`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）上可作為 `gemini` 使用。

Gemini CLI JSON 備註：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 不存在或為空時，使用量會回退到 `stats`。
- `stats.cached` 會被正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從
  `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆寫（常見：絕對 `command` 路徑）。

## 外掛擁有的預設值

CLI 後端預設值現在是外掛介面的一部分：

- 外掛使用 `api.registerCliBackend(...)` 註冊它們。
- 後端 `id` 成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆寫外掛預設值。
- 後端特定的設定清理仍然透過可選的
  `normalizeConfig` hook 由外掛擁有。

需要微小提示/訊息相容性填充層的外掛程式可以宣告雙向文字轉換，而無需取代提供者或 CLI 後端：

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

`input` 重寫傳遞給 CLI 的系統提示和用戶提示。`output`
在 OpenClaw 處理其自己的控制標記和通道傳遞之前，重寫串流輸出的助理差量和解析的最終文字。

對於發出與 Claude Code stream- 相容的 JSONL 的 CLI，請在該後端的配置中設定
`jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆蓋層

CLI 後端並**不**直接接收 OpenClaw 工具呼叫，但後端可以選擇使用 `bundleMcp: true` 加入生成的 MCP 配置覆蓋層。

當前的打包行為：

- `claude-cli`：生成的嚴格 MCP 配置檔案
- `codex-cli`：`mcp_servers` 的內聯配置覆蓋；生成的
  OpenClaw 回送伺服器會標記 Codex 的每伺服器工具批准模式，
  因此 MCP 呼叫不會因本機批准提示而停滯
- `google-gemini-cli`：生成的 Gemini 系統設定檔案

當啟用打包 MCP 時，OpenClaw：

- 產生一個回送 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每會話令牌 (`OPENCLAW_MCP_TOKEN`) 對橋接進行身份驗證
- 將工具存取範圍限定於目前的工作階段、帳戶和通道上下文
- 為目前的工作區載入已啟用的打包 MCP 伺服器
- 將它們與任何現有的後端 MCP 配置/設定形狀合併
- 使用來自擁有擴充功能的後端擁有的整合模式重寫啟動配置

如果未啟用 MCP 伺服器，當後端選擇加入打包 MCP 時，OpenClaw 仍會注入嚴格配置，以便背景執行保持隔離。

工作階段範圍的打包 MCP 執行時間會被快取以在工作階段內重複使用，然後在閒置 `mcp.sessionIdleTtlMs` 毫秒後回收
（預設 10 分鐘；設定 `0` 以停用）。一次性嵌入式執行（例如驗證探測、
slug 生成和執行結束時的活動記憶體回憶請求清理）會進行清理，以便 stdio
子程序和可串流 HTTP/SSE 串流不會超出執行生命週期。

## 限制

- **無直接的 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入到
  CLI 後端通訊協定中。後端只有在選擇加入
  `bundleMcp: true` 時才會看到閘道工具。
- **串流取決於後端。** 某些後端串流 JSONL；其他的則會緩衝
  直到退出。
- **結構化輸出** 取決於 CLI 的 JSON 格式。
- **Codex CLI 會話** 透過文字輸出（無 JSONL）恢復，這比最初的
  `--json` 執行更不具結構性。OpenClaw 會話仍能
  正常運作。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無會話連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是
  `none`（Codex CLI 目前無法使用 JSON 輸出恢復）。
- **圖片被忽略**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [Local models](/zh-Hant/gateway/local-models)
