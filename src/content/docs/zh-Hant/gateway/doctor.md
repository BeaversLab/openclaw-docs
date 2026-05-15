---
summary: "Doctor command: health checks, config migrations, and repair steps"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "醫生"
---

`openclaw doctor` 是 OpenClaw 的修復和遷移工具。它能修復過時的設定/狀態，檢查健康狀況，並提供可執行的修復步驟。

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

    接受預設值而不提示（包括適用時的重啟/服務/沙箱修復步驟）。

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    在不提示的情況下套用建議的修復（在安全的地方進行修復和重啟）。

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    也套用積極的修復（覆寫自訂 supervisor 設定）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    無提示執行，僅套用安全的遷移（設定正規化 + 磁碟上的狀態移動）。跳過需要人員確認的重啟/服務/沙箱動作。偵測到舊版狀態遷移時會自動執行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    掃描系統服務以尋找額外的閘道安裝（launchd/systemd/schtasks）。

  </Tab>
</Tabs>

如果您想在寫入之前檢視變更，請先開啟設定檔：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能摘要

<AccordionGroup>
  <Accordion title="Health, UI, and updates">
    - 針對 git 安裝的可選預檢更新（僅限互動模式）。
    - UI 通訊協定新鮮度檢查（當通訊協定架構較新時重建 Control UI）。
    - 健康檢查 + 重新啟動提示。
    - Skills 狀態摘要（符合資格/遺失/被封鎖）和外掛程式狀態。

  </Accordion>
  <Accordion title="設定與遷移">
    - 針對舊版值的設定正規化。
    - 將對話設定從舊版扁平的 `talk.*` 欄位遷移至 `talk.provider` + `talk.providers.<provider>`。
    - 瀏覽器遷移檢查，包含舊版 Chrome 擴充功能設定和 Chrome MCP 準備狀況。
    - OpenCode 提供者覆寫警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - Codex OAuth 遮蔽警告（`models.providers.openai-codex`）。
    - 針對 OpenAI Codex OAuth 設定檔的 OAuth TLS 先決條件檢查。
    - 當 `plugins.allow` 具有限制性，但工具原則仍要求萬用字元或外掛擁有的工具時，顯示外掛/工具允許清單警告。
    - 舊版磁碟狀態遷移（sessions/agent dir/WhatsApp auth）。
    - 舊版外掛清單合約金鑰遷移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 舊版 cron 存儲遷移（`jobId`、`schedule.cron`、頂層 delivery/payload 欄位、payload `provider`、簡單的 `notify: true` webhook 後備作業）。
    - 舊版全代理執行時期原則清理；提供者/模型執行時期原則為啟用的路由選擇器。
    - 啟用外掛時清理過時的外掛設定；當 `plugins.enabled=false` 時，過時的外掛參考會被視為非作用中的容器設定並予以保留。

  </Accordion>
  <Accordion title="狀態與完整性">
    - 檢查工作階段鎖定檔案並清理過時的鎖定。
    - 修復工作階段紀錄，修復受影響的 2026.4.4 版本所建立的重複提示重寫分支。
    - 卡住的子代理重新啟動復原墓碑標記檢測，具備 `--fix` 支援以清除過時的已中止復原標記，避免啟動時持續將子程序視為已中止重新啟動。
    - 狀態完整性和權限檢查（工作階段、紀錄、狀態目錄）。
    - 當地執行時的設定檔權限檢查 (chmod 600)。
    - 模型驗證健康狀態：檢查 OAuth 過期、可重新整理過期權杖，並回報驗證設定檔冷卻/停用狀態。
    - 額外的工作區目錄檢測 (`~/openclaw`)。

  </Accordion>
  <Accordion title="Gateway、服務和監督器">
    - 啟用沙箱時的沙箱映像修復。
    - 舊版服務遷移和額外的 Gateway 偵測。
    - Matrix 頻道舊版狀態遷移（在 `--fix` / `--repair` 模式下）。
    - Gateway 執行時檢查（服務已安裝但未執行；快取的 launchd 標籤）。
    - 頻道狀態警告（從執行中的 Gateway 探測）。
    - 特定頻道的權限檢查位於 `openclaw channels capabilities` 下；例如，Discord 語音頻道權限使用 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 進行稽核。
    - WhatsApp 回應性檢查，針對 Gateway 事件迴圈健康度下降但本機 TUI 客戶端仍在執行的情況；`--fix` 僅停止已驗證的本機 TUI 客戶端。
    - 針對主要模型、後備機制、heartbeat/subagent/compaction 覆寫、掛鉤、頻道模型覆寫和會話路由釘選中的舊版 `openai-codex/*` 模型參照進行 Codex 路由修復；`--fix` 會將其重寫為 `openai/*`，移除過時的會話/全代理執行時釘選，並在預設 Codex 駁具上保留標準的 OpenAI 代理參照。
    - 監督器設定稽核（launchd/systemd/schtasks），可選修復。
    - 針對在安裝或更新期間擷取了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值的 Gateway 服務，清理嵌入式 Proxy 環境。
    - Gateway 執行時最佳實踐檢查（Node vs Bun、版本管理器路徑）。
    - Gateway 連接埠衝突診斷（預設 `18789`）。

  </Accordion>
  <Accordion title="Auth、安全性和配對">
    - 關於開放 DM 原則的安全性警告。
    - 針對本機 Token 模式的 Gateway Auth 檢查（當不存在 Token 來源時提供 Token 產生；不會覆寫 Token SecretRef 設定）。
    - 裝置配對故障偵測（擱置中的首次配對請求、擱置中的角色/範圍升級、過時的本機裝置 Token 快取漂移，以及配對記錄 Auth 漂移）。

  </Accordion>
  <Accordion title="工作區與 shell">
    - Linux 上的 systemd linger 檢查。
    - 工作區啟動檔案大小檢查（針對上下文檔案的截斷/接近限制警告）。
    - 預設代理的技能就緒檢查；報告允許但缺少 bins、env、config 或 OS 需求的技能，並且 `--fix` 可以在 `skills.entries` 中停用不可用的技能。
    - Shell 補全狀態檢查及自動安裝/升級。
    - 記憶體搜尋嵌入提供者就緒檢查（本機模型、遠端 API 金鑰或 QMD 二進位檔）。
    - 原始碼安裝檢查（pnpm 工作區不匹配、缺少 UI 資產、缺少 tsx 二進位檔）。
    - 寫入更新的設定 + 精靈中繼資料。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填與重置

控制 UI Dreams 場景包含用於接地 夢想工作流程的 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除接地）動作。這些動作使用類似 gateway doctor 的 RPC 方法，但它們**並不**是 `openclaw doctor` CLI 修復/遷移的一部分。

它們的作用：

- **Backfill** 會掃描現用工作區中的歷史 `memory/YYYY-MM-DD.md` 檔案，執行接地 REM 日記傳遞，並將可逆的回填條目寫入 `DREAMS.md`。
- **Reset** 僅從 `DREAMS.md` 中移除那些標記為回填的日記條目。
- **清除基礎** 僅移除那些源自歷史重放、且尚未累積即時回憶或每日支援的暫存僅基礎短期項目。

它們本身**不**會做的是：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您明確先執行暫存的 CLI 路徑，否則它們不會自動將基礎候選項暫存至即時短期升級存放區

如果您希望基礎歷史重放能影響正常的深度升級通道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將接地的持久候選者暫存到短期夢想儲存庫中，同時將 `DREAMS.md` 作為審查介面。

## 詳細行為與原理

<AccordionGroup>
  <Accordion title="0. 可選更新 (git 安裝)">
    如果這是 git checkout 且 doctor 正以互動模式執行，它會在執行 doctor 之前提供更新 (fetch/rebase/build) 的選項。
  </Accordion>
  <Accordion title="1. 設定正規化">
    如果設定包含舊版值形狀（例如沒有通道特定覆寫的 `messages.ackReaction`），doctor 會將其正規化為目前的架構。

    這包含舊版 Talk 扁平欄位。目前的公開 Talk 語音設定是 `talk.provider` + `talk.providers.<provider>`，即時語音設定則是 `talk.realtime.*`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形狀重寫為提供者對應，並將舊版頂層即時選擇器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重寫為 `talk.realtime`。

    當 `plugins.allow` 非空且工具原則使用萬用字元或外掛擁有的工具項目時，Doctor 也會發出警告。`tools.allow: ["*"]` 僅匹配實際載入的外掛中的工具；它不會繞過專屬外掛允許清單。Doctor 會為遷移的舊版允許清單設定寫入 `plugins.bundledDiscovery: "compat"`，以保留現有的捆綁提供者行為，然後指向更嚴格的 `"allowlist"` 設定。

  </Accordion>
  <Accordion title="2. 舊版配置鍵遷移">
    當配置包含已棄用的鍵時，其他命令將拒絕執行並要求您執行 `openclaw doctor`。

    Doctor 將會：

    - 說明發現了哪些舊版鍵。
    - 顯示它所套用的遷移。
    - 使用更新後的架構重寫 `~/.openclaw/openclaw.json`。

    Gateway 啟動時會拒絕舊版配置格式，並要求您執行 `openclaw doctor --fix`；它不會在啟動時重寫 `openclaw.json`。Cron job 存儲遷移也由 `openclaw doctor --fix` 處理。

    目前的遷移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - configured-channel configs missing visible reply policy → `messages.groupChat.visibleReplies: "message_tool"`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → top-level `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - legacy `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - legacy top-level realtime Talk selectors (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
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
    - 對於具有命名 `accounts` 但仍遺留單一帳號頂層頻道值的頻道，將這些帳號範圍的值移至為該頻道選擇的升級帳號中（大多數頻道為 `accounts.default`；Matrix 可以保留現有的匹配命名/預設目標）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；針對緩慢的提供商/模型逾時使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (舊版擴充轉送設定)
    - legacy `models.providers.*.api: "openai"` → `"openai-completions"` (gateway 啟動時也會跳過其 `api` 設定為未來或未知列舉值的提供商，而不是封閉式失敗)
    - 移除 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始終保持 Codex 原生工作區工具的原生狀態

    Doctor 警告還包括多帳號頻道的帳號預設指導：

    - 如果配置了兩個或多個 `channels.<channel>.accounts` 項目，但沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 會警告備援路由可能會選擇非預期的帳號。
    - 如果 `channels.<channel>.defaultAccount` 設定為未知的帳號 ID，doctor 會發出警告並列出已配置的帳號 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供者覆寫">
    如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。這可能會強制模型使用錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除該覆寫並恢復依模型的 API 路由與成本。
  </Accordion>
  <Accordion title="2c. 瀏覽器遷移與 Chrome MCP 就緒檢查">
    如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，doctor 會將其正規化為目前的主機本機 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 會變成 `"existing-session"`
    - `browser.relayBindHost` 會被移除

    當您使用 `defaultProfile: "user"` 或設定的 `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

    - 檢查預設自動連線設定檔的主機上是否安裝了 Google Chrome
    - 檢查偵測到的 Chrome 版本，如果低於 Chrome 144 則發出警告
    - 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 無法為您啟用 Chrome 端的設定。主機本機 Chrome MCP 仍然需要：

    - 閘道/節點主機上安裝 144 版以上的 Chromium 瀏覽器
    - 瀏覽器在本機執行
    - 在該瀏覽器中啟用遠端偵錯
    - 在瀏覽器中核准第一個附加同意提示

    這裡的就緒檢查僅關乎本機附加的先決條件。現有工作階段會保持目前的 Chrome MCP 路由限制；進階路由如 `responsebody`、PDF 匯出、下載攔截和批次操作仍然需要受管理的瀏覽器或原始 CDP 設定檔。

    此檢查**不**適用於 Docker、sandbox、remote-browser 或其他無頭流程。這些流程會繼續使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 必要條件">
    當設定 OpenAI Codex OAuth 設定檔時，doctor 會探測 OpenAI 授權端點，以驗證本機 Node/OpenSSL TLS 堆疊能否驗證憑證鏈。如果探測因憑證錯誤而失敗（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期憑證或自我簽署憑證），doctor 會列印平台特定的修復指引。在 macOS 上搭配使用 Homebrew Node 時，修復方法通常是 `brew postinstall ca-certificates`。若使用 `--deep`，即使閘道狀態正常，探測仍會執行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供者覆寫">
    如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，它們可能會覆蓋較新版本自動使用的內建 Codex OAuth 提供者路徑。當 Doctor 發現這些舊的傳輸設定與 Codex OAuth 並存時會發出警告，以便您移除或重寫過時的傳輸覆寫，並恢復內建的路由/後援行為。自訂 proxy 和僅標頭的覆寫仍受支援，且不會觸發此警告。
  </Accordion>
  <Accordion title="2f. Codex 路由修復">
    Doctor 會檢查舊版 `openai-codex/*` 模型參照。原生 Codex harness 路由使用標準 `openai/*` 模型參照；OpenAI agent 轉向會透過 Codex app-server harness，而不是 OpenClaw PI OpenAI 路徑。

    在 `--fix` / `--repair` 模式下，doctor 會重寫受影響的 default-agent 和 per-agent 參照，包括主要模型、後備、heartbeat/subagent/compaction 覆寫、hooks、通道模型覆寫，以及過時的持久化會話路由狀態：

    - `openai-codex/gpt-*` 會變成 `openai/gpt-*`。
    - 過時的 whole-agent runtime 配置和持久化會話 runtime pin 會被移除，因為 runtime 選擇是針對提供者/模型的範圍。
    - 明確的提供者/模型 runtime 策略會被保留。
    - 現有的模型後備清單會被保留，並將其舊版條目重寫；複製的 per-model 設定會從舊版金鑰移至標準 `openai/*` 金鑰。
    - 持久化會話 `modelProvider`/`providerOverride`、`model`/`modelOverride`、後備通知、auth-profile pins 和 Codex harness pins 會在所有發現的 agent 會話存放區中修復。
    - `/codex ...` 表示「從聊天控制或綁定原生 Codex 對話」。
    - `/acp ...` 或 `runtime: "acp"` 表示「使用外部 ACP/acpx 配接器」。

  </Accordion>
  <Accordion title="2g. 會話路由清理">
    當您將已配置的模型或執行時從外掛擁有的路由（例如 Codex）移開後，Doctor 還會掃描發現的代理程式會話儲存，以尋找過時的自動建立路由狀態。

    當其擁有的路由不再被配置時，`openclaw doctor --fix` 可以清除自動建立的過時狀態，例如 `modelOverrideSource: "auto"` 模型釘選、執行時模型中繼資料、已釘選的 harness id、CLI 會話綁定和自動 auth-profile 覆寫。明確的使用者或舊版會話模型選擇將被回報以供手動審查，並保持不變；請使用 `/model ...`、`/new` 進行切換，或者當該路由不再需要時重置會話。

  </Accordion>
  <Accordion title="3. 舊版狀態遷移（磁碟佈局）">
    Doctor 可以將較舊的磁碟佈局遷移到當前結構：

    - 會話儲存 + 轉錄：
      - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - 代理程式目錄：
      - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp 認證狀態：
      - 從舊版 `~/.openclaw/credentials/*.json` （`oauth.json` 除外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （預設帳戶 id：`default`）

    這些遷移是盡力而為且冪等的；當 doctor 將任何舊版資料夾作為備份保留時，會發出警告。Gateway/CLI 也會在啟動時自動遷移舊版會話 + 代理程式目錄，以便歷史記錄/認證/模型無需手動執行 doctor 即可落入每個代理程式的路徑中。WhatsApp 認證僅透過 `openclaw doctor` 故意進行遷移。Talk provider/provider-map 正規化現在使用結構相等性進行比較，因此僅鍵順序的差異不再觸發重複的空操作 `doctor --fix` 變更。

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor 會掃描所有已安裝的外掛清單，尋找已棄用的頂層功能金鑰（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。當找到這些金鑰時，它會提議將其移至 `contracts` 物件中，並直接重寫清單檔案。此遷移具備等冪性（idempotent）；如果 `contracts` 金鑰已包含相同的數值，則會移除舊版金鑰而不會重複該資料。
  </Accordion>
  <Accordion title="3b. Legacy cron store migrations">
    Doctor 也會檢查 cron job store（預設為 `~/.openclaw/cron/jobs.json`，若覆寫則為 `cron.store`），尋找排程器為相容性仍接受的舊 job 形狀。

    目前的 cron 清理項目包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 頂層 payload 欄位（`message`、`model`、`thinking`，...）→ `payload`
    - 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`，...）→ `delivery`
    - payload `provider` delivery 別名 → 明確的 `delivery.channel`
    - 簡單的舊版 `notify: true` webhook 後備 jobs → 明確的 `delivery.mode="webhook"` 並搭配 `delivery.to=cron.webhook`

    Doctor 只有在能夠不改變行為的情況下，才會自動遷移 `notify: true` jobs。如果某個 job 結合了舊版 notify 後備機制與現有的非 webhook delivery 模式，doctor 會發出警告並將該 job 留待人工審查。

    在 Linux 上，如果使用者的 crontab 仍然呼叫舊版的 `~/.openclaw/bin/ensure-whatsapp.sh`，doctor 也會發出警告。該主機本機腳本已不由目前的 OpenClaw 維護，且當 cron 無法連線至 systemd user bus 時，可能會寫入錯誤的 `Gateway inactive` 訊息到 `~/.openclaw/logs/whatsapp-health.log`。請使用 `crontab -e` 移除過時的 crontab 項目；並使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 進行目前的健康檢查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 會掃描每一個 agent session 目錄，尋找過時的寫入鎖定檔案（write-lock files）—— 即在會話異常結束後遺留的檔案。對於每個找到的鎖定檔案，它會回報：路徑、PID、PID 是否仍在執行、鎖定存在時間，以及是否被視為過時（PID 已死、超過 30 分鐘，或是可證實屬於非 OpenClaw 程序的活躍 PID）。在 `--fix` / `--repair` 模式下，它會自動移除過時的鎖定檔案；否則它會列印備註並指示您使用 `--fix` 重新執行。
  </Accordion>
  <Accordion title="3d. Session transcript branch repair">
    Doctor 會掃描 agent session JSONL 檔案，尋找由 2026.4.24 prompt transcript rewrite 錯誤所建立的重複分支結構：一個包含 OpenClaw 內部執行時期內容的已棄用使用者回合，以及一個包含相同可見使用者提示的活躍同層分支。在 `--fix` / `--repair` 模式下，doctor 會將每個受影響的檔案備份在原始檔案旁，並將內容重寫至活躍分支，讓 gateway 歷史記錄與記憶體讀取器不再看到重複的回合。
  </Accordion>
  <Accordion title="4. 狀態完整性檢查（會話持久化、路由與安全性）">
    狀態目錄是運作中的核心。若其消失，您將失去會話、憑證、日誌與配置（除非您在其他地方有備份）。

    Doctor 會檢查：

    - **State dir missing**（狀態目錄遺失）：警告可能發生災難性的狀態遺失，提示重新建立目錄，並提醒您無法還原遺失的資料。
    - **State dir permissions**（狀態目錄權限）：驗證可寫入性；提供修復權限（並在偵測到擁有者/群組不符時發出 `chown` 提示）。
    - **macOS cloud-synced state dir**（macOS 雲端同步狀態目錄）：當狀態解析於 iCloud Drive（`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或 `~/Library/CloudStorage/...` 下時發出警告，因為同步支援的路徑可能導致較慢的 I/O 與鎖定/同步競爭。
    - **Linux SD or eMMC state dir**（Linux SD 或 eMMC 狀態目錄）：當狀態解析至 `mmcblk*``sessions/` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在會話與憑證寫入時可能較慢且磨損較快。
    - **Session dirs missing**（會話目錄遺失）：%%PH:INLINE_CODE:383:bea0b5b9％％與會話儲存目錄為持久化歷史與避免 `ENOENT` 崩潰所必需。
    - **Transcript mismatch**（對話紀錄不符）：當最近的會話項目缺少對話紀錄檔案時發出警告。
    - **Main session "1-line JSONL"**（主會話「單行 JSONL」）：當主要對話紀錄只有一行時標記（表示歷史未累積）。
    - **Multiple state dirs**（多個狀態目錄）：當多個 `~/.openclaw` 資料夾存在於各個家目錄中，或當 `OPENCLAW_STATE_DIR``~/.openclaw/openclaw.json``gateway.mode=remote` 指向其他位置時發出警告（歷史可能分散於不同安裝之間）。
    - **Remote mode reminder**（遠端模式提醒）：若 %%PH:INLINE_CODE:387:6dea0cf9％，doctor 會提醒您在遠端主機上執行（狀態位於該處）。
    - **Config file permissions**（配置檔案權限）：若 %%PH:INLINE_CODE:388:beb9fec7％％ 可被群組/全世界讀取則發出警告，並提供將其加強為 `600`。

  </Accordion>
  <Accordion title="5. 模型授權健康狀態 (OAuth 過期)">
    Doctor 會檢查授權儲存庫中的 OAuth 設定檔，在權杖即將過期或已過期時發出警告，並在安全時進行刷新。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。刷新提示僅在以互動方式執行 (TTY) 時出現；`--non-interactive` 會跳過刷新嘗試。

    當 OAuth 刷新永久失敗時（例如 `refresh_token_reused`、`invalid_grant`，或是提供者要求您重新登入），doctor 會報告需要重新驗證，並列印出確切的 `openclaw models auth login --provider ...` 指令以供執行。

    Doctor 也會回報因以下原因而暫時無法使用的授權設定檔：

    - 短暫冷卻 (速率限制/逾時/授權失敗)
    - 較長期的停用 (帳單/點數失敗)

  </Accordion>
  <Accordion title="6. Hooks 模型驗證">
    如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被拒絕時發出警告。
  </Accordion>
  <Accordion title="7. Sandboxing 映像檔修復">
    當啟用沙盒機制時，doctor 會檢查 Docker 映像檔，如果目前的映像檔遺失，會提供建立或切換至舊版名稱的選項。
  </Accordion>
  <Accordion title="7b. 外掛程式安裝清理">
    Doctor 會在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式中移除舊版 OpenClaw 產生的外掛程式依賴暫存狀態。這涵蓋過時的產生依賴根目錄、舊的安裝階段目錄、來自早期捆綁外掛程式依賴修復程式碼的套件本地殘留，以及可能遮蔽目前捆綁清單的孤立或已復原受管理 npm 捆綁 `@openclaw/*` 外掛程式複本。

    當設定參照了可下載的外掛程式但本地外掛程式登錄區找不到它們時，Doctor 也可以重新安裝這些遺失的外掛程式。範例包括素材 `plugins.entries`、設定的頻道/提供者/搜尋設定，以及設定的代理程式執行時。在套件更新期間，當核心套件正在交換時，doctor 會避免執行套件管理員外掛修復；如果設定的外掛程式仍需要復原，請在更新後再次執行 `openclaw doctor --fix`。Gateway 啟動和設定重新載入不會執行套件管理員；外掛程式安裝仍然是明確的 doctor/install/update 工作。

  </Accordion>
  <Accordion title="8. Gateway 服務移轉與清理提示">
    Doctor 會偵測舊版 gateway 服務（launchd/systemd/schtasks），並提議移除它們並使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外類似 gateway 的服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一等公民，不會被標記為「額外」。

    在 Linux 上，如果缺少使用者層級的 gateway 服務但存在系統層級的 OpenClaw gateway 服務，doctor 不會自動安裝第二個使用者層級服務。請使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 進行檢查，然後移除重複項目或在系統監督器擁有 gateway 生命週期時設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 啟動 Matrix 遷移">
    當 Matrix 頻道帳戶有待處理或可操作的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟都不是致命的；錯誤會被記錄下來，並且啟動會繼續。在唯讀模式（`openclaw doctor` 不含 `--fix`）下，此檢查會被完全跳過。
  </Accordion>
  <Accordion title="8c. 裝置配對與認證漂移">
    Doctor 現在會將檢查裝置配對狀態作為正常健康檢查的一部分。

    它會回報：

    - 待處理的首次配對請求
    - 已配對裝置的待處理角色升級
    - 已配對裝置的待處理範圍升級
    - 公鑰不匹配的修復，其中裝置 ID 仍然匹配，但裝置身分不再符合已核准的記錄
    - 已配對記錄缺少已核准角色的有效權杖
    - 已配對權杖的範圍偏離已核准的配對基準
    - 本機快取的目前機器裝置權杖條目，其日期早於閘道端權杖輪替或包含過期的範圍中繼資料

    Doctor 不會自動核准配對請求或自動輪替裝置權杖。相反地，它會列印出確切的後續步驟：

    - 使用 `openclaw devices list` 檢查待處理的請求
    - 使用 `openclaw devices approve <requestId>` 核准確切的請求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 輪替新的權杖
    - 使用 `openclaw devices remove <deviceId>` 移除並重新核准過期的記錄

    這解決了常見的「已配對但仍要求配對」問題：doctor 現在可以區分首次配對、待處理的角色/範圍升級以及過期權杖/裝置身分漂移。

  </Accordion>
  <Accordion title="9. 安全性警告">
    當提供者開放 DM 且沒有允許清單，或是以危險的方式配置原則時，Doctor 會發出警告。
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    若作為 systemd 使用者服務執行，doctor 會確保已啟用 linger，讓登出後閘道仍保持運作。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 會列印預設代理程式的工作區狀態摘要：

    - **Skills status**：計算符合資格、缺少需求及被允許清單封鎖的 skills。
    - **Legacy workspace dirs**：當 `~/openclaw` 或其他舊版工作區目錄與目前工作區並存時發出警告。
    - **Plugin status**：計算已啟用/已停用/錯誤的插件；列出任何錯誤的插件 ID；回報套件插件功能。
    - **Plugin compatibility warnings**：標記與目前執行環境有相容性問題的插件。
    - **Plugin diagnostics**：顯示外掛程式登錄處發出的任何載入時期警告或錯誤。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 會檢查工作區引導檔案（例如 `AGENTS.md`、`CLAUDE.md` 或其他插入的上下文檔案）是否接近或超過設定的字元預算。它會回報每個檔案的原始與插入字元數、截斷百分比、截斷原因（`max/file` 或 `max/total`），以及總插入字元數佔總預算的比例。當檔案被截斷或接近上限時，doctor 會列印調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    當 `openclaw doctor --fix` 移除遺漏的頻道插件時，它也會移除參照該插件的懸置頻道範圍配置：`channels.<id>` 項目、命名該頻道的心跳目標，以及 `agents.*.models["<channel>/*"]` 覆寫。這可防止 Gateway 開機迴圈，即頻道執行環境已消失但配置仍要求閘道繫結至該處。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 會檢查目前 Shell (zsh、bash、fish 或 PowerShell) 是否已安裝 Tab 補齊功能：

    - 如果 Shell 設定檔使用緩慢的動態補齊模式 (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的快取檔案變體。
    - 如果補齊功能已在設定檔中設定，但缺少快取檔案，doctor 會自動重新產生快取。
    - 如果完全沒有設定補齊功能，doctor 會提示安裝 (僅限互動模式；使用 `--non-interactive` 時會跳過)。

    執行 `openclaw completion --write-state` 以手動重新產生快取。

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor 會檢查本機 Gateway Token 驗證的準備狀態。

    - 如果 Token 模式需要 Token 但不存在 Token 來源，doctor 會提議產生一個。
    - 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，並不會用純文字覆寫它。
    - `openclaw doctor --generate-gateway-token` 僅在未設定 Token SecretRef 時強制產生。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修復流程需要檢查已設定的認證資訊，而不會削弱執行時期的快速失敗 (fail-fast) 行為。

    - `openclaw doctor --fix` 現在針對目標設定修復，使用與 status 系列指令相同的唯讀 SecretRef 摘要模型。
    - 範例：當可用時，Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試使用已設定的 Bot 認證資訊。
    - 如果 Telegram Bot Token 透過 SecretRef 設定，但在目前指令路徑中無法使用，doctor 會回報該認證資訊為「已設定但無法使用」，並跳過自動解決，而不是當機或將 Token 誤報為遺失。

  </Accordion>
  <Accordion title="13. Gateway health check + restart">
    Doctor 會執行健康檢查，並在 Gateway 看起來不正常時提議重新啟動。
  </Accordion>
  <Accordion title="13b. 記憶體搜尋就緒狀態">
    Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否已就緒。其行為取決於設定的後端與提供者：

    - **QMD 後端**：探測 `qmd` 二進位檔案是否可用且可啟動。如果不可用，則會列印修復指引，包括 npm 套件與手動二進位路徑選項。
    - **明確的本地提供者**：檢查是否存在本機模型檔案或可識別的遠端/可下載模型 URL。如果缺失，建議切換至遠端提供者。
    - **明確的遠端提供者**（`openai`、`voyage` 等）：驗證環境或認證儲存中是否存在 API 金鑰。如果缺失，會列印可執行的修復提示。
    - **自動提供者**：優先檢查本機模型可用性，接著依自動選擇順序嘗試各個遠端提供者。

    當有快取的閘道探測結果可用（檢查時閘道處於健康狀態），doctor 會將其結果與 CLI 可見設定進行比對，並標註任何差異。Doctor 不會在預設路徑上發起新的嵌入連線測試；若您需要即時提供者檢查，請使用 deep memory status 指令。

    使用 `openclaw memory status --deep` 以在執行時期驗證嵌入就緒狀態。

  </Accordion>
  <Accordion title="14. 頻道狀態警告">
    如果閘道狀態健康，doctor 會執行頻道狀態探測並回報附帶建議修復方式的警告。
  </Accordion>
  <Accordion title="15. 監管程式設定稽核與修復">
    Doctor 會檢查已安裝的監管程式設定 (launchd/systemd/schtasks) 是否有遺漏或過時的預設值（例如：systemd network-online 相依性和重新啟動延遲）。當發現不符時，它會建議進行更新，並可將服務檔案/工作重寫為目前的預設值。

    註記：

    - `openclaw doctor` 會在重寫監管程式設定前提示。
    - `openclaw doctor --yes` 接受預設的修復提示。
    - `openclaw doctor --repair` 套用建議的修復，不經提示。
    - `openclaw doctor --repair --force` 覆寫自訂監管程式設定。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 讓 doctor 對於閘道服務生命週期保持唯讀。它仍會回報服務健康狀況並執行非服務修復，但因為生命週期由外部監管程式管理，所以會跳過服務安裝/啟動/重新啟動/啟動、監管程式設定重寫，以及舊版服務清理。
    - 在 Linux 上，當對應的 systemd 閘道單元處於作用中時，doctor 不會重寫 command/entrypoint 中繼資料。在重複服務掃描期間，它也會忽略非舊版且非作用中的額外閘道類似單元，以免伴隨服務檔案產生清理雜訊。
    - 如果權杖驗證需要權杖且 `gateway.auth.token` 是由 SecretRef 管理，doctor 服務安裝/修復會驗證 SecretRef，但不會將解析後的明文權杖值保存至監管程式服務環境中繼資料中。
    - Doctor 會偵測受管理的 `.env`/SecretRef 支援的服務環境值，這些值在舊版 LaunchAgent、systemd 或 Windows 排程任務安裝中是內嵌的，並會重寫服務中繼資料，讓這些值從執行時期來源載入，而非從監管程式定義載入。
    - Doctor 會偵測當服務指令在 `gateway.port` 變更後仍釘選到舊的 `--port`，並將服務中繼資料重寫為目前連接埠。
    - 如果權杖驗證需要權杖且設定的權杖 SecretRef 未解析，doctor 會提供可執行的指引並封鎖安裝/修復路徑。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，doctor 會封鎖安裝/修復，直到明確設定模式。
    - 針對 Linux 使用者 systemd 單元，doctor 權杖偏移檢查現在在比較服務驗證中繼資料時會包含 `Environment=` 和 `EnvironmentFile=` 來源。
    - 當設定最後是由較新版本寫入時，Doctor 服務修復會拒絕重寫、停止或重新啟動來自較舊 OpenClaw 二進位檔案的閘道服務。請參閱 [閘道疑難排解](/zh-Hant/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您隨時可以透過 `openclaw gateway install --force` 強制執行完整重寫。

  </Accordion>
  <Accordion title="16. Gateway runtime + port diagnostics">
    Doctor 會檢查服務運行時（PID、上次退出狀態），並在服務已安裝但實際未運行時發出警告。它還會檢查 Gateway 連接埠（預設為 `18789`）是否有連接埠衝突，並報告可能的原因（Gateway 已在運行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    當 Gateway 服務在 Bun 或受版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上運行時，Doctor 會發出警告。WhatsApp 和 Telegram 頻道需要 Node，而版本管理器路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化設定。當有可用的系統 Node 安裝（Homebrew/apt/choco）時，Doctor 會建議遷移。

    新安裝或修復的 macOS LaunchAgents 會使用標準的系統 PATH（`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`），而不是複製互動式 shell 的 PATH，因此 Homebrew 管理的系統二進位檔案仍可使用，而 Volta、asdf、fnm、pnpm 和其他版本管理器目錄不會影響 Node 子程序解析的路徑。Linux 服務仍會保留明確的環境根目錄（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和穩定的使用者 bin 目錄，但推測的版本管理器備用目錄僅在這些目錄存在於磁碟上時才會寫入服務 PATH。

  </Accordion>
  <Accordion title="18. Config write + wizard metadata">
    Doctor 會保存任何設定變更，並標記精靈中繼資料以記錄 doctor 的執行。
  </Accordion>
  <Accordion title="19. 工作區提示（備份 + 記憶系統）">
    當缺少工作區記憶系統時，Doctor 會建議安裝一個，如果工作區尚未使用 git，則會列印備份提示。

    參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得工作區結構和 git 備份的完整指南（建議使用私有的 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相關

- [Gateway 操作手冊](/zh-Hant/gateway)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting)
