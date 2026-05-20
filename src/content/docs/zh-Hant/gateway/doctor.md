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
  <Accordion title="Config and migrations">
    - 舊版值的設定正規化。
    - 將對話設定從舊版的扁平 `talk.*` 欄位遷移至 `talk.provider` + `talk.providers.<provider>`。
    - 檢查舊版 Chrome 擴充功能設定與 Chrome MCP 準備情況的瀏覽器遷移。
    - OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - Codex OAuth 遮蔽警告（`models.providers.openai-codex`）。
    - 檢查 OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件。
    - 當 `plugins.allow` 為限制性但工具原則仍要求萬用字元或外掛擁有的工具時，顯示外掛/工具允許清單警告。
    - 舊版磁碟狀態遷移（sessions/agent dir/WhatsApp auth）。
    - 舊版外掛清單合約金鑰遷移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 舊版 cron 存儲遷移（`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、簡單 `notify: true` webhook 後備作業）。
    - 舊版全代理 runtime-policy 清理；提供者/模型 runtime policy 是作用中的路由選擇器。
    - 啟用外掛時清理過時的外掛設定；當設為 `plugins.enabled=false` 時，過時的外掛參照會被視為非靜態的封裝設定並予以保留。

  </Accordion>
  <Accordion title="狀態與完整性">
    - 檢查工作階段鎖定檔案並清理過時的鎖定。
    - 修復工作階段紀錄，修復受影響的 2026.4.4 版本所建立的重複提示重寫分支。
    - 卡住的子代理程式重新啟動復原墓碑檢測，並具有 `--fix` 支援，可清除過時的已中止復原旗標，以免啟動時持續將子程序視為重新啟動已中止。
    - 狀態完整性和權限檢查（工作階段、紀錄、狀態目錄）。
    - 在本機執行時的設定檔權限檢查 (chmod 600)。
    - 模型驗證健康狀況：檢查 OAuth 到期時間，可重新整理即將到期的權杖，並回報驗證設定檜冷卻/停用狀態。
    - 額外的工作區目錄檢測 (`~/openclaw`)。

  </Accordion>
  <Accordion title="閘道、服務與監督器">
    - 啟用沙盒時修復沙盒映像檔。
    - 舊版服務遷移與額外閘道偵測。
    - Matrix 頻道舊版狀態遷移（在 `--fix` / `--repair` 模式下）。
    - 閘道執行時期檢查（服務已安裝但未執行；快取的 launchd 標籤）。
    - 頻道狀態警告（從執行中的閘道探測）。
    - 頻道專屬權限檢查位於 `openclaw channels capabilities`；例如，Discord 語音頻道權限會使用 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 進行稽核。
    - WhatsApp 回應性檢查，針對閘道事件迴圈效能下降但本機 TUI 客戶端仍在執行的情況；`--fix` 僅會停止已驗證的本機 TUI 客戶端。
    - Codex 路由修復，針對主要模型、備援、心跳/子代理/壓縮覆寫、掛鉤、頻道模型覆寫與工作階段路由釘選中的舊版 `openai-codex/*` 模型參照；`--fix` 會將其重寫為 `openai/*`，移除過時的工作階段/整體代理執行時期釘選，並在預設 Codex 駭具上保留標準的 OpenAI 代理參照。
    - 監督器設定稽核（launchd/systemd/schtasks），可選擇進行修復。
    - 針對在安裝或更新期間擷取 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值的閘道服務，清理嵌入式代理環境變數。
    - 閘道執行時期最佳實務檢查（Node 與 Bun、版本管理器路徑）。
    - 閘道連接埠衝突診斷（預設 `18789`）。

  </Accordion>
  <Accordion title="驗證、安全性與配對">
    - 針對開放 DM 政策的安全性警告。
    - 本機權杖模式下的閘道驗證檢查（當不存在權杖來源時提供權杖產生；不會覆寫權杖 SecretRef 設定）。
    - 裝置配對問題偵測（待處理的首次配對請求、待處理的角色/範圍升級、過時的本機裝置權杖快取漂移，以及配對記錄驗證漂移）。

  </Accordion>
  <Accordion title="工作區與 Shell">
    - Linux 上的 systemd linger 檢查。
    - 工作區啟動檔案大小檢查（針對上下文檔案的截斷/接近上限警告）。
    - 預設代理程式的技能就緒檢查；報告缺少 bins、env、config 或 OS 需求的允許技能，並且 `--fix` 可以在 `skills.entries` 中停用不可用的技能。
    - Shell 自動完成狀態檢查與自動安裝/升級。
    - 記憶體搜尋嵌入提供者就緒檢查（本機模型、遠端 API 金鑰或 QMD 二進位檔）。
    - 原始碼安裝檢查（pnpm 工作區不匹配、缺少 UI 資產、缺少 tsx 二進位檔）。
    - 寫入更新的設定 + 精靈中繼資料。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填與重置

控制 UI Dreams 場景包含針對落地做夢工作流程的 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除落地）動作。這些動作使用 gateway doctor 風格的 RPC 方法，但它們**不**屬於 `openclaw doctor` CLI 修復/遷移的一部分。

它們的功能：

- **Backfill** 會掃描現用工作區中的歷史 `memory/YYYY-MM-DD.md` 檔案，執行落地 REM 日記傳遞，並將可逆轉的回填條目寫入 `DREAMS.md`。
- **Reset** 僅從 `DREAMS.md` 中移除那些標記為回填的日記條目。
- **Clear Grounded** 僅移除那些來自歷史重播且尚未累積活躍回憶或每日支援的暫存落地專用短期條目。

它們自身**不**會做的事：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您先明確執行暫存 CLI 路徑，否則它們不會自動將落地候選項暫存到活躍的短期升級存放區

如果您希望落地歷史重播影響正常的深度升級管道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將落地持久候選項暫存到短期做夢存放區，同時保持 `DREAMS.md` 作為審查介面。

## 詳細行為與基本原理

<AccordionGroup>
  <Accordion title="0. 可選更新（Git 安裝）">
    如果這是 git 檢出並且 doctor 正以互動模式執行，它會在執行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 設定正規化">
    如果設定包含舊版數值形狀（例如沒有通道特定覆寫的 `messages.ackReaction`），doctor 會將其正規化為目前架構。

    這包括舊版 Talk 扁平欄位。目前的公開 Talk 語音設定是 `talk.provider` + `talk.providers.<provider>`，而即時語音設定是 `talk.realtime.*`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形狀重寫為供應商對應，並將舊版頂層即時選擇器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重寫為 `talk.realtime`。

    當 `plugins.allow` 非空且工具原則使用
    萬用字元或外掛擁有的工具項目時，Doctor 也會發出警告。`tools.allow: ["*"]` 僅符合
    實際載入之外掛中的工具；它不會繞過專屬外掛
    白名單。Doctor 會針對已遷移的
    舊版白名單設定寫入 `plugins.bundledDiscovery: "compat"` 以保留現有的捆綁供應商行為，並
    隨後指向更嚴格的 `"allowlist"` 設定。

  </Accordion>
  <Accordion title="2. 舊版配置鍵遷移">
    當配置包含已棄用的鍵時，其他指令將拒絕執行並要求您執行 `openclaw doctor`。

    Doctor 會執行以下操作：

    - 說明找到了哪些舊版鍵。
    - 顯示它應用的遷移。
    - 以更新後的架構重寫 `~/.openclaw/openclaw.json`。

    Gateway 啟動時會拒絕舊版配置格式，並要求您執行 `openclaw doctor --fix`；它不會在啟動時重寫 `openclaw.json`。Cron 任務存儲遷移也由 `openclaw doctor --fix` 處理。

    目前的遷移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 頂層 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 舊版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - 舊版頂層即時 Talk 選擇器 (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 對於具有命名 `accounts` 但仍存在單帳戶頂層通道值的通道，將這些帳戶範圍的值移至為該通道選擇的提升帳戶中（大多數通道為 `accounts.default`；Matrix 可以保留現有的匹配命名/預設目標）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；對於緩慢的提供者/模型逾時，請使用 `models.providers.<id>.timeoutSeconds`，並且當整個執行必須持續更長時間時，將 agent/run 逾時保持在該值之上
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (舊版擴充功能轉送設定)
    - 舊版 `models.providers.*.api: "openai"` → `"openai-completions"` (gateway 啟動時也會跳過其 `api` 被設定為未來或未知枚舉值的提供者，而不是封閉式失敗)
    - 移除 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始終保持 Codex 原生工作區工具為原生

    Doctor 警告還包含多帳戶通道的帳戶預設指導：

    - 如果配置了兩個或多個 `channels.<channel>.accounts` 條目但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 會警告備援路由可能會選擇意外的帳戶。
    - 如果 `channels.<channel>.defaultAccount` 被設定為未知的帳戶 ID，doctor 會發出警告並列出已配置的帳戶 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供者覆寫">
    如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，這將覆寫來自 `@earendil-works/pi-ai` 的內建 OpenCode 目錄。這可能會強制將模型導向錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除覆寫並恢復各個模型的 API 路由與成本。
  </Accordion>
  <Accordion title="2c. 瀏覽器遷移與 Chrome MCP 就緒檢查">
    如果您的瀏覽器設定仍指向已移除的 Chrome 擴充功能路徑，doctor 會將其標準化為目前的本機 Chrome MCP 附加模式：

    - `browser.profiles.*.driver: "extension"` 會變成 `"existing-session"`
    - `browser.relayBindHost` 會被移除

    當您使用 `defaultProfile: "user"` 或設定的 `existing-session` 設定檔時，Doctor 也會稽核本機 Chrome MCP 路徑：

    - 檢查預設自動連線設定檔是否已在同一台主機上安裝 Google Chrome
    - 檢查偵測到的 Chrome 版本，如果低於 Chrome 144 則發出警告
    - 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 無法為您啟用 Chrome 端的設定。本機 Chrome MCP 仍然需要：

    - 閘道/節點主機上安裝 Chromium 瀏覽器 144+ 版本
    - 瀏覽器在本地執行
    - 在該瀏覽器中啟用遠端偵錯
    - 在瀏覽器中批准首次附加的同意提示

    此處的就緒檢查僅涉及本地附加的先決條件。Existing-session 會保留目前的 Chrome MCP 路由限制；進階路由（例如 `responsebody`、PDF 匯出、下載攔截和批次操作）仍然需要受管理的瀏覽器或原始 CDP 設定檔。

    此檢查**不**適用於 Docker、sandbox、remote-browser 或其他無頭流程。這些流程會繼續使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 必要條件">
    當設定 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI 授權端點，以驗證本機 Node/OpenSSL TLS 堆疊是否能驗證憑證鏈。如果探查因憑證錯誤而失敗（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期的憑證或自我簽署憑證），doctor 會列印平台特定的修復指南。在使用 Homebrew Node 的 macOS 上，修復方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 時，即使閘道健全，探查仍會執行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供者覆寫">
    如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，它們可能會遮蔽較新版本自動使用的內建 Codex OAuth 提供者路徑。當 Doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時，會發出警告，讓您可以移除或重寫過時的傳輸覆寫，並恢復內建的路由/後援行為。自訂 Proxy 和僅標頭覆寫仍然受到支援，且不會觸發此警告。
  </Accordion>
  <Accordion title="2f. Codex 路由修復">
    Doctor 會檢查舊版 `openai-codex/*` 模型參照。原生 Codex harness 路由使用標準 `openai/*` 模型參照；OpenAI agent 轉向會經過 Codex app-server harness 而非 OpenClaw PI OpenAI 路徑。

    在 `--fix` / `--repair` 模式下，doctor 會重寫受影響的 default-agent 和 per-agent 參照，包括主要模型、備援、heartbeat/subagent/compaction 覆寫、hooks、頻道模型覆寫，以及過時的持久化會話路由狀態：

    - `openai-codex/gpt-*` 會變成 `openai/gpt-*`。
    - Codex intent 會移動到針對已修復 agent 模型參照的 provider/model-scoped `agentRuntime.id: "codex"` 項目，以便在模型參照變成 `openai/*` 後仍能選擇 `openai-codex:...` auth profiles。
    - 會移除過時的全 agent runtime 配置和持久化會話 runtime 固定值，因為 runtime 選擇是 provider/model-scoped 的。
    - 會保留現有的 provider/model runtime 原則，除非已修復的舊版模型參照需要 Codex 路由來保持舊的 auth 路徑。
    - 會保留現有的模型備援清單，並重寫其中的舊版項目；複製的 per-model 設定會從舊版金鑰移動到標準 `openai/*` 金鑰。
    - 會在所有探索到的 agent session stores 中修復持久化會話 `modelProvider`/`providerOverride`、`model`/`modelOverride`、備援通知，以及 auth-profile 固定值。
    - `/codex ...` 意指「從聊天控制或綁定原生 Codex 對話」。
    - `/acp ...` 或 `runtime: "acp"` 意指「使用外部 ACP/acpx 轉接器」。

  </Accordion>
  <Accordion title="2g. Session route cleanup">
    Doctor 也會掃描發現的 agent session stores，當您將設定的模型或執行時環境從外掛擁有的路由（例如 Codex）移開後，尋找過時的自動建立路由狀態。

    `openclaw doctor --fix` 可以清除自動建立的過時狀態，例如 `modelOverrideSource: "auto"` 模型釘選、執行時模型中繼資料、釘選的 harness id、CLI session 繫結以及自動 auth-profile 覆寫，條件是其擁有的路由已不再設定。明確的使用者或舊版 session 模型選擇會被回報以供人工審查，且保持不變；當該路由不再需要時，請使用 `/model ...`、`/new` 切換它們，或重置 session。

  </Accordion>
  <Accordion title="3. Legacy state migrations (disk layout)">
    Doctor 可以將較舊的磁碟佈局遷移至目前的結構：

    - Sessions store + transcripts:
      - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent dir:
      - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp auth state (Baileys):
      - 從舊版 `~/.openclaw/credentials/*.json` （除了 `oauth.json`）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （預設 account id: `default`）

    這些遷移屬於盡力而為且具等冪性；當 doctor 將任何舊版資料夾保留作為備份時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版 sessions + agent dir，讓歷史紀錄/驗證/模型無需手動執行 doctor 即能落入每個 agent 的路徑中。WhatsApp auth 僅透過 `openclaw doctor` 故意進行遷移。Talk provider/provider-map 標準化現在會透過結構相等性進行比較，因此僅鍵順序的差異將不再觸發重複的無操作 `doctor --fix` 變更。

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor 會掃描所有已安裝的外掛清單，尋找已棄用的頂層功能金鑰（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。當找到這些金鑰時，它會將其移動到 `contracts` 物件中，並直接就地重寫清單檔案。此遷移具有等冪性（idempotent）；如果 `contracts` 金鑰已經具有相同的值，則會移除舊版金鑰而不會重複資料。
  </Accordion>
  <Accordion title="3b. Legacy cron store migrations">
    Doctor 也會檢查 cron job store（預設為 `~/.openclaw/cron/jobs.json`，若被覆寫則為 `cron.store`）中排程器為了相容性仍接受的舊 job 形狀。

    目前的 cron 清理項目包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 頂層 payload 欄位（`message`、`model`、`thinking`，...）→ `payload`
    - 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`，...）→ `delivery`
    - payload `provider` delivery 別名 → 明確的 `delivery.channel`
    - 簡單的舊版 `notify: true` webhook 後備作業 → 具有明確 `delivery.mode="webhook"` 和 `delivery.to=cron.webhook` 的作業

    只有當 Doctor 能在不改變行為的情況下，才會自動遷移 `notify: true` 作業。如果作業結合了舊版 notify 後備機制與現有的非 webhook 傳遞模式，Doctor 會發出警告並保留該作業供人工審查。

    在 Linux 上，如果使用者的 crontab 仍然呼叫舊版 `~/.openclaw/bin/ensure-whatsapp.sh`，Doctor 也會發出警告。詞主機本機腳本目前不受 OpenClaw 維護，當 cron 無法連接 systemd user bus 時，可能會將錯誤的 `Gateway inactive` 訊息寫入 `~/.openclaw/logs/whatsapp-health.log`。請使用 `crontab -e` 移除過時的 crontab 項目；並使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 進行目前的健康檢查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 會掃描每個 agent session 目錄，尋找過期的寫入鎖定檔案（write-lock files）——即當 session 異常結束時遺留下的檔案。對於找到的每個鎖定檔案，它會回報：路徑、PID、PID 是否仍在運作、鎖定存在時間，以及是否被視為過期（PID 已終止、超過 30 分鐘，或是可證明屬於非 OpenClaw 程序的運作中 PID）。在 `--fix` / `--repair` 模式下，它會自動移除過期的鎖定檔案；否則它會印出提示並指示您使用 `--fix` 重新執行。
  </Accordion>
  <Accordion title="3d. Session transcript branch repair">
    Doctor 會掃描 agent session JSONL 檔案，尋找由 2026.4.24 prompt transcript rewrite bug 所建立的重複分支結構：一個包含 OpenClaw 內部運行時語境的被放棄使用者輪次，加上一個包含相同可見使用者提示的活躍同層級分支。在 `--fix` / `--repair` 模式下，doctor 會在原始檔案旁備份每個受影響的檔案，並將記錄重寫至活躍分支，讓 gateway 歷史和記憶體讀取器不再看到重複的輪次。
  </Accordion>
  <Accordion title="4. 狀態完整性檢查 (會話持久化、路由與安全性)">
    狀態目錄是運作中的樞紐。若它消失，您將失去會話、憑證、日誌與組態 (除非您在別處有備份)。

    Doctor 檢查項目：

    - **State dir missing**：警告災難性的狀態遺失，提示重新建立目錄，並提醒您無法遺失的資料。
    - **State dir permissions**：驗證可寫入性；提供修復權限 (當偵測到擁有者/群組不匹配時發出 `chown` 提示)。
    - **macOS cloud-synced state dir**：當狀態解析於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下方時發出警告，因為同步備份的路徑可能導致較慢的 I/O 與鎖定/同步競爭。
    - **Linux SD or eMMC state dir**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 備份的隨機 I/O 在會話與憑證寫入時可能較慢且磨損更快。
    - **Session dirs missing**：`sessions/` 與會話儲存目錄為持久化歷史並避免 `ENOENT` 當機所必需。
    - **Transcript mismatch**：當近期的會話項目缺少文字記錄檔案時發出警告。
    - **Main session "1-line JSONL"**：當主要文字記錄僅有一行時標記 (歷史未累積)。
    - **Multiple state dirs**：當多個 `~/.openclaw` 資料夾存在於不同家目錄，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告 (歷史可能分散於不同安裝)。
    - **Remote mode reminder**：若 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行 (狀態位於該處)。
    - **Config file permissions**：若 `~/.openclaw/openclaw.json` 可被群組/世界讀取則發出警告，並提供收緊為 `600`。

  </Accordion>
  <Accordion title="5. 模型驗證健康狀態（OAuth 到期）">
    Doctor 會檢查驗證存儲中的 OAuth 設定檔，在權杖即將到期或已過期時發出警告，並在安全時進行更新。如果 Anthropic OAuth/權杖設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。更新提示僅在以互動方式（TTY）執行時出現；`--non-interactive` 會跳過更新嘗試。

    當 OAuth 更新永久失敗（例如 `refresh_token_reused`、`invalid_grant`，或供應商通知您重新登入）時，doctor 會回報需要重新驗證，並列印出確切的 `openclaw models auth login --provider ...` 指令以供執行。

    Doctor 也會回報因以下原因暫時無法使用的驗證設定檔：

    - 短暫冷卻（速率限制/逾時/驗證失敗）
    - 較長時間的停用（帳單/信用失敗）

  </Accordion>
  <Accordion title="6. Hooks 模型驗證">
    如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。
  </Accordion>
  <Accordion title="7. Sandbox 映像檔修復">
    當啟用沙箱機制時，doctor 會檢查 Docker 映像檔，如果目前映像檔遺失，會提供建置或切換至舊版名稱的選項。
  </Accordion>
  <Accordion title="7b. Plugin install cleanup">
    Doctor 會在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下移除舊版 OpenClaw 產生的外掛程式相依性暫存狀態。這包括過時的產生相依性根目錄、舊的安裝階段目錄、來自早期組合外掛相依性修復程式碼的套件本機殘留檔案，以及可能遮蔽目前組合清單的孤立或已復原之受控 npm 套件組合 `@openclaw/*` 外掛程式副本。Doctor 也會將主機 `openclaw` 套件重新連結至宣告 `peerDependencies.openclaw` 的受控 npm 外掛程式，以便在更新或 npm 修復後，諸如 `openclaw/plugin-sdk/*` 的套件本機執行時間匯入能持續正確解析。

    當組態參照外掛程式但本機外掛登錄找不到它們時，Doctor 也可以重新安裝遺失的可下載外掛程式。範例包括 material `plugins.entries`、設定的通道/提供者/搜尋設定，以及設定的代理程式執行環境。在套件更新期間，當核心套件正在交換時，doctor 會避免執行套件管理員外掛修復；如果設定的外掛仍需要復原，請在更新後再次執行 `openclaw doctor --fix`。Gateway 啟動和組態重新載入不會執行套件管理員；外掛安裝仍屬明確的 doctor/install/update 工作。

  </Accordion>
  <Accordion title="8. Gateway service migrations and cleanup hints">
    Doctor 會偵測舊版 gateway 服務 (launchd/systemd/schtasks)，並提議將其移除，然後使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外的類似 gateway 的服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一級服務，不會被標記為「額外」。

    在 Linux 上，如果缺少使用者層級的 gateway 服務，但存在系統層級的 OpenClaw gateway 服務，doctor 不會自動安裝第二個使用者層級服務。請使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 進行檢查，然後移除重複項，或者當系統管理員負責 gateway 生命週期時，設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 啟動時 Matrix 遷移">
    當 Matrix 頻道帳號有待處理或可操作的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前的快照，然後執行盡力的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，啟動會繼續。在唯讀模式（`openclaw doctor` 但不帶 `--fix`）下，此檢查會被完全跳過。
  </Accordion>
  <Accordion title="8c. 裝置配對與認證漂移">
    Doctor 現在會將裝置配對狀態檢查作為正常健康檢查的一部分。

    它會回報以下項目：

    - 待處理的首次配對請求
    - 已配對裝置的待處理角色升級
    - 已配對裝置的待處理範圍升級
    - 公鑰不符修復，即裝置 ID 仍然匹配但裝置身分不再符合已核准記錄的情況
    - 已配對記錄缺少已核准角色的有效權杖
    - 已配對權杖的範圍偏離已核准配對基準
    - 本機快取的目前機器裝置權杖條目，其日期早於閘道端權杖輪替或包含過時的範圍元資料

    Doctor 不會自動核准配對請求或自動輪替裝置權杖。取而代之的是，它會列印確切的後續步驟：

    - 使用 `openclaw devices list` 檢查待處理請求
    - 使用 `openclaw devices approve <requestId>` 核準確切的請求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 輪替新的權杖
    - 使用 `openclaw devices remove <deviceId>` 移除並重新核准過時的記錄

    這解決了常見的「已配對但仍被要求配對」的漏洞：doctor 現在能區分首次配對、待處理的角色/範圍升級，以及過時權杖/裝置身分漂移。

  </Accordion>
  <Accordion title="9. 安全性警告">
    當提供者在沒有允許清單的情況下開放私訊，或是以危險方式設定原則時，Doctor 會發出警告。
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    如果作為 systemd 使用者服務執行，doctor 會確保啟用 linger，以便閘道在登出後保持運作。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 會列印預設代理程式的工作區狀態摘要：

    - **Skills status**：計算符合資格、缺少需求以及被允許清單封鎖的技能。
    - **Legacy workspace dirs**：當 `~/openclaw` 或其他舊版工作區目錄與目前的工作區同時存在時發出警告。
    - **Plugin status**：計算已啟用/已停用/錯誤的外掛程式；列出任何錯誤的外掛程式 ID；回報捆綁外掛程式功能。
    - **Plugin compatibility warnings**：標記與目前執行時間有相容性問題的外掛程式。
    - **Plugin diagnostics**：顯示外掛程式註冊表發出的任何載入時間警告或錯誤。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 會檢查工作區啟動檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他插入的上下文檔案）是否接近或超過設定的字元預算。它會回報每個檔案的原始與插入字元計數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總插入字元佔總預算的比例。當檔案被截斷或接近限制時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    當 `openclaw doctor --fix` 移除遺漏的通道外掛程式時，它也會移除參考該外掛程式的懸空通道範圍配置：`channels.<id>` 條目、指定該通道的心跳目標，以及 `agents.*.models["<channel>/*"]` 覆寫。這可以防止 Gateway 啟動迴圈，即通道執行時間已消失但配置仍要求閘道繫結至該通道。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 會檢查目前 Shell (zsh、bash、fish 或 PowerShell) 是否已安裝 Tab 鍵自動完成功能：

    - 如果 Shell 設定檔使用緩慢的動態完成模式 (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的快取檔案版本。
    - 如果在設定檔中已設定完成功能但缺少快取檔案，doctor 會自動重新產生快取。
    - 如果完全沒有設定完成功能，doctor 會提示安裝 (僅限互動模式；使用 `--non-interactive` 時會跳過)。

    執行 `openclaw completion --write-state` 以手動重新產生快取。

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor 會檢查本機 Gateway token 驗證的準備狀態。

    - 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
    - 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，且不會用明文覆寫它。
    - `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制產生。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修復流程需要檢查設定的憑證，而不會削弱執行時期的「快速失敗」 行為。

    - `openclaw doctor --fix` 現在針對目標設定修復，使用與 status 系列指令相同的唯讀 SecretRef 摘要模型。
    - 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用設定的 bot 憑證。
    - 如果 Telegram bot token 是透過 SecretRef 設定，但在目前指令路徑中無法使用，doctor 會回報該憑證為「已設定但無法使用」，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

  </Accordion>
  <Accordion title="13. Gateway health check + restart">
    Doctor 會執行健康檢查，並在 Gateway 看起來不健康時提議重新啟動。
  </Accordion>
  <Accordion title="13b. 記憶體搜尋就緒狀態">
    Doctor 會檢查設定的記憶體搜尋嵌入提供者是否已準備好供預設代理程式使用。其行為取決於設定的後端與提供者：

    - **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。如果不可用，則會列印修復指引，包括 npm 套件與手動二進位路徑選項。
    - **明確的本地提供者**：檢查是否有本機模型檔案或可識別的遠端/可下載模型 URL。如果遺失，建議切換至遠端提供者。
    - **明確的遠端提供者**（`openai`、`voyage` 等）：驗證環境變數或認證儲存中是否存在 API 金鑰。如果遺失，則列印可執行的修復提示。
    - **自動提供者**：先檢查本機模型的可用性，然後依照自動選擇順序嘗試每個遠端提供者。

    當有可用的閘道探測快取結果（檢查時閘道狀態良好）時，doctor 會將其結果與 CLI 可見的設定進行交叉比對，並標註任何差異。Doctor 不會在預設路徑上發起新的嵌入 ping 呼叫；當您需要即時提供者檢查時，請使用 deep memory status 指令。

    使用 `openclaw memory status --deep` 以在執行時期驗證嵌入就緒狀態。

  </Accordion>
  <Accordion title="14. 頻道狀態警告">
    如果閘道狀態良好，doctor 會執行頻道狀態探測並回報帶有建議修復方式的警告。
  </Accordion>
  <Accordion title="15. Supervisor 設定檔稽核與修復">
    Doctor 會檢查已安裝的 Supervisor 設定檔 (launchd/systemd/schtasks) 是否缺少或過時的預設值 (例如，systemd network-online 相依性和重新啟動延遲)。當發現不符時，它會建議更新並可將服務檔案/任務重寫為目前的預設值。

    注意事項：

    - `openclaw doctor` 會在重寫 Supervisor 設定之前提示。
    - `openclaw doctor --yes` 接受預設的修復提示。
    - `openclaw doctor --fix` 在不提示的情況下套用建議的修復 (`--repair` 是別名)。
    - `openclaw doctor --fix --force` 會覆寫自訂的 Supervisor 設定。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 保持 Doctor 對於 Gateway 服務生命週期為唯讀。它仍會回報服務健康狀況並執行非服務修復，但會跳過服務安裝/啟動/重新啟動/啟動、Supervisor 設定重寫以及舊版服務清理，因為外部 Supervisor 擁有該生命週期。
    - 在 Linux 上，當對應的 systemd gateway 單元處於作用中狀態時，Doctor 不會重寫 command/entrypoint 中繼資料。它還會在重複服務掃描期間忽略非作用中的非舊版額外 Gateway 類似單元，以免伴隨的服務檔案產生清理雜訊。
    - 如果 Token 驗證需要 Token 且 `gateway.auth.token` 是由 SecretRef 管理，Doctor 服務安裝/修復會驗證 SecretRef，但不會將解析出的明文 Token 值保存到 Supervisor 服務環境中繼資料中。
    - Doctor 會偵測舊版 LaunchAgent、systemd 或 Windows 排程任務安裝內嵌的受管理 `.env`/SecretRef 支援的服務環境值，並重寫服務中繼資料，以便這些值從執行階段來源載入，而不是從 Supervisor 定義載入。
    - 當服務命令在 `gateway.port` 變更後仍舊釘選到舊的 `--port` 時，Doctor 會偵測到並將服務中繼資料重寫為目前的連接埠。
    - 如果 Token 驗證需要 Token 且設定的 Token SecretRef 未解析，Doctor 會提供可操作的指引並封鎖安裝/修復路徑。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已設定且未設定 `gateway.auth.mode`，Doctor 會封鎖安裝/修復，直到明確設定模式為止。
    - 對於 Linux user-systemd 單元，Doctor token 漂移檢查現在會在比較服務驗證中繼資料時包含 `Environment=` 和 `EnvironmentFile=` 來源。
    - 當設定最後是由較新版本寫入時，Doctor 服務修復會拒絕重寫、停止或重新啟動來自較舊 OpenClaw 二進位檔案的 Gateway 服務。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您始終可以透過 `openclaw gateway install --force` 強制執行完整重寫。

  </Accordion>
  <Accordion title="16. Gateway runtime + port diagnostics">
    Doctor 會檢查服務運行時 (PID、上次退出狀態)，並在服務已安裝但未實際運行時發出警告。它還會檢查閘道埠 (預設 `18789`) 是否有衝突，並報告可能的原因 (閘道已在運行、SSH 通道)。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    當閘道服務在 Bun 或受版本管理的 Node 路徑 (`nvm`、`fnm`、`volta`、`asdf` 等) 上運行時，Doctor 會發出警告。WhatsApp 和 Telegram 頻道需要 Node，而版本管理器路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化設定。當有系統 Node 安裝可用時 (Homebrew/apt/choco)，Doctor 會提議遷移。

    新安裝或修復的 macOS LaunchAgents 會使用標準的系統 PATH (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`)，而不是複製互動式 shell PATH，因此 Homebrew 管理的系統二進位檔案仍然可用，而 Volta、asdf、fnm、pnpm 和其他版本管理器目錄不會影響 Node 子程序解析的路徑。Linux 服務仍然保留明確的環境根目錄 (`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`) 和穩定的使用者 bin 目錄，但推測的版本管理器備用目錄只有在磁碟上存在這些目錄時，才會寫入服務 PATH。

  </Accordion>
  <Accordion title="18. Config write + wizard metadata">
    Doctor 會保存任何組態變更，並標記精靈中繼資料以記錄 doctor 的執行。
  </Accordion>
  <Accordion title="19. 工作區提示（備份 + 記憶系統）">
    當缺少工作區記憶系統時，Doctor 會建議安裝；如果工作區尚未納入 git 版本控制，則會印出備份提示。

    請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構與 git 備份的完整指南（建議使用私人的 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相關

- [Gateway 手冊](/zh-Hant/gateway)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
