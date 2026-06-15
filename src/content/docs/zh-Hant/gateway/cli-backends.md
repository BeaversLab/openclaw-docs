---
summary: "CLI 後端：本地 AI CLI 備援與選用的 MCP 工具橋接"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 後端"
---

當 API 提供商斷線、受到速率限制或暫時異常時，OpenClaw 可以將 **本機 AI CLI** 作為 **僅文字備援** 來執行。此設計意趨保守：

- **OpenClaw 工具並不會直接被注入**，但具有 `bundleMcp: true` 的後端可以透過迴路 MCP 橋接器接收閘道工具。
- 針對支援的 CLI 提供 **JSONL 串流**。
- **支援會話** (因此後續回應能保持連貫)。
- 若 CLI 接受圖片路徑，**圖片可以被傳遞**。

此設計旨在作為一個**安全網**，而非主要途徑。當您希望在不依賴外部 API 的情況下獲得「始終可用」的文字回應時，請使用此功能。

如果您需要具備 ACP 會話控制、背景任務、執行緒/對話綁定以及持續性外部編碼會話的完整牽引運行時，請改用 [ACP Agents](/zh-Hant/tools/acp-agents)。CLI 後端並非 ACP。

<Tip>正在建立新的後端外掛嗎？請使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)。本頁面是供設定和操作已註冊後端的使用者使用。</Tip>

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

如果您在閘道主機上將捆綁的 CLI 後端用作 **主要訊息提供者**，當您的設定在模型參考或 `agents.defaults.cliBackends` 下列該後端時，OpenClaw 現在會自動載入擁有該後端的捆綁外掛。

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

- 如果您使用 `agents.defaults.models` (允許清單)，您也必須將您的 CLI 後端模型包含在其中。
- 如果主要提供者失敗（驗證、速率限制、逾時），OpenClaw 將
  接著嘗試 CLI 後端。

## 設定概覽

所有 CLI 後端皆位於：

```
agents.defaults.cliBackends
```

每個條目都是以 **提供者 ID** 為鍵值 (例如 `claude-cli`、`my-cli`)。
提供者 ID 會成為您模型參考的左側部分：

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

1. 根據提供者前綴 (`claude-cli/...`) **選取後端**。
2. 使用相同的 OpenClaw 提示詞 + 工作區上下文來**建構系統提示詞**。
3. **執行 CLI** 並附上會話 ID (如果支援)，以便歷史記錄保持一致。
   捆綁的 `claude-cli` 後端會為每個 OpenClaw 會話保持一個 Claude stdio 程序運作，並透過 stream- stdin 傳送後續輪次。
4. **解析輸出**（JSON 或純文字）並傳回最終文字。
5. 對每個後端**保存會話 ID**，以便後續追問重複使用相同的 CLI 會話。

<Note>捆綁的 Anthropic `claude-cli` 後端再次受到支援。Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 `claude -p` 的使用視為此整合的核准行為。</Note>

隨附的 Anthropic `claude-cli` 後端偏好使用 Claude Code 原生的 skill 解析器來解析 OpenClaw skills。當目前的 skills 快照包含至少一個具有具體路徑的已選擇 skill 時，OpenClaw 會傳遞一個帶有 `--plugin-dir` 的暫時性 Claude Code 外掛，並從附加的系統提示詞中省略重複的 OpenClaw skills 目錄。如果快照沒有具體的外掛 skill，OpenClaw 會保留提示詞目錄作為後備。Skill 環境變數/API 金鑰覆寫仍會由 OpenClaw 套用至該次執行的子行程環境中。

Claude CLI 也有自己的非互動式權限模式。OpenClaw 將其映射至現有的 exec 原則，而不是新增 Claude 特定的原則配置。對於由 OpenClaw 管理的 Claude 即時作業階段，有效的 OpenClaw exec 原則具有最終決定權：YOLO（`tools.exec.security: "full"` 和 `tools.exec.ask: "off"`）會以 `--permission-mode bypassPermissions` 啟動 Claude，而具限制性的有效 exec 原則則會以 `--permission-mode default` 啟動 Claude。每個代理程式的 `agents.list[].tools.exec` 設定會覆寫該代理程式的全域 `tools.exec`。原始的 Claude 後端參數可能仍包含 `--permission-mode`，但即時的 Claude 啟動程序會將該標準化以符合有效的 OpenClaw exec 原則。

隨附的 Anthropic `claude-cli` 後端也會將 OpenClaw `/think` 層級映射至 Claude Code 原生的 `--effort` 標誌（針對非關閉層級）。`minimal` 和 `low` 會映射至 `low`，`adaptive` 和 `medium` 會映射至 `medium`，而 `high`、`xhigh` 和 `max` 則會直接映射。其他 CLI 後端需要其擁有的外掛宣告等效的 argv 映射器，`/think` 才能影響衍生的 CLI。

在 OpenClaw 能使用隨附的 `claude-cli` 後端之前，Claude Code 本身必須已經在同一台主機上登入：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

僅當 `claude`
二進位檔案尚未位於 `PATH` 上時，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 工作階段

- 如果 CLI 支援 sessions，請設定 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（預留位置 `{sessionId}`），當 ID 需要被插入
  到多個 flags 時。
- 如果 CLI 使用具有不同 flags 的 **resume subcommand**，請設定
  `resumeArgs`（在恢復時取代 `args`）以及可選的 `resumeOutput`
  （用於非 JSON 恢復）。
- `sessionMode`：
  - `always`：總是發送 session id（如果沒有存儲則使用新的 UUID）。
  - `existing`：僅當之前有存儲時才發送 session id。
  - `none`：從不發送 session id。
- `claude-cli` 預設為 `liveSession: "claude-stdio"`、`output: "jsonl"`
  和 `input: "stdin"`，因此後續回合會重複使用活躍的 Claude 處理程序，同時
  保持其運作。Warm stdio 是目前的預設值，包括省略 transport 欄位的自訂
  設定。如果 Gateway 重新啟動或閒置處理程序結束，OpenClaw 會從
  存儲的 Claude session id 恢復。存儲的 session id 在恢復前會
  與現有的可讀項目記錄進行驗證，因此幻象綁定會被 `reason=transcript-missing` 清除，
  而不是在 `--resume` 下靜默啟動一個新的 Claude CLI session。
- Claude 即時 sessions 保持有限的 JSONL 輸出防護。預設值允許每回合
  最多 8 MiB 和 20,000 行原始 JSONL 行。工具繁重的 Claude 回合可以透過
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines` 針對每個後端進行調高；OpenClaw 會將這些設定限制在 64 MiB 和 100,000
  行。
- 存儲的 CLI sessions 是提供者擁有的連續性。隱含的每日 session
  重設不會中斷它們；`/reset` 和明確的 `session.reset` 策略仍然
  會中斷。
- 全新的 CLI 工作階段通常僅從 OpenClaw 的壓縮摘要加上壓縮後的尾部重新播種。若要還原在壓縮前失效的短工作階段，後端可以選擇使用 `reseedFromRawTranscriptWhenUncompacted: true`。OpenClaw 仍會將原始逐字稿重新播種保持在有界範圍內，並僅限於安全的失效情況，例如遺失的 CLI 逐字稿、系統提示詞/MCP 變更，或工作階段過期重試；授權設定檔或憑證 epoch 變更絕不會重新播種原始逐字稿歷史。

序列化註記：

- `serialize: true` 會保持同通道執行的順序。
- 大多數 CLI 在單一提供者通道上進行序列化。
- 當選取的驗證身分變更時，包括變更的驗證設定檔 id、靜態 API 金鑰、靜態權杖，或是當 CLI 公開時的 OAuth 帳戶身分，OpenClaw 會捨棄儲存的 CLI session 重用。OAuth 存取和更新權杖輪換不會中斷儲存的 CLI session。如果 CLI 沒有公開穩定的 OAuth 帳戶 id，OpenClaw 會讓該 CLI 強制執行恢復權限。

## 來自 claude-cli session 的後備前導

當 `claude-cli` 嘗試在 [`agents.defaults.model.fallbacks`](/zh-Hant/concepts/model-failover) 中失效切換至非 CLI 候選者時，OpenClaw 會使用從 `~/.claude/projects/` 的 Claude Code 本地 JSONL 逐字稿中收割的內容前導來為下一次嘗試播種。若無此播種，備援提供者將冷啟動，因為 OpenClaw 自身的工作階段逐字稿對於 `claude-cli` 執行而言是空的。

- 前導會偏好最新的 `/compact` 摘要或 `compact_boundary` 標記，然後附加最近的邊界後輪次直到字元預算上限。邊界前的輪次會被捨棄，因為摘要已經代表了它們。
- 工具區塊會被合併以壓縮 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示預算誠實。如果摘要溢位，則會標記為 `(truncated)`。
- 同提供者的 `claude-cli` 到 `claude-cli` 備援依賴 Claude 自身的 `--resume` 並跳過前導。
- 種子會重用現有的 Claude 會話檔案路徑驗證，因此無法讀取任意路徑。

## 影像 （直通傳遞）

如果您的 CLI 接受圖片路徑，請設定 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 會將 base64 圖片寫入暫存檔。如果設定了 `imageArg`，這些路徑會作為 CLI 引數傳遞。如果缺少 `imageArg`，OpenClaw 會將檔案路徑附加到提示（路徑注入），這對於會從純路徑自動載入本地檔案的 CLI 來說已足夠。

## 輸入 / 輸出

- `output: "json"`（預設值）會嘗試解析 JSON 並提取文字和工作階段 ID。
- 對於 Gemini CLI JSON 輸出，當 `usage` 缺失或為空時，OpenClaw 會從 `response` 讀取回覆文字，並從 `stats` 讀取使用量。
- `output: "jsonl"` 會解析 JSONL 串流，並在有提供時擷取最終代理程式訊息以及工作階段識別碼。
- `output: "text"` 將 stdout 視為最終回應。

輸入模式：

- `input: "arg"` (預設) 將提示作為最後一個 CLI 引數傳遞。
- `input: "stdin"` 透過 stdin 發送提示。
- 如果提示很長且設定了 `maxPromptArgChars`，則會使用 stdin。

## 預設值（外掛程式擁有）

隨附的 CLI 後端預設值隸屬於其擁有的外掛程式。例如，Anthropic 擁有 `claude-cli`，而 Google 擁有 `google-gemini-cli`。OpenAI Codex 代理程式執行會透過 `openai/*` 使用 Codex 應用程式伺服器線具；OpenClaw 不再註冊隨附的 `codex-cli` 後端。

隨附的 Anthropic 外掛程式會為 `claude-cli` 註冊預設值：

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

隨附的 Google 外掛程式也會為 `google-gemini-cli` 註冊預設值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

先決條件：本機 Gemini CLI 必須已安裝，並在 `PATH` (`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`) 上可作為 `gemini` 使用。

Gemini CLI JSON 說明：

- 回覆文字是從 JSON `response` 欄位讀取的。
- 當 `usage` 缺失或為空時，使用量會退回至 `stats`。
- `stats.cached` 會被正規化為 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 token。

僅在需要時覆寫（常見：絕對 `command` 路徑）。

## 外掛程式擁有的預設值

CLI 後端預設值現已成為外掛程式介面的一部分：

- 外掛使用 `api.registerCliBackend(...)` 註冊它們。
- 後端 `id` 會成為模型參照中的提供者前綴。
- `agents.defaults.cliBackends.<id>` 中的使用者設定仍然會覆寫外掛預設值。
- 後端特定的設定清理作業透過選用的 `normalizeConfig` hook 保持由外掛擁有。

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

`input` 會重寫傳遞給 CLI 的系統提示和使用者提示。`output` 會在 OpenClaw 處理自己的控制標記和通道傳遞之前，重寫串流的助手差異和解析的最終文字。

對於發出 Claude Code stream- 相容 JSONL 的 CLI，請在該後端的設定上設定 `jsonlDialect: "claude-stream-json"`。

## 原生壓縮擁有權

某些 CLI 後端會執行一個壓縮其**自身**逐字稿的代理，因此 OpenClaw 絕不能對它們執行其安全保障摘要程式——這樣做會與後端自己的壓縮衝突，並可能導致該輪次徹底失敗。

`claude-cli` 沒有 harness 端點——Claude Code 會在內部進行壓縮——因此它宣告 `ownsNativeCompaction: true`，而 OpenClaw 會從壓縮路徑傳回無操作指令。諸如 Codex 之類的原生 harness 會話則繼續路由至它們的 harness 壓縮端點。

由於後端擁有壓縮權，因此單純為了防止 OpenClaw 的安全保障在 claude-cli 會話上觸發而設定 `contextTokens: 1_000_000` 的舊權宜措施**不再需要**——退出選項已取而代之。

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

僅對真正擁有其壓縮權的後端宣告 `ownsNativeCompaction`：它必須在接近其內容視窗時可靠地限制其自身的逐字稿，並持續存在可恢復的會話（例如 `--resume` / `--session-id`）；否則，延遲會話可能會持續超出預算。相符的 `agentHarnessId` 會話仍會路由至 harness 端點。

## 套件 MCP 覆蓋層

CLI 後端**不**會直接接收 OpenClaw 工具呼叫，但後端可以選擇使用 `bundleMcp: true` 來加入生成的 MCP 設定覆蓋層。

目前的打包行為：

- `claude-cli`：生成的嚴格 MCP 設定檔
- `google-gemini-cli`：生成的 Gemini 系統設定檔

當啟用打包 MCP 時，OpenClaw：

- 產生一個回傳 HTTP MCP 伺服器，將閘道工具暴露給 CLI 程序
- 使用每個工作階段權杖 (`OPENCLAW_MCP_TOKEN`) 對橋接器進行驗證
- 將工具存取範圍限定於當前工作階段、帳戶和頻道內容
- 為當前工作區載入已啟用的打包 MCP 伺服器
- 將它們與任何現有的後端 MCP 設定/設定檔結構合併
- 使用來自有擁有權擴充功能之後端擁有的整合模式，重寫啟動設定

如果未啟用 MCP 伺服器，當後端選擇加入打包 MCP 時，OpenClaw 仍會注入嚴格配置，
以便背景執行保持隔離。

工作階段範圍的打包 MCP 運行時會被快取以在工作階段內重複使用，然後在閒置
`mcp.sessionIdleTtlMs` 毫秒後回收（預設 10 分鐘；設定
`0` 即可停用）。一次性嵌入執行（例如驗證探測、
代碼生成）和執行結束時的主動記憶回憶請求清理，使 stdio 子程序和可串流 HTTP/SSE
串流的存續時間不會超過執行時間。

## 重種歷史記錄上限

當從先前的 OpenClaw 逐字稿播種新的 CLI 工作階段時（例如在
`session_expired` 重試之後），
`<conversation_history>` 區塊會被限制上限，以防止重種提示詞
過度膨脹。預設為 `12288` 個字元（約 3000 個 token）。

Claude CLI 後端會自動使用根據解析的 Claude 內容層級推導出的較大上限。
標準 200K token Claude 執行會保留較大的逐字稿片段，而 1M token Claude 執行
會保留更大的片段，而其他 CLI 後端則保留保守的預設值。

- 此上限僅控制重種提示詞的先前歷史記錄區塊。即時工作階段輸出
  限制則在 `reliability.outputLimits` 下單獨調整
  （請參閱 [工作階段](#sessions)）。

## 限制

- **無直接 OpenClaw 工具呼叫。** OpenClaw 不會將工具呼叫注入到 CLI
  後端協定中。只有當後端選擇加入 `bundleMcp: true` 時，
  才能看到閘道工具。
- **串流視後端而定。** 某些後端串流 JSONL；其他則緩衝直到退出。
- **結構化輸出**取決於 CLI 的 JSON 格式。

## 疑難排解

- **找不到 CLI**：將 `command` 設定為完整路徑。
- **錯誤的模型名稱**：使用 `modelAliases` 將 `provider/model` 對應至 CLI 模型。
- **無會話連續性**：請確保已設定 `sessionArg` 且 `sessionMode` 不為
  `none`。
- **忽略圖片**：設定 `imageArg`（並驗證 CLI 支援檔案路徑）。

## 相關

- [Gateway 操作手冊](/zh-Hant/gateway)
- [本機模型](/zh-Hant/gateway/local-models)
