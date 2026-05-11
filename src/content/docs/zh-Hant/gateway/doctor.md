---
summary: "Doctor command: health checks, config migrations, and repair steps"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "醫生"
---

`openclaw doctor` 是 OpenClaw 的修復 + 遷移工具。它會修復過期的設定/狀態、檢查健康狀況，並提供可執行的修復步驟。

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
  <Accordion title="健康狀況、UI 和更新">
    - 針對 git 安裝的可選預先更新（僅限互動式）。
    - UI 協定新鮮度檢查（當協定綱架較新時重建控制 UI）。
    - 健康檢查 + 重啟提示。
    - 技能狀態摘要（合格/遺失/被封鎖）和外掛狀態。
  </Accordion>
  <Accordion title="Config and migrations">
    - Config normalization for legacy values.
    - Talk config migration from legacy flat `talk.*` fields into `talk.provider` + `talk.providers.<provider>`.
    - Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
    - OpenCode provider override warnings (`models.providers.opencode` / `models.providers.opencode-go`).
    - Codex OAuth shadowing warnings (`models.providers.openai-codex`).
    - OAuth TLS prerequisites check for OpenAI Codex OAuth profiles.
    - Legacy on-disk state migration (sessions/agent dir/WhatsApp auth).
    - Legacy plugin manifest contract key migration (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Legacy cron store migration (`jobId`, `schedule.cron`, top-level delivery/payload fields, payload `provider`, simple `notify: true` webhook fallback jobs).
    - Legacy agent runtime-policy migration to `agents.defaults.agentRuntime` and `agents.list[].agentRuntime`.
  </Accordion>
  <Accordion title="State and integrity">
    - Session lock file inspection and stale lock cleanup.
    - Session transcript repair for duplicated prompt-rewrite branches created by affected 2026.4.24 builds.
    - State integrity and permissions checks (sessions, transcripts, state dir).
    - Config file permission checks (chmod 600) when running locally.
    - Model auth health: checks OAuth expiry, can refresh expiring tokens, and reports auth-profile cooldown/disabled states.
    - Extra workspace dir detection (`~/openclaw`).
  </Accordion>
  <Accordion title="Gateway, services, and supervisors">
    - 啟用沙盒機制時修復沙盒映像檔。
    - 舊版服務遷移與額外的 Gateway 偵測。
    - Matrix 頻道舊版狀態遷移（在 `--fix` / `--repair` 模式下）。
    - Gateway 執行時檢查（服務已安裝但未執行；快取的 launchd 標籤）。
    - 頻道狀態警示（從執行中的 Gateway 探查）。
    - Supervisor 設定稽核（launchd/systemd/schtasks），並提供選用修復功能。
    - 針對在安裝或更新期間擷取了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 數值的 Gateway 服務，清理內嵌的代理環境變數。
    - Gateway 執行時最佳實踐檢查（Node vs Bun，版本管理器路徑）。
    - Gateway 連接埠衝突診斷（預設 `18789`）。
  </Accordion>
  <Accordion title="Auth, security, and pairing">
    - 針對開放 DM 政策的安全性警示。
    - 針對本機 token 模式的 Gateway 驗證檢查（當不存在 token 來源時提供 token 產生功能；不會覆寫 token SecretRef 設定）。
    - 裝置配對故障偵測（待處理的首次配對請求、待處理的角色/範圍升級、過期的本機 device-token 快取漂移，以及配對記錄的驗證漂移）。
  </Accordion>
  <Accordion title="Workspace and shell">
    - Linux 上的 systemd linger 檢查。
    - 工作區引導檔案大小檢查（針對內容檔案的截斷/接近限制警示）。
    - Shell 自動完成狀態檢查及自動安裝/升級。
    - 記憶體搜尋嵌入提供者就緒檢查（本機模型、遠端 API 金鑰或 QMD 執行檔）。
    - 原始碼安裝檢查（pnpm 工作區不匹配、缺少 UI 資產、缺少 tsx 執行檔）。
    - 寫入更新的設定 + 精靈中繼資料。
  </Accordion>
</AccordionGroup>

## Dreams UI 回填與重置

控制 UI 的 Dreams 場景包含針對落地式夢境工作流程的 **Backfill**、**Reset** 與 **Clear Grounded** 動作。這些動作使用 Gateway 風格的 RPC 方法，但它們**不**屬於 `openclaw doctor` CLI 修復/遷移的一部分。

它們的作用：

- **回填** 會掃描使用中工作區內的歷史 `memory/YYYY-MM-DD.md` 檔案，執行基礎的 REM 日誌傳遞，並將可逆的回填項目寫入 `DREAMS.md`。
- **重設** 僅會從 `DREAMS.md` 中移除那些標記為回填的日誌項目。
- **清除基礎** 僅移除那些源自歷史重放、且尚未累積即時回憶或每日支援的暫存僅基礎短期項目。

它們本身**不**會做的是：

- 它們不會編輯 `MEMORY.md`
- 它們不會執行完整的 doctor 遷移
- 除非您明確先執行暫存的 CLI 路徑，否則它們不會自動將基礎候選項暫存至即時短期升級存放區

如果您希望基礎歷史重放能影響正常的深度升級通道，請改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

這會將基礎的持久候選項暫存至短期夢境存放區，同時將 `DREAMS.md` 作為檢閱介面。

## 詳細行為與原理

<AccordionGroup>
  <Accordion title="0. 可選更新 (git 安裝)">
    如果這是 git checkout 且 doctor 正以互動模式執行，它會在執行 doctor 之前提供更新 (fetch/rebase/build) 的選項。
  </Accordion>
  <Accordion title="1. 設定正規化">
    如果設定包含舊版的值形狀 (例如 `messages.ackReaction` 缺少通道特定的覆寫)，doctor 會將其正規化為目前結構描述。

    這包括舊版的 Talk 扁平欄位。目前的公開 Talk 設定是 `talk.provider` + `talk.providers.<provider>`。Doctor 會將舊的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重寫為提供者對應。

  </Accordion>
  <Accordion title="2. 舊版配置鍵遷移">
    當配置包含已棄用的鍵時，其他命令會拒絕執行並要求您執行 `openclaw doctor`。

    Doctor 會：

    - 說明找到了哪些舊版鍵。
    - 顯示其所套用的遷移。
    - 以更新後的架構重寫 `~/.openclaw/openclaw.json`。

    此外，當 Gateway 偵測到舊版配置格式時，也會在啟動時自動執行 doctor 遷移，因此無需手動介入即可修復過時的配置。Cron job 存儲遷移由 `openclaw doctor --fix` 處理。

    目前的遷移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 頂層 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 舊版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
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
    - 對於具有命名 `accounts` 但仍保留單一帳戶頂層通道值的通道，將這些帳戶範圍的值移至為該通道選擇的升級帳戶中（大多數通道為 `accounts.default`；Matrix 可以保留現有匹配的命名/預設目標）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；使用 `models.providers.<id>.timeoutSeconds` 進行緩慢的供應商/模型逾時處理
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (舊版擴充功能中繼設定)
    - 舊版 `models.providers.*.api: "openai"` → `"openai-completions"` (Gateway 啟動時也會跳過其 `api` 設定為未來或未知列舉值的供應商，而不是封閉式失敗)

    Doctor 警告也包含多帳戶通道的帳戶預設指導：

    - 如果配置了兩個或多個 `channels.<channel>.accounts` 項目而沒有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 會警告備援路由可能會選擇非預期的帳戶。
    - 如果 `channels.<channel>.defaultAccount` 設定為未知的帳戶 ID，doctor 會警告並列出已配置的帳戶 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供者覆寫">
    如果您手動新增了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它會覆寫來自 `@mariozechner/pi-ai` 的內建 OpenCode 目錄。這可能會強制將模型導向錯誤的 API 或將成本歸零。Doctor 會發出警告，以便您移除該覆寫並恢復依模型的 API 路由與成本計算。
  </Accordion>
  <Accordion title="2c. 瀏覽器遷移與 Chrome MCP 就緒檢查">
    如果您的瀏覽器設定仍然指向已移除的 Chrome 擴充功能路徑，doctor 會將其正規化為目前的主機本機 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 會變成 `"existing-session"`
    - `browser.relayBindHost` 會被移除

    當您使用 `defaultProfile: "user"` 或設定的 `existing-session` 設定檔時，Doctor 也會稽核主機本機 Chrome MCP 路徑：

    - 檢查預設自動連線設定檔的主機上是否已安裝 Google Chrome
    - 檢查偵測到的 Chrome 版本，如果低於 Chrome 144 則發出警告
    - 提醒您在瀏覽器檢查頁面中啟用遠端偵錯（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 無法為您啟用 Chrome 端的設定。主機本機 Chrome MCP 仍然需要：

    - 閘道/節點主機上安裝基於 Chromium 的瀏覽器 144+ 版本
    - 瀏覽器在本地執行
    - 在該瀏覽器中啟用遠端偵錯
    - 在瀏覽器中批准第一次附加的同意提示

    此處的就緒檢查僅涉及本地附加的先決條件。既有工作階段會保持目前的 Chrome MCP 路由限制；像 `responsebody`、PDF 匯出、下載攔截和批次動作等進階路由，仍然需要受管理的瀏覽器或原始 CDP 設定檔。

    此檢查**不**適用於 Docker、沙箱、遠端瀏覽器或其他無頭流程。這些流程會繼續使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 先決條件">
    當設定 OpenAI Codex OAuth 設定檔時，doctor 會探查 OpenAI 授權端點，以驗證本機 Node/OpenSSL TLS 堆疊能否驗證憑證鏈。如果探查因憑證錯誤而失敗（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、過期的憑證或自簽憑證），doctor 會列印平台專屬的修復指引。在搭配 Homebrew Node 的 macOS 上，修復方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 時，即使閘道狀況良好，探查仍會執行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供者覆寫">
    如果您先前在 `models.providers.openai-codex` 下新增了舊版 OpenAI 傳輸設定，這些設定可能會覆蓋較新版本自動使用的內建 Codex OAuth 提供者路徑。當 Doctor 發現這些舊傳輸設定與 Codex OAuth 並存時會發出警告，讓您可以移除或重寫過時的傳輸覆寫，以取回內建的路由/容錯移轉行為。自訂代理和僅標頭的覆寫仍受支援，且不會觸發此警告。
  </Accordion>
  <Accordion title="2f. Codex 外掛程式路由警告">
    當啟用內建的 Codex 外掛程式時，doctor 也會檢查 `openai-codex/*` 主要模型參照是否仍透過預設 PI runner 解析。當您想要透過 PI 使用 Codex OAuth/訂閱驗證時，該組合是有效的，但它很容易與原生的 Codex app-server harness 混淆。Doctor 會發出警告並指向明確的 app-server 形狀：`openai/*` 加上 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。

    Doctor 不會自動修復此問題，因為這兩條路由都是有效的：

    - `openai-codex/*` + PI 表示「透過正常的 OpenClaw runner 使用 Codex OAuth/訂閱驗證。」
    - `openai/*` + `runtime: "codex"` 表示「透過原生 Codex app-server 執行內建的回合。」
    - `/codex ...` 表示「從聊天控制或綁定原生的 Codex 對話。」
    - `/acp ...` 或 `runtime: "acp"` 表示「使用外部 ACP/acpx 配接器。」

    如果出現警告，請選擇您原本打算使用的路由並手動編輯設定。當 PI Codex OAuth 是刻意為之時，請保持警告不變。

  </Accordion>
  <Accordion title="3. Legacy state migrations (disk layout)">
    Doctor 可以將舊版的磁碟佈局遷移至目前的結構：

    - Sessions store + transcripts:
      - 從 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent dir:
      - 從 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp auth state (Baileys):
      - 從 legacy `~/.openclaw/credentials/*.json` (除了 `oauth.json`)
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` (預設 account id: `default`)

    這些遷移皆為盡力而為且具等冪性；當 doctor 將任何 legacy 資料夾保留為備份時，會發出警告。Gateway/CLI 也在啟動時自動遷移 legacy sessions + agent dir，讓 history/auth/models 能直接落入 per-agent 路徑，無需手動執行 doctor。WhatsApp auth 故意僅能透過 `openclaw doctor` 進行遷移。Talk provider/provider-map 的正規化現在改用結構相等性比較，因此「僅金鑰順序不同」的差異不再觸發重複的無操作 `doctor --fix` 變更。

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor 會掃描所有已安裝的外掛清單 (manifest)，尋找已棄用的頂層 capability 金鑰 (`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`)。若發現這些金鑰，doctor 會提議將其移動至 `contracts` 物件中，並直接就地重寫 manifest 檔案。此遷移具等冪性；若 `contracts` 金鑰已含有相同的值，則會移除 legacy 金鑰而不重複資料。
  </Accordion>
  <Accordion title="3b. Legacy cron store migrations">
    Doctor 還會檢查 cron job store（預設為 `~/.openclaw/cron/jobs.json`，若覆寫則為 `cron.store`）中排程器為了相容性仍接受的舊 job 形狀。

    目前的 cron 清理項目包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 頂層 payload 欄位（`message`、`model`、`thinking`、...）→ `payload`
    - 頂層 delivery 欄位（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
    - payload `provider` delivery 別名 → 明確的 `delivery.channel`
    - 簡單的舊版 `notify: true` webhook 回退 job → 帶有 `delivery.to=cron.webhook` 的明確 `delivery.mode="webhook"`

    Doctor 只有在能夠不改變行為的情況下才會自動遷移 `notify: true` jobs。如果一個 job 結合了舊版 notify 回退與現有的非 webhook delivery 模式，doctor 會發出警告並將該 job 留待手動審查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 會掃描每個 agent session 目錄，尋找過時的寫入鎖定檔案——即當工作階段異常結束時留下的檔案。對於找到的每個鎖定檔案，它會報告：路徑、PID、PID 是否仍在運作、鎖定存在時間，以及是否被視為過時（PID 已死或超過 30 分鐘）。在 `--fix` / `--repair` 模式下，它會自動移除過時的鎖定檔案；否則，它會印出提示並指示您使用 `--fix` 重新執行。
  </Accordion>
  <Accordion title="3d. Session transcript branch repair">
    Doctor 會掃描代理會話 JSONL 檔案，查找由 2026.4.24 提示詞轉錄重寫錯誤所建立的重複分支形狀：一個帶有 OpenClaw 內部運行時上下文的已放棄使用者回合，加上一個包含相同可見使用者提示詞的作用中同級分支。在 `--fix` / `--repair` 模式下，doctor 會將每個受影響的檔案在原始檔案旁進行備份，並將轉錄內容重寫為作用中分支，以便閘道歷史記錄和記憶體讀取器不再看到重複的回合。
  </Accordion>
  <Accordion title="4. 狀態完整性檢查（會話持久性、路由與安全性）">
    狀態目錄是作業的腦幹。如果它消失，您將失去會話、憑證、日誌和設定（除非您在其他地方有備份）。

    Doctor 檢查：

    - **State dir missing**：警告災難性的狀態遺失，提示重新建立目錄，並提醒您它無法還原遺失的資料。
    - **State dir permissions**：驗證可寫性；提供修復權限（並在偵測到擁有者/群組不符時發出 `chown` 提示）。
    - **macOS cloud-synced state dir**：當狀態解析於 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下時發出警告，因為同步支援的路徑可能導致較慢的 I/O 與鎖定/同步競爭。
    - **Linux SD or eMMC state dir**：當狀態解析至 `mmcblk*` 掛載來源時發出警告，因為 SD 或 eMMC 支援的隨機 I/O 在會話與憑證寫入下可能較慢且磨損更快。
    - **Session dirs missing**：`sessions/` 與會話儲存目錄是持久化歷史與避免 `ENOENT` 當機所必需的。
    - **Transcript mismatch**：當最近的會話項目缺少文字記錄檔時發出警告。
    - **Main session "1-line JSONL"**：當主要文字記錄只有一行時標示（歷史未累積）。
    - **Multiple state dirs**：當多個 `~/.openclaw` 資料夾存在於各個主目錄中，或當 `OPENCLAW_STATE_DIR` 指向其他位置時發出警告（歷史可能在安裝之間分割）。
    - **Remote mode reminder**：如果 `gateway.mode=remote`，doctor 會提醒您在遠端主機上執行它（狀態位於該處）。
    - **Config file permissions**：如果 `~/.openclaw/openclaw.json` 可被群組/全世界讀取，則發出警告並提供收緊至 `600`。

  </Accordion>
  <Accordion title="5. 模型授權健康狀態 (OAuth 過期)">
    Doctor 會檢查授權存儲中的 OAuth 設定檔，在即將過期或已過期時發出警告，並在安全時嘗試重新整理。如果 Anthropic OAuth/token 設定檔已過時，它會建議使用 Anthropic API 金鑰或 Anthropic setup-token 路徑。重新整理提示僅在互動模式 (TTY) 下執行時會出現；`--non-interactive` 會跳過重新整理嘗試。

    當 OAuth 重新整理永久失敗時（例如 `refresh_token_reused`、`invalid_grant` 或提供者要求您重新登入），doctor 會報告需要重新驗證，並打印出確切的 `openclaw models auth login --provider ...` 指令以供執行。

    Doctor 也會報告因以下原因而暫時無法使用的授權設定檔：

    - 短暫冷卻（速率限制/逾時/驗證失敗）
    - 長期停用（帳單/點數失敗）

  </Accordion>
  <Accordion title="6. Hooks 模型驗證">
    如果設定了 `hooks.gmail.model`，doctor 會根據目錄和允許清單驗證模型參照，並在無法解析或被禁止時發出警告。
  </Accordion>
  <Accordion title="7. Sandbox 映像檔修復">
    當啟用沙盒時，doctor 會檢查 Docker 映像檔，如果目前的映像檔遺失，會提供建構或切換至舊版名稱的選項。
  </Accordion>
  <Accordion title="7b. Bundled plugin runtime deps">
    Doctor 僅對目前設定中啟用的，或是透過其隨附清單預設啟用的隨附外掛程式驗證執行時期相依性，例如 `plugins.entries.discord.enabled: true`、舊版 `channels.discord.enabled: true`，或是預設啟用的隨附提供者。如果缺少任何相依性，doctor 會回報這些套件並在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式中安裝它們。外部外掛程式仍使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不會為任意外掛程式路徑安裝相依性。

    在 doctor 修復期間，隨附執行時期相依性的 npm 安裝會在 TTY 工作階段中報告轉輪進度，並在管線/無頭模式輸出中報告定期行進度。Gateway 和本機 CLI 也可以在匯入隨附外掛程式之前，視需要修復作用中隨附外掛程式的執行時期相依性。這些安裝的範圍僅限於外掛程式執行時期安裝根目錄，會在停用指令碼的情況下執行，不會寫入套件鎖定，並且由安裝根目錄鎖定保護，以免並行 CLI 或 Gateway 啟動同時變更相同的 `node_modules` 樹狀結構。

  </Accordion>
  <Accordion title="8. Gateway service migrations and cleanup hints">
    Doctor 會偵測舊版 gateway 服務 (launchd/systemd/schtasks)，並提議移除這些服務，並使用目前的 gateway 連接埠安裝 OpenClaw 服務。它也可以掃描額外類似 gateway 的服務並列印清理提示。以設定檔命名的 OpenClaw gateway 服務被視為一級服務，不會被標記為「額外」。

    在 Linux 上，如果缺少使用者層級的 gateway 服務，但存在系統層級的 OpenClaw gateway 服務，doctor 不會自動安裝第二個使用者層級服務。請使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 進行檢查，然後移除重複項，或在系統監督器擁有 gateway 生命週期時設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 啟動時 Matrix 遷移">
    當 Matrix 頻道帳號有待處理或可操作的舊版狀態遷移時，doctor（在 `--fix` / `--repair` 模式下）會建立遷移前快照，然後執行盡力而為的遷移步驟：舊版 Matrix 狀態遷移和舊版加密狀態準備。這兩個步驟均不會導致致命錯誤；錯誤會被記錄下來，啟動繼續進行。在唯讀模式下（`openclaw doctor` 不含 `--fix`），此檢查會被完全跳過。
  </Accordion>
  <Accordion title="8c. 裝置配對與認證漂移">
    Doctor 現在會將檢查裝置配對狀態作為正常健康檢查的一部分。

    它會報告以下內容：

    - 待處理的首次配對請求
    - 已配對裝置的待處理角色升級
    - 已配對裝置的待處理範圍升級
    - 公鑰不符修復，即裝置 ID 仍然匹配，但裝置身分不再符合已批准記錄的情況
    - 缺少已批准角色有效 token 的配對記錄
    - 範圍漂移超出已批准配對基準的配對 token
    - 本機快取中當前機器的裝置 token 項目，其時間早於閘道端 token 輪替，或包含過期的範圍元資料

    Doctor 不會自動批准配對請求或自動輪替裝置 token。相反，它會列印確切後續步驟：

    - 使用 `openclaw devices list` 檢查待處理請求
    - 使用 `openclaw devices approve <requestId>` 批准特定請求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 輪替新的 token
    - 使用 `openclaw devices remove <deviceId>` 移除並重新批准過期記錄

    這解決了常見的「已配對但仍被要求配對」漏洞：doctor 現在可以區分首次配對、待處理的角色/範圍升級，以及過期 token/裝置身分漂移。

  </Accordion>
  <Accordion title="9. 安全警告">
    當供應商在沒有允許清單的情況下開放私訊 (DM)，或是政策以危險方式配置時，Doctor 會發出警告。
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    如果作為 systemd 使用者服務執行，doctor 會確保已啟用 linger，以便閘道在登出後保持運作。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 會印出預設代理程式的工作區狀態摘要：

    - **Skills status**：計算符合資格、缺少需求以及被允許清單封鎖的技能。
    - **Legacy workspace dirs**：當 `~/openclaw` 或其他舊版工作區目錄與目前工作區並存時發出警告。
    - **Plugin status**：計算已啟用/已停用/錯誤的外掛程式；列出任何錯誤的外掛程式 ID；回報套件外掛程式功能。
    - **Plugin compatibility warnings**：標記與目前執行時期有相容性問題的外掛程式。
    - **Plugin diagnostics**：顯示外掛程式登錄區發出的任何載入時期警告或錯誤。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 會檢查工作區啟動檔案 (例如 `AGENTS.md`、`CLAUDE.md` 或其他插入的內容檔案) 是否接近或超過設定的字元預算。它會回報每個檔案的原始與插入字元計數、截斷百分比、截斷原因 (`max/file` 或 `max/total`)，以及總插入字元佔總預算的比例。當檔案被截斷或接近限制時，doctor 會印出調整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    當 `openclaw doctor --fix` 移除遺漏的通道外掛程式時，它也會移除參照該外掛程式的懸置通道範圍設定：`channels.<id>` 項目、命名該通道的心跳目標，以及 `agents.*.models["<channel>/*"]` 覆寫。這可防止 Gateway 開機迴圈，即通道執行時期已消失，但設定仍要求閘道繫結至該通道。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 會檢查目前 shell（zsh、bash、fish 或 PowerShell）是否已安裝 tab completion（按 Tab 鍵自動補全）功能：

    - 如果 shell 設定檔使用了緩慢的動態補全模式 (`source <(openclaw completion ...)`)，doctor 會將其升級為更快的快取檔案版本。
    - 如果設定檔中已設定補全功能但快取檔案遺失，doctor 會自動重新產生快取。
    - 如果完全沒有設定補全功能，doctor 會提示進行安裝（僅限互動模式；使用 `--non-interactive` 時會跳過）。

    執行 `openclaw completion --write-state` 可手動重新產生快取。

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor 會檢查本地閘道 token 認證的準備狀態。

    - 如果 token 模式需要 token 但沒有 token 來源，doctor 會提議產生一個。
    - 如果 `gateway.auth.token` 是由 SecretRef 管理但無法使用，doctor 會發出警告，且不會用純文字覆寫它。
    - `openclaw doctor --generate-gateway-token` 僅在未設定 token SecretRef 時強制產生。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修復流程需要檢查已設定的憑證，而不能削弱執行階段的快速失敗 (fail-fast) 行為。

    - `openclaw doctor --fix` 現在使用與 status 系列指令相同的唯讀 SecretRef 摘要模型來進行目標設定修復。
    - 範例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修復會嘗試在可用時使用已設定的機器人憑證。
    - 如果 Telegram bot token 是透過 SecretRef 設定，但在目前的指令路徑中無法使用，doctor 會回報該憑證為「已設定但無法使用」，並跳過自動解析，而不是當機或錯誤地回報 token 遺失。

  </Accordion>
  <Accordion title="13. Gateway health check + restart">
    Doctor 會執行健康檢查，並在閘道看起來不正常時提議重新啟動。
  </Accordion>
  <Accordion title="13b. 記憶體搜尋就緒狀態">
    Doctor 會檢查為預設代理程式設定的記憶體搜尋嵌入提供者是否已就緒。其行為取決於設定的後端與提供者：

    - **QMD backend**：探測 `qmd` 二進位檔案是否可用且可啟動。如果否，則會印出修復指引，包括 npm 套件與手動二進位路徑選項。
    - **Explicit local provider**：檢查是否有本機模型檔案或已識別的遠端/可下載模型 URL。如果遺失，建議切換至遠端提供者。
    - **Explicit remote provider**（`openai`、`voyage` 等）：驗證環境或 auth store 中是否存在 API 金鑰。如果遺失，會印出可行的修復提示。
    - **Auto provider**：先檢查本機模型的可用性，然後依自動選擇順序嘗試各個遠端提供者。

    當有閘道探測的快取結果可用（檢查時閘道狀態健康）時，Doctor 會將其結果與 CLI 可見的設定進行比對，並標註任何差異。Doctor 不會在預設路徑上發起新的嵌入 ping；如果您需要即時提供者檢查，請使用 deep memory status 指令。

    使用 `openclaw memory status --deep` 以在執行時期驗證嵌入就緒狀態。

  </Accordion>
  <Accordion title="14. 頻道狀態警告">
    如果閘道狀態健康，Doctor 會執行頻道狀態探測，並回報附帶建議修復方式的警告。
  </Accordion>
  <Accordion title="15. Supervisor config audit + repair">
    Doctor 會檢查已安裝的 Supervisor 設定（launchd/systemd/schtasks），查看是否有遺失或過時的預設值（例如：systemd network-online 相依性和重新啟動延遲）。當發現不符時，它會建議更新，並可將服務檔案/任務重寫為目前的預設值。

    註記：

    - `openclaw doctor` 會在重寫 Supervisor 設定前提示。
    - `openclaw doctor --yes` 接受預設修復提示。
    - `openclaw doctor --repair` 在無提示下套用建議的修復。
    - `openclaw doctor --repair --force` 覆寫自訂的 Supervisor 設定。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 將 Doctor 保持唯讀狀態，以用於 Gateway 服務的生命週期。它仍會回報服務健康狀況並執行非服務修復，但會跳過服務安裝/啟動/重新啟動/啟動、Supervisor 設定重寫以及舊版服務清理，因為該生命週期由外部 Supervisor 管理。
    - 如果 Token 驗證需要 Token 且 `gateway.auth.token` 是由 SecretRef 管理，Doctor 服務安裝/修復會驗證 SecretRef，但不會將解析後的明文 Token 值保存到 Supervisor 服務環境元資料中。
    - Doctor 會偵測受管理的 `.env`/SecretRef 支援的服務環境值，這些值在舊版 LaunchAgent、systemd 或 Windows 排程任務安裝中是內嵌的，並會重寫服務元資料，讓這些值從執行階段來源載入，而不是從 Supervisor 定義載入。
    - 當服務指令在 `gateway.port` 變更後仍指向舊的 `--port` 時，Doctor 會偵測到並將服務元資料重寫為目前的連接埠。
    - 如果 Token 驗證需要 Token 且設定的 Token SecretRef 未解析，Doctor 會以可行的指引封鎖安裝/修復路徑。
    - 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 但未設定 `gateway.auth.mode`，Doctor 會封鎖安裝/修復，直到明確設定模式。
    - 對於 Linux user-systemd 單元，Doctor Token 偏移檢查現在會在比較服務驗證元資料時，同時包含 `Environment=` 和 `EnvironmentFile=` 來源。
    - 當設定最後是由較新版本寫入時，Doctor 服務修復會拒絕從較舊的 OpenClaw 二進位檔重寫、停止或重新啟動 Gateway 服務。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您可以隨時透過 `openclaw gateway install --force` 強制完整重寫。

  </Accordion>
  <Accordion title="16. Gateway runtime + port diagnostics">
    Doctor 會檢查服務運行時（PID，上次退出狀態），並在服務已安裝但實際未運行時發出警告。它還會檢查 gateway 連接埠上的連接埠衝突（預設 `18789`）並報告可能的原因（gateway 正在運行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    當 gateway 服務在 Bun 或受版本管理的 Node 路徑（`nvm`、`fnm`、`volta`、`asdf` 等）上運行時，Doctor 會發出警告。WhatsApp + Telegram 頻道需要 Node，且版本管理器路徑可能會在升級後失效，因為服務不會載入您的 shell 初始化腳本。如果可用，Doctor 會提議遷移至系統 Node 安裝（Homebrew/apt/choco）。
  </Accordion>
  <Accordion title="18. Config write + wizard metadata">
    Doctor 會儲存任何設定變更，並標記 wizard 中繼資料以記錄 doctor 的執行。
  </Accordion>
  <Accordion title="19. Workspace tips (backup + memory system)">
    如果缺少 workspace 記憶系統，Doctor 會建議使用；如果 workspace 尚未受 git 管理，則會列印備份提示。

    請參閱 [/concepts/agent-workspace](/zh-Hant/concepts/agent-workspace) 以取得 workspace 結構和 git 備份（建議使用私有的 GitHub 或 GitLab）的完整指南。

  </Accordion>
</AccordionGroup>

## 相關

- [Gateway runbook](/zh-Hant/gateway)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
