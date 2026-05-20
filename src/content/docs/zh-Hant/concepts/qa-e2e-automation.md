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
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並撰寫 agentic parity 報告，或使用 `--runtime-axis --token-efficiency` 根據單一 runtime-pair 摘要撰寫 Codex-vs-Pi runtime parity 與 token-efficiency 報告。                                          |
| `qa character-eval`                                 | 跨多個即時模型執行角色 QA 場景並產出評斷報告。請參閱 [報告](#reporting)。                                                                                                                                                                 |
| `qa manual`                                         | 針對選定的供應商/模型通道執行一次性提示。                                                                                                                                                                                                 |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 總線 (別名：`pnpm qa:lab:ui`)。                                                                                                                                                                               |
| `qa docker-build-image`                             | 建置預先製作的 QA Docker 映像檔。                                                                                                                                                                                                         |
| `qa docker-scaffold`                                | 為 QA 儀表板 + 閘道通道撰寫 docker-compose 腳手架。                                                                                                                                                                                       |
| `qa up`                                             | 建置 QA 網站、啟動 Docker 支援的堆疊、列印 URL (別名：`pnpm qa:lab:up`；`:fast` 變體會新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`)。                                                                                       |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                                                                                                              |
| `qa mock-openai`                                    | 僅啟動具備場景感知能力的 `mock-openai` 提供者伺服器。                                                                                                                                                                                     |
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

`qa:lab:up:fast` 將 Docker 服務保持在預先建構的映像檔上，並將
`extensions/qa-lab/web/dist` 掛載至 `qa-lab` 容器中。 `qa:lab:watch`
會在變更時重新建構該套件，且當 QA Lab
資產雜湊變更時，瀏覽器會自動重新載入。

若要進行本機 OpenTelemetry 追蹤冒煙測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本會啟動本機 OTLP/HTTP 追蹤接收器，執行啟用
`diagnostics-otel` 外掛程式的 `otel-trace-smoke` QA 場景，接著
解碼匯出的 protobuf 跨度並斷言發行關鍵結構：
`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、
`openclaw.context.assembled` 和 `openclaw.message.delivery` 必須存在；
模型呼叫在成功的回合中不得匯出 `StreamAbandoned`；原始診斷 ID 和
`openclaw.content.*` 屬性必須排除在追蹤之外。它會在
QA 套件成品旁寫入 `otel-smoke-summary.json`。

可觀測性 QA 僅限於原始碼檢出。npm tarball 意圖省略
QA Lab，因此套件 Docker 發行通道不會執行 `qa` 指令。當變更診斷
檢測時，請從已建構的原始碼檢出中使用
`pnpm qa:otel:smoke`。

若要執行傳輸真實的 Matrix 冒煙管道，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 參考資料、profile/scenario 目錄、環境變數和佈局位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。概況如下：它在 Docker 中佈建一個一次性 Tuwunel homeserver，註冊臨時 driver/SUT/observer 使用者，在限定於該傳輸的子 QA gateway 內執行真實的 Matrix 外掛（無 `qa-channel`），然後在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下撰寫 Markdown 報告、JSON 摘要、observed-events 佈局和合併輸出日誌。

這些情境涵蓋了單元測試無法端到端驗證的傳輸行為：提及閘道、allow-bot 政策、允許清單、頂層和執行緒回覆、DM 路由、反應處理、輸入編輯抑制、重新啟動重放去重、homeserver 中斷恢復、核准元資料傳遞、媒體處理，以及 Matrix E2EE 啟動/恢復/驗證流程。E2EE CLI 設定檔也會在檢查 gateway 回覆之前，透過同一個用完即丟的 homeserver 驅動 `openclaw matrix encryption setup` 和驗證指令。

Discord 也有專屬於 Mantis 的選用情境，用於 bug 再現。使用 `--scenario discord-status-reactions-tool-only` 來取得明確的狀態反應時間軸，或使用 `--scenario discord-thread-reply-filepath-attachment` 來建立真實的 Discord 執行緒並驗證 `message.thread-reply` 是否保留了 `filePath` 附件。這些情境預設不包含在實時 Discord 通道中，因為它們是再現前後的探測，而非廣泛的冒煙測試。當 QA 環境中設定 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 時，執行緒附件 Mantis 工作流程也可以新增已登入的 Discord Web 見證影片。該檢視器設定檔僅用於視覺捕捉；通過/失敗決策仍來自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的指令介面。排程和預設的手動執行會使用實時 frontier 憑證、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 來執行快速 Matrix 設定檔。手動 `matrix_profile=all` 會分散到五個設定檔分片，以便在執行完整目錄時能夠並行執行，同時為每個分片保留一個產出目錄。

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

該指令租用一台 Crabbox 桌面/瀏覽器機器，在 VM 內執行 Slack 即時通道，在 VNC 瀏覽器中開啟 Slack Web，擷取桌面，並在視訊擷取可用時將 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 複製回 Mantis 成品目錄。Crabbox 桌面/瀏覽器租用會提前提供擷取工具和瀏覽器/原生建置輔助套件，因此情境應僅在較舊的租用上安裝備援方案。Mantis 會在 `mantis-slack-desktop-smoke-report.md` 中回報總計和各階段的時序，因此緩慢的執行可以顯示時間是否花在租用預熱、憑證取得、遠端設定或成品複製上。透過 VNC 手動登入 Slack Web 後重複使用 `--lease-id <cbx_...>`；重複使用的租用還能保持 Crabbox 的 pnpm store cache 溫熱。預設的 `--hydrate-mode source` 會從原始碼检出進行驗證，並在 VM 內執行 install/build。僅當重複使用的遠端工作區已經具有 `node_modules` 和已建置的 `dist/` 時才使用 `--hydrate-mode prehydrated`；該模式會跳過昂貴的 install/build 步驟，並在工作區未準備好時以封閉式失敗處理。使用 `--gateway-setup` 時，Mantis 會在 VM 內的連接埠 `38973` 上持續執行 OpenClaw Slack 閘道；若不使用，該指令會執行正常的 bot 對 bot Slack QA 通道，並在擷取成品後結束。

操作員檢查清單、GitHub workflow dispatch 指令、證據評註契約、hydrate-mode 決策表、計時解讀以及失敗處理步驟皆位於 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook) 中。

若要執行 agent/CV 風格的桌面任務，請執行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 租用或重用 Crabbox 桌面/瀏覽器機器，啟動
`crabbox record --while`，透過巢狀 `visual-driver`
驅動可見的瀏覽器，擷取 `visual-task.png`，當選取
`--vision-mode image-describe` 時針對擷圖執行 `openclaw infer image describe`，
並寫入 `visual-task.mp4`、`mantis-visual-task-summary.json`、
`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
當設定 `--expect-text` 時，視覺提示會要求結構化的 JSON
裁決，且僅在模型回報肯定的可見證據時才通過；如果負面回應僅引用
目標文字，則該斷言失敗。
請使用 `--vision-mode metadata` 進行無模型冒煙測試，在不呼叫圖像理解
提供者的情況下驗證桌面、瀏覽器、擷圖和影片的運作。
錄製是 `visual-task` 的必要產出；如果 Crabbox 未記錄
任何非空的 `visual-task.mp4`，即使視覺驅動程式
通過，任務仍會失敗。失敗時，除非任務已通過且
未設定 `--keep-lease`，否則 Mantis 會保留 VNC 的租用。

使用共用即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

此診斷程式會檢查 Convex broker 環境，驗證端點設定，並在維護者金鑰存在時驗證 admin/list 的連線性。它僅回報金鑰的已設定/遺失狀態。

## 即時傳輸覆蓋範圍

即時傳輸通道共享同一個合約，而不是各自發明自己的場景清單形狀。`qa-channel` 是廣泛的合成產品行為套件，並非即時傳輸覆蓋率矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | Bot 對 Bot | 許可清單區塊 | 頂層回覆 | 重新啟動恢復 | 串後跟進 | 串隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | ------------ | -------- | ------ | -------- | -------- | ------------ |
| 矩陣     | x      | x        | x          | x            | x        | x            | x        | x      | x        |          |              |
| Telegram | x      | x        | x          |              |          |              |          |        |          | x        |              |
| Discord  | x      | x        | x          |              |          |              |          |        |          |          | x            |
| Slack    | x      | x        | x          | x            | x        | x            | x        | x      |          |          |              |

這將 `qa-channel` 保留為廣泛的產品行為套件，而 Matrix、
Telegram 和未來的即時傳輸則共享一個明確的傳輸合約檢查清單。

若要在不將 Docker 引入 QA 路徑的情況下使用一次性 Linux VM 通道，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體、安裝相依元件、在客體內建置 OpenClaw，然後執行 `qa suite`，接著將一般的 QA 報告與摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它會重複使用與主機上 `qa suite` 相同的情境選取行為。
預設情況下，主機與 Multipass 套件執行會使用獨立的 Gateway Worker 並行執行多個選取的情境。`qa-channel` 預設並行數為 4，並以選取的情境數量為上限。使用 `--concurrency <count>` 來調整 Worker 數量，或是使用 `--concurrency 1` 進行序列執行。
使用 `--pack personal-agent` 來執行個人助理基準測試套件。套件選取器會透過重複的 `--scenario` 標誌進行累加：明確指定的情境會先執行，接著套件情境會依照套件順序執行並移除重複項目。
當任何情境失敗時，該指令會傳回非零值。當您想要取得產出檔案但不希望因失敗而傳回非零值時，請使用 `--allow-failures`。
即時執行會轉發對客體而言實用且受支援的 QA 驗證輸入：基於環境變數的 Provider 金鑰、QA 即時 Provider 設定路徑，以及當存在的 `CODEX_HOME`。請將 `--output-dir` 保留在 repo 根目錄下，以便客體可以透過掛載的工作區寫回資料。

## Telegram、Discord 和 Slack QA 參考資料

Matrix 因為其場景數量和支援 Docker 的 Home Server 佈建而擁有[專屬頁面](/zh-Hant/concepts/qa-matrix)。Telegram、Discord 和 Slack 規模較小——每個只有少數場景，沒有設定檔系統，對抗既有的真實頻道——因此它們的參考資訊列於此處。

### 共用的 CLI 旗標

這些通道透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊並接受相同的標誌：

| 旗標                                  | 預設值                                                          | 描述                                                                              |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 僅執行此情境。可重複使用。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 寫入報告/摘要/觀察訊息與輸出日誌的位置。相對路徑會相對於 `--repo-root` 進行解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 從中立的 cwd 呼叫時的 Repository 根目錄。                                         |
| `--sut-account <id>`                  | `sut`                                                           | QA gateway config 中的臨時帳戶 ID。                                               |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（舊版 `live-openai` 仍然有效）。                 |
| `--model <ref>` / `--alt-model <ref>` | 供應商預設值                                                    | 主要/替代模型參照。                                                               |
| `--fast`                              | 關                                                              | 在支援的情況下使用供應商快速模式。                                                |
| `--credential-source <env\|convex>`   | `env`                                                           | 請參閱 [Convex credential pool](#convex-credential-pool)。                        |
| `--credential-role <maintainer\|ci>`  | 在 CI 中使用 `ci`，否則使用 `maintainer`                        | 執行 `--credential-source convex` 時使用的角色。                                  |

每個通道在發生失敗的情況時皆會以非零值結束。`--allow-failures` 會寫入構件而不會設定失敗的結束代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以兩個不同的機器人（driver + SUT）對向一個真實的私人 Telegram 群組。SUT 機器人必須擁有 Telegram 使用者名稱；當兩個機器人在 `@BotFather` 中啟用 **Bot-to-Bot 通訊模式** 時，機器人對機器人的觀察效果最佳。

執行 `--credential-source env` 時的必填環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 數值聊天 ID（字串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可選：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會將訊息內文保留在已觀察訊息構件中（預設為編輯）。

場景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`）：

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

隱式預設集合始終涵蓋 canary、提及閘控、原生指令回覆、指令定址以及 Bot 到 Bot 的群組回覆。`mock-openai` 預設值也包含決定性回覆鏈和最終訊息串流檢查。`telegram-current-session-status-tool` 仍為選用 (opt-in)，因為僅在緊接著 canary 之後的執行緒中才穩定，而非在任意原生指令回覆之後。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 來列印目前的預設/選用分割及其回歸參考。

輸出成品：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含從 canary 開始的每次回覆 RTT (驅動程式發送 → 觀察到的 SUT 回覆)。
- `telegram-qa-observed-messages.json` - 除非使用 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否則會編輯訊息內容。

套件 RTT 比較使用相同的 Telegram 憑證合約，同時將其 RTT 樣本控制保留在 RTT 測試線路上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

當設定 `--credential-source convex` 時，RTT Docker 包裝器會租用 `kind: "telegram"` 憑證，將租用的群組/驅動程式/SUT bot 環境變數匯出到已安裝套件的執行中，對租約發送心跳，並在關閉時釋放它。`--samples` 和 `--sample-timeout-ms` 仍然饋送 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在環境變數支援和 Convex 支援的 RTT 執行之間保持可比較性。

### Discord QA

```bash
pnpm openclaw qa discord
```

針對一個真實的私人 Discord 公會頻道，該頻道有兩個 bot：一個由測試線路控制的驅動程式 bot，以及一個由子 OpenClaw 閘道透過捆綁的 Discord 外掛程式啟動的 SUT bot。驗證頻道提及處理、SUT bot 是否已向 Discord 註冊原生 `/help` 指令，以及選用 Mantis 證據情境。

當使用 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必須符合 Discord 傳回的 SUT bot 使用者 ID (否則該通道會快速失敗)。

選用：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 會將訊息內容保留在觀察到的訊息產出中。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 選擇 `discord-voice-autojoin` 的語音/舞台頻道；如果沒有它，場景會選擇 SUT 機器人第一個可見的語音/舞台頻道。

場景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 選用的語音場景。獨立運行，啟用 `channels.discord.voice.autoJoin`，並驗證 SUT 機器人目前的 Discord 語音狀態是否為目標語音/舞台頻道。Convex Discord 憑證可能包含選用的 `voiceChannelId`；否則執行器會在伺服器中探索第一個可見的語音/舞台頻道。
- `discord-status-reactions-tool-only` - 選用的 Mantis 場景。獨立運行，因為它會將 SUT 切換為僅限工具的常駐伺服器回覆，並使用 `messages.statusReactions.enabled=true`，然後擷取 REST 反應時間軸以及 HTML/PNG 視覺構件。Mantis 前/後報告也會將場景提供的 MP4 構件保留為 `baseline.mp4` 和 `candidate.mp4`。

明確執行 Discord 語音自動加入場景：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

明確執行 Mantis 狀態反應場景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast
```

輸出構件：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 內文已編輯，除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- 當狀態反應場景運行時，會有 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

以一個真實的私人 Slack 頻道為目標，其中包含兩個不同的機器人：一個是由測試套件控制的驅動機器人，另一個是由子 OpenClaw 透過內建的 Slack 外掛程式啟動的 SUT 機器人。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

選用：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 會在觀察到的訊息構件中保留訊息內文。

場景 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

輸出構件：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 內容已塗黑，除非 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。

#### 設定 Slack 工作區

此通道需要在一個工作區中使用兩個不同的 Slack 應用程式，以及一個兩個機器人皆為成員的頻道：

- `channelId` - 兩個機器人都已被邀請加入的頻道之 `Cxxxxxxxxxx` ID。請使用專用頻道；此通道會在每次執行時發布貼文。
- `driverBotToken` - **Driver** 應用程式的機器人權杖 (`xoxb-...`)。
- `sutBotToken` - **SUT** 應用程式的機器人權杖 (`xoxb-...`)，它必須是與驅動程式不同的 Slack 應用程式，以便其機器人使用者 ID 是唯一的。
- `sutAppToken` - 具有 `connections:write` 的 SUT 應用程式之應用程式層級權杖 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 應用程式可以接收事件。

建議使用專用於 QA 的 Slack 工作區，而不是重複使用生產環境工作區。

下方的 SUT manifest 將內建的 Slack 外掛的正式安裝（`extensions/slack/src/setup-shared.ts:10`）特意縮減至即時 Slack QA 套件所涵蓋的權限與事件。關於使用者所見的正式通道設定，請參閱 [Slack channel quick setup](/zh-Hant/channels/slack#quick-setup)；QA Driver/SUT 對刻意分開，因為此通道需要在一個工作區中使用兩個不同的 bot 使用者 ID。

**1. 建立 Driver 應用程式**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 選擇 QA 工作區，貼上下方 manifest，然後 _Install to Workspace_：

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

複製 _Bot User OAuth Token_ (`xoxb-...`) - 這會變成 `driverBotToken`。驅動程式只需要發布訊息並識別自己；無事件，無 Socket Mode。

**2. 建立 SUT 應用程式**

在同一個工作區中重複 _Create New App → From a manifest_。此 QA 應用程式有意使用隨附 Slack 外掛程式之生產環境清單 (`extensions/slack/src/setup-shared.ts:10`) 的較窄版本：已省略回應範圍和事件，因為即時 Slack QA 測試套件尚未涵蓋回應處理。

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

- _安裝至工作區_ → 複製 _Bot User OAuth Token_ → 該值即為 `sutBotToken`。
- _基本資訊 → 應用程式層級權杖 → 產生權杖與範圍_ → 新增範圍 `connections:write` → 儲存 → 複製 `xapp-...` 的值 → 該值即為 `sutAppToken`。

透過對每個權杖呼叫 `auth.test`，驗證這兩個機器人擁有不同的使用者 ID。執行時期會根據使用者 ID 來區分驅動程式與 SUT；若雙方重複使用同一個應用程式，將會立即導致提及 gating (mention-gating) 失敗。

**3. 建立頻道**

在 QA 工作區中，建立一個頻道 (例如 `#openclaw-qa`)，並在頻道內邀請這兩個機器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

從 _頻道資訊 → 關於 → 頻道 ID_ 複製 `Cxxxxxxxxxx` ID —— 該值即為 `channelId`。公開頻道即可運作；如果您使用私人頻道，由於兩個應用程式都已經擁有 `groups:history`，因此測試架構的歷程紀錄讀取仍會成功。

**4. 註冊憑證**

有兩種選項。使用環境變數進行單機除錯 (設定四個 `OPENCLAW_QA_SLACK_*` 變數並傳遞 `--credential-source env`)，或是將共用 Convex 集區 (pool) 進行初始化 (seed)，以便 CI 和其他維護者可以租用這些憑證。

若要使用 Convex 集區，請將這四個欄位寫入 JSON 檔案：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 Shell 中匯出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 後，進行註冊與驗證：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

預期會看到 `count: 1`、`status: "active"`，以及沒有 `lease` 欄位。

**5. 驗證端對端**

在本地執行該跑道 (lane)，以確認這兩個機器人能透過中介程式 (broker) 進行通訊：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

成功的執行會在 30 秒內完成，且 `slack-qa-report.md` 會顯示 `slack-canary` 和 `slack-mention-gating` 的狀態皆為 `pass`。如果跑道停滯約 90 秒並以 `Convex credential pool exhausted for kind "slack"` 結束，這表示集區是空的，或者每一列都已被租用 —— `qa credentials list --kind slack --status all --json` 會告訴您是哪種情況。

### Convex 憑證集區

Telegram、Discord、Slack 和 WhatsApp 通道可以從共享的 Convex 池租用憑證，而不是讀取上述的環境變數。傳遞 `--credential-source convex`（或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨佔租約，在執行期間發送心跳訊號，並在關閉時釋放它。池的類型為 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

Broker 在 `admin/add` 上驗證的 Payload 形狀：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必須是數字聊天 ID 字串。
- Telegram 真實使用者（`kind: "telegram-user"`）：`{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 僅供 Mantis Telegram Desktop proof 使用。Generic QA Lab 通道不得取得此類型。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 電話號碼必須是不同的 E.164 字串。

Mantis Telegram Desktop proof 工作流程會為 TDLib CLI driver 和 Telegram Desktop witness 持有一個獨佔的 Convex `telegram-user` 租用，然後在發布 proof 後將其釋放。

當 PR 需要確定性的視覺比對時，Mantis 可以在 Telegram formatter 或 delivery 層變更時，對 `main` 和 PR head 使用相同的模擬模型回覆。擷取預設值是針對 PR 評論調整：標準 Crabbox 類別、24fps 桌面錄製、24fps 動態 GIF 和 1920px 預覽寬度。Before/after 評論應發布一個乾淨的套件，其中僅包含預期的 GIF。

Slack 通道也可以使用此集區。Slack payload 形狀檢查目前位於 Slack QA 執行器中而非 broker；請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，並提供 Slack channel id，例如 `Cxxxxxxxxxx`。請參閱 [Setting up the Slack workspace](#setting-up-the-slack-workspace) 以進行應用程式和範圍設置。

操作環境變數和 Convex broker 端點合約位於 [Testing → Shared Telegram credentials via Convex](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1)（該章節名稱早於多通道集區；租用語義在各類型間共享）。

## Repo-backed seeds

Seed 資源位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些檔案故意放在 git 中，以便 QA 計畫對人類和代理程式都可見。

`qa-lab` 應保持為通用 markdown 執行器。每個情境 markdown 檔案是單次測試執行的來源事實，並應定義：

- 情境元資料
- 選用的類別、能力、通道 和風險 元資料
- 文件和程式碼參照
- 選用的外掛程式需求
- 選用的 gateway config 設定補丁
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重用執行時層被允許保持通用和跨領域。例如，markdown 情境可以結合傳輸端輔助程式與瀏覽器端輔助程式，後者透過 Gateway `browser.request` 縫合來驅動嵌入式控制 UI，而無需新增特例執行器。

情境檔案應依產品能力而非來源樹資料夾分組。當檔案移動時，請保持情境 ID 穩定；使用 `docsRefs` 和 `codeRefs` 以進行實作可追溯性。

基線清單應保持足夠廣泛以涵蓋：

- DM 和通道聊天
- thread 行為
- 訊息動作生命週期
- cron 回呼
- 記憶體回憶
- 模型切換
- 子代理程式移交
- repo 閱讀和 docs 閱讀
- 一個小型建置任務，例如 Lobster Invaders

## Provider mock lanes

`qa suite` 有兩個本機 provider mock lanes：

- `mock-openai` 是具情境感知能力的 OpenClaw mock。它仍是 repo-backed QA 和 parity gates 的預設決定性 mock lane。
- `aimock` 啟動一個由 AIMock 支援的提供者伺服器，用於實驗性協定、fixture、記錄/重放以及混亂測試覆蓋。它是累加的，並不取代 `mock-openai` 場景調度器。

提供者通道的實作位於 `extensions/qa-lab/src/providers/` 之下。每個提供者擁有其預設值、本機伺服器啟動、閘道模型設定、認證設定檔佈建需求，以及即時/模擬功能標誌。共享的套件和閘道程式碼應透過提供者註冊表路由，而不是根據提供者名稱進行分支。

## 傳輸適配器

`qa-lab` 擁有 markdown QA 場景的通用傳輸縫合。`qa-channel` 是該縫合上的第一個適配器，但設計目標更廣泛：未來的真實或合成通道應插入到同一個套件執行器中，而不是新增傳輸特定的 QA 執行器。

在架構層級，劃分如下：

- `qa-lab` 擁有通用場景執行、工作並發、產生品寫入和報告。
- 傳輸適配器擁有閘道設定、就緒狀態、入站和出站觀測、傳輸動作以及正規化的傳輸狀態。
- `qa/scenarios/` 下的 Markdown 場景檔案定義測試執行；`qa-lab` 提供執行它們的可重複使用執行時介面。

### 新增通道

將通道新增到 markdown QA 系統只需要兩件事：

1. 該通道的傳輸適配器。
2. 一個用於測試通道合約的場景套件。

當共享的 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 命令根。

`qa-lab` 擁有共享的主機機制：

- `openclaw qa` 命令根
- 套件啟動和拆除
- 工作並發
- 產生品寫入
- 報告生成
- 場景執行
- 較舊 `qa-channel` 場景的相容性別名

執行器外掛擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根之下
- 如何為該傳輸設定閘道
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀測出站訊息
- 如何公開文字紀錄和標準化的傳輸狀態
- 如何執行由傳輸支援的動作
- 如何處理特定於傳輸的重設或清理

採用新頻道的最低門檻：

1. 保持 `qa-lab` 作為共享 `qa` 根目錄的擁有者。
2. 在共享 `qa-lab` 主機接縫上實作傳輸執行器。
3. 將特定於傳輸的機制保留在執行器外掛或頻道套件內。
4. 將執行器掛載為 `openclaw qa <runner>`，而不是註冊競爭的根命令。執行器外掛應在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量化；延遲 CLI 和執行器執行應保留在獨立的進入點後方。
5. 在主題 `qa/scenarios/` 目錄下編寫或調整 markdown 情境。
6. 對於新情境，請使用通用情境輔助程式。
7. 除非儲存庫正在進行有意遷移，否則請保持現有的相容性別名正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於單一頻道傳輸，請將其保留在該執行器外掛或外掛套件中。
- 如果情境需要多個頻道都能使用的新功能，請新增通用輔助程式，而不是在 `suite.ts` 中新增特定於頻道的分支。
- 如果行為僅對一種傳輸有意義，請保持情境特定於傳輸，並在情境合約中明確說明。

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

相容性別名仍然可用於現有場景 - `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` - 但新場景的撰寫應使用通用名稱。別名的存在是為了避免一次性遷移，而非作為未來的模型。

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協議報告。
該報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼仍然受阻
- 有哪些後續場景值得新增

若要查看可用場景的清單 - 這在評估後續工作量或連接新傳輸時很有用 - 請執行 `pnpm openclaw qa coverage`（新增 `--json` 以取得機器可讀的輸出）。

若要進行字元和樣式檢查，請在多個即時模型參照上執行相同的場景，並撰寫一份評斷式的 Markdown 報告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-7,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-7,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

此指令會執行本機 QA 閘道子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，接著執行一般使用者回合，例如聊天、工作區協助和小型檔案任務。候選模型不應被告知其正在接受評估。此指令會保留每份完整的對話紀錄，記錄基本的執行統計數據，然後要求評判模型在支援的情況下以具有 `xhigh` 推理的快速模式，根據自然度、氛圍和幽默感對執行進行排名。比較供應商時請使用 `--blind-judge-models`：評判提示仍會取得每份對話紀錄和執行狀態，但候選參照會被中性標籤（例如 `candidate-01`）取代；報表會在解析後將排名對應回真實參照。
候選執行預設使用 `high` 思考，其中 GPT-5.5 使用 `medium`，而支援此功能的舊版 OpenAI 評估參照則使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 在行內覆寫特定候選項。`--thinking <level>` 仍會設定全域備選，而舊版 `--model-thinking <provider/model=level>` 格式則為了相容性而保留。
OpenAI 候選參照預設為快速模式，因此在供應商支援時會使用優先處理。當單一候選項或評判需要覆寫時，請在行內新增 `,fast`、`,no-fast` 或 `,fast=false`。僅當您想要強制所有候選模型啟用快速模式時，才傳遞 `--fast`。候選項和評判的持續時間會記錄在報表中以進行基準分析，但評判提示會明確指出不要根據速度進行排名。
候選和評判模型執行的預設並行數均為 16。當供應商限制或本機閘道壓力導致執行過於干擾時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-7`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和
`google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。
當未傳遞 `--judge-model` 時，評判預設為
`openai/gpt-5.5,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-7,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [個人代理程式基準測試套件](/zh-Hant/concepts/personal-agent-benchmark-pack)
- [QA 頻道](/zh-Hant/channels/qa-channel)
- [測試](/zh-Hant/help/testing)
- [儀表板](/zh-Hant/web/dashboard)
