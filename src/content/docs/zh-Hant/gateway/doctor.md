---
summary: "Doctor 指令：健康檢查、設定遷移和修復步驟"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` 是 OpenClaw 的修復與遷移工具。它能修復過期的設定/狀態、檢查健康狀況，並提供可執行的修復步驟。

## 快速入門

```bash
openclaw doctor
```

### 無介面與自動化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    接受預設值而不提示（適用時包括重啟/服務/沙箱修復步驟）。

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    無提示套用建議的修復（在安全處進行修復和重啟）。

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    執行結構化健康檢查以供 CI 或預檢自動化使用。此模式為
    唯讀：它不會提示、修復、遷移設定、重啟服務或
    觸及狀態。

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    也套用激進的修復（覆寫自訂 supervisor 設定）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    無提示執行並僅套用安全的遷移（設定正規化 + 磁碟狀態移動）。跳過需要人工確認的重啟/服務/沙箱動作。偵測到舊版狀態遷移時會自動執行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    掃描系統服務以尋找額外的 gateway 安裝（launchd/systemd/schtasks）。

  </Tab>
</Tabs>

如果您想在寫入之前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 唯讀 lint 模式

`openclaw doctor --lint` 是
`openclaw doctor --fix` 適合自動化的姊妹指令。兩者都使用 doctor 健康檢查，但它們的處理方式
不同：

| 模式                     | 提示 | 寫入設定/狀態  | 輸出           | 使用於               |
| ------------------------ | ---- | -------------- | -------------- | -------------------- |
| `openclaw doctor`        | 是   | 否             | 友善的健康報告 | 人工檢查狀態         |
| `openclaw doctor --fix`  | 有時 | 是，帶修復原則 | 友善的修復日誌 | 正在套用已核准的修復 |
| `openclaw doctor --lint` | 否   | 否             | 結構化發現結果 | CI、預檢和審查閘道   |

現代化的健康檢查可能提供選用的 `repair()` 實作。
`doctor --fix` 會在這些修復存在時加以套用，並針對尚未遷移的檢查繼續使用
既有的 doctor 修復流程。
結構化修復合約也將修復報告與偵測分開：
`detect()` 回報目前的發現結果，而 `repair()` 則可回報變更、
設定/檔案差異，以及非檔案的副作用。這樣可以在不讓 lint 檢查
規劃異動的情況下，保留未來 `doctor --fix --dry-run` 和差異輸出的遷移路徑。

範例：

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

JSON 輸出包含：

- `ok`：是否有任何可見的發現結果符合選取的嚴重性閾值
- `checksRun`：執行的健康檢查數量
- `checksSkipped`：被 `--only` 或 `--skip` 跳過的檢查
- `findings`：具有 `checkId`、`severity`、`message` 和
  選用 `path`、`line`、`column`、`ocPath` 以及 `fixHint` 的結構化診斷

結束代碼：

- `0`：沒有達到或超過選取閾值的發現結果
- `1`：一個或多個發現結果符合選取的閾值
- `2`：在發出 lint 發現結果之前的指令/執行階段失敗

使用 `--severity-min info|warning|error` 來控制列印內容以及導致非零 lint 退出的條件。使用 `--only <id>` 進行狹窄的預檢閘門，並使用 `--skip <id>` 在保持其餘 lint 運行啟用的同時暫時排除嘈雜的檢查。
Lint 輸出選項（如 `--json`、`--severity-min`、`--only` 和 `--skip`）
必須與 `--lint` 搭配使用；常規的 doctor 和 repair 運行會拒絕它們。

## 功能摘要

<AccordionGroup>
  <Accordion title="Health, UI, and updates">
    - 針對 git 安裝的可選預檢更新（僅限互動模式）。
    - UI 協定新鮮度檢查（當協定架構較新時重建 Control UI）。
    - 健康檢查 + 重啟提示。
    - 技能狀態摘要（合格/遺失/封鎖）和外掛程式狀態。

  </Accordion>
  <Accordion title="設定與遷移">
    - 舊版值的設定正規化。
    - 將對話設定從舊版扁平的 `talk.*` 欄位遷移至 `talk.provider` + `talk.providers.<provider>`。
    - 瀏覽器遷移檢查，適用於舊版 Chrome 擴充功能設定與 Chrome MCP 就緒狀態。
    - OpenCode 提供者覆寫警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
    - 舊版 OpenAI Codex 提供者/設定檔遷移 (`openai-codex` → `openai`) 以及過時 `models.providers.openai-codex` 的遮蔽警告。
    - OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件檢查。
    - 當 `plugins.allow` 具有限制性但工具原則仍要求萬用字元或外掛擁有的工具時，顯示外掛/工具允許清單警告。
    - 舊版磁碟狀態遷移 (sessions/agent dir/WhatsApp auth)。
    - 舊版外掛資訊清單合約金鑰遷移 (`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`)。
    - 舊版 cron 存儲遷移 (`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、`notify: true` webhook 後備工作)。
    - 舊版全代理 runtime-policy 清理；提供者/模型 runtime policy 為啟用的路由選擇器。
    - 啟用外掛時清除過時的外掛設定；當 `plugins.enabled=false` 時，過時的外掛參照會被視為非作用中的容器設定並予以保留。

  </Accordion>
  <Accordion title="State and integrity">
    - 檢查工作階段鎖定檔案並清理過時的鎖定。
    - 修復工作階段逐字稿，修復受影響的 2026.4.24 版本所建立的重複提示重寫分支。
    - 偵測卡住的子代理程式重新啟動復原墓碑標記，並支援 `--fix` 清除過時的已中止復原旗標，以免啟動時持續將子程式視為已中止重新啟動。
    - 狀態完整性和權限檢查（工作階段、逐字稿、狀態目錄）。
    - 在本機執行時的設定檔權限檢查 (chmod 600)。
    - 模型驗證健康狀況：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報驗證設定檜的冷卻/停用狀態。
    - 額外的工作區目錄偵測 (`~/openclaw`)。

  </Accordion>
  <Accordion title="Gateway、服務與監督器">
    - 啟用沙盒時修復沙盒映像。
    - 舊版服務遷移與額外 Gateway 偵測。
    - Matrix 頻道的舊版狀態遷移（在 `--fix` / `--repair` 模式下）。
    - Gateway 執行時檢查（服務已安裝但未執行；快取的 launchd 標籤）。
    - 頻道狀態警告（從執行中的 Gateway 探測）。
    - 頻道特定權限檢查位於 `openclaw channels capabilities` 下；例如，Discord 語音頻道權限會使用 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 進行稽核。
    - 當 Gateway 事件迴圈健康度下降且本機 TUI 用戶端仍在執行時，檢查 WhatsApp 回應狀況；`--fix` 只會停止已驗證的本機 TUI 用戶端。
    -針對主要模型、備用機制、影像/影片生成模型、heartbeat/subagent/compaction 覆寫、hooks、頻道模型覆寫與會話路由釘選中的舊版 `openai-codex/*` 模型參照，進行 Codex 路由修復；`--fix` 會將其重寫為 `openai/*`，將 `openai-codex:*` 驗證設定檔/順序遷移為 `openai:*`，移除過時的會話/全代理 執行時釘選，並在預設 Codex 駁取上保留標準的 OpenAI 代理參照。
    - 監督器設定稽核（launchd/systemd/schtasks），可選擇性修復。
    - 清理 Gateway 服務的嵌入式代理環境，這些服務在安裝或更新時擷取了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值。
    - Gateway 執行時最佳實踐檢查（Node vs Bun、版本管理器路徑）。
    - Gateway 連接埠衝突診斷（預設 `18789`）。

  </Accordion>
  <Accordion title="驗證、安全性與配對">
    - 針對開放 DM 政策的安全性警告。
    - 本機權杖模式下的閘道驗證檢查（當不存在權杖來源時提供權杖產生；不會覆寫權杖 SecretRef 設定）。
    - 裝置配對問題偵測（待處理的首次配對請求、待處理的角色/範圍升級、過時的本機裝置權杖快取漂移，以及配對記錄驗證漂移）。

  </Accordion>
  <Accordion title="Workspace and shell">
    - Linux 上的 systemd linger 檢查。
    - Workspace bootstrap 檔案大小檢查（針對 context 檔案的截斷/接近限制警告）。
    - 預設代理程式的 Skills 準備情況檢查；報告缺少 bins、env、config 或 OS 需求的允許 skills，並且 `--fix` 可以在 `skills.entries` 中停用不可用的 skills。
    - Shell 完成狀態檢查和自動安裝/升級。
    - 記憶體搜尋嵌入提供者準備情況檢查（本機模型、遠端 API 金鑰或 QMD binary）。
    - 原始碼安裝檢查（pnpm workspace 不匹配、缺少 UI assets、缺少 tsx binary）。
    - 寫入更新的設定 + wizard 中繼資料。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填與重置

Control UI Dreams 場景包含針對 grounded dreaming 工作流程的 **Backfill**、**Reset** 和 **Clear Grounded** 動作。這些動作使用 gateway doctor 風格的 RPC 方法，但**不**屬於 `openclaw doctor` CLI 修復/遷移的一部分。

它們的功能：

- **Backfill** 會掃描使用中 workspace 中的歷史 `memory/YYYY-MM-DD.md` 檔案，執行 grounded REM diary pass，並將可逆轉的 backfill 條目寫入 `DREAMS.md`。
- **Reset** 僅從 `DREAMS.md` 中移除那些標記為 backfill 的 diary 條目。
- **Clear Grounded** 僅移除那些來自歷史重播且尚未累積活躍回憶或每日支援的暫存落地專用短期條目。

它們自身**不**會做的事：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您先明確執行暫存 CLI 路徑，否則它們不會自動將落地候選項暫存到活躍的短期升級存放區

如果您希望落地歷史重播影響正常的深度升級管道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將 grounded durable candidates 暫存到短期 dreaming store 中，同時保持 `DREAMS.md` 作為審查介面。

## 詳細行為與基本原理

<AccordionGroup>
  <Accordion title="0. 可選更新（Git 安裝）">
    如果這是 git 檢出並且 doctor 正以互動模式執行，它會在執行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. Config normalization">
    如果配置包含舊版值形狀（例如 `messages.ackReaction` 沒有特定通道的覆寫），doctor 會將其正規化為當前的架構。

    這包括舊版 Talk 平面欄位。當前公開的 Talk 語音配置是 `talk.provider` + `talk.providers.<provider>`，即時語音配置是 `talk.realtime.*`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形狀重寫為提供商映射，並將舊的頂層即時選擇器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重寫為 `talk.realtime`。

    當 `plugins.allow` 非空並且工具策略使用
    萬用字元或外掛擁有的工具條目時，Doctor 也會發出警告。`tools.allow: ["*"]` 僅匹配來自實際載入的外掛的工具；它不會繞過專用外掛
    允許列表。

  </Accordion>
  <Accordion title="2. 舊版配置鍵遷移">
    當配置包含已棄用的鍵時，其他指令將拒絕執行，並要求您執行 `openclaw doctor`。

    Doctor 將會：

    - 說明發現了哪些舊版鍵。
    - 顯示套用的遷移。
    - 以更新後的架構重寫 `~/.openclaw/openclaw.json`。

    Gateway 啟動時會拒絕舊版配置格式，並要求您執行 `openclaw doctor --fix`；它不會在啟動時重寫 `openclaw.json`。Cron 任務存放區遷移也由 `openclaw doctor --fix` 處理。

    目前的遷移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - 移除已停用的 `channels.webchat` 和 `gateway.webchat`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 頂層 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 舊版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - 舊版頂層即時 Talk 選擇器 (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - TTS 說話者選擇欄位 (`voice`/`voiceName`/`voiceId`) → `speakerVoice`/`speakerVoiceId`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 對於具有命名 `accounts` 但仍有殘留單一帳號頂層通道值的通道，將這些帳號範圍的值移至為該通道選擇的升級帳號中 (對於大多數通道為 `accounts.default`；Matrix 可以保留現有符合的命名/預設目標)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；針對緩慢的供應者/模型逾時使用 `models.providers.<id>.timeoutSeconds`，並且當整個執行需要更長時間時，將 agent/run 逾時保持在該值以上
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)
    - 舊版 `models.providers.*.api: "openai"` → `"openai-completions"` (Gateway 啟動時也會跳過其 `api` 設為未來或未知列舉值的供應者，而不是以失敗封閉)
    - 移除 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始終保持 Codex 原生工作區工具為原生

    Doctor 警告也包含多帳號通道的帳號預設指導：

    - 如果設定兩個或多個 `channels.<channel>.accounts` 項目時未設定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 會警告備援路由可能會選擇非預期的帳號。
    - 如果 `channels.<channel>.defaultAccount` 設為未知的帳號 ID，Doctor 會警告並列出已設定的帳號 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供者覆寫">
    如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它會覆寫來自 `openclaw/plugin-sdk/llm` 的內建 OpenCode 目錄。這可能會將模型強制導向錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除覆寫並恢復逐模型的 API 路由與成本。
  </Accordion>
  <Accordion title="2c. 瀏覽器遷移與 Chrome MCP 準備情況">
    如果您的瀏覽器設定仍指向已移除的 Chrome 擴充功能路徑，doctor 會將其正規化為當前主機本機 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 變成 `"existing-session"`
    - `browser.relayBindHost` 會被移除

    當您使用 `defaultProfile: "user"` 或設定的 `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

    - 檢查預設自動連線設定檔是否已在同一台主機上安裝 Google Chrome
    - 檢查偵測到的 Chrome 版本，並在低於 Chrome 144 時發出警告
    - 提醒您在瀏覽器檢查頁面中啟用遠端偵錯 (例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`)

    Doctor 無法為您啟用 Chrome 端的設定。主機本機 Chrome MCP 仍需要：

    - 閘道/節點主機上基於 Chromium 的瀏覽器 144+
    - 瀏覽器在本機執行
    - 在該瀏覽器中啟用遠端偵錯
    - 在瀏覽器中核准第一次附加同意提示

    這裡的準備情況僅關乎本機附加的先決條件。既有會話會保留目前的 Chrome MCP 路由限制；進階路由如 `responsebody`、PDF 匯出、下載攔截和批次操作仍需要受管理的瀏覽器或原始 CDP 設定檔。

    此檢查 **不** 適用於 Docker、沙箱、遠端瀏覽器或其他無頭流程。這些流程會繼續使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 先決條件">
    當配置了 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI 授權端點以驗證本機 Node/OpenSSL TLS 堆疊能否驗證憑證鏈。如果探測因憑證錯誤而失敗（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期憑證或自我簽署憑證），doctor 會列印平台特定的修復指引。在使用 Homebrew Node 的 macOS 上，修復方法通常是 `brew postinstall ca-certificates`。若使用 `--deep`，即使閘道健康，探測仍會執行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供者覆寫">
    如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，它們可能會覆蓋較新版本自動使用的內建 Codex OAuth 提供者路徑。當 Doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時會發出警告，讓您可以移除或重寫過時的傳輸覆寫設定，以恢復內建的路由/後備行為。自訂代理和僅標頭的覆寫仍受支援，且不會觸發此警告。
  </Accordion>
  <Accordion title="2f. Codex 路由修復">
    Doctor 會檢查舊版 `openai-codex/*` 模型參照。原生 Codex harness 路由使用標準 `openai/*` 模型參照；OpenAI agent 轉向會經過 Codex app-server harness，而不是 OpenClaw OpenAI 提供者路徑。

    在 `--fix` / `--repair` 模式下，doctor 會重寫受影響的 default-agent 和 per-agent 參照，包括主要模型、備援、圖片/視訊生成模型、heartbeat/subagent/compaction 覆寫、hooks、通道模型覆寫，以及過時的持久化會話路由狀態：

    - `openai-codex/gpt-*` 會變成 `openai/gpt-*`。
    - 對於修復後的 agent 模型參照，Codex intent 會移至 provider/model-scoped 的 `agentRuntime.id: "codex"` 項目。
    - 過時的 whole-agent 執行時配置和持久化會話執行時釘選會被移除，因為執行時選取是 provider/model-scoped 的。
    - 現有的 provider/model 執行時政策會被保留，除非修復後的舊版模型參照需要 Codex 路由以保留舊的 auth 路徑。
    - 現有的模型備援清單會被保留，並重寫其舊版項目；複製的 per-model 設定會從舊版金鑰移至標準 `openai/*` 金鑰。
    - 在所有發現的 agent 會話儲存中，持久化會話的 `modelProvider`/`providerOverride`、`model`/`modelOverride`、備援通知以及 auth-profile 釘選都會被修復。
    - `/codex ...` 意指「從聊天中控制或綁定原生 Codex 對話」。
    - `/acp ...` 或 `runtime: "acp"` 意指「使用外部 ACP/acpx 轉接器」。

  </Accordion>
  <Accordion title="2g. 工作階段路由清理">
    當您將設定的模型或執行時從外掛擁有的路由（例如 Codex）移開後，Doctor 也會掃描探索到的代理工作階段存放區，尋找過時的自動建立路由狀態。

    當其擁有的路由不再被設定時，`openclaw doctor --fix` 可以清除自動建立的過時狀態，例如 `modelOverrideSource: "auto"` 模型釘選、執行時模型元資料、釘選的 harness id、CLI 工作階段綁定以及自動 auth-profile 覆寫。明確的使用者或舊版工作階段模型選擇將被回報以供手動審查並保持不變；當該路由不再預期使用時，請使用 `/model ...`、`/new` 切換它們，或重設工作階段。

  </Accordion>
  <Accordion title="3. 舊版狀態遷移（磁碟配置）">
    Doctor 可以將較舊的磁碟配置遷移至目前的結構：

    - 工作階段存放區 + 逐字稿：
      - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - 代理目錄：
      - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 認證狀態 (Baileys)：
      - 從舊版 `~/.openclaw/credentials/*.json` (`oauth.json` 除外)
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` (預設帳戶 id：`default`)

    這些遷移為盡力而為且具等冪性；當 doctor 將任何舊版資料夾保留為備份時，將會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版工作階段 + 代理目錄，因此歷史記錄/認證/模型會落在每個代理的路徑中，而無需手動執行 doctor。WhatsApp 認證刻意僅透過 `openclaw doctor` 進行遷移。Talk provider/provider-map 正規化現在會比較結構相等性，因此僅金鑰順序的差異將不再觸發重複的無操作 `doctor --fix` 變更。

  </Accordion>
  <Accordion title="3a. 舊版插件清單遷移">
    Doctor 會掃描所有已安裝的外掛程式清單，尋找已棄用的頂層功能鍵 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`)。找到後，它會提供將這些鍵移至 `contracts` 物件並就地重寫清單檔案的選項。此遷移具有等冪性；如果 `contracts` 鍵已經包含相同的值，則會移除舊版鍵而不會重複資料。
  </Accordion>
  <Accordion title="3b. 傳統 cron 儲存遷移">
    Doctor 也會檢查 cron 工作儲存（預設為 `~/.openclaw/cron/jobs.json`，若被覆寫則為 `cron.store`）中，排程器為了相容性仍接受的舊有工作格式。

    目前的 cron 清理項目包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 頂層 payload 欄位（`message`、`model`、`thinking`，……）→ `payload`
    - 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`，……）→ `delivery`
    - payload `provider` delivery 別名 → 顯式 `delivery.channel`
    - 傳統 `notify: true` webhook 後備工作 → 來自 `cron.webhook` 的顯式 webhook delivery；announce 工作保留其 chat delivery 並取得 `delivery.completionDestination`

    Gateway 也會在載入時清理格式錯誤的 cron 列，以便有效工作能繼續執行。原始的格式錯誤列會在從 `jobs.json` 移除前，複製到位於使用中儲存旁邊的 `jobs-quarantine.json`；doctor 會回報隔離的列，以便您手動檢閱或修復它們。

    Doctor 和 Gateway 啟動在排程器執行之前，都會使用相同的 `notify: true` 遷移。如果缺少 `cron.webhook`，doctor 會發出警告並保留傳統的 notify 標記以供手動修復。

    在 Linux 上，如果使用者的 crontab 仍然呼叫傳統的 `~/.openclaw/bin/ensure-whatsapp.sh`，doctor 也會發出警告。詞主機本機腳本並非由目前的 OpenClaw 維護，且當 cron 無法連接 systemd user bus 時，可能會將錯誤的 `Gateway inactive` 訊息寫入 `~/.openclaw/logs/whatsapp-health.log`。請使用 `crontab -e` 移除過時的 crontab 項目；並使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 進行目前的健康檢查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 會掃描每個代理程式工作階段目錄中的過時寫入鎖定檔案——即當工作階段異常結束時遺留下來的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍處於運作狀態、鎖定存在時間，以及是否被視為過時（已死 PID、格式錯誤的擁有者元資料、超過 30 分鐘，或是可證明屬於非 OpenClaw 程序的運作中 PID）。在 `--fix` / `--repair` 模式下，它會自動移除擁有者已死、孤兒、已回收、格式錯誤且舊、或非 OpenClaw 的鎖定。仍由運作中 OpenClaw 程序擁有的舊鎖定會被回報但予以保留，以免 doctor 中斷正在運作的錄本寫入器。
  </Accordion>
  <Accordion title="3d. Session transcript branch repair">
    Doctor 會掃描代理程式工作階段 JSONL 檔案，尋找由 2026.4.24 提示錄本重寫錯誤所產生的重複分支形狀：包含 OpenClaw 內部執行時間內容的已放棄使用者輪次，加上包含相同可見使用者提示的運作中同層分支。在 `--fix` / `--repair` 模式下，doctor 會在原始檔案旁備份每個受影響的檔案，並將錄本重寫至運作中分支，讓閘道歷史和記憶體讀取器不再看到重複的輪次。
  </Accordion>
  <Accordion title="4. 狀態完整性檢查（會話持久化、路由和安全）">
    狀態目錄是運行的中樞。如果它消失，您將會丟失會話、憑據、日誌和配置（除非您在其他地方有備份）。

    Doctor 檢查以下內容：

    - **State dir missing**：警告災難性的狀態丟失，提示重新建立目錄，並提醒您它無法恢復丟失的數據。
    - **State dir permissions**：驗證可寫性；提供修復權限的選項（並在檢測到所有者/組不匹配時發出 `chown` 提示）。
    - **macOS cloud-synced state dir**：當狀態解析位於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下時發出警告，因為同步支援的路徑可能會導致 I/O 變慢以及鎖定/同步競爭。
    - **Linux SD or eMMC state dir**：當狀態解析到 `mmcblk*` 掛載源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在會話和憑據寫入時可能會變慢並加快磨損。
    - **Session dirs missing**：`sessions/` 和會話存儲目錄是持久化歷史記錄並避免 `ENOENT` 崩潰所必需的。
    - **Transcript mismatch**：當最近的會話條目缺少腳本文件時發出警告。
    - **Main session "1-line JSONL"**：當主腳本只有一行時標記（歷史記錄未累積）。
    - **Multiple state dirs**：當多個 `~/.openclaw` 資料夾存在於各個主目錄中或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史記錄可能在安裝之間拆分）。
    - **Remote mode reminder**：如果是 `gateway.mode=remote`，doctor 會提醒您在遠端主機上運行它（狀態位於那裡）。
    - **Config file permissions**：如果 `~/.openclaw/openclaw.json` 是組/世界可讀的，則發出警告並提供建議將其收緊為 `600`。

  </Accordion>
  <Accordion title="5. 模型授權健康狀態 (OAuth 到期)">
    Doctor 會檢查授權儲存區中的 OAuth 設定檔，在權杖即將到期或已過期時發出警告，並在安全時進行更新。如果 Anthropic OAuth/權杖設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。更新提示只會在以互動方式 (TTY) 執行時出現；`--non-interactive` 會略過更新嘗試。

    當 OAuth 更新永久失敗時（例如 `refresh_token_reused`、`invalid_grant`，或提供者要求您重新登入），doctor 會回報需要重新授權，並印出確切的 `openclaw models auth login --provider ...` 指令以供執行。

    Doctor 也會回報因以下原因而暫時無法使用的授權設定檔：

    - 短暫冷卻 (速率限制/逾時/授權失敗)
    - 較長時間的停用 (帳單/信用額度失敗)

    其權杖儲存在 macOS 鑰匙圈 中的舊版 Codex OAuth 設定檔（在基於檔案的 sidecar 佈局之前的舊版入門流程）只能由 doctor 修復。請從互動式終端機執行一次 `openclaw doctor --fix`，將依賴鑰匙圈的舊版權杖直接遷移到 `auth-profiles.json`；之後，嵌入式回合 (Telegram、cron、子代理程式分派) 將會將其解析為標準的 OpenAI OAuth 設定檔。

  </Accordion>
  <Accordion title="6. Hooks model validation">
    如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證 model 參考，並在無法解析或被禁止時發出警告。
  </Accordion>
  <Accordion title="7. Sandbox 映像檔修復">
    當啟用沙箱機制時，doctor 會檢查 Docker 映像檔，如果目前映像檔遺失，會提供建置或切換至舊版名稱的選項。
  </Accordion>
  <Accordion title="7b. 外掛程式安裝清理">
    Doctor 會在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下移除舊版 OpenClaw 產生的外掛程式相依性暫存狀態。這涵蓋了過時的產生相依性根目錄、舊的安裝階段目錄、來自早期捆綁外掛程式相依性修復程式碼的套件本機殘留，以及可能遮蔽目前捆綁清單的孤立或已復原之受管理 npm 捆綁 `@openclaw/*` 外掛程式副本。Doctor 也會將主機 `openclaw` 套件重新連結到宣告 `peerDependencies.openclaw` 的受管理 npm 外掛程式中，以便在更新或 npm 修復後，諸如 `openclaw/plugin-sdk/*` 的套件本機執行匯入仍能正確解析。

    當設定參照了可下載的外掛程式但本機外掛程式登錄庫找不到它們時，Doctor 也可以重新安裝這些缺失的外掛程式。範例包括材質 `plugins.entries`、設定的頻道/提供者/搜尋設定，以及設定的代理程式執行環境。在套件更新期間，當正在交換核心套件時，doctor 會避免執行套件管理員外掛程式修復；如果在更新後設定的外掛程式仍需要復原，請在更新後再次執行 `openclaw doctor --fix`。Gateway 啟動和設定重新載入不會執行套件管理員；外掛程式安裝仍須透過明確的 doctor/install/update 工作。

  </Accordion>
  <Accordion title="8. Gateway 服務移轉與清理提示">
    Doctor 會偵測舊版 gateway 服務 (launchd/systemd/schtasks) 並提議將其移除，然後使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外的類似 gateway 服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一等公民，不會被標記為「額外」。

    在 Linux 上，如果缺少使用者層級的 gateway 服務但存在系統層級的 OpenClaw gateway 服務，doctor 不會自動安裝第二個使用者層級服務。請使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 進行檢查，然後移除重複項，或在系統管理程式擁有 gateway 生命週期時設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. Startup Matrix migration">
    當 Matrix 頻道帳號有待處理或可採取行動的舊狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力而為的遷移步驟：舊 Matrix 狀態遷移和舊加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動會繼續。在唯讀模式下（`openclaw doctor` 但沒有 `--fix`），此檢查會被完全跳過。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor 現在會在正常健康檢查期間檢查裝置配對狀態。

    回報內容：

    - 待處理的首次配對請求
    - 已配對裝置的待處理角色升級
    - 已配對裝置的待處理範圍升級
    - 公鑰不符修復，即裝置 ID 仍然相符，但裝置身分不再符合已批准的記錄
    - 已配對記錄缺少已批准角色的有效權杖
    - 已配對權杖的範圍偏離已批准的配對基準
    - 本機快取的目前機器裝置權杖條目，其日期早於閘道端權杖輪替或包含過時的範圍元資料

    Doctor 不會自動批准配對請求或自動輪替裝置權杖。它會改為印出確切的後續步驟：

    - 使用 `openclaw devices list` 檢查待處理請求
    - 使用 `openclaw devices approve <requestId>` 批准確切的請求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 輪替新權杖
    - 使用 `openclaw devices remove <deviceId>` 移除並重新批准過時記錄

    這解決了常見的「已配對但仍需要配對」問題：Doctor 現在能區分首次配對、待處理的角色/範圍升級，以及過時權杖/裝置身分偏移。

  </Accordion>
  <Accordion title="9. 安全性警告">
    當提供者在沒有允許清單的情況下開放私訊，或是以危險方式設定原則時，Doctor 會發出警告。
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    如果作為 systemd 使用者服務執行，doctor 會確保啟用 linger，以便閘道在登出後保持運作。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 會列印出預設代理程式的工作區狀態摘要：

    - **Skills status**：計算符合資格、缺少需求以及被允許清單阻擋的技能。
    - **Legacy workspace dirs**：當 `~/openclaw` 或其他遺留工作區目錄與當前工作區並存時發出警示。
    - **Plugin status**：計算已啟用/已停用/發生錯誤的外掛程式；列出發生錯誤的外掛程式 ID；報告套件外掛程式功能。
    - **Plugin compatibility warnings**：標示與目前執行環境有相容性問題的外掛程式。
    - **Plugin diagnostics**：呈現外掛程式登錄區發出的任何載入時期警示或錯誤。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 會檢查工作區啟動檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的內容檔案）是否接近或超過已設定的字元預算。它會報告每個檔案的原始字元數與注入字元數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總注入字元數佔總預算的比例。當檔案被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    當 `openclaw doctor --fix` 移除遺漏的通道外掛程式時，它也會移除參照該外掛程式的懸置通道範圍設定：`channels.<id>` 項目、為通道命名的目標，以及 `agents.*.models["<channel>/*"]` 覆寫。這可防止 Gateway 啟動迴圈，即通道執行環境已消失但設定仍要求 gateway 繫結至該通道。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 會檢查目前 shell（zsh、bash、fish 或 PowerShell）是否安裝了 Tab 鍵自動完成功能：

    - 如果 shell 設定檔使用緩慢的動態完成模式 (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的快取檔案變體。
    - 如果設定檔中已設定完成功能但缺少快取檔案，doctor 會自動重新生成快取。
    - 如果完全未設定完成功能，doctor 會提示進行安裝（僅限互動模式；使用 `--non-interactive` 時會跳過）。

    執行 `openclaw completion --write-state` 以手動重新生成快取。

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor 會檢查本機 Gateway token 驗證的準備狀態。

    - 如果 token 模式需要 token 但不存在 token 來源，doctor 會提議產生一個。
    - 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告且不會以純文字覆寫它。
    - `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制產生。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修復流程需要檢查已設定的憑證，同時不削弱執行時期的「快速失敗」 行為。

    - `openclaw doctor --fix` 現在使用與 status 系列指令相同的唯讀 SecretRef 摘要模型，以進行目標設定修復。
    - 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用已設定的機器人憑證。
    - 如果 Telegram 機器人 token 透過 SecretRef 設定但在目前指令路徑中無法使用，doctor 會回報該憑證為「已設定但無法使用」並跳過自動解決，而不是當機或錯誤地回報 token 遺失。

  </Accordion>
  <Accordion title="13. Gateway health check + restart">
    Doctor 會執行健康檢查，並在 Gateway 看起來不健康時提議重新啟動。
  </Accordion>
  <Accordion title="13b. 記憶體搜尋就緒狀態">
    Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否已就緒。其行為取決於設定的後端與提供者：

    - **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。若否，則會印出修復指引，包含 npm 套件與手動二進位路徑選項。
    - **明確的本地提供者**：檢查本地模型檔案或可識別的遠端/可下載模型 URL。若缺失，建議切換至遠端提供者。
    - **明確的遠端提供者**（`openai`、`voyage` 等）：驗證環境變數或認證儲存中是否存在 API 金鑰。若缺失則印出可行的修復提示。
    - **舊版自動提供者**：將 `memorySearch.provider: "auto"` 視為 OpenAI，檢查 OpenAI 就緒狀態，並 `doctor --fix` 將其重寫為 `provider: "openai"`。

    當有快取的閘道探測結果可用（檢查時閘道狀態良好），Doctor 會將其結果與 CLI 可見設定進行比對，並標註任何差異。Doctor 不會在預設路徑上發起全新的嵌入連線測試；當您需要即時提供者檢查時，請使用 deep memory status 指令。

    使用 `openclaw memory status --deep` 以在執行時期驗證嵌入就緒狀態。

  </Accordion>
  <Accordion title="14. 頻道狀態警告">
    如果閘道狀態良好，doctor 會執行頻道狀態探測並回報帶有建議修復方式的警告。
  </Accordion>
  <Accordion title="15. Supervisor 設定稽核 + 修復">
    Doctor 會檢查已安裝的 supervisor 設定（launchd/systemd/schtasks）是否有遺失或過時的預設值（例如 systemd network-online 相依性和重新啟動延遲）。當發現不符時，它會建議更新，並可以將服務檔案/任務重寫為目前的預設值。

    註事：

    - `openclaw doctor` 會在重寫 supervisor 設定前提示。
    - `openclaw doctor --yes` 接受預設的修復提示。
    - `openclaw doctor --fix` 無需提示即套用建議的修復（`--repair` 是別名）。
    - `openclaw doctor --fix --force` 會覆寫自訂的 supervisor 設定。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 使 doctor 對於閘道服務生命週期保持唯讀。它仍會回報服務健康狀況並執行非服務修復，但會跳過服務安裝/啟動/重新啟動/啟動程序、supervisor 設定重寫以及舊版服務清理，因為外部 supervisor 擁有該生命週期。
    - 在 Linux 上，當對應的 systemd gateway unit 處於作用中狀態時，doctor 不會重寫 command/entrypoint 中繼資料。在重複服務掃描期間，它也會忽略非作用中的非舊版額外類似 gateway 的 unit，以免伴隨的服務檔案產生清理雜訊。
    - 如果 token auth 需要 token 且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的純文字 token 值保存到 supervisor 服務環境中繼資料中。
    - Doctor 會偵測舊版 LaunchAgent、systemd 或 Windows Scheduled Task 安裝內嵌的受管理 `.env`/SecretRef 支援的服務環境值，並重寫服務中繼資料，使這些值從執行時期來源載入，而不是從 supervisor 定義載入。
    - Doctor 會偵測當服務指令在 `gateway.port` 變更後仍釘選到舊的 `--port`，並將服務中繼資料重寫為目前的連接埠。
    - 如果 token auth 需要 token 且設定的 token SecretRef 未解析，doctor 會以可採取行動的指導方針封鎖安裝/修復路徑。
    - 如果同時設定 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會封鎖安裝/修復，直到明確設定模式為止。
    - 對於 Linux user-systemd unit，doctor token drift 檢查現在會在比較服務驗證中繼資料時包含 `Environment=` 和 `EnvironmentFile=` 來源。
    - 當設定最後是由較新版本寫入時，Doctor 服務修復會拒絕重寫、停止或重新啟動來自較舊 OpenClaw 二進位檔案的閘道服務。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您總是可以透過 `openclaw gateway install --force` 強制完整重寫。

  </Accordion>
  <Accordion title="16. Gateway runtime + port diagnostics">
    Doctor 會檢查服務執行時（PID、上次退出狀態），並在服務已安裝但實際未執行時發出警示。它也會檢查閘道連接埠（預設為 `18789`）是否有連接埠衝突，並回報可能的原因（閘道已在執行中、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    當閘道服務在 Bun 或受版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上執行時，Doctor 會發出警示。WhatsApp + Telegram 頻道需要 Node，且版本管理器路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化檔案。當可用時，Doctor 會提議將其遷移至系統 Node 安裝（Homebrew/apt/choco）。

    新安裝或修復的 macOS LaunchAgents 會使用標準系統 PATH（`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`），而不是複製互動式 shell PATH，因此 Homebrew 管理的系統二進位檔案保持可用，而 Volta、asdf、fnm、pnpm 和其他版本管理器目錄不會改變 Node 子程序解析的路徑。Linux 服務仍保留明確的環境根目錄（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和穩定的使用者 bin 目錄，但推測的版本管理器備用目錄僅在這些目錄存在於磁碟上時才會寫入服務 PATH。

  </Accordion>
  <Accordion title="18. Config write + wizard metadata">
    Doctor 會保存任何組態變更，並標記精靈中繼資料以記錄 doctor 的執行。
  </Accordion>
  <Accordion title="19. Workspace tips (backup + memory system)">
    Doctor 會在缺少工作區記憶系統時提出建議，並在工作區尚未受 git 管理時列印備份提示。

    請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構和 git 備份的完整指南（建議使用私人的 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
