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

- `extensions/qa-channel`：綜合訊息通道，具備 DM、頻道、執行緒、
  反應、編輯和刪除介面。
- `extensions/qa-lab`：除錯器 UI 和 QA 總線，用於觀察對話記錄、
  注入傳入訊息以及匯出 Markdown 報告。
- `extensions/qa-matrix`，未來的執行器外掛：即時傳輸配接器，用於
  驅動子 QA 閘道內的真實通道。
- `qa/`：儲存庫支援的啟動任務和基準 QA
  場景的種子資產。
- [Mantis](/zh-Hant/concepts/mantis)：針對需要真實傳輸、瀏覽器截圖、
  VM 狀態和 PR 證據的錯誤進行即時驗證前後比對。

## 指令介面

每個 QA 流程都在 `pnpm openclaw qa <subcommand>` 下執行。許多都有 `pnpm qa:*`
腳本別名；這兩種形式都受到支援。

| 指令                                                | 用途                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 隨附的 QA 自我檢查；寫入 Markdown 報告。                                                                                                                                                                                                        |
| `qa suite`                                          | 針對 QA 閘道通道執行儲存庫支援的場景。別名：`pnpm openclaw qa suite --runner multipass` 用於一次性 Linux VM。                                                                                                                                   |
| `qa coverage`                                       | 列印 markdown 場景覆蓋率清單（`--json` 用於機器可讀輸出）。                                                                                                                                                                                     |
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並寫入 agentic parity 報告。                                                                                                                                                                               |
| `qa character-eval`                                 | 在多個即時模型上執行角色 QA 場景並生成評鑑報告。請參閱 [報告](#reporting)。                                                                                                                                                                     |
| `qa manual`                                         | 針對選定的供應商/模型通道執行一次性提示。                                                                                                                                                                                                       |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 總線（別名：`pnpm qa:lab:ui`）。                                                                                                                                                                                    |
| `qa docker-build-image`                             | 建置預先製作的 QA Docker 映像檔。                                                                                                                                                                                                               |
| `qa docker-scaffold`                                | 為 QA 儀表板 + 閘道通道撰寫 docker-compose 腳手架。                                                                                                                                                                                             |
| `qa up`                                             | 建置 QA 網站，啟動 Docker 支援的堆疊，並列印 URL（別名：`pnpm qa:lab:up`；`:fast` 變體會新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                          |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                                                                                                                    |
| `qa mock-openai`                                    | 僅啟動具備情境感知能力的 `mock-openai` 提供者伺服器。                                                                                                                                                                                           |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共用的 Convex 憑證池。                                                                                                                                                                                                                      |
| `qa matrix`                                         | 針對可拋棄式 Tuwunel homeserver 的即時傳輸通道。請參閱 [Matrix QA](/zh-Hant/concepts/qa-matrix)。                                                                                                                                                    |
| `qa telegram`                                       | 針對真實私人 Telegram 群組的即時傳輸通道。                                                                                                                                                                                                      |
| `qa discord`                                        | 針對真實私人 Discord 公會頻道的即時傳輸通道。                                                                                                                                                                                                   |
| `qa slack`                                          | 針對真實私人 Slack 頻道的即時傳輸通道。                                                                                                                                                                                                         |
| `qa mantis`                                         | 用於即時傳輸錯誤的事前與事後驗證執行器，包含 Discord 狀態回應證據、Crabbox 桌面/瀏覽器冒煙測試，以及 Slack-in-VNC 冒煙測試。請參閱 [Mantis](/zh-Hant/concepts/mantis) 與 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast` 會讓 Docker 服務保持在預先建置的映像檔上，並將 `extensions/qa-lab/web/dist` bind-mount 到 `qa-lab` 容器中。`qa:lab:watch` 會在變更時重建該 bundle，而當 QA Lab 資產雜湊變更時，瀏覽器會自動重新載入。

若要進行本機 OpenTelemetry 追蹤冒煙測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本啟動一個本地的 OTLP/HTTP 追蹤接收器，運行啟用了 `diagnostics-otel` 外掛程式的 `otel-trace-smoke` QA 情境，然後解碼匯出的 protobuf 範圍並斷言發布關鍵的結構：`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必須存在；模型呼叫在成功的輪次中不得匯出 `StreamAbandoned`；原始診斷 ID 和 `openclaw.content.*` 屬性必須排除在追蹤之外。它會將 `otel-smoke-summary.json` 寫在 QA 套件產物旁。

可觀測性 QA 僅限於原始碼檢出。npm tarball 檔案刻意省略了 QA Lab，因此套件 Docker 發布管道不會執行 `qa` 指令。變更診斷檢測時，請從已建置的原始碼檢出中使用 `pnpm qa:otel:smoke`。

若要執行傳輸真實的 Matrix 冒煙管道，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此管道的完整 CLI 參考、情境/設定檔目錄、環境變數和產物佈局位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。概況如下：它在 Docker 中佈建一個用完即丟的 Tuwunel homeserver，註冊暫時的 driver/SUT/observer 使用者，在範圍限定為該傳輸的子 QA Gateway 中執行真實的 Matrix 外掛程式（無 `qa-channel`），然後將 Markdown 報告、JSON 摘要、觀察到的事件產物和組合輸出日誌寫入 `.artifacts/qa-e2e/matrix-<timestamp>/` 下。

這些情境涵蓋了單元測試無法端到端證明的傳輸行為：提及閘道、允許 Bot 政策、允許清單、頂層和執行緒回覆、DM 路由、反應處理、入境編輯抑制、重新播放重複資料刪除、homeserver 中斷恢復、批准元資料傳遞、媒體處理，以及 Matrix E2EE 引導/恢復/驗證流程。E2EE CLI 設定檔還會在檢查 Gateway 回覆之前，透過同一個用完即丟的 homeserver 驅動 `openclaw matrix encryption setup` 和驗證指令。

Discord 還具備專屬於 Mantis 的選用情境，用於錯誤重現。使用
`--scenario discord-status-reactions-tool-only` 取得明確的狀態反應時間軸，或使用
`--scenario discord-thread-reply-filepath-attachment` 建立真實的 Discord 執行緒，並驗證
`message.thread-reply` 是否保留
`filePath` 附件。這些情境不納入預設的即時 Discord 通道，因為它們屬於重現前後的探測，而非廣泛的冒煙測試覆蓋。
當在 QA 環境中設定 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 時，執行緒附件的 Mantis 工作流程也可以新增已登入的 Discord Web
見證影片。該檢視者設定檔僅用於視覺擷取；通過/失敗的決策仍來自 Discord REST 預言機。

CI 使用 `.github/workflows/qa-live-transports-convex.yml` 中相同的指令介面。排程和預設的手動執行會使用具有即時 frontier 憑證的快速 Matrix 設定檔、`--fast` 和
`OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 來執行。手動
`matrix_profile=all` 會擴散到五個設定檔分片，以便在為每個分片保留一個成品目錄的同時，並行執行完整的目錄。

針對傳輸真實的 Telegram、Discord 和 Slack 冒煙通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它們以預先存在的真實通道為目標，該通道包含兩個機器人（驅動程式 + SUT）。必要的環境變數、情境清單、輸出成品和 Convex 憑證池記載於下方的 [Telegram、Discord 和 Slack QA 參考](#telegram-discord-and-slack-qa-reference) 中。

若要使用 VNC 救援執行完整的 Slack 桌面 VM，請執行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

該指令會租用一台 Crabbox 桌面/瀏覽器機器，在虛擬機內執行 Slack live lane，在 VNC 瀏覽器中開啟 Slack Web，擷取桌面畫面，並在影片擷取可用時將 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 複製回 Mantis 成品目錄。Crabbox 桌面/瀏覽器租用會預先提供擷取工具以及瀏覽器/原生建置輔助套件，因此該情境應僅在較舊的租用上安裝後備方案。Mantis 會在 `mantis-slack-desktop-smoke-report.md` 中報告總時間與各階段時間，因此若執行緩慢，可顯示時間是花在租用預熱、取得憑證、遠端設定，還是成品複製上。在透過 VNC 手動登入 Slack Web 後，重複使用 `--lease-id <cbx_...>`；重複使用的租用也能讓 Crabbox 的 pnpm store 快取保持熱度。預設的 `--hydrate-mode source` 會從原始碼 checkout 進行驗證，並在虛擬機內執行 install/build。僅當重複使用的遠端工作區已經具備 `node_modules` 和已建置的 `dist/` 時，才使用 `--hydrate-mode prehydrated`；該模式會跳過耗時的 install/build 步驟，並在工作區未就緒時以封閉式失敗處理。使用 `--gateway-setup` 時，Mantis 會在虛擬機內於連接埠 `38973` 留下一個持續運行的 OpenClaw Slack gateway；若不使用，該指令會執行一般的 bot-to-bot Slack QA lane，並在擷取成品後結束。

操作員檢查清單、GitHub workflow dispatch 指令、證據留言合約、hydrate-mode 決策表、時間解讀以及失敗處理步驟，均記載於 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。

若要執行 agent/CV 風格的桌面任務，請執行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` 租用或重用 Crabbox 桌面/瀏覽器機器，啟動
`crabbox record --while`，透過巢狀 `visual-driver` 驅動可見的瀏覽器，
擷取 `visual-task.png`，當選取 `--vision-mode image-describe` 時對截圖執行 `openclaw infer image describe`，
並寫入 `visual-task.mp4`、`mantis-visual-task-summary.json`、
`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
當設定 `--expect-text` 時，視覺提示會要求結構化的 JSON 判決，
並且僅在模型回報正面可見證據時通過；僅引用目標文字的負面回應會導致斷言失敗。
使用 `--vision-mode metadata` 進行無模型的冒煙測試，以在不呼叫圖片理解提供者的情況下，
證明桌面、瀏覽器、截圖和影片管道正常運作。錄製是 `visual-task` 的必要產出；
如果 Crabbox 未錄製任何非空的 `visual-task.mp4`，則即使視覺驅動程式通過，任務也會失敗。
失敗時，Mantis 會保留 VNC 的租用權，除非任務已經通過且未設定 `--keep-lease`。

使用共用即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

此診斷程式會檢查 Convex broker 環境，驗證端點設定，並在維護者金鑰存在時驗證 admin/list 的連線性。它僅回報金鑰的已設定/遺失狀態。

## 即時傳輸覆蓋範圍

即時傳輸通道共用一份合約，而不是各自發明自己的場景清單形狀。`qa-channel` 是廣泛的綜合產品行為套件，並非即時傳輸覆蓋範圍矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | Bot 對 Bot | 許可清單區塊 | 頂層回覆 | 重新啟動恢復 | 串後跟進 | 串隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | ------------ | -------- | ------ | -------- | -------- | ------------ |
| 矩陣     | x      | x        | x          | x            | x        | x            | x        | x      | x        |          |              |
| Telegram | x      | x        | x          |              |          |              |          |        |          | x        |              |
| Discord  | x      | x        | x          |              |          |              |          |        |          |          | x            |
| Slack    | x      | x        | x          | x            | x        | x            | x        | x      |          |          |              |

這將 `qa-channel` 保留為廣泛的產品行為套件，而 Matrix、Telegram 和未來的即時傳輸則共用一個明確的傳輸契約檢查清單。

若要在不將 Docker 引入 QA 路徑的情況下使用一次性 Linux VM 通道，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 訪客系統、安裝相依項、在訪客系統內建置 OpenClaw、執行 `qa suite`，然後將正常的 QA 報告和摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它重用主機上 `qa suite` 相同的情境選擇行為。
預設情況下，主機和 Multipass 套件執行會透過隔離的 Gateway Worker 並行執行多個選定的情境。`qa-channel` 預設並發數為 4，並以選定的情境數量為上限。使用 `--concurrency <count>` 調整 Worker 數量，或使用 `--concurrency 1` 進行序列執行。
當任何情境失敗時，該指令會以非零狀態碼退出。當您需要產生成果（artifacts）但不希望因失敗而退出時，請使用 `--allow-failures`。
即時執行會轉發對訪客系統而言實用的支援 QA 驗證輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及存在的 `CODEX_HOME`。請將 `--output-dir` 保持在 repo 根目錄下，以便訪客系統可以透過掛載的工作區寫回資料。

## Telegram、Discord 和 Slack QA 參考資料

Matrix 擁有[專屬頁面](/zh-Hant/concepts/qa-matrix)，因為其情境數量眾多且採用 Docker 支援的 Home Server 佈建。Telegram、Discord 和 Slack 規模較小——各自僅有少數情境、沒有設定檔系統，且針對既有的真實通道——因此其參考資料列於此處。

### 共用的 CLI 旗標

這些通道透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊，並接受相同的旗標：

| 旗標                                  | 預設值                                                          | 描述                                                                            |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 僅執行此情境。可重複使用。                                                      |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 報告/摘要/觀察到的訊息以及輸出日誌的寫入位置。相對路徑將依 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 從中立的 cwd 呼叫時的 Repository 根目錄。                                       |
| `--sut-account <id>`                  | `sut`                                                           | QA gateway config 中的臨時帳戶 ID。                                             |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（舊版 `live-openai` 仍然有效）。               |
| `--model <ref>` / `--alt-model <ref>` | 供應商預設值                                                    | 主要/替代模型參照。                                                             |
| `--fast`                              | 關                                                              | 在支援的情況下使用供應商快速模式。                                              |
| `--credential-source <env\|convex>`   | `env`                                                           | 請參閱 [Convex credential pool](#convex-credential-pool)。                      |
| `--credential-role <maintainer\|ci>`  | 在 CI 中為 `ci`，否則為 `maintainer`                            | 當 `--credential-source convex` 時使用的角色。                                  |

如果任何場景失敗，每個通道會以非零代碼退出。`--allow-failures` 會寫入構件而不設定失敗的退出代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以一個擁有兩個不同機器人（driver + SUT）的真實私人 Telegram 群組為目標。SUT 機器人必須擁有 Telegram 用戶名；當兩個機器人在 `@BotFather` 中啟用 **Bot-to-Bot Communication Mode** 時，機器人之間的觀察效果最佳。

當 `--credential-source env` 時的必要環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 數字聊天 ID（字串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可選：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會將訊息主體保留在已觀察訊息構件中（預設為編輯）。

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

隱含的預設集始終涵蓋 canary、提及閘控、原生指令回覆、指令定址以及 Bot 對 Bot 的群組回覆。`mock-openai` 預設值還包含決定性回覆鏈和最終訊息串流檢查。`telegram-current-session-status-tool` 保持選用 (opt-in)，因為它僅在直接接在 canary 之後執行緒化時才穩定，而非在任意原生指令回覆之後。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 來列印目前的預設/選用分割以及回歸參考。

輸出成品：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含每個回覆的 RTT (驅動程式發送 → 觀察到的 SUT 回覆)，從 canary 開始。
- `telegram-qa-observed-messages.json` - 內文已編輯，除非使用 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

### Discord QA

```bash
pnpm openclaw qa discord
```

以一個真實的私有 Discord 公會頻道為目標，其中包含兩個 Bot：一個由測試套件控制的驅動程式 Bot，以及一個由子 OpenClaw 閘道透過內建的 Discord 外掛程式啟動的 SUT Bot。驗證頻道提及處理、SUT Bot 已向 Discord 註冊原生 `/help` 指令，以及選用的 Mantis 證據場景。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必須符合 Discord 傳回的 SUT Bot 使用者 ID (否則該通道會快速失敗)。

選用項目：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 會在觀察到的訊息成品中保留訊息內文。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 選擇 `discord-voice-autojoin` 的語音/舞台頻道；若無此設定，該場景會選擇 SUT Bot 可見的第一個語音/舞台頻道。

場景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 選用的語音情境。單獨執行，啟用 `channels.discord.voice.autoJoin`，並驗證 SUT 機器人目前的 Discord 語音狀態是否為目標語音/舞台頻道。Convex Discord 憑證可能包含選用的 `voiceChannelId`；否則執行器會發現伺服器中第一個可見的語音/舞台頻道。
- `discord-status-reactions-tool-only` - 選用的 Mantis 情境。單獨執行，因為它會將 SUT 切換為僅使用工具的伺服器始終在線回覆，並帶有 `messages.statusReactions.enabled=true`，然後擷取 REST 反應時間軸以及 HTML/PNG 視覺產出物。Mantis 前/後報告也會將情境提供的 MP4 產出物保留為 `baseline.mp4` 和 `candidate.mp4`。

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
- `discord-qa-observed-messages.json` - 內文已編輯，除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- 當狀態反應情境執行時的 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

目標為一個真實的私有 Slack 頻道，包含兩個不同的機器人：一個由控制線程駕馭的驅動程式機器人，以及一個由子 OpenClaw 透過隨附的 Slack 外掛程式啟動的 SUT 機器人。

當 `--credential-source env` 時的必要環境變數：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

選用：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 會在觀察訊息產出物中保留訊息內文。

情境 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`)：

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
- `slack-qa-observed-messages.json` - 內文已編輯，除非 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。

#### 設定 Slack 工作區

此通道需要在同一個工作區中使用兩個不同的 Slack 應用程式，以及一個兩個機器人皆為成員的頻道：

- `channelId` - 兩個機器人皆已被邀請加入的頻道的 `Cxxxxxxxxxx` ID。請使用專用頻道；此通道會在每次執行時發布訊息。
- `driverBotToken` - **Driver** 應用程式的機器人權杖 (`xoxb-...`)。
- `sutBotToken` - **SUT** 應用程式的機器人權杖 (`xoxb-...`)，它必須是與驅動程式不同的 Slack 應用程式，以便其機器人使用者 ID 是唯一的。
- `sutAppToken` - 具有 `connections:write` 的 SUT 應用程式的應用程式層級權杖 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 應用程式可以接收事件。

建議使用專用於 QA 的 Slack 工作區，而非重複使用生產環境工作區。

下方的 SUT manifest 有意將隨附的 Slack 外掛程式的生產環境安裝 (`extensions/slack/src/setup-shared.ts:10`) 縮小至即時 Slack QA 測試套件所涵蓋的權限和事件。關於使用者所見的生產頻道設定，請參閱 [Slack channel quick setup](/zh-Hant/channels/slack#quick-setup)；QA Driver/SUT 配對是有意分開的，因為此通道需要在一個工作區中使用兩個不同的機器人使用者 ID。

**1. 建立 Driver 應用程式**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 選擇 QA 工作區，貼上以下 manifest，然後 _Install to Workspace_：

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

複製 _Bot User OAuth Token_ (`xoxb-...`) - 該權杖即為 `driverBotToken`。驅動程式僅需發布訊息並表明身分；不需要事件，也不需要 Socket Mode。

**2. 建立 SUT 應用程式**

在同一個工作區中重複 _Create New App → From a manifest_。此 QA 應用程式有意使用隨附 Slack 外掛程式的生產環境 manifest (`extensions/slack/src/setup-shared.ts:10`) 的縮減版本：省略了反應範圍和事件，因為即時 Slack QA 測試套件尚未涵蓋反應處理。

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

- _Install to Workspace_ → 複製 _Bot User OAuth Token_ → 該權杖即為 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 新增範圍 `connections:write` → 儲存 → 複製 `xapp-...` 值 → 該值即成為 `sutAppToken`。

透過對每個 token 呼叫 `auth.test`，驗證這兩個 bot 具有不同的使用者 ID。執行時會依據使用者 ID 區分驅動程式 (driver) 與被測系統 (SUT)；若雙方重複使用同一個應用程式，將會立即導及提及篩選 (mention-gating) 失敗。

**3. 建立頻道**

在 QA 工作區中，建立一個頻道 (例如 `#openclaw-qa`) 並在頻道內邀請這兩個 bot：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

從 _頻道資訊 → 關於 → 頻道 ID_ 複製 `Cxxxxxxxxxx` id — 該 ID 即成為 `channelId`。公開頻道即可運作；如果您使用私密頻道，由於兩個應用程式已經擁有 `groups:history`，因此測試框架的歷史紀錄讀取仍會成功。

**4. 註冊認證資訊**

有兩種選項。若為單機除錯，可使用環境變數 (設定四個 `OPENCLAW_QA_SLACK_*` 變數並傳遞 `--credential-source env`)，或是將資料植入共用的 Convex 集區，以便 CI 與其他維護者可以租用這些資源。

若是使用 Convex 集區，請將這四個欄位寫入 JSON 檔案：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 shell 中匯出 `OPENCLAW_QA_CONVEX_SITE_URL` 與 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 後，進行註冊與驗證：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

預期會有 `count: 1`、`status: "active"`，且沒有 `lease` 欄位。

**5. 進行端對端驗證**

在本地執行該 lane，以確認這兩個 bot 可以透過 broker 互相對話：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

順利完成的執行 (green run) 會在 30 秒內完成，且 `slack-qa-report.md` 會顯示 `slack-canary` 與 `slack-mention-gating` 的狀態皆為 `pass`。如果 lane 停滯約 90 秒並以 `Convex credential pool exhausted for kind "slack"` 結束，表示集區是空的，或者每一列都已被租用 — `qa credentials list --kind slack --status all --json` 會告訴您是哪種情況。

### Convex 認證集區

Telegram、Discord、Slack 和 WhatsApp 通道可以從共享的 Convex 集區租用憑證，而不是讀取上述環境變數。傳遞 `--credential-source convex`（或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨佔租用，在執行期間發送心跳，並在關機時釋放它。集區種類為 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

Broker 在 `admin/add` 上驗證的 Payload 形狀：

- Telegram (`kind: "telegram"`)：`{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必須是數字聊天 ID 字串。
- Discord (`kind: "discord"`)：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`)：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 電話號碼必須是不同的 E.164 字串。

Slack 通道也可以使用該集區。Slack payload 形狀檢查目前位於 Slack QA 執行器中而非 Broker 中；使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，並搭配類似 `Cxxxxxxxxxx` 的 Slack 通道 ID。關於應用程式和範圍佈建，請參閱[設定 Slack 工作區](#setting-up-the-slack-workspace)。

操作環境變數和 Convex broker 端點合約位於[測試 → 透過 Convex 共享 Telegram 憑證](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1)（該章節名稱早於多通道集區；租用語義在各種類型之間共享）。

## Repo-backed 種子

種子資產位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些有意放在 git 中，以便人類和代理程式都能看到 QA 計畫。

`qa-lab` 應保持為通用 markdown 執行器。每個情境 markdown 檔案是單次測試執行的真實來源，並應定義：

- 情境元資料
- 選用的類別、能力、通道和風險元資料
- 文件和程式碼參照
- 選用的外掛程式需求
- 選用的 gateway 設定修補
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重用執行時層級被允許保持通用
和橫切性。例如，markdown 情境可以結合傳輸端
輔助程式與瀏覽器端輔助程式，透過 Gateway `browser.request` 接縫
驅動嵌入式控制 UI，而無需新增特例執行器。

情境檔案應依產品功能而非原始碼樹資料夾分組。當檔案移動時，請保持情境 ID 穩定；使用 `docsRefs` 和 `codeRefs`
以供實作追蹤。

基準清單應保持足夠寬廣以涵蓋：

- DM 和頻道聊天
- 執行緒行為
- 訊息動作生命週期
- cron 回呼
- 記憶體回溯
- 模型切換
- 子代理移交
- repo-reading 和 docs-reading
- 一個小型建置任務，例如 Lobster Invaders

## Provider 模擬通道

`qa suite` 有兩個本地 Provider 模擬通道：

- `mock-openai` 是具備情境感知的 OpenClaw 模擬器。它仍然是 repo-backed QA 和
  parity gates 的預設決定性模擬通道。
- `aimock` 啟動一個由 AIMock 支援的 Provider 伺服器，用於實驗性協定、
  fixture、錄製/重放和混亂測試覆蓋率。它是附加性的，並且不會
  取代 `mock-openai` 情境分發器。

Provider 通道實作位於 `extensions/qa-lab/src/providers/` 之下。
每個 Provider 擁有其預設值、本地伺服器啟動、gateway 模型設定、
auth-profile staging 需求，以及即時/模擬功能標誌。共用的套件和
gateway 程式碼應透過 provider registry 路由，而不是根據
provider 名稱進行分支。

## 傳輸轉接器

`qa-lab` 擁有用於 markdown QA 情境的通用傳輸接縫。`qa-channel` 是該接縫上的第一個轉接器，但設計目標更為廣泛：未來的真實或合成頻道應插入同一個套件執行器，而不是新增傳輸專用的 QA 執行器。

在架構層級上，劃分如下：

- `qa-lab` 負責通用情境執行、Worker 並行、寫入產出物和報告。
- 傳輸適配器擁有網關配置、就緒狀態、入站和出站觀察、傳輸操作以及標準化傳輸狀態。
- `qa/scenarios/` 下的 Markdown 場景檔案定義了測試運行；`qa-lab` 提供了執行它們的可重用運行時介面。

### 新增頻道

向 Markdown QA 系統新增頻道僅需要滿足兩個條件：

1. 該頻道的傳輸適配器。
2. 一個用於測試頻道合約的場景包。

當共享的 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 命令根目錄。

`qa-lab` 擁有共享的主機機制：

- `openclaw qa` 命令根目錄
- 套件啟動和拆除
- 工作併發
- 產生寫入
- 報告生成
- 場景執行
- 舊版 `qa-channel` 場景的相容性別名

Runner 外掛擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置網關
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開文字記錄和標準化傳輸狀態
- 如何執行傳輸支援的操作
- 如何處理傳輸特定的重置或清理

新增頻道的最低採用門檻：

1. 保持 `qa-lab` 作為共享 `qa` 根目錄的擁有者。
2. 在共享的 `qa-lab` 主機接縫上實作傳輸 runner。
3. 將傳輸特定的機制保留在 runner 外掛或頻道 harness 內部。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根命令。Runner 外掛應該在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 導出匹配的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量；延遲 CLI 和 runner 執行應保留在單獨的進入點之後。
5. 在主題 `qa/scenarios/` 目錄下撰寫或調整 Markdown 場景。
6. 為新場景使用通用場景輔助程式。
7. 除非程式庫正在進行有意的遷移，否則請保持現有的相容性別名正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為依賴於單一通道傳輸，請將其保留在該執行器外掛程式或外掛程式套件中。
- 如果某個情境需要多個通道都能使用的新功能，請新增一個通用輔助函式，而不是在 `suite.ts` 中新增特定於通道的分支。
- 如果某個行為僅對一種傳輸有意義，請保持該情境特定於該傳輸，並在情境合約中明確說明。

### 情境輔助函式名稱

新情境的首選通用輔助函式：

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

相容性別名仍可用於現有情境 —— `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` —— 但新情境的撰寫應使用通用名稱。這些別名的存在是為了避免「標誌日」式遷移，而非作為未來的模型。

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協議報告。
該報告應回答：

- 什麼有效
- 什麼失敗
- 什麼仍然受阻
- 值得新增哪些後續情境

若要取得可用情境的清單 —— 在評估後續工作範圍或接線新傳輸時很有用 —— 請執行 `pnpm openclaw qa coverage`（新增 `--json` 以取得機器可讀的輸出）。

若要進行角色和風格檢查，請在多個即時模型參考上執行相同的情境
並撰寫評判後的 Markdown 報告：

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

該指令會執行本機 QA gateway 子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，然後執行一般使用者輪次，例如聊天、工作區說明和小型檔案任務。候選模型不應被告知正在接受評估。該指令會保留每份完整的逐字稿，記錄基本的執行統計數據，然後在支援的情況下，詢問處於快速模式的評審模型，並使用 `xhigh` 推理來根據自然度、氛圍和幽默感對執行結果進行排名。比較提供商時請使用 `--blind-judge-models`：評審提示仍然會取得每份逐字稿和執行狀態，但候選參考會被替換為中立標籤，例如 `candidate-01`；報告會在解析後將排名對應回真實參考。候選執行預設使用 `high` 思考，GPT-5.5 使用 `medium`，而支援此功能的較舊 OpenAI 評估參考則使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 內聯覆寫特定候選。`--thinking <level>` 仍然會設定全域後備，而較舊的 `--model-thinking <provider/model=level>` 形式則為了相容性而保留。OpenAI 候選參考預設為快速模式，因此在提供商支援的情況下會使用優先處理。當單一候選或評審需要覆寫時，請內聯新增 `,fast`、`,no-fast` 或 `,fast=false`。僅當您希望強制每個候選模型都開啟快速模式時，才傳遞 `--fast`。候選和評審的持續時間會記錄在報告中以進行基準分析，但評審提示會明確指出不要根據速度排名。候選和評審模型執行預設的並發性皆為 16。當提供商限制或本機 gateway 壓力導致執行過於雜亂時，請降低 `--concurrency` 或 `--judge-concurrency`。當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。當未傳遞 `--judge-model` 時，評審預設為 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [QA 頻道](/zh-Hant/channels/qa-channel)
- [測試](/zh-Hant/help/testing)
- [儀表板](/zh-Hant/web/dashboard)
