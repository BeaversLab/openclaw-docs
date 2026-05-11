---
summary: "QA 堆疊概覽：qa-lab、qa-channel、repo-backed 場景、live transport lanes、transport adapters 以及報告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概覽"
---

專有的 QA 堆疊旨在以更貼近現實、具備通道形態的方式來測試 OpenClaw，這比單一的單元測試更能模擬實際情況。

目前的組成部分：

- `extensions/qa-channel`：具有 DM、頻道、主題串、回應、編輯和刪除介面的綜合訊息通道。
- `extensions/qa-lab`：除錯器 UI 和 QA 匯流排，用於觀察對話紀錄、注入傳入訊息以及匯出 Markdown 報告。
- `extensions/qa-matrix`，未來的執行器外掛程式：live-transport adapters，用於在子 QA gateway 中驅動真實通道。
- `qa/`：用於啟動任務和基準 QA 場景的 repo-backed seed 資產。

## 指令介面

每個 QA 流程都在 `pnpm openclaw qa <subcommand>` 下執行。許多流程都有 `pnpm qa:*` 腳本別名；這兩種形式都支援。

| 指令                                                | 用途                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `qa run`                                            | 內建的 QA 自檢；寫入 Markdown 報告。                                                                                                                   |
| `qa suite`                                          | 針對 QA gateway lane 執行 repo-backed 場景。別名：`pnpm openclaw qa suite --runner multipass` 用於一次性 Linux VM。                                    |
| `qa coverage`                                       | 列印 markdown 場景覆蓋率清單（`--json` 用於機器可讀輸出）。                                                                                            |
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並寫入 agentic parity-gate 報告。                                                                                 |
| `qa character-eval`                                 | 在多個即時模型上執行角色 QA 場景並產生評鑑報告。請參閱 [報告](#reporting)。                                                                            |
| `qa manual`                                         | 對選定的 provider/model lane 執行一次性提示。                                                                                                          |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 匯流排（別名：`pnpm qa:lab:ui`）。                                                                                         |
| `qa docker-build-image`                             | 建置預先烘焙好的 QA Docker 映像檔。                                                                                                                    |
| `qa docker-scaffold`                                | 為 QA 儀表板 + gateway lane 撰寫 docker-compose 腳手架。                                                                                               |
| `qa up`                                             | 建置 QA 網站，啟動 Docker 支援的堆疊，並列印 URL（別名：`pnpm qa:lab:up`；`:fast` 變體會新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。 |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                           |
| `qa mock-openai`                                    | 僅啟動具備場景感知能力的 `mock-openai` 提供者伺服器。                                                                                                  |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共用的 Convex 憑證池。                                                                                                                             |
| `qa matrix`                                         | 針對可拋棄式 Tuwunel homeserver 的即時傳輸通道。請參閱 [Matrix QA](/zh-Hant/concepts/qa-matrix)。                                                           |
| `qa telegram`                                       | 針對真實私人 Telegram 群組的即時傳輸通道。                                                                                                             |
| `qa discord`                                        | 針對真實私人 Discord 工會頻道的即時傳輸通道。                                                                                                          |

## 操作員流程

目前的 QA 操作員流程是一個雙面板 QA 網站：

- 左側：包含代理程式的 Gateway 儀表板（控制 UI）。
- 右側：QA Lab，顯示類似 Slack 的對話紀錄和場景計畫。

執行方式：

```bash
pnpm qa:lab:up
```

這會建置 QA 網站，啟動 Docker 支援的 gateway 通道，並公開 QA Lab 頁面，讓操作員或自動化迴圈可以指派代理程式 QA 任務，觀察真實的通道行為，並記錄成功、失敗或受阻的項目。

若要在不需每次重建 Docker 映像檔的情況下更快迭代 QA Lab UI，請使用綁定掛載的 QA Lab 套件啟動堆疊：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 會讓 Docker 服務保持在預先建置的映像檔上，並將 `extensions/qa-lab/web/dist` 綁定掛載到 `qa-lab` 容器中。`qa:lab:watch` 會在變更時重建該套件，而當 QA Lab 資產雜湊變更時，瀏覽器會自動重新載入。

若要進行本機 OpenTelemetry 追蹤測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本會啟動一個本地的 OTLP/HTTP 追蹤接收器，並在啟用 `diagnostics-otel` 插件的情況下執行 `otel-trace-smoke` QA 場景，然後解碼匯出的 protobuf 跨度並斷言釋出關鍵形狀：`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必須存在；模型呼叫在成功的輪次中不得匯出 `StreamAbandoned`；原始診斷 ID 和 `openclaw.content.*` 屬性必須保持在追蹤之外。它會在 QA 套件產生物旁寫入 `otel-smoke-summary.json`。

可觀測性 QA 僅限於原始碼檢出。npm tarball 故意省略了 QA Lab，因此套件 Docker 釋出通道不會執行 `qa` 指令。當變更診斷插樁時，請從建置好的原始碼檢出中使用 `pnpm qa:otel:smoke`。

若要執行傳輸真實 Matrix smoke channel，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 參考、設定檔/場景目錄、環境變數和產生物佈局位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。概況如下：它在 Docker 中佈建一次性 Tuwunel homeserver，註冊臨時 driver/SUT/observer 使用者，在作用於該傳輸的子 QA gateway 中執行真實的 Matrix 插件（無 `qa-channel`），然後在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下寫入 Markdown 報告、JSON 摘要、觀察事件產生物和組合輸出日誌。

對於傳輸真實 Telegram 和 Discord smoke channels：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
```

這兩者都以預先存在的真實通道為目標，並配備兩個機器人（driver + SUT）。所需的環境變數、場景列表、輸出產生物和 Convex 憑證池記載於下方的 [Telegram and Discord QA reference](#telegram-and-discord-qa-reference) 中。

使用共用即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

doctor 會檢查 Convex broker 環境，驗證端點設定，並在存在維護者金鑰時驗證 admin/list 連線性。對於金鑰，它僅回報已設定/缺失的狀態。

## 即時傳輸涵蓋範圍

即時傳輸通道共享同一個契約，而不是各自發明自己的情境清單結構。`qa-channel` 是廣泛的綜合產品行為測試套件，並非即時傳輸覆蓋矩陣的一部分。

| 通道     | 金絲雀 | 提及閘控 | 允許清單區塊 | 頂層回覆 | 重新啟動恢復 | 主題後續追蹤 | 主題隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ------------ | -------- | ------------ | ------------ | -------- | -------- | -------- | ------------ |
| 矩陣     | x      | x        | x            | x        | x            | x            | x        | x        |          |              |
| Telegram | x      | x        |              |          |              |              |          |          | x        |              |
| Discord  | x      | x        |              |          |              |              |          |          |          | x            |

這將 `qa-channel` 保持為廣泛的產品行為測試套件，同時 Matrix、Telegram 和未來的即時傳輸共享一個明確的傳輸契約檢查清單。

若要在不將 Docker 納入 QA 路徑的情況下，執行一次性 Linux VM 通道，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體，安裝相依套件，在客體內建置 OpenClaw，執行 `qa suite`，然後將正常的 QA 報告和摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它會重複使用與主機上 `qa suite` 相同的情境選擇行為。
依預設，主機和 Multipass 套件執行會使用隔離的 gateway 並行執行多個選定的情境。`qa-channel` 預設並行數為 4，上限為選定的情境數量。使用 `--concurrency <count>` 調整 worker 數量，或使用 `--concurrency 1` 進行列行執行。
當任何情境失敗時，該指令會以非零狀態碼結束。當您需要產出檔案而不希望因失敗而結束時，請使用 `--allow-failures`。
即時執行會轉發對客體實用且受支援的 QA 驗證輸入：基於 env 的提供者金鑰、QA 即時提供者設定路徑，以及當存在時的 `CODEX_HOME`。請將 `--output-dir` 保留在 repo 根目錄下，以便客體可以透過掛載的工作區寫回資料。

## Telegram 和 Discord QA 參考

由於其情境數量和支援 Docker 的 homeserver 佈建，Matrix 擁有[專屬頁面](/zh-Hant/concepts/qa-matrix)。Telegram 和 Discord 規模較小 — 各只有少數情境，沒有設定檔系統，且針對既有的真實頻道 — 因此它們的參考資料位於此處。

### 共享 CLI 旗標

這兩個通道都透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊，並接受相同的旗標：

| 旗標                                  | 預設值                                                    | 描述                                                                              |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                         | 僅執行此場景。可重複使用。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord}-<timestamp>` | 寫入報告/摘要/觀察到的訊息和輸出日誌的位置。相對路徑會相對於 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                           | 從中立的 cwd 呼叫時的存放庫根目錄。                                               |
| `--sut-account <id>`                  | `sut`                                                     | QA 閘道設定中的暫時性帳戶 ID。                                                    |
| `--provider-mode <mode>`              | `live-frontier`                                           | `mock-openai` 或 `live-frontier`（舊版 `live-openai` 仍可使用）。                 |
| `--model <ref>` / `--alt-model <ref>` | 提供者預設值                                              | 主要/備用模型參考。                                                               |
| `--fast`                              | 關閉                                                      | 提供者快速模式（在支援的情況下）。                                                |
| `--credential-source <env\|convex>`   | `env`                                                     | 請參閱 [Convex credential pool](#convex-credential-pool)。                        |
| `--credential-role <maintainer\|ci>`  | 在 CI 中為 `ci`，否則為 `maintainer`                      | 當 `--credential-source convex` 時使用的角色。                                    |

如果有任何場景失敗，兩者皆會以非零代碼結束。`--allow-failures` 會寫入構件而不會設定失敗的結束代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以兩個不同的機器人（驅動程式 + SUT）鎖定一個真實的私人 Telegram 群組。SUT 機器人必須具備 Telegram 使用者名稱；當兩個機器人都在 `@BotFather` 中啟用 **Bot-to-Bot Communication Mode** 時，bot-to-bot 觀察的效果最好。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — 數值聊天 ID（字串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

選用：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會將訊息主體保留在觀察到的訊息構件中（預設為編輯）。

場景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

輸出成品：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — 包含每次回覆的 RTT（驅動程式發送 → 觀察到的 SUT 回覆），從金絲雀開始。
- `telegram-qa-observed-messages.json` — 除非設定了 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否則會遮蔽內文。

### Discord QA

```bash
pnpm openclaw qa discord
```

針對一個真實的私人 Discord 公會頻道，使用兩個機器人進行測試：一個由測試工具控制的驅動程式機器人，以及另一個由子 OpenClaw 透過內建的 Discord 外掛程式啟動的 SUT 機器人。驗證頻道提及處理，以及 SUT 機器人是否已向 Discord 註冊原生的 `/help` 指令。

當 `--credential-source env` 時需要的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — 必須符合 Discord 傳回的 SUT 機器人使用者 ID（否則該跑道會快速失敗）。

選用項目：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 會在觀察到的訊息成品中保留訊息內文。

場景（`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`）：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`

輸出成品：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — 除非設定了 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否則會遮蔽內文。

### Convex 憑證集區

Telegram 和 Discord 跑道可以從共用的 Convex 集區租用憑證，而不是讀取上述的環境變數。傳遞 `--credential-source convex`（或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨佔租用、在執行期間保持心跳，並在關機時釋放它。集區種類為 `"telegram"` 和 `"discord"`。

中介軟體在 `admin/add` 上驗證的 Payload 形狀：

- Telegram（`kind: "telegram"`）：`{ groupId: string, driverToken: string, sutToken: string }` — `groupId` 必須是數字聊天 ID 字串。
- Discord（`kind: "discord"`）：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。

操作環境變數和 Convex broker 端點合約位於 [Testing → Shared Telegram credentials via Convex](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1)（該章節名稱早於 Discord 支援；broker 語義對這兩種類別是相同的）。

## Repo-backed seeds

Seed assets 位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些有意放在 git 中，以便 QA 計畫對人類和 agent 都可見。

`qa-lab` 應保持為通用的 markdown 執行器。每個 scenario markdown 檔案是一次測試執行的來源事實，應定義：

- scenario metadata
- 選用的 category、capability、lane 和 risk metadata
- docs and code refs
- 選用的 plugin requirements
- 選用的 gateway config patch
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重用 runtime 介面允許保持通用和橫向切分。例如，markdown scenarios 可以結合 transport-side helpers 與 browser-side helpers，透過 Gateway `browser.request` 縫隙驅動嵌入式 Control UI，而無需新增特殊情況的 runner。

Scenario 檔案應按 product capability 而非 source tree 資料夾分組。當檔案移動時，請保持 scenario IDs 穩定；使用 `docsRefs` 和 `codeRefs` 進行實作追溯。

基準清單應保持足夠廣泛以涵蓋：

- DM 和 channel chat
- thread behavior
- message action lifecycle
- cron callbacks
- memory recall
- model switching
- subagent handoff
- repo-reading 和 docs-reading
- 一個小型建置任務，例如 Lobster Invaders

## Provider mock lanes

`qa suite` 有兩個本機 provider mock lanes：

- `mock-openai` 是具備 scenario 感知的 OpenClaw mock。它仍然是 repo-backed QA 和 parity gates 的預設決定性 mock lane。
- `aimock` 啟動一個由 AIMock 支援的 provider 伺服器，用於實驗性協定、fixture、record/replay 和 chaos 測試範圍。它是增補性的，不會取代 `mock-openai` scenario dispatcher。

Provider-lane 的實作位於 `extensions/qa-lab/src/providers/` 之下。每個提供者都擁有自己的預設值、本機伺服器啟動、閘道模型配置、auth-profile 暫存需求，以及即時/模擬功能旗標。共用的測試套件和閘道程式碼應透過提供者註冊表進行路由，而不是根據提供者名稱進行分支。

## 傳輸介面卡

`qa-lab` 擁有一個用於 Markdown QA 情境的通用傳輸接縫。`qa-channel` 是該接縫上的第一個介面卡，但設計目標更為廣泛：未來的真實或合成通道應插入同一個測試套件執行器，而不是新增傳輸特定的 QA 執行器。

在架構層級上，劃分如下：

- `qa-lab` 負責通用情境執行、工作並行、產生品寫入和報告。
- 傳輸介面卡負責閘道配置、就緒狀態、入站和出站觀察、傳輸動作，以及正規化的傳輸狀態。
- `qa/scenarios/` 下的 Markdown 情境檔案定義了測試執行；`qa-lab` 提供了執行它們的可重複使用執行時期介面。

### 新增通道

將通道新增到 Markdown QA 系統需要兩件事：

1. 該通道的傳輸介面卡。
2. 測試通道合約的情境套件。

當共用 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 命令根目錄。

`qa-lab` 擁有共用的主機機制：

- `openclaw qa` 命令根目錄
- 測試套件啟動和拆除
- 工作並行
- 產生品寫入
- 報告生成
- 情境執行
- 舊版 `qa-channel` 情境的相容性別名

執行器外掛擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共用 `qa` 根目錄下
- 如何為該傳輸配置閘道
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開文字記錄和正規化的傳輸狀態
- 如何執行傳輸支援的動作
- 如何處理傳輸特定的重置或清理

採用新通道的最低門檻：

1. 將 `qa-lab` 保留為共享 `qa` 根目錄的所有者。
2. 在共享的 `qa-lab` 主機接縫上實作傳輸執行器。
3. 將傳輸特定的機制保留在執行器外掛程式或通道套件內。
4. 將執行器掛載為 `openclaw qa <runner>`，而不是註冊一個競爭的根命令。執行器外掛程式應在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量化；延遲的 CLI 和執行器執行應保留在個別的進入點之後。
5. 在主題式 `qa/scenarios/` 目錄下撰寫或調整 Markdown 情境。
6. 為新情境使用通用情境協助程式。
7. 除非儲存庫正在進行有意識的遷移，否則請保持現有的相容性別名正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於一個通道傳輸，請將其保留在該執行器外掛程式或外掛程式套件中。
- 如果情境需要多個通道都能使用的新功能，請新增通用協助程式，而不是在 `suite.ts` 中新增通道特定的分支。
- 如果行為僅對一個傳輸有意義，請保持情境傳輸特定，並在情境合約中明確說明。

### 情境協助程式名稱

新情境的首選通用協助程式：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

相容性別名仍可用於現有情境 —— `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` —— 但新情境的撰寫應使用通用名稱。別名的存在是為了避免一次性全面遷移，而非作為未來的模型。

## 報告

`qa-lab` 從觀測到的匯流排時間軸匯出 Markdown 協定報告。
該報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼仍處於封鎖狀態
- 哪些後續情境值得新增

若要取得可用情境的清單 —— 在評估後續工作範圍或接線新傳輸時很有用 —— 請執行 `pnpm openclaw qa coverage`（加入 `--json` 以取得機器可讀的輸出）。

若要進行字元與樣式檢查，請在多個即時模型參照上執行相同的情境
並撰寫一份經過評判的 Markdown 報告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

此指令會執行本機 QA gateway 子進程，而非 Docker。Character eval（角色評估）情境應透過 `SOUL.md` 設定角色，然後執行一般使用者輪次，例如聊天、工作區幫助和小型檔案任務。候選模型不應被告知其正在接受評估。此指令會保留每份完整的逐字稿，記錄基本執行統計數據，然後要求評審模型以快模式（fast mode）並在支援的情況下使用 `xhigh` 推理，以自然程度、氛圍和幽默感來為執行結果排名。比較供應商時請使用 `--blind-judge-models`：評審提示仍會取得每份逐字稿和執行狀態，但候選參照會被替換為中性標籤，例如 `candidate-01`；報告會在解析後將排名對應回真實參照。
候選執行預設為 `high` 思考，其中 GPT-5.5 為 `medium`，支援此功能的較舊 OpenAI 評估參照則為 `xhigh`。可在內嵌（inline）中覆寫特定候選，使用 `--model provider/model,thinking=<level>`。`--thinking <level>` 仍會設定全域備援，並保留較舊的 `--model-thinking <provider/model=level>` 形式以維持相容性。
OpenAI 候選參照預設為快模式，因此在供應商支援的情況下會使用優先處理。當單一候選或評審需要覆寫時，請在內嵌中加入 `,fast`、`,no-fast` 或 `,fast=false`。僅在您希望強制所有候選模型都啟用快模式時才傳遞 `--fast`。候選和評審的持續時間會記錄在報告中用於基準分析，但評審提示會明確指出不要根據速度排名。
候選和評審模型執行的預設並行數均為 16。當供應商限制或本機 gateway 負載導致執行過於吵雜時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和
`google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。
當未傳遞 `--judge-model` 時，評審預設為
`openai/gpt-5.5,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-6,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [QA Channel](/zh-Hant/channels/qa-channel)
- [測試](/zh-Hant/help/testing)
- [儀表板](/zh-Hant/web/dashboard)
