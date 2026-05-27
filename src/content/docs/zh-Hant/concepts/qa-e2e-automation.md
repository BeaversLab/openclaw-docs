---
summary: "QA 堆疊概覽：qa-lab、qa-channel、存放庫支援的場景、即時傳輸通道、傳輸配接器和報告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概覽"
---

專有的 QA 堆疊旨在以更貼近現實、具備通道形態的方式來測試 OpenClaw，這比單一的單元測試更能模擬實際情況。

目前的組成部分：

- `extensions/qa-channel`：具有私人訊息 (DM)、頻道、執行緒、反應、編輯和刪除介面的合成訊息頻道。
- `extensions/qa-lab`：用於觀察對話紀錄、注入傳入訊息和匯出 Markdown 報告的除錯器 UI 和 QA 匯流排。
- `extensions/qa-matrix`，未來的執行器外掛：在子 QA 閘道內驅動真實頻道的即時傳輸配接器。
- `qa/`：用於啟動任務和基準 QA 場景的存放庫支援的種子資產。
- [Mantis](/zh-Hant/concepts/mantis)：針對需要真實傳輸、瀏覽器畫面擷取、VM 狀態和 PR 證據的錯誤，進行即時驗證的前後比對。

## 指令介面

每個 QA 流程都在 `pnpm openclaw qa <subcommand>` 下運作。許多流程都有 `pnpm qa:*` 腳本別名；這兩種形式都受到支援。

| 指令                                                | 用途                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 隨附的 QA 自我檢查；寫入 Markdown 報告。                                                                                                                                                                                                    |
| `qa suite`                                          | 針對 QA 閘道通道執行存放庫支援的場景。別名：`pnpm openclaw qa suite --runner multipass` 用於一次性 Linux VM。                                                                                                                               |
| `qa coverage`                                       | 列印 markdown 場景涵蓋範圍清單 (`--json` 用於機器可讀輸出)。                                                                                                                                                                                |
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並撰寫代理對等報告，或使用 `--runtime-axis --token-efficiency` 從單一執行時間組摘要中撰寫 Codex 對 Pi 的執行時間對等和 Token 效率報告。                                                                |
| `qa character-eval`                                 | 在多個即時模型上執行角色 QA 場景，並產生經過評斷的報告。請參閱 [報告](#reporting)。                                                                                                                                                         |
| `qa manual`                                         | 針對選定的供應商/模型通道執行一次性提示。                                                                                                                                                                                                   |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 匯流排 (別名：`pnpm qa:lab:ui`)。                                                                                                                                                                               |
| `qa docker-build-image`                             | 建置預先製作的 QA Docker 映像檔。                                                                                                                                                                                                           |
| `qa docker-scaffold`                                | 為 QA 儀表板 + 閘道通道撰寫 docker-compose 腳手架。                                                                                                                                                                                         |
| `qa up`                                             | 建置 QA 網站，啟動 Docker 支援的堆疊，列印 URL（別名：`pnpm qa:lab:up`；`:fast` 變體新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                          |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                                                                                                                |
| `qa mock-openai`                                    | 僅啟動具備情境感知能力的 `mock-openai` 提供者伺服器。                                                                                                                                                                                       |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共用的 Convex 憑證池。                                                                                                                                                                                                                  |
| `qa matrix`                                         | 針對一次性 Tuwunel 主伺服器的即時傳輸通道。請參閱 [Matrix QA](/zh-Hant/concepts/qa-matrix)。                                                                                                                                                     |
| `qa telegram`                                       | 針對真實私人 Telegram 群組的即時傳輸通道。                                                                                                                                                                                                  |
| `qa discord`                                        | 針對真實私人 Discord 公會頻道的即時傳輸通道。                                                                                                                                                                                               |
| `qa slack`                                          | 針對真實私人 Slack 頻道的即時傳輸通道。                                                                                                                                                                                                     |
| `qa mantis`                                         | 針對即時傳輸錯誤的前後驗證執行器，包含 Discord 狀態反應證據、Crabbox 桌面/瀏覽器冒煙測試，以及 VNC 中的 Slack 冒煙測試。請參閱 [Mantis](/zh-Hant/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast` 讓 Docker 服務保持在預先建置的映像檔上，並將
`extensions/qa-lab/web/dist` 掛載進 `qa-lab` 容器中。`qa:lab:watch`
會在變更時重建該套件，而當 QA Lab 資產雜湊變更時，瀏覽器會自動重新載入。

若要執行本機 OpenTelemetry 訊號冒煙測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本會啟動本機 OTLP/HTTP 接收器，在啟用 `diagnostics-otel` 插件的
情況下執行 `otel-trace-smoke` QA 情境，然後斷言已匯出追蹤、指標和日誌。它會解碼匯出的
protobuf 追蹤範圍並檢查發行關鍵結構：
`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、
`openclaw.context.assembled` 和 `openclaw.message.delivery` 必須存在；
模型呼叫在成功的回合中不得匯出 `StreamAbandoned`；原始診斷 ID 和
`openclaw.content.*` 屬性必須排除在追蹤之外。原始 OTLP
承載不得包含提示標記、回應標記或 QA 工作階段金鑰。它會在
QA 套件產物旁寫入 `otel-smoke-summary.json`。

若要執行受保護的 Prometheus 刮取測試，請執行：

```bash
pnpm qa:prometheus:smoke
```

該別名會在啟用 `diagnostics-prometheus` 的情況下執行 `docker-prometheus-smoke` QA 情境，驗證未經驗證的刮取會被拒絕，然後檢查經過驗證的刮取是否包含發行關鍵的指標系列，且不包含提示內容、回應內容、原始診斷識別碼、授權權杖或本機路徑。

若要連續執行這兩個可觀測性測試，請使用：

```bash
pnpm qa:observability:smoke
```

可觀測性 QA 僅限於來源檢出。由於 npm tarball 故意省略了 QA Lab，因此套件 Docker 發行管道不會執行 `qa` 指令。當變更診斷檢測時，請從已建置的來源檢出中使用 `pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或 `pnpm qa:observability:smoke`。

若要執行傳輸真實的 Matrix 測試管道，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此管道的完整 CLI 參考、設定檔/情境目錄、環境變數和產品佈局位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。簡而言之：它會在 Docker 中佈建一次性的 Tuwunel homeserver，註冊暫時的 driver/SUT/observer 使用者，在範圍限定於該傳輸的子 QA gateway 中執行真實的 Matrix 外掛程式（無 `qa-channel`），然後在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下寫入 Markdown 報告、JSON 摘要、觀察事件產品和組合輸出日誌。

這些情境涵蓋了單元測試無法端到端證明的傳輸行為：提及閘門、允許 Bot 原則、允許清單、頂層和執行緒回覆、DM 路由、反應處理、入站編輯抑制、重新執行重播去重、homeserver 中斷復原、核准元資料傳遞、媒體處理，以及 Matrix E2EE 啟動/復原/驗證流程。E2EE CLI 設定檔還會在檢查 gateway 回覆之前，透過相同的一次性 homeserver 驅動 `openclaw matrix encryption setup` 和驗證指令。

Discord 也有僅限 Mantis 的選用場景用於 Bug 重現。使用
`--scenario discord-status-reactions-tool-only` 來取得明確的狀態反應時間軸，或使用
`--scenario discord-thread-reply-filepath-attachment` 來建立一個真實的 Discord 執行緒並驗證
`message.thread-reply` 是否保留了
`filePath` 附件。這些場景不包含在預設的即時 Discord 管道中，因為它們是重現前後的探測，而非廣泛的冒煙測試覆蓋。
當在 QA 環境中設定 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 時，執行緒附件的 Mantis 工作流程也可以新增已登入的 Discord Web
見證影片。該檢視者設定檔僅用於視覺捕捉；通過/失敗的決定仍來自 Discord REST 預言機。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的指令介面。預定和預設的手動執行會使用具有即時 frontier 憑證、
`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 的快速 Matrix 設定檔。
手動 `matrix_profile=all` 會分散到五個設定檔分片，以便在每個分片保持一個成品目錄的同時，能夠並行執行窮盡型目錄。

對於傳輸真實的 Telegram、Discord 和 Slack 冒煙管道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它們以預先存在的真實頻道為目標，該頻道包含兩個機器人（驅動程式 + SUT）。必需的環境變數、場景列表、輸出成品和 Convex 憑證池記錄在下方的 [Telegram, Discord, and Slack QA reference](#telegram-discord-and-slack-qa-reference) 中。

若要使用 VNC 救援功能執行完整的 Slack 桌面 VM，請執行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

該指令租用一台 Crabbox 桌面/瀏覽器機器，在 VM 內執行 Slack live lane，在 VNC 瀏覽器中開啟 Slack Web，擷取桌面，並在視訊擷取可用時將 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 複製回 Mantis 成品目錄。Crabbox 桌面/瀏覽器租用會預先提供擷取工具和瀏覽器/原生建置輔助套件，因此場景應僅在較舊的租用上安裝備援方案。Mantis 會在 `mantis-slack-desktop-smoke-report.md` 中回報總計和各階段的計時，因此執行緩慢時可顯示時間是花在租用預熱、憑證取得、遠端設定，還是成品複製。在透過 VNC 手動登入 Slack Web 後重複使用 `--lease-id <cbx_...>`；重複使用的租用還能讓 Crabbox 的 pnpm 存儲快取保持熱狀態。預設的 `--hydrate-mode source` 會從來源 checkout 進行驗證，並在 VM 內執行 install/build。僅當重複使用的遠端 workspace 已經有 `node_modules` 和建置好的 `dist/` 時才使用 `--hydrate-mode prehydrated`；該模式會跳過耗時的 install/build 步驟，並在 workspace 尚未準備好時失敗閉鎖。使用 `--gateway-setup` 時，Mantis 會在 VM 內於連接埠 `38973` 上留下一個持久運行的 OpenClaw Slack gateway；若無此旗標，該指令會執行正常的 bot-to-bot Slack QA lane，並在擷取成品後結束。

為了透過桌面證據驗證原生 Slack 核准 UI，請執行 Mantis 核準檢查點模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

此模式與 `--gateway-setup` 互斥。它會執行 Slack 核準場景，拒絕非核准場景 ID，在每個待處理和已解決的核准狀態下等待，將觀察到的 Slack API 訊息轉譯成 `approval-checkpoints/<scenario>-pending.png` 和 `approval-checkpoints/<scenario>-resolved.png`，然後若有任何檢查點、訊息證據、確認或轉譯的螢幕截圖遺失或空白，則會失敗。冷 CI 租用可能仍會在 `slack-desktop-smoke.png` 中顯示 Slack 登入；核准檢查點圖片是此 lane 的視覺證明。

操作員檢查清單、GitHub workflow dispatch 指令、證據評論契約、hydrate-mode 決策表、計時解讀以及失敗處理步驟位於 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook) 中。

若要執行代理/電腦視覺風格的桌面任務，請執行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 會租用或重用 Crabbox 桌面/瀏覽器機器，啟動 `crabbox record --while`，透過巢狀 `visual-driver` 驅動可見的瀏覽器，擷取 `visual-task.png`，並在選取 `--vision-mode image-describe` 時對擷圖執行 `openclaw infer image describe`，然後寫入 `visual-task.mp4`、`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。當設定 `--expect-text` 時，視覺提示會要求結構化的 JSON 判決，並且只有在模型回報正面的可見證據時才會通過；單純引用目標文字的否定回應會導致斷言失敗。使用 `--vision-mode metadata` 進行無模型的冒煙測試，在不呼叫圖像理解提供者的情況下驗證桌面、瀏覽器、擷圖和視訊管道。錄製是 `visual-task` 的必要產出；如果 Crabbox 未錄製任何非空的 `visual-task.mp4`，即使視覺驅動程式通過，任務也會失敗。失敗時，Mantis 會保留 VNC 的租用，除非任務已經通過且未設定 `--keep-lease`。

使用集區即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

Doctor 會檢查 Convex broker 環境，驗證端點設定，並在維護者密鑰存在時驗證 admin/list 的連線性。它僅回報密鑰的設定/遺失狀態。

## 即時傳輸覆蓋範圍

即時傳輸通道共用一個契約，而不是各自發明自己的場景清單形狀。`qa-channel` 是廣泛的綜合產品行為套件，並非即時傳輸覆蓋範圍矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | Bot 對 Bot | 允許清單區塊 | 頂層回覆 | 重新啟動恢復 | 後續追蹤 | 執行緒隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | ------------ | -------- | ---------- | -------- | -------- | ------------ |
| 矩陣     | x      | x        | x          | x            | x        | x            | x        | x          | x        |          |              |
| Telegram | x      | x        | x          |              |          |              |          |            |          | x        |              |
| Discord  | x      | x        | x          |              |          |              |          |            |          |          | x            |
| Slack    | x      | x        | x          | x            | x        | x            | x        | x          |          |          |              |

這將 `qa-channel` 保留為廣泛的產品行為測試套件，而 Matrix、
Telegram 和未來的即時傳輸則共用一份明確的傳輸契約檢查清單。

若要在不將 Docker 引入 QA 路徑的情況下使用一次性 Linux VM 通道，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體、安裝相依套件、在客體內建置 OpenClaw、
執行 `qa suite`，然後將標準 QA 報告和摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它會重用主機上 `qa suite` 相同的情境選擇行為。
主機和 Multipass 套件執行預設會使用獨立的 Gateway Worker 並行執行多個選定的情境。`qa-channel` 預設並行數為 4，
並以選定的情境數量為上限。使用 `--concurrency <count>` 調整 Worker 數量，
或使用 `--concurrency 1` 進行序列執行。
使用 `--pack personal-agent` 來執行個人助理基準測試套件。
套件選取器會與重複的 `--scenario` 旗標累加：明確指定的情境會先執行，
然後套件情境會依套件順序執行並移除重複項。
當自訂 QA 執行器已提供 OpenTelemetry 收集器設定，且希望
同時選取 OpenTelemetry 和 Prometheus 診斷冒煙測試情境時，請使用 `--pack observability`。
當任何情境失敗時，該指令會以非零狀態碼結束。
當您需要輸出結果但不希望以失敗狀態碼結束時，請使用 `--allow-failures`。
即時執行會轉發對客體實用且受支援的 QA 認證輸入：基於環境變數的提供者金鑰、
QA 即時提供者設定路徑，以及存在時的 `CODEX_HOME`。
請將 `--output-dir` 保留在儲存庫根目錄下，以便客體可以透過掛載的工作區寫回資料。

## Telegram、Discord 與 Slack QA 參考

Matrix 擁有一個[專用頁面](/zh-Hant/concepts/qa-matrix)，因其場景數量以及基於 Docker 的主伺服器佈建。Telegram、Discord 和 Slack 較小——每個只有少數場景，沒有設定檔系統，針對預先存在的真實頻道——因此它們的參考資料位於此處。

### 共用的 CLI 標誌

這些通道透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊，並接受相同的標誌：

| 標誌                                  | 預設值                                                          | 描述                                                                      |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 僅執行此場景。可重複。                                                    |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 寫入報告/摘要/觀察訊息和輸出日誌的位置。相對路徑根據 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 從中立 cwd 呼叫時的儲存庫根目錄。                                         |
| `--sut-account <id>`                  | `sut`                                                           | QA gateway 設定內的暫時帳戶 ID。                                          |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier` （舊版 `live-openai` 仍可運作）。        |
| `--model <ref>` / `--alt-model <ref>` | 供應商預設值                                                    | 主要/備用模型參照。                                                       |
| `--fast`                              | 關閉                                                            | 在支援的情況下啟用供應商快速模式。                                        |
| `--credential-source <env\|convex>`   | `env`                                                           | 參閱 [Convex credential pool](#convex-credential-pool)。                  |
| `--credential-role <maintainer\|ci>`  | 在 CI 中為 `ci`，否則為 `maintainer`                            | 當 `--credential-source convex` 時使用的角色。                            |

任何場景失敗時，每個通道皆以非零值結束。`--allow-failures` 會寫入產製物而不設定失敗的結束代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

針對一個真實的私人 Telegram 群組，包含兩個不同的機器人（驅動程式 + SUT）。SUT 機器人必須具備 Telegram 使用者名稱；當兩個機器人在 `@BotFather` 中啟用 **Bot-to-Bot Communication Mode** 時，bot-to-bot 觀察運作最佳。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 數字聊天 ID（字串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

選用：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會在 observed-message 成果中保留訊息主體（預設為編輯遮蔽）。

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

隱含的預設集始終涵蓋 canary、提及閘控、原生指令回覆、指令定址以及 bot 對 bot 群組回覆。`mock-openai` 預設值還包含決定性回覆鏈和最終訊息串流檢查。`telegram-current-session-status-tool` 仍維持選用，因為它只有在緊接在 canary 之後執行緒時才穩定，而不是在任意的原生指令回覆之後。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 來列印目前的預設/選用分割與迴歸參考。

輸出成果：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含從 canary 開始的個別回覆 RTT（驅動程式發送 → 觀察到的 SUT 回覆）。
- `telegram-qa-observed-messages.json` - 主體已編輯遮蔽，除非使用 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

套件 RTT 比較使用相同的 Telegram 憑證合約，同時將其 RTT 樣本控制保留在 RTT 驅動程式路徑上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

當設定 `--credential-source convex` 時，RTT Docker 包裝器會租用 `kind: "telegram"` 憑證，將租用的群組/驅動程式/SUT bot 環境變數匯出到已安裝套件的執行中，對租用發送心跳，並在關閉時釋放它。`--samples` 和 `--sample-timeout-ms` 仍然提供給 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在環境變數支援和 Convex 支援的 RTT 執行之間仍然可比較。

### Discord QA

```bash
pnpm openclaw qa discord
```

針對一個真實的私有 Discord 公會頻道，使用兩個機器人進行測試：一個是由測試工具控制的驅動機器人，另一個是由子 OpenClaw 透過內建的 Discord 外掛程式啟動的 SUT 機器人。驗證頻道提及處理、SUT 機器人是否已向 Discord 註冊了原生的 `/help` 指令，以及選用的 Mantis 證據場景。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必須符合 Discord 傳回的 SUT 機器人使用者 ID（否則該通道會快速失敗）。

選用：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 將訊息內文保留在 observed-message 成果中。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 選取 `discord-voice-autojoin` 的語音/舞台頻道；若無此設定，該場景將選取 SUT 機器人可見的第一個語音/舞台頻道。

場景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 選用語音場景。獨立執行，啟用 `channels.discord.voice.autoJoin`，並驗證 SUT 機器人目前的 Discord 語音狀態是否為目標語音/舞台頻道。Convex Discord 憑證可能包含選用的 `voiceChannelId`；否則執行器將會探索公會中第一個可見的語音/舞台頻道。
- `discord-status-reactions-tool-only` - 選用 Mantis 場景。獨立執行，因為它會將 SUT 切換至僅使用工具的公會永續回覆模式 (always-on, tool-only)，並使用 `messages.statusReactions.enabled=true`，然後擷取 REST 反應時間軸以及 HTML/PNG 視覺化成果。Mantis 之前/之後的報告也會將場景提供的 MP4 成果保留為 `baseline.mp4` 和 `candidate.mp4`。

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

輸出成果：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 內文已編輯，除非設定 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- 當 status-reaction 情境執行時，`discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

以一個真實的私人 Slack 頻道為目標，包含兩個不同的機器人：一個是由 harness 控制的驅動機器人，另一個是由子 OpenClaw gateway 透過內建的 Slack 外掛啟動的 SUT 機器人。

當 `--credential-source env` 時需要的環境變數：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

選用項：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 會在 observed-message 成果中保留訊息內文。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 啟用 Mantis 的視覺認可
  檢查點。執行程式會寫入 `<scenario>.pending.json` 和
  `<scenario>.resolved.json`，然後等待對應的 `.ack.json` 檔案。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 會覆寫檢查點
  確認逾時時間。預設值為 `120000`。

情境 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - 選用式的原生 Slack exec 認可情境。
  透過 gateway 請求 exec 認可，驗證 Slack 訊息是否包含
  原生認可按鈕，將其解決，並驗證已解決的 Slack 更新。
- `slack-approval-plugin-native` - 選用式的原生 Slack 外掛認可情境。
  同時啟用 exec 和外掛認可轉送，讓外掛事件不會
  被 exec 認可路由抑制，然後驗證相同的待處理/已解決
  原生 Slack UI 路徑。

輸出成果：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 內文會被編輯，除非設定了 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。
- `approval-checkpoints/` - 僅當 Mantis 設定了
  `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 時；包含檢查點 JSON、
  確認 JSON 以及待處理/已解決的螢幕截圖。

#### 設定 Slack 工作區

此通道需要在一個工作區中使用兩個不同的 Slack 應用程式，以及一個兩個機器人皆為成員的頻道：

- `channelId` - 一個兩個機器人都已被邀請加入的頻道的 `Cxxxxxxxxxx` ID。請使用專用頻道；車道會在每次執行時發佈訊息。
- `driverBotToken` - **Driver** 應用程式的 Bot Token (`xoxb-...`)。
- `sutBotToken` - **SUT** 應用程式的 Bot Token (`xoxb-...`)，這必須是一個與 Driver 分開的 Slack 應用程式，這樣其 Bot 使用者 ID 才會不同。
- `sutAppToken` - 具有 `connections:write` 的 SUT 應用程式的應用層級 Token (`xapp-...`)，由 Socket Mode 使用，以便 SUT 應用程式可以接收事件。

與其重複使用生產環境工作區，不如優先使用專門用於 QA 的 Slack 工作區。

下面的 SUT manifest 有意將內建 Slack 外掛程式的生產環境安裝 (`extensions/slack/src/setup-shared.ts:10`) 縮小至即時 Slack QA 測試套件所涵蓋的權限和事件。若要查看使用者所見的生產頻道設定，請參閱 [Slack 頻道快速設定](/zh-Hant/channels/slack#quick-setup)；QA Driver/SUT 配對是有意分開的，因為車道需要在一個工作區中有兩個不同的 Bot 使用者 ID。

**1. 建立 Driver 應用程式**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 選擇 QA 工作區，貼上下列 manifest，然後 _Install to Workspace_：

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

複製 _Bot User OAuth Token_ (`xoxb-...`) — 這會成為 `driverBotToken`。Driver 只需要發佈訊息並識別自己；不需要事件，也不需要 Socket Mode。

**2. 建立 SUT 應用程式**

在同一個工作區中重複 _Create New App → From a manifest_。此 QA 應用程式有意使用內建 Slack 外掛程式生產環境 manifest (`extensions/slack/src/setup-shared.ts:10`) 的更窄版本：省略了反應範圍和事件，因為即時 Slack QA 測試套件尚未涵蓋反應處理。

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

Slack 建立應用程式後，請在其設定頁面上執行兩個操作：

- _Install to Workspace_ → 複製 _Bot User OAuth Token_ → 這會成為 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 新增範圍 `connections:write` → 儲存 → 複製 `xapp-...` 值 → 這會成為 `sutAppToken`。

透過對每個 token 呼叫 `auth.test` 來驗證這兩個 bots 具有不同的使用者 id。執行時會根據使用者 id 來區分 driver 和 SUT；對兩者重複使用同一個 app 會立即導致提及控制 失敗。

**3. 建立頻道**

在 QA 工作區中，建立一個頻道（例如 `#openclaw-qa`）並在頻道內邀請這兩個 bots：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

從 _頻道資訊 → 關於 → 頻道 ID_ 複製 `Cxxxxxxxxxx` id - 這將成為 `channelId`。公開頻道即可運作；如果您使用私密頻道，兩個 apps 已經擁有 `groups:history`，因此工具 的歷史紀錄讀取仍會成功。

**4. 註冊憑證**

有兩個選項。使用環境變數進行單機除錯（設定四個 `OPENCLAW_QA_SLACK_*` 變數並傳遞 `--credential-source env`），或是為共享的 Convex pool 播種，以便 CI 和其他維護者可以租用它們。

對於 Convex pool，將這四個欄位寫入 JSON 檔案：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 shell 中匯出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 後，註冊並驗證：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

預期會有 `count: 1`、`status: "active"`，沒有 `lease` 欄位。

**5. 端對端驗證**

在本機執行 lane 以確認這兩個 bots 可以透過 broker 與彼此通訊：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

順利的執行會在 30 秒內完成，且 `slack-qa-report.md` 會顯示 `slack-canary` 和 `slack-mention-gating` 的狀態皆為 `pass`。如果 lane 暫停約 90 秒並以 `Convex credential pool exhausted for kind "slack"` 結束，可能是 pool 為空或每個資料列都被租用 - `qa credentials list --kind slack --status all --json` 會告訴您是哪一種情況。

### Convex 憑證池

Telegram、Discord、Slack 和 WhatsApp lanes 可以從共享的 Convex pool 租用憑證，而不是讀取上述的環境變數。傳遞 `--credential-source convex`（或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨占租用，在執行期間發送心跳，並在關閉時釋放它。Pool 種類有 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

代理在 `admin/add` 上驗證的 Payload 形狀：

- Telegram (`kind: "telegram"`)：`{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必須是數字聊天 ID 字串。
- Telegram 真實使用者 (`kind: "telegram-user"`)：`{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 僅限 Mantis Telegram Desktop proof。通用 QA Lab lanes 不得取得此類型。
- Discord (`kind: "discord"`)：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`)：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 電話號碼必須是不同的 E.164 字串。

Mantis Telegram Desktop proof 工作流程會為 TDLib CLI 驅動程式和 Telegram Desktop
witness 持有一個獨佔的 Convex `telegram-user` 租用，然後在發佈 proof 後釋放它。

當 PR 需要確定性視覺差異時，在 Telegram 格式化器或傳遞層變更期間，Mantis 可以在 `main` 和 PR head 上使用相同的 mock model
reply。擷取預設值是為 PR 註解調整的：標準 Crabbox 類別、24fps 桌面錄製、24fps 動態 GIF 和 1920px 預覽寬度。
之前/之後的註解應該發佈一個只包含預期 GIF 的乾淨 bundle。

Slack lanes 也可以使用該 pool。Slack payload 形狀檢查目前位於 Slack QA runner 而非 broker 中；使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，搭配像 `Cxxxxxxxxxx` 這樣的 Slack 頻道 id。有關應用程式和範圍佈建，請參閱[設定 Slack 工作區](#setting-up-the-slack-workspace)。

操作環境變數和 Convex broker 端點合約位於[測試 → 透過 Convex 共用 Telegram 憑證](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1)中（該章節名稱早於多頻道 pool；租用語義在各種類型之間共用）。

## Repo-backed seeds

Seed 資產位於 `qa/` 中：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些有意放在 git 中，以便 QA 計劃對人類和代理來說都是可見的。

`qa-lab` 應保持為通用的 markdown runner。每個情境 markdown 檔案是
單次測試執行的事實來源，並且應定義：

- 情境元資料
- 選用的類別、功能、lane 和風險元資料
- 文件與程式碼參考
- 可選的外掛程式需求
- 可選的 Gateway 設定補丁
- 可執行檔 `qa-flow`

支援 `qa-flow` 的可重複使用執行時層面允許保持通用
和跨領域。例如，Markdown 情境可以結合傳輸端
協助程式與瀏覽器端協助程式，透過 Gateway
`browser.request` 縫合來驅動內嵌的 Control UI，而無需新增特殊用途的執行器。

情境檔案應依產品功能分組，而非依原始碼樹資料夾。
當檔案移動時，請保持情境 ID 穩定；使用 `docsRefs` 和 `codeRefs`
以進行實作追蹤。

基準清單應保持足夠寬泛以涵蓋：

- 私訊和頻道聊天
- 串流行為
- 訊息動作生命週期
- cron 回呼
- 記憶體回溯
- 模型切換
- 子代理程式交接
- 讀取程式庫和讀取文件
- 一個小型建置任務，例如 Lobster Invaders

## Provider 模擬通道

`qa suite` 有兩個本機 Provider 模擬通道：

- `mock-openai` 是具備情境感知能力的 OpenClaw 模擬器。它仍是 Repo 支援 QA
  和一致性檢查的預設確定性模擬通道。
- `aimock` 啟動一個由 AIMock 支援的 Provider 伺服器，用於實驗性協定、
  測試資料、錄製/重放和混亂測試覆蓋率。它是附加性的，並不會
  取代 `mock-openai` 情境分派器。

Provider 通道實作位於 `extensions/qa-lab/src/providers/` 下。
每個 Provider 擁有其預設值、本機伺服器啟動、Gateway 模型設定、
Auth 設定檔暫存需求以及即時/模擬功能旗標。共用的套件和
Gateway 程式碼應透過 Provider 註冊表路由，而不是根據
Provider 名稱進行分支處理。

## 傳輸轉接器

`qa-lab` 擁有用於 Markdown QA 情境的通用傳輸縫合。`qa-channel` 是該縫合上的第一個轉接器，但設計目標更廣泛：未來的真實或合成通道應插入相同的套件執行器，而不是新增傳輸特定的 QA 執行器。

在架構層面上，劃分為：

- `qa-lab` 擁有通用情境執行、Worker 並行、產生品寫入和報告功能。
- 傳輸適配器擁有閘道配置、就緒狀態、入站和出站觀察、傳輸操作以及標準化傳輸狀態。
- `qa/scenarios/` 下的 Markdown 情境檔案定義了測試運行；`qa-lab` 提供了執行它們的可重複使用運行時介面。

### 新增頻道

向 Markdown QA 系統新增頻道僅需要兩件事：

1. 該頻道的傳輸適配器。
2. 一個用於測試頻道合約的情境包。

當共享的 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共享的主機機制：

- `openclaw qa` 指令根目錄
- 套件啟動和拆解
- 工作並行
- 產生寫入
- 報告生成
- 情境執行
- 舊版 `qa-channel` 情境的相容性別名

Runner 外掛擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置閘道
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開逐字稿和標準化傳輸狀態
- 如何執行傳輸支援的操作
- 如何處理傳輸特定的重設或清理

新增頻道的最低採用門檻：

1. 將 `qa-lab` 保留為共享 `qa` 根目錄的擁有者。
2. 在共享的 `qa-lab` 主機接點上實作傳輸 runner。
3. 將傳輸特定的機制保留在 runner 外掛或頻道束線器中。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根指令。Runner 外掛應該在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量化；延遲 CLI 和 runner 執行應保留在獨立的入口點之後。
5. 在主題 `qa/scenarios/` 目錄下編寫或調整 Markdown 情境。
6. 對於新情境，使用通用情境輔助程式。
7. 保持現有的相容性別名正常運作，除非儲存庫正在進行有意的遷移。

決策規則是嚴格的：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為依賴於單一通道傳輸，請將其保留在該執行器外掛程式或外掛程式套件中。
- 如果場景需要多個通道都能使用的新功能，請新增一個通用輔助函式，而不是在 `suite.ts` 中新增通道特定的分支。
- 如果某種行為僅對一種傳輸有意義，請將場景保持為傳輸特定，並在場景合約中明確說明。

### 場景輔助函式名稱

新場景的首選通用輔助函式：

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

相容性別名仍可用於現有場景 - `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` - 但新場景的撰寫應使用通用名稱。這些別名的存在是為了避免全面遷移，而非作為未來的模型。

## 報告

`qa-lab` 從觀測到的匯流排時間軸匯出 Markdown 協議報告。
該報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼仍然受阻
- 哪些後續場景值得新增

若要取得可用場景的清單 - 在評估後續工作範圍或連接新傳輸時很有用 - 請執行 `pnpm openclaw qa coverage`（新增 `--json` 以取得機器可讀輸出）。

若要進行字元和風格檢查，請在多個即時模型參考上執行相同的場景
並撰寫評斷式的 Markdown 報告：

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

此指令執行本機 QA 閘道子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，然後執行一般的使用者輪次，例如聊天、工作區說明和小型檔案任務。不應告知候選模型它正在接受評估。此指令會保留每份完整的對話記錄，記錄基本的執行統計數據，然後在快速模式下要求評審模型（在支援的情況下使用 `xhigh` 推理）依自然度、氛圍和幽默感對執行結果進行排名。
在比較供應商時請使用 `--blind-judge-models`：評審提示仍會取得每份對話記錄和執行狀態，但候選參照會被替換為中性標籤，例如 `candidate-01`；報表會在解析後將排名對應回真實參照。
候選執行預設使用 `high` 思考，針對 GPT-5.5 使用 `medium`，針對支援此功能的較舊 OpenAI 評估參照使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 在行內覆寫特定候選。`--thinking <level>` 仍會設定全域後備值，而較舊的 `--model-thinking <provider/model=level>` 形式則會為了相容性而保留。
OpenAI 候選參照預設為快速模式，因此在供應商支援的地方會使用優先處理。當單一候選或評審需要覆寫時，請在行內加入 `,fast`、`,no-fast` 或 `,fast=false`。僅當您希望對每個候選模型強制開啟快速模式時才傳遞 `--fast`。候選和評審的持續時間會記錄在報表中以進行基準分析，但評審提示會明確說明不要根據速度進行排名。
候選和評審模型執行的預設並行度皆為 16。當供應商限制或本機閘道壓力導致執行過於雜訊時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞任何候選 `--model` 時，角色評估會預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-7`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。
當未傳遞任何 `--judge-model` 時，評審會預設為 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-7,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [個人代理基準測試套件](/zh-Hant/concepts/personal-agent-benchmark-pack)
- [QA 頻道](/zh-Hant/channels/qa-channel)
- [測試](/zh-Hant/help/testing)
- [儀表板](/zh-Hant/web/dashboard)
