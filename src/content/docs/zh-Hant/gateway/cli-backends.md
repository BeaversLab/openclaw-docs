---
summary: "CLI 後端：本地 AI CLI 備援與選用 MCP 工具橋接"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 後端"
---

當 API 提供商斷線、受到速率限制或暫時異常時，OpenClaw 可以將 **本機 AI CLI** 作為 **僅文字備援** 來執行。此設計意趨保守：

- **OpenClaw 工具不會直接被注入**，但具有 `bundleMcp: true` 的後端
  可以透過回送 MCP 橋接器接收閘道工具。
- 針對支援的 CLI 提供 **JSONL 串流**。
- **支援會話** (因此後續回應能保持連貫)。
- 若 CLI 接受圖片路徑，**圖片可以被傳遞**。

此設計旨在作為一個**安全網**，而非主要途徑。當您希望在不依賴外部 API 的情況下獲得「始終可用」的文字回應時，請使用此功能。

如果您需要一個完整的 ACP 會話控制、背景任務、
執行緒/對話綁定以及持久化外部編碼會話的運行時環境，請改用
[ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

<Tip>正在建立新的後端外掛？請使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)。本頁面適用於 配置和操作已註冊後端的使用者。</Tip>

## 新手友善的快速入門

您可以**完全不需要配置**（內建的 Anthropic 外掛
會註冊預設後端）來使用 Claude Code CLI：

```bash
openclaw agent --message "hi" --model claude-cli/claude-sonnet-4-6
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

就這樣。除了 CLI 本身之外，不需要金鑰或額外的 auth 設定。

如果您在閘道主機上將捆綁的 CLI 後端用作**主要訊息提供者**，當您的設定在模型參考中或 `agents.defaults.cliBackends` 之下明確參考該後端時，OpenClaw 現在會自動載入擁有該後端的捆綁外掛程式。

## 將其作為後備使用

將 CLI 後端新增到您的後備清單中，使其僅在主要模型失敗時執行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/claude-sonnet-4-6"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/claude-sonnet-4-6": {},
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

每個條目都以 **提供者 ID** 為鍵（例如 `claude-cli`、`my-cli`）。
提供者 ID 會成為您的模型參照的左側部分：

```
<provider>/<model>
```

### 配置範例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
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

1. **根據提供者前綴（`claude-cli/...`）選取後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. **執行 CLI** 時附帶會話 ID (如果支援)，以確保歷史記錄保持一致。
   內建的 `claude-cli` 後端會為每個 OpenClaw 會話維持一個 Claude stdio 程序，並透過 stream- stdin 發送後續輪次。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>內建的 Anthropic `claude-cli` 後端再次獲得支援。Anthropic 人員 告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布 新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的核准行為。</Note>

內建的 Anthropic `claude-cli` 後端偏好使用 Claude Code 的原生技能
解析器來處理 OpenClaw 技能。當目前的技能快照包含至少
一個具有具體化路徑的已選技能時，OpenClaw 會傳遞一個帶有 `--plugin-dir` 的暫時 Claude
Code 外掛，並從附加的系統提示詞中省略重複的 OpenClaw 技能目錄。
如果快照沒有具體化的外掛技能，OpenClaw 會保留提示詞目錄作為備援。
技能環境變數/API 金鑰的覆蓋設定仍會由 OpenClaw 套用至
該次執行的子程序環境中。

Claude CLI 也有其自己的非互動式權限模式。OpenClaw 將其
對應至現有的執行策略，而不是新增 Claude 專用的策略配置。
對於由 OpenClaw 管理的 Claude 即時會話，有效的 OpenClaw 執行策略
具有最終決定權：YOLO (`tools.exec.security: "full"` 和
`tools.exec.ask: "off"`) 模式會以 `--permission-mode bypassPermissions` 啟動 Claude，而限制性有效執行策略
則會以 `--permission-mode default` 啟動 Claude。針對個別代理的
`agents.list[].tools.exec` 設定會覆蓋該代理的全域 `tools.exec`。
原始的 Claude 後端引數可能仍包含 `--permission-mode`，但即時
Claude 啟動程序會將該標準化以符合有效的 OpenClaw 執行策略。

內建的 Anthropic `claude-cli` 後端也會將 OpenClaw 的 `/think` 層級映射到 Claude Code 原生的 `--effort` 標誌（針對非關閉層級）。`minimal` 和 `low` 映射到 `low`，`adaptive` 和 `medium` 映射到 `medium`，而 `high`、`xhigh` 和 `max` 則直接映射。其他 CLI 後端需要其所屬外掛宣告對等的 argv 映射器，`/think` 才能影響啟動的 CLI。

在 OpenClaw 能夠使用內建的 `claude-cli` 後端之前，Claude Code 本身必須已經在同一台主機上登入：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

僅當 `claude` 二進位檔案尚未位於 `PATH` 時，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 工作階段

- 如果 CLI 支援 sessions，請設定 `sessionArg`（例如 `--session-id`）或 `sessionArgs`（佔位符 `{sessionId}`），當 ID 需要插入多個標誌時。
- 如果 CLI 使用帶有不同標誌的 **resume 子命令**，請設定 `resumeArgs`（恢復時取代 `args`）以及可選的 `resumeOutput`（用於非 JSON 恢復）。
- `sessionMode`:
  - `always`：始終發送 session ID（若未儲存則為新的 UUID）。
  - `existing`：僅在之前已儲存時才發送 session ID。
  - `none`：從不發送 session ID。
- `claude-cli` 預設為 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此後續輪次會在活躍時重用運行中的 Claude 處理程序。預熱 stdio 現在是預設行為，包括省略傳輸欄位的自訂設定。如果 Gateway 重新啟動或閒置處理程序退出，OpenClaw 會從儲存的 Claude session id 恢復。在恢復之前，會根據現有的可讀取專案逐字稿驗證儲存的 session id，因此虛幻綁定會使用 `reason=transcript-missing` 清除，而不是在 `--resume` 下靜默啟動新的 Claude CLI session。
- Claude 即時 session 保持有界的 JSONL 輸出防護。預設值允許每輪最多 8 MiB 和 20,000 行原始 JSONL 行。工具繁重的 Claude 輪次可以透過 `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars` 和 `maxTurnLines` 針對各個後端提高這些限制；OpenClaw 會將這些設定限制為 64 MiB 和 100,000 行。
- 儲存的 CLI session 是提供者擁有的連續性。隱含的每日 session 重置不會中斷它們；`/reset` 和明確的 `session.reset` 政策仍然會。
- 新的 CLI session 通常僅從 OpenClaw 的壓縮摘要以及壓縮後尾部重新植入。若要恢復在壓縮前失效的短 session，後端可以使用 `reseedFromRawTranscriptWhenUncompacted: true` 加入。OpenClaw 仍會保持原始逐字稿重新植入有界，並將其限制在安全的失效情況，例如遺失的 CLI 逐字稿、system-prompt/MCP 變更或 session 過期的重試；auth profile 或 credential-epoch 變更絕不會重新植入原始逐字稿歷史。

序列化註記：

- `serialize: true` 保持同車道的執行順序。
- 大多數 CLI 在單一提供者通道上進行序列化。
- 當選取的驗證身分變更時，包括變更的驗證設定檔 id、靜態 API 金鑰、靜態權杖，或是當 CLI 公開時的 OAuth 帳戶身分，OpenClaw 會捨棄儲存的 CLI session 重用。OAuth 存取和更新權杖輪換不會中斷儲存的 CLI session。如果 CLI 沒有公開穩定的 OAuth 帳戶 id，OpenClaw 會讓該 CLI 強制執行恢復權限。

## 來自 claude-cli session 的後備前導

當 `claude-cli` 嘗試失敗並轉移到 [`agents.defaults.model.fallbacks`](/zh-Hant/concepts/model-failover) 中的非 CLI 候選者時，OpenClaw 會使用從 `~/.claude/projects/` 的 Claude Code 本地 JSONL 逐字稿中收集的 context 前奏來植入下一次嘗試。如果沒有此種子，備援提供者將冷啟動，因為 OpenClaw 自己的 session 逐字稿對於 `claude-cli` 執行來說是空的。

- 前言優先使用最新的 `/compact` 摘要或 `compact_boundary`
  標記，然後附加邊界之後最近的輪次，直至達到字元
  預算。邊界之前的輪次會被丟棄，因為摘要已經代表了
  它們。
- 工具區塊會被合併為緊湊的 `(tool call: name)` 和
  `(tool result: …)` 提示，以確保提示預算誠實。如果摘要溢出，
  則會被標記為 `(truncated)`。
- 同供應商 `claude-cli` 到 `claude-cli` 的後備依賴 Claude 自己的
  `--resume` 並跳過前言。
- 種子會重用現有的 Claude 會話檔案路徑驗證，因此無法讀取任意路徑。

## 影像 （直通傳遞）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔案。如果設定了 `imageArg`，這些
路徑將會作為 CLI 引數傳遞。如果缺少 `imageArg`，OpenClaw 會將
檔案路徑附加到提示（路徑注入），這對於會從純路徑自動
載入本機檔案的 CLI 來說已經足夠了。

## 輸入 / 輸出

- `output: "json"`（預設）會嘗試解析 JSON 並提取文字 + 會話 ID。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或空白時，
  OpenClaw 會從 `response` 讀取回覆文字，並從
  `stats` 讀取用量。
- `output: "jsonl"` 會解析 JSONL 串流並提取最終的代理訊息以及（如果存在的）會話
  識別碼。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"`（預設）會將提示作為最後一個 CLI 引數傳遞。
- `input: "stdin"` 會透過 stdin 發送提示。
- 如果提示非常長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

捆綁的 CLI 後端預設值與其擁有的外掛共存。例如，
Anthropic 擁有 `claude-cli`，Google 擁有 `google-gemini-cli`。OpenAI Codex
代理執行會透過 `openai/*` 使用 Codex 應用伺服器擴充功能；OpenClaw 不
再註冊捆綁的 `codex-cli` 後端。

捆綁的 Anthropic 外掛會為 `claude-cli` 註冊預設值：

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

內建的 Google 插件也會為 `google-gemini-cli` 註冊預設值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

先決條件：本機 Gemini CLI 必須已安裝，並可在
`PATH` 上作為 `gemini` 使用（`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）。

Gemini CLI JSON 說明：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 缺失或為空時，使用方式會回退至 `stats`。
- `stats.cached` 會被正規化為 OpenClaw 的 `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從
  `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆寫（常見情況：絕對 `command` 路徑）。

## 外掛程式擁有的預設值

CLI 後端預設值現已成為外掛程式介面的一部分：

- 外掛程式使用 `api.registerCliBackend(...)` 來註冊它們。
- 後端的 `id` 會成為模型引用中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者組態仍然會覆寫外掛程式的預設值。
- 特定於後端的組態清理透過選用的
  `normalizeConfig` hook 仍由外掛程式擁有。

需要微小的提示/訊息相容性填充層的外掛程式，可以宣告雙向文字轉換，而無需取代提供者或 CLI 後端：

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

`input` 會重寫傳遞給 CLI 的系統提示詞和使用者提示詞。`output`
會在 OpenClaw 處理自己的控制標記和通道傳遞之前，重寫串流助手增量資料和解析的最終文字。

對於發出與 Claude Code stream- 相容 JSONL 的 CLI，請在該後端的組態上設定
`jsonlDialect: "claude-stream-json"`。

## 套件 MCP 覆蓋層

CLI 後端**不會**直接接收 OpenClaw 工具呼叫，但後端可以選擇透過 `bundleMcp: true` 加入生成的 MCP 組態疊加層。

目前的套件行為：

- `claude-cli`：生成的嚴格 MCP 組態檔案
- `google-gemini-cli`：生成的 Gemini 系統設定檔案

當啟用套件 MCP 時，OpenClow 會：

- 產生一個回送 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每次會話的權杖驗證橋接器 (`OPENCLAW_MCP_TOKEN`)
- 將工具存取範圍限制在目前的工作階段、帳戶和通道上下文
- 為目前的工作區載入已啟用的套件 MCP 伺服器
- 將其與任何現有的後端 MCP 配置/設定結構合併
- 使用來自擁有擴充功能之後端擁有的整合模式重寫啟動配置

如果未啟用 MCP 伺服器，當後端選擇使用套件 MCP 時，OpenClow 仍會注入嚴格配置，以便背景執行保持隔離。

會話範圍的捆綁 MCP 運行時會被快取以在會話內重複使用，然後在閒置 `mcp.sessionIdleTtlMs` 毫秒後被回收（預設為 10 分鐘；設定 `0` 可停用）。一次性嵌入式執行（例如驗證探測、slug 生成和主動記憶召回請求）會在執行結束時清理，以確保 stdio 子程序和可串流 HTTP/SSE 串流不會超過執行的生命週期。

## 重新播種歷史上限

當從先前的 OpenClaw 逐字稿播種新的 CLI 會話時（例如在 `session_expired` 重試後），渲染的 `<conversation_history>` 區塊會被限制上限，以防止重新播種提示爆炸。預設值為 `12288` 個字元（約 3000 個 token）。

Claude CLI 後端會自動使用根據解析出的 Claude 內容層級所得出的較大上限。標準 200K token 的 Claude 執行會保留較大的逐字稿片段，而 1M token 的 Claude 執行會保留更大的片段，而其他 CLI 後端則保留保守的預設值。

- 此上限僅控制重新播種提示的先前歷史區塊。即時會話的輸出限制是在 `reliability.outputLimits` 下單獨調整的（請參閱 [Sessions](#sessions)）。

## 限制

- **無直接的 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入 CLI 後端通訊協定。後端只有在選擇加入 `bundleMcp: true` 時，才能看到閘道工具。
- **串流傳輸取決於後端。** 某些後端串流 JSONL；其他則會緩衝直到結束。
- **結構化輸出** 取決於 CLI 的 JSON 格式。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **模型名稱錯誤**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無會話連續性**：確保已設定 `sessionArg` 且 `sessionMode` 不是 `none`。
- **忽略圖片**：設定 `imageArg`（並驗證 CLI 是否支援檔案路徑）。

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [Local models](/zh-Hant/gateway/local-models)
