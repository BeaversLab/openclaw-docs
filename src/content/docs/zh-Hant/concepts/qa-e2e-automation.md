---
summary: "QA 堆疊概覽：qa-lab、qa-channel、儲存庫支援的場景、即時傳輸通道、傳輸配接器和報告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概覽"
---

專有的 QA 堆疊旨在以更貼近現實、具備通道形態的方式來測試 OpenClaw，這比單一的單元測試更能模擬實際情況。

目前的組成部分：

- `extensions/qa-channel`：綜合訊息通道，支援私訊、頻道、主題回覆、反應、編輯和刪除介面。
- `extensions/qa-lab`：除錯器 UI 和 QA 匯流排，用於觀察對話紀錄、注入入站訊息以及匯出 Markdown 報告。
- `extensions/qa-matrix`，未來的執行器外掛：即時傳輸配接器，可在子 QA Gateway 內驅動真實通道。
- `qa/`：儲存庫支援的啟動任務和基準 QA 場景種子資產。
- [Mantis](/zh-Hant/concepts/mantis)：針對需要真實傳輸、瀏覽器截圖、VM 狀態和 PR 證據的錯誤，進行即時驗證前後比對。

## 指令介面

每個 QA 流程都在 `pnpm openclaw qa <subcommand>` 下執行。許多流程都有 `pnpm qa:*` 腳本別名；這兩種形式都受支援。

| 指令                                                | 用途                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 隨附的 QA 自我檢查；寫入 Markdown 報告。                                                                                                                                                                                                  |
| `qa suite`                                          | 針對 QA gateway 通道執行儲存庫支援的場景。別名：`pnpm openclaw qa suite --runner multipass` 用於一次性 Linux VM。                                                                                                                         |
| `qa coverage`                                       | 列印 Markdown 場景覆蓋率清單 (`--json` 用於機器輸出)。                                                                                                                                                                                    |
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並寫入 agentic 對等報告。                                                                                                                                                                            |
| `qa character-eval`                                 | 跨多個即時模型執行角色 QA 場景並產出評斷報告。請參閱 [報告](#reporting)。                                                                                                                                                                 |
| `qa manual`                                         | 針對選定的供應商/模型通道執行一次性提示。                                                                                                                                                                                                 |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 匯流排 (別名：`pnpm qa:lab:ui`)。                                                                                                                                                                             |
| `qa docker-build-image`                             | 建置預先製作的 QA Docker 映像檔。                                                                                                                                                                                                         |
| `qa docker-scaffold`                                | 為 QA 儀表板 + 閘道通道撰寫 docker-compose 腳手架。                                                                                                                                                                                       |
| `qa up`                                             | 建置 QA 站台，啟動 Docker 支援的堆疊，列印 URL (別名：`pnpm qa:lab:up`；`:fast` 變體新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`)。                                                                                         |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                                                                                                              |
| `qa mock-openai`                                    | 僅啟動具有情境感知能力的 `mock-openai` 提供者伺服器。                                                                                                                                                                                     |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共用的 Convex 憑證池。                                                                                                                                                                                                                |
| `qa matrix`                                         | 針對一次性 Tuwunel homeserver 的即時傳輸通道。請參閱 [Matrix QA](/zh-Hant/concepts/qa-matrix)。                                                                                                                                                |
| `qa telegram`                                       | 針對真實私人 Telegram 群組的即時傳輸通道。                                                                                                                                                                                                |
| `qa discord`                                        | 針對真實私人 Discord 公會頻道的即時傳輸通道。                                                                                                                                                                                             |
| `qa slack`                                          | 針對真實私人 Slack 頻道的即時傳輸通道。                                                                                                                                                                                                   |
| `qa mantis`                                         | 用於即時傳輸錯誤的前後驗證執行器，包含 Discord 狀態反應證據、Crabbox 桌面/瀏覽器冒煙測試以及 VNC 中的 Slack 冒煙測試。請參閱 [Mantis](/zh-Hant/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。 |

## 操作員流程

目前的 QA 操作員流程是一個雙面板的 QA 網站：

- 左側：包含代理程式的 Gateway 儀表板（控制 UI）。
- 右側：QA Lab，顯示類 Slack 的對話紀錄和情境計畫。

執行方式：

```bash
pnpm qa:lab:up
```

這會建置 QA 網站，啟動 Docker 支援的 gateway 通道，並公開 QA Lab 頁面，讓操作員或自動化迴圈可以在該頁面給予代理程式 QA 任務、觀察真實頻道行為，並記錄成功、失敗或受阻的項目。

若要進行更快速的 QA Lab UI 迭代而不需每次都重建 Docker 映像檔，請使用 bind-mounted QA Lab bundle 啟動堆疊：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 將 Docker 服務保持在預先建置的映像上，並將
`extensions/qa-lab/web/dist` 掛載到 `qa-lab` 容器中。`qa:lab:watch`
會在變更時重建該套件，而當 QA Lab
資產雜湊變更時，瀏覽器會自動重新載入。

若要進行本機 OpenTelemetry 追蹤冒煙測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本會啟動本機 OTLP/HTTP 追蹤接收器，並在啟用 `diagnostics-otel` 外掛程式的情況下執行
`otel-trace-smoke` QA 情境，然後
解碼匯出的 protobuf spans 並斷言發行關鍵結構：
`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、
`openclaw.context.assembled` 和 `openclaw.message.delivery` 必須存在；
模型呼叫在成功的回合中不得匯出 `StreamAbandoned`；原始診斷 ID 和
`openclaw.content.*` 屬性必須保留在追蹤之外。它會
將 `otel-smoke-summary.json` 寫入 QA 套件產物旁。

可觀測性 QA 僅保留在原始碼簽出中。npm tarball 故意省略
QA Lab，因此套件 Docker 發行通道不會執行 `qa` 指令。變更
診斷檢測時，請從已建置的原始碼簽出中使用
`pnpm qa:otel:smoke`。

若要執行傳輸真實的 Matrix 冒煙管道，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 參考資料、設定檔/情境目錄、環境變數和工件配置位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。概覽如下：它在 Docker 中佈建一個一次性的 Tuwunel homeserver，註冊暫時的 driver/SUT/observer 使用者，在範圍限定於該傳輸的子 QA Gateway 中執行真正的 Matrix 外掛（無 `qa-channel`），然後在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下寫入 Markdown 報告、JSON 摘要、observed-events 工件和組合輸出日誌。

這些情境涵蓋了單元測試無法端到端證明的傳輸行為：提及閘控、允許機器人政策、允許清單、頂層和執行緒回覆、DM 路由、反應處理、入站編輯抑制、重新啟動重放去重、homeserver 中斷恢復、批准元數據傳遞、媒體處理，以及 Matrix E2EE 引導/恢復/驗證流程。E2EE CLI 設定檔還會在檢查 Gateway 回覆之前，透過同一個一次性 homeserver 驅動 `openclaw matrix encryption setup` 和驗證指令。

Discord 也有僅限 Mantis 的選用情境用於 Bug 重現。使用 `--scenario discord-status-reactions-tool-only` 來取得明確的狀態反應時間軸，或使用 `--scenario discord-thread-reply-filepath-attachment` 建立真實的 Discord 執行緒並驗證 `message.thread-reply` 是否保留了 `filePath` 附件。這些情境不包含在預設的即時 Discord 通道中，因為它們是重現前後的探針，而非廣泛的冒煙測試覆蓋範圍。當 QA 環境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 時，執行緒附件 Mantis 工作流程也可以新增已登入的 Discord Web 見證影片。該檢視者設定檔僅用於視覺捕捉；通過/失敗決定仍來自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的指令介面。排程和預設手動執行會使用即時 frontier 憑證、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 執行快速 Matrix 設定檔。手動 `matrix_profile=all` 會分散到五個設定檔分片，以便在執行完整目錄時能夠並行運作，同時保持每個分片一個工件目錄。

針對傳輸真實的 Telegram、Discord 和 Slack 冒煙通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它們針對一個既有真實頻道，並使用兩個機器人（driver + SUT）。所需的環境變數、情境清單、輸出成品以及 Convex 憑證池都記載於下方的 [Telegram, Discord, and Slack QA reference](#telegram-discord-and-slack-qa-reference) 中。

若要使用 VNC 救援執行完整的 Slack 桌面 VM，請執行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

該指令租用一台 Crabbox 桌面/瀏覽器機器，在 VM 內執行 Slack live lane，在 VNC 瀏覽器中開啟 Slack Web，擷取桌面，並在影片擷取可用時將 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 複製回 Mantis 成品目錄。Crabbox 桌面/瀏覽器租用會提前提供擷取工具和瀏覽器/原生建置輔助套件，因此情境應僅在較舊的租用上安裝備援方案。Mantis 會在 `mantis-slack-desktop-smoke-report.md` 中回報總計和各階段的計時，以便緩慢的執行能顯示時間是花在租用預熱、憑證取得、遠端設定還是成品複製上。透過 VNC 手動登入 Slack Web 後重複使用 `--lease-id <cbx_...>`；重複使用的租用也能讓 Crabbox 的 pnpm store 快取保持熱度。預設的 `--hydrate-mode source` 會從原始碼检出進行驗證並在 VM 內執行 install/build。僅當重複使用的遠端工作區已有 `node_modules` 和已建置的 `dist/` 時才使用 `--hydrate-mode prehydrated`；該模式會跳過昂貴的 install/build 步驟，並在工作區未就緒時封閉式失敗。使用 `--gateway-setup` 時，Mantis 會在 VM 內的連接埠 `38973` 上留下一個持續運行的 OpenClaw Slack gateway；若無此選項，該指令會執行正常的 bot-to-bot Slack QA lane 並在成品擷取後結束。

操作員檢查清單、GitHub workflow dispatch 指令、證據評註契約、hydrate-mode 決策表、計時解讀以及失敗處理步驟皆位於 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook) 中。

若要執行 agent/CV 風格的桌面任務，請執行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` 租用或重用 Crabbox 桌面/瀏覽器機器，啟動
`crabbox record --while`，透過巢狀 `visual-driver` 驅動可見的瀏覽器，
擷取 `visual-task.png`，當選取 `--vision-mode image-describe` 時對擷圖執行
`openclaw infer image describe`，並寫入 `visual-task.mp4`、
`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
當設定 `--expect-text` 時，視覺提示會要求結構化的 JSON
評判，且只有在模型回報正面的可見證據時才會通過；單純引用目標文字的
負面回應會導致斷言失敗。使用 `--vision-mode metadata` 進行無模型的冒煙測試，
以在不呼叫影像理解提供者的情況下證明桌面、瀏覽器、擷圖和影片的管道運作。
錄製是 `visual-task` 的必要產出；如果 Crabbox 未錄製任何
非空的 `visual-task.mp4`，即使視覺驅動程式已通過，任務仍會失敗。
失敗時，除非任務已經通過且未設定 `--keep-lease`，否則 Mantis 會保留 VNC 的租用。

使用共用即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

此診斷程式會檢查 Convex broker 環境，驗證端點設定，並在維護者金鑰存在時驗證 admin/list 的連線性。它僅回報金鑰的已設定/遺失狀態。

## 即時傳輸覆蓋範圍

即時傳輸通道共用一個合約，而不是各自發明自己的場景清單形狀。`qa-channel` 是廣泛的綜合產品行為套件，並非即時傳輸覆蓋率矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | Bot 對 Bot | 許可清單區塊 | 頂層回覆 | 重新啟動恢復 | 串後跟進 | 串隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | ------------ | -------- | ------ | -------- | -------- | ------------ |
| 矩陣     | x      | x        | x          | x            | x        | x            | x        | x      | x        |          |              |
| Telegram | x      | x        | x          |              |          |              |          |        |          | x        |              |
| Discord  | x      | x        | x          |              |          |              |          |        |          |          | x            |
| Slack    | x      | x        | x          | x            | x        | x            | x        | x      |          |          |              |

這讓 `qa-channel` 保持為廣泛的產品行為套件，同時 Matrix、
Telegram 和未來的即時傳輸共用一份明確的傳輸合約檢查清單。

若要在不將 Docker 引入 QA 路徑的情況下使用一次性 Linux VM 通道，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體，安裝依賴項，在客體內建置 OpenClaw，執行 `qa suite`，然後將一般的 QA 報告和摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它會重複使用主機上 `qa suite` 相同的場景選取行為。
主機和 Multipass 套件執行預設會以獨立的 Gateway Worker 並行執行多個選取的場景。`qa-channel` 預設並行數為 4，並以選取的場景數量為上限。使用 `--concurrency <count>` 來調整 Worker 數量，或使用 `--concurrency 1` 進行序列執行。
當任何場景失敗時，該指令會以非零代碼結束。當您想要產出檔案而不因失敗結束時，請使用 `--allow-failures`。
即時執行會轉發對客體實用且受支援的 QA 驗證輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及當存在的 `CODEX_HOME`。請將 `--output-dir` 保持在儲存庫根目錄下，以便客體可以透過掛載的工作區寫回資料。

## Telegram、Discord 和 Slack QA 參考資料

Matrix 因為其場景數量和支援 Docker 的 Home Server 佈建而擁有[專屬頁面](/zh-Hant/concepts/qa-matrix)。Telegram、Discord 和 Slack 規模較小——每個只有少數場景，沒有設定檔系統，對抗既有的真實頻道——因此它們的參考資訊列於此處。

### 共用的 CLI 旗標

這些通道透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊，並接受相同的標誌：

| 旗標                                  | 預設值                                                          | 描述                                                                              |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 僅執行此情境。可重複使用。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 寫入報告/摘要/觀察到的訊息和輸出日誌的位置。相對路徑會相對於 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 從中立的 cwd 呼叫時的 Repository 根目錄。                                         |
| `--sut-account <id>`                  | `sut`                                                           | QA gateway config 中的臨時帳戶 ID。                                               |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（舊版的 `live-openai` 仍然有效）。               |
| `--model <ref>` / `--alt-model <ref>` | 供應商預設值                                                    | 主要/替代模型參照。                                                               |
| `--fast`                              | 關                                                              | 在支援的情況下使用供應商快速模式。                                                |
| `--credential-source <env\|convex>`   | `env`                                                           | 請參閱 [Convex credential pool](#convex-credential-pool)。                        |
| `--credential-role <maintainer\|ci>`  | 在 CI 中使用 `ci`，否則使用 `maintainer`                        | 當 `--credential-source convex` 時使用的角色。                                    |

每個 lane 若有任何場景失敗，會以非零代碼退出。`--allow-failures` 會寫入相關檔案而不設定失敗的退出代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以兩個不同的機器人（driver + SUT）針對一個真實的私人 Telegram 群組。SUT 機器人必須擁有 Telegram 使用者名稱；當兩個機器人在 `@BotFather` 中啟用 **Bot-to-Bot Communication Mode** 時，機器人之間的觀測效果最佳。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 數位聊天 ID (字串)。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可選：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會將訊息主體保留在觀測到的訊息相關檔案中（預設會編輯）。

場景 (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`)：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

隱含的預設集合總是包含 canary、提及閘控、原生指令回覆、指令定址以及機器人到機器人的群組回覆。`mock-openai` 預設值也包含確定性回覆鏈和最終訊息串流檢查。`telegram-current-session-status-tool` 仍為選用，因為它只有在直接緊接在 canary 之後執行緒時才穩定，而非在任意原生指令回覆之後。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 列印目前的預設/選用分割與回歸參考。

輸出成品：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含從 canary 開始的每次回覆 RTT (driver 傳送 → 觀測到的 SUT 回覆)。
- `telegram-qa-observed-messages.json` - 訊息內文已編輯，除非設定 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

### Discord QA

```bash
pnpm openclaw qa discord
```

目標針對一個真實的私人 Discord 公會頻道，其中包含兩個機器人：一個是由測試框架控制的驅動程式機器人，另一個是由子 OpenClaw 透過內建的 Discord 外掛程式啟動的 SUT 機器人。驗證頻道提及處理、SUT 機器人是否已向 Discord 註冊原生 `/help` 指令，以及選用 Mantis 證據場景。

執行 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必須符合 Discord 傳回的 SUT 機器人使用者 ID（否則該車道會快速失敗）。

選用項目：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 會在觀察到的訊息產出中保留訊息內文。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 選取 `discord-voice-autojoin` 的語音/舞台頻道；若未指定，場景會選取 SUT 機器人看見的第一個語音/舞台頻道。

場景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 選用語音場景。單獨執行，啟用 `channels.discord.voice.autoJoin`，並驗證 SUT 機器人的目前 Discord 語音狀態是否為目標語音/舞台頻道。Convex Discord 憑證可能包含選用的 `voiceChannelId`；否則執行器會探索公會中第一個可見的語音/舞台頻道。
- `discord-status-reactions-tool-only` - 選用 Mantis 場景。單獨執行，因為它會將 SUT 切換為僅使用工具的永久啟用公會回覆 (`messages.statusReactions.enabled=true`)，然後擷取 REST 反應時間軸以及 HTML/PNG 視覺化產出。Mantis 事前/事後報告也會將場景提供的 MP4 產出保留為 `baseline.mp4` 和 `candidate.mp4`。

明確執行 Discord 語音自動加入情境：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

明確執行 Mantis 狀態反應情境：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast
```

輸出產出物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 訊息內文已編輯，除非設定 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- 當狀態反應場景執行時會出現 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

目標為一個真實的私有 Slack 頻道，包含兩個不同的機器人：一個由控制線程駕馭的驅動程式機器人，以及一個由子 OpenClaw 透過隨附的 Slack 外掛程式啟動的 SUT 機器人。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

選用：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 會將訊息主體保留在 observed-message 成件中。

場景 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

輸出產出物：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 除非設定 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否則訊息主體會被編輯。

#### 設定 Slack 工作區

此通道需要在同一個工作區中使用兩個不同的 Slack 應用程式，以及一個兩個機器人皆為成員的頻道：

- `channelId` - 一個兩個機器人都已被邀請加入的頻道的 `Cxxxxxxxxxx` id。請使用專用頻道；此通道每次執行時都會發佈訊息。
- `driverBotToken` - **Driver** 應用程式的機器人權杖 (`xoxb-...`)。
- `sutBotToken` - **SUT** 應用程式的機器人權杖 (`xoxb-...`)，它必須是與驅動程式分開的 Slack 應用程式，以便其機器人使用者 id 是唯一的。
- `sutAppToken` - 具有 `connections:write` 的 SUT 應用程式的應用程式層級權杖 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 應用程式可以接收事件。

建議使用專用於 QA 的 Slack 工作區，而非重複使用生產環境工作區。

下方的 SUT 宣告有意將隨附的 Slack 外掛程式的生產安裝 (`extensions/slack/src/setup-shared.ts:10`) 縮減為即時 Slack QA 測試套件所涵蓋的權限和事件。如需使用者所見的生產頻道設定，請參閱 [Slack channel quick setup](/zh-Hant/channels/slack#quick-setup)；QA Driver/SUT 配對有意分開，因為通道需要在一個工作區中有兩個不同的機器人使用者 id。

**1. 建立 Driver 應用程式**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 選擇 QA 工作區，貼上下列宣告，然後 _Install to Workspace_：

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "Test driver bot for OpenClaw QA Slack live lane"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

複製 _Bot User OAuth Token_ (`xoxb-...`) - 這會變成 `driverBotToken`。驅動程式只需要發佈訊息並識別自己；不需要事件，不需要 Socket Mode。

**2. 建立 SUT 應用程式**

在同一個工作區中重複 _Create New App → From a manifest_。此 QA 應用程式特意使用了較窄版本的內建 Slack 外掛程式生產清單 (`extensions/slack/src/setup-shared.ts:10`)：反應範圍和事件被省略，因為即時 Slack QA 套件尚未涵蓋反應處理。

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed"]
    }
  }
}
```

在 Slack 建立應用程式後，請在其設定頁面上執行兩項操作：

- _Install to Workspace_ → 複製 _Bot User OAuth Token_ → 該令牌即為 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 新增範圍 `connections:write` → 儲存 → 複製 `xapp-...` 值 → 該值即為 `sutAppToken`。

透過在每個令牌上呼叫 `auth.test`，驗證這兩個機器人擁有不同的使用者 ID。執行時期會根據使用者 ID 區分驅動程式和 SUT；對兩者重複使用同一個應用程式會導致提及閘門 (mention-gating) 立即失敗。

**3. 建立頻道**

在 QA 工作區中，建立一個頻道 (例如 `#openclaw-qa`) 並從頻道內邀請這兩個機器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

從 _channel info → About → Channel ID_ 複製 `Cxxxxxxxxxx` ID - 該 ID 即為 `channelId`。公開頻道即可運作；如果您使用私人頻道，兩個應用程式都已經有 `groups:history`，因此測試架構的歷史紀錄讀取仍然會成功。

**4. 註冊認證資訊**

有兩個選項。使用環境變數進行單機除錯 (設定四個 `OPENCLAW_QA_SLACK_*` 變數並傳遞 `--credential-source env`)，或是將資料播種到共用的 Convex 池，以便 CI 和其他維護者可以租用它們。

若是使用 Convex 集區，請將這四個欄位寫入 JSON 檔案：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 Shell 中匯出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 後，進行註冊和驗證：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

預期會有 `count: 1`、`status: "active"`，而沒有 `lease` 欄位。

**5. 進行端對端驗證**

在本地執行該 lane，以確認這兩個 bot 可以透過 broker 互相對話：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

成功的執行會在 30 秒內完成，且 `slack-qa-report.md` 會顯示 `slack-canary` 和 `slack-mention-gating` 的狀態皆為 `pass`。如果通道暫停約 90 秒並以 `Convex credential pool exhausted for kind "slack"` 結束，則可能是池已空或每列都已被租用 - `qa credentials list --kind slack --status all --json` 會告訴您是哪種情況。

### Convex 認證集區

Telegram、Discord、Slack 和 WhatsApp 通道可以從共享的 Convex 池租用憑證，而不是讀取上述的環境變數。傳遞 `--credential-source convex` （或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨占租約，在執行期間發送心跳，並在關閉時釋放它。池種類為 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

Broker 在 `admin/add` 上驗證的 Payload 形狀：

- Telegram (`kind: "telegram"`)： `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必須是數字聊天 ID 字串。
- Telegram 真實使用者 (`kind: "telegram-user"`)： `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 一個由 TDLib CLI 驅動程式和 Telegram Desktop 視覺見證使用的獨占一次性帳戶租約。
- Discord (`kind: "discord"`)： `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`)： `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 電話號碼必須是不同的 E.164 字串。

對於視覺化的真實使用者 Telegram 證明，建議使用保留的 Crabbox 工作階段：

```bash
pnpm qa:telegram-user:crabbox -- start --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json --text /status
pnpm qa:telegram-user:crabbox -- finish --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` 為 TDLib CLI 驅動程式和 Telegram Desktop 見證保留一個獨占的 Convex `telegram-user` 租約，啟動桌面錄製，並讓 Crabbox 保持運行以進行任意的代理驅動重現步驟。代理可以根據需要使用 `send`、`run`、`screenshot` 和 `status`，然後 `finish` 會在釋放憑證之前收集螢幕截圖、影片、動態修剪的影片/GIF、TDLib 探測輸出和日誌。`publish --session <file> --pr

<number>` comments only the motion GIF by default; `--full-artifacts` 是針對日誌和 JSON 輸出的明確選擇加入。預設的 `probe` 指令仍然是快速 `/status` 煙霧測試的單一指令簡寫。

當 PR 需要確定性的視覺差異時使用 `--mock-response-file <path>`：可以在 Telegram 格式化程式或傳遞層變更時，在 `main` 和 PR head 上執行相同的模擬模型回覆。擷取預設值是針對 PR 註解調整的：標準 Crabbox 類別、24fps 桌面錄製、24fps 動態 GIF 和 1920px 預覽寬度。前後註解應發布一個乾淨的套件，其中僅包含預期的 GIF。

Slack lanes 也可以使用集區。Slack payload 形狀檢查目前位於 Slack QA runner 而非 broker 中；請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，搭配像 `Cxxxxxxxxxx` 這樣的 Slack 頻道 ID。有關應用程式和範圍佈建，請參閱 [Setting up the Slack workspace](#setting-up-the-slack-workspace)。

操作環境變數和 Convex broker 端點合約位於 [Testing → Shared Telegram credentials via Convex](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1)（該區段名稱早於多頻道集區；租用語意在所有類型中共享）。

## Repo-backed seeds

Seed 資產位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些刻意放在 git 中，以便 QA 計畫對人類和代理程式都可见。

`qa-lab` 應保持為一個通用的 markdown runner。每個情境 markdown 檔案是一次測試執行的來源，應定義：

- 情境元資料
- 選用的類別、功能、lane 和風險元資料
- 文件和程式碼參照
- 選用的外掛程式需求
- 選用的 gateway config patch
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重用執行時介面允許保持通用和橫向性。例如，markdown 情境可以結合傳輸端輔助程式與瀏覽器端輔助程式，透過 Gateway `browser.request` 縫隙驅動內嵌的 Control UI，而無需新增特殊情況的 runner。

情境檔案應依產品功能而非原始碼樹資料夾分組。當檔案移動時，請保持情境 ID 穩定；使用 `docsRefs` 和 `codeRefs` 進行實作追蹤。

基準清單應保持足夠廣泛以涵蓋：

- DM 和頻道聊天
- 執行續行為
- 訊息動作生命週期
- cron 回呼
- 記憶回溯
- 模型切換
- 子代理移交
- 讀取 repo 和讀取文件
- 一個小型的建構任務，例如 Lobster Invaders

## Provider mock 通道

`qa suite` 有兩個本機 Provider mock 通道：

- `mock-openai` 是具有情境感知能力的 OpenClaw mock。它仍是 repo 備份 QA 和同等性檢查預設的
  決定性 mock 通道。
- `aimock` 啟動一個以 AIMock 為後盾的 provider 伺服器，用於實驗性協定、
  fixture、記錄/重放和混亂測試涵蓋範圍。它是附加性的，並不會
  取代 `mock-openai` 情境分派器。

Provider 通道實作位於 `extensions/qa-lab/src/providers/` 之下。
每個 provider 擁有其預設值、本機伺服器啟動、gateway 模型設定、
auth-profile 暫存需求，以及即時/mock 能力旗標。共用的套件和
gateway 程式碼應透過 provider 註冊表進行路由，而不是根據
provider 名稱進行分支處理。

## 傳輸適配器

`qa-lab` 擁有用於 markdown QA 情境的通用傳輸縫合層。`qa-channel` 是該縫合層上的第一個適配器，但設計目標更廣泛：未來的真實或合成通道應插入同一個套件執行器，而不是新增傳輸特定的 QA 執行器。

在架構層面上，劃分如下：

- `qa-lab` 擁有通用情境執行、工作併發、寫入成品和報告功能。
- 傳輸適配器擁有 gateway 設定、就緒狀態、入站和出站觀察、傳輸動作，以及正規化的傳輸狀態。
- `qa/scenarios/` 下的 Markdown 情境檔案定義了測試執行；`qa-lab` 提供了執行這些檔案的可重複使用執行時期介面。

### 新增通道

將通道新增至 markdown QA 系統只需要兩件事：

1. 該通道的傳輸適配器。
2. 用於測試通道合約的情境套件。

當共用的 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共用的主機機制：

- `openclaw qa` 指令根目錄
- 套件啟動和拆除
- 工作併發
- 寫入成品
- 報告生成
- 情境執行
- 較舊 `qa-channel` 情境的相容性別名

Runner 插件擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置閘道
- 如何檢查就緒狀態
- 如何注入 inbound 事件
- 如何觀察 outbound 訊息
- 如何公開對話記錄和正規化的傳輸狀態
- 如何執行傳輸支援的動作
- 如何處理傳輸特定的重置或清理

採用新通道的最低門檻：

1. 保持 `qa-lab` 作為共享 `qa` 根目錄的擁有者。
2. 在共享的 `qa-lab` 主機接縫上實作傳輸 runner。
3. 將傳輸特定的機制保留在 runner 插件或通道套件內。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根指令。Runner 插件應在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量化；延遲 CLI 和 runner 執行應保持在分離的入口點後。
5. 在主題化的 `qa/scenarios/` 目錄下撰寫或調整 markdown 情境。
6. 為新情境使用通用情境輔助程式。
7. 保持現有的相容性別名正常運作，除非 repo 正在進行有意的遷移。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，就將其放在 `qa-lab` 中。
- 如果行為依賴於單一通道傳輸，請將其保留在該 runner 插件或插件套件中。
- 如果情境需要多個通道可以使用的新功能，請新增通用輔助程式，而不是在 `suite.ts` 中新增特定通道的分支。
- 如果行為僅對一種傳輸有意義，請保持情境傳輸特定，並在情境合約中明確說明。

### 情境輔助程式名稱

新情境的首選通用輔助程式：

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

既有的相容性別名仍然可用 - `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` - 但編寫新情境時應使用通用名稱。這些別名的存在是為了避免一次性的大規模遷移，而非作為未來的模型。

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協議報告。
該報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼保持受阻
- 哪些後續情境值得新增

若要取得可用情境的清單 - 在評估後續工作範圍或連接新傳輸時很有用 - 請執行 `pnpm openclaw qa coverage`（加入 `--json` 以取得機器可讀的輸出）。

若要進行字元與風格檢查，請在多個即時模型參照上執行相同的情境，並撰寫一份經過評估的 Markdown 報告：

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

此指令運行本機 QA 閘道子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定人格，然後執行一般使用者輪次，例如聊天、工作區幫助和小型檔案任務。候選模型不應被告知它正在接受評估。該指令會保留每份完整的對話記錄，記錄基本的執行統計資料，然後要求評判模型在支援的情況下以帶有 `xhigh` 推理的快速模式，依自然度、氛圍和幽默感對執行結果進行排名。
在比較提供者時請使用 `--blind-judge-models`：評判提示仍然會取得每份對話記錄和執行狀態，但候選參照會被替換為中立標籤，例如 `candidate-01`；報告會在解析後將排名對應回實際參照。
候選執行預設為 `high` 思考，GPT-5.5 使用 `medium`，而支援該功能的較舊 OpenAI 評估參照則使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 即可在行內覆寫特定候選模型。`--thinking <level>` 仍會設定全域備選，且較舊的 `--model-thinking <provider/model=level>` 形式為了相容性而予以保留。
OpenAI 候選參照預設為快速模式，因此提供者支援的地方會使用優先處理。當單一候選或評判需要覆寫時，請在行內加入 `,fast`、`,no-fast` 或 `,fast=false`。僅當您希望強制每個候選模型都開啟快速模式時，才傳遞 `--fast`。候選和評判的持續時間會記錄在報告中以進行基準分析，但評判提示會明確說明不要依速度排名。
候選和評判模型執行皆預設並行數為 16。當提供者限制或本機閘道壓力導致執行過於雜亂時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。
當未傳遞 `--judge-model` 時，評判預設為 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [QA Channel](/zh-Hant/channels/qa-channel)
- [測試](/zh-Hant/help/testing)
- [儀表板](/zh-Hant/web/dashboard)
