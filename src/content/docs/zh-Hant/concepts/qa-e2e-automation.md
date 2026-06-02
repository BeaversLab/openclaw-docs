---
summary: "QA 棧概覽：qa-lab、qa-channel、倉庫支援的情境、即時傳輸通道、傳輸介面卡，以及報告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概覽"
---

專有的 QA 堆疊旨在以更貼近現實、具備通道形態的方式來測試 OpenClaw，這比單一的單元測試更能模擬實際情況。

目前的組成部分：

- `extensions/qa-channel`：綜合訊息通道，具備私訊、頻道、討論串、反應、編輯和刪除介面。
- `extensions/qa-lab`：除錯器 UI 和 QA 匯流排，用於觀察對話記錄、注入傳入訊息，以及匯出 Markdown 報告。
- `extensions/qa-matrix`，未來的執行器外掛：即時傳輸介面卡，可在子 QA Gateway 中驅動真實通道。
- `qa/`：倉庫支援的種子資產，用於啟動任務和基準 QA 情境。
- [Mantis](/zh-Hant/concepts/mantis)：針對需要真實傳輸、瀏覽器截圖、VM 狀態和 PR 證據的錯誤，進行實時驗證前後的檢查。

## 指令介面

每個 QA 流程都在 `pnpm openclaw qa <subcommand>` 下執行。許多流程都有 `pnpm qa:*` 腳本別名；這兩種形式都受到支援。

| 指令                                                | 用途                                                                                                                                                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 隨附的 QA 自我檢查；寫入 Markdown 報告。                                                                                                                                                                                                |
| `qa suite`                                          | 針對 QA Gateway 通道執行倉庫支援的情境。別名：`pnpm openclaw qa suite --runner multipass` 用於一次性 Linux VM。                                                                                                                         |
| `qa coverage`                                       | 列印 markdown 情境覆蓋率清單（`--json` 用於機器輸出）。                                                                                                                                                                                 |
| `qa parity-report`                                  | 比較兩個 `qa-suite-summary.json` 檔案並撰寫代理對等性報告，或使用 `--runtime-axis --token-efficiency` 根據單一執行時組摘要撰寫 Codex 與 OpenClaw 的執行時對等性和 Token 效率報告。                                                      |
| `qa character-eval`                                 | 在多個實時模型上運行角色 QA 場景，並生成判斷報告。請參閱 [報告](#reporting)。                                                                                                                                                           |
| `qa manual`                                         | 針對選定的供應商/模型通道執行一次性提示。                                                                                                                                                                                               |
| `qa ui`                                             | 啟動 QA 除錯器 UI 和本機 QA 匯流排（別名：`pnpm qa:lab:ui`）。                                                                                                                                                                          |
| `qa docker-build-image`                             | 建置預先製作的 QA Docker 映像檔。                                                                                                                                                                                                       |
| `qa docker-scaffold`                                | 為 QA 儀表板 + 閘道通道撰寫 docker-compose 腳手架。                                                                                                                                                                                     |
| `qa up`                                             | 建置 QA 網站，啟動 Docker 支援的堆疊，列印 URL（別名：`pnpm qa:lab:up`；`:fast` 變體新增 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                      |
| `qa aimock`                                         | 僅啟動 AIMock 提供者伺服器。                                                                                                                                                                                                            |
| `qa mock-openai`                                    | 僅啟動具備情境感知的 `mock-openai` 提供者伺服器。                                                                                                                                                                                       |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共用的 Convex 憑證池。                                                                                                                                                                                                              |
| `qa matrix`                                         | 針對一次性 Tuwunel homeserver 的實時傳輸通道。請參閱 [Matrix QA](/zh-Hant/concepts/qa-matrix)。                                                                                                                                              |
| `qa telegram`                                       | 針對真實私人 Telegram 群組的即時傳輸通道。                                                                                                                                                                                              |
| `qa discord`                                        | 針對真實私人 Discord 公會頻道的即時傳輸通道。                                                                                                                                                                                           |
| `qa slack`                                          | 針對真實私人 Slack 頻道的即時傳輸通道。                                                                                                                                                                                                 |
| `qa mantis`                                         | 針對實時傳輸錯誤的驗證前後執行器，包含 Discord 狀態反應證據、Crabbox 桌面/瀏覽器冒煙測試以及 Slack-in-VNC 冒煙測試。請參閱 [Mantis](/zh-Hant/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast` 會將 Docker 服務保持在預先建構的映像上，並將
`extensions/qa-lab/web/dist` bind-mount 到 `qa-lab` 容器中。`qa:lab:watch`
會在變更時重新建置該套件，且當 QA Lab
資產雜湊變更時，瀏覽器會自動重新載入。

若要執行本機 OpenTelemetry 訊號冒煙測試，請執行：

```bash
pnpm qa:otel:smoke
```

該腳本啟動本機 OTLP/HTTP 接收器，在啟用 `diagnostics-otel` 外掛程式的情況下執行 `otel-trace-smoke` QA
情境，然後斷言追蹤、指標和日誌已匯出。它會對匯出的 protobuf 追蹤 span 進行解碼
並檢查發佈關鍵的結構：
`openclaw.run`、`openclaw.harness.run`、最新的 GenAI 語義約定
model-call span、`openclaw.context.assembled` 和 `openclaw.message.delivery`
必須存在。此冒煙測試會強制
`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，因此 model-call
span 必須使用 `{gen_ai.operation.name} {gen_ai.request.model}` 名稱；
模型呼叫在成功的輪次中不得匯出 `StreamAbandoned`；原始診斷 ID 和
`openclaw.content.*` 屬性必須排除在追蹤之外。原始 OTLP
承載不得包含提示哨兵、回應哨兵或 QA 會話金鑰。它會將 `otel-smoke-summary.json` 寫在 QA 套件人工產出物旁。

若要執行由收集器支援的 OpenTelemetry 冒煙測試，請執行：

```bash
pnpm qa:otel:collector-smoke
```

該通道會將真實的 OpenTelemetry Collector Docker 容器置於
同一個本機接收器前方。當變更端點接線、收集器
相容性，或程序內接收器可能掩蓋的 OTLP 匯出行為時，請使用它。

若要執行受保護的 Prometheus 抓取冒煙測試，請執行：

```bash
pnpm qa:prometheus:smoke
```

該別名會在啟用 `diagnostics-prometheus` 的情況下執行 `docker-prometheus-smoke` QA 情境，
驗證未經驗證的抓取會被拒絕，然後檢查已驗證的抓取包含發佈關鍵的指標系列，
且不含提示內容、回應內容、原始診斷識別碼、驗證
權杖或本機路徑。

若要連續執行這兩個可觀測性冒煙測試，請使用：

```bash
pnpm qa:observability:smoke
```

若要執行由收集器支援的 OpenTelemetry 通道加上受保護的 Prometheus 抓取
冒煙測試，請使用：

```bash
pnpm qa:observability:collector-smoke
```

可觀測性 QA 僅限原始碼簽出。npm tarball 故意省略
QA Lab，因此套件 Docker 發佈通道不會執行 `qa` 指令。當變更
診斷檢測時，請從已建置的原始碼簽出中使用
`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或
`pnpm qa:observability:smoke`。

若要執行傳輸真實的 Matrix 冒煙測試通道，請執行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 參考、設定檔/場景目錄、環境變數和產品佈局位於 [Matrix QA](/zh-Hant/concepts/qa-matrix)。概況如下：它在 Docker 中佈建一次性 Tuwunel homeserver，註冊臨時 driver/SUT/observer 使用者，在範圍限於該傳輸的子 QA gateway 中執行真實 Matrix 外掛（無 `qa-channel`），然後在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下寫入 Markdown 報告、JSON 摘要、observed-events 產品和組合輸出日誌。

這些情境涵蓋了單元測試無法端到端驗證的 transport 行為：提及閘控、允許 bot 原則、允許清單、頂層和執行緒回覆、DM 路由、反應處理、入站編輯抑制、重新執行重放去重、homeserver 中斷恢復、審核元數據傳遞、媒體處理，以及 Matrix E2EE 啟動/恢復/驗證流程。E2EE CLI 設定檔還會在檢查 gateway 回覆之前，透過相同的一次性 homeserver 驅動 `openclaw matrix encryption setup` 和驗證指令。

Discord 也有僅限 Mantis 的選用情境，用於 Bug 重現。使用
`--scenario discord-status-reactions-tool-only` 取得明確狀態反應時間軸，或使用 `--scenario discord-thread-reply-filepath-attachment` 建立真實的 Discord 執行緒並驗證 `message.thread-reply` 是否保留了
`filePath` 附件。這些情境不包含在預設的即時 Discord 通道中，因為它們是重現前後的探測，而非廣泛的煙霧測試。
當 QA 環境中設定 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 時，執行緒附件 Mantis 工作流程也可以新增已登入的 Discord Web
見證影片。該檢視者設定檔僅用於視覺捕捉；通過/失敗決策仍來自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的指令介面。排程和預設手動執行會使用即時 frontier 憑證、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 來執行快速的 Matrix 設定檔。手動 `matrix_profile=all` 會擴展為五個設定檔分片，以便在並行執行完整目錄的同時，為每個分片保留一個產出目錄。

對於傳輸真實的 Telegram、Discord 和 Slack 煙霧測試通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它們以包含兩個機器人 (driver + SUT) 的現有真實通道為目標。所需的環境變數、場景列表、輸出產品和 Convex 憑證池記載於下方的 [Telegram, Discord, and Slack QA reference](#telegram-discord-and-slack-qa-reference) 中。

若要透過 VNC 救援執行完整的 Slack 桌面 VM，請執行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

該指令租用一台 Crabbox 桌面/瀏覽器機器，在 VM 內執行 Slack 即時通道，在 VNC 瀏覽器中開啟 Slack Web，擷取桌面，並在可擷取影片時將 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 複製回 Mantis 成品目錄。Crabbox 桌面/瀏覽器租用會提前提供擷取工具和瀏覽器/原生建置輔助套件，因此情境應僅在較舊的租用上安裝後備方案。Mantis 會在 `mantis-slack-desktop-smoke-report.md` 中回報總計和各階段的時間，因此緩慢的執行會顯示時間是否花在租用預熱、憑證取得、遠端設定或成品複製上。在透過 VNC 手動登入 Slack Web 後重複使用 `--lease-id <cbx_...>`；重複使用的租用也會讓 Crabbox 的 pnpm 存儲快取保持熱度。預設的 `--hydrate-mode source` 會從來源检出驗證並在 VM 內執行 install/build。僅當重複使用的遠端工作區已經有 `node_modules` 和建置好的 `dist/` 時才使用 `--hydrate-mode prehydrated`；該模式會跳過昂貴的 install/build 步驟，並在工作區未準備好時失敗封閉。使用 `--gateway-setup` 時，Mantis 會在 VM 內的連接埠 `38973` 上保留持續運行的 OpenClaw Slack 閘道；若無此旗標，該指令會執行正常的機器人對機器人 Slack QA 通道，並在擷取成品後結束。

若要透過桌面證據證明原生 Slack 核准 UI，請執行 Mantis 核准檢查點模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

此模式與 `--gateway-setup` 互斥。它運行 Slack
審批場景，拒絕非審批場景 ID，在每個待處理和
已解決的審批狀態等待，將觀察到的 Slack API 訊息渲染成
`approval-checkpoints/<scenario>-pending.png` 和
`approval-checkpoints/<scenario>-resolved.png`，然後如果任何檢查點、
訊息證據、確認或渲染的螢幕截圖缺失或為空則失敗。
Cold CI 租約可能仍會在 `slack-desktop-smoke.png` 中顯示 Slack 登入；
審批檢查點影像是此通道的視覺證明。

操作員檢查清單、GitHub workflow dispatch 指令、證據留言合約、hydrating-mode 決策表、時序解讀以及失敗處理步驟位於 [Mantis Slack Desktop Runbook](/zh-Hant/concepts/mantis-slack-desktop-runbook)。

對於 agent/CV 風格的桌面任務，請執行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 租用或重用 Crabbox 桌面/瀏覽器機器，啟動
`crabbox record --while`，透過巢狀的
`visual-driver` 驅動可見瀏覽器，擷取 `visual-task.png`，當選擇 `--vision-mode image-describe` 時對螢幕截圖執行 `openclaw infer image describe`，
並寫入 `visual-task.mp4`、`mantis-visual-task-summary.json`、
`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
當設定 `--expect-text` 時，視覺提示會要求結構化的 JSON
裁決，並且僅在模型回報正面可見證據時通過；
僅引用目標文字的負面回應會導致斷言失敗。
使用 `--vision-mode metadata` 進行無模型的冒煙測試，以在不呼叫影像理解
提供者的情況下驗證桌面、
瀏覽器、螢幕截圖和影片管道。錄製是 `visual-task` 的必要產物；如果 Crabbox 未錄製
任何非空的 `visual-task.mp4`，即使視覺驅動程式
通過，任務也會失敗。失敗時，除非任務已經
通過且未設定 `--keep-lease`，否則 Mantis 會保留租約供 VNC 使用。

使用共用的即時憑證之前，請執行：

```bash
pnpm openclaw qa credentials doctor
```

Doctor 檢查 Convex broker 環境，驗證端點設定，並在存在維護者金鑰時驗證 admin/list 的連線能力。它僅回報金鑰的已設定/缺失狀態。

## Live transport 涵蓋範圍

Live transport lanes 共用同一個合約，而不是各自發明自己的情境清單結構。`qa-channel` 是廣泛的綜合產品行為測試套件，不屬於 live transport 涵蓋範圍矩陣的一部分。

實時傳輸執行器應從 `openclaw/plugin-sdk/qa-live-transport-scenarios` 匯入共享的場景 ID、基準覆蓋率輔助函數和場景選擇輔助函數。

| 通道     | Canary | 提及閘門 | Bot 對 Bot | 允許列表封鎖 | 頂層回覆 | 重啟恢復 | 串群後續 | 串群隔離 | 反應觀察 | 說明指令 | 原生指令註冊 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | -------- | -------- | -------- | -------- | -------- | ------------ |
| Matrix   | x      | x        | x          | x            | x        | x        | x        | x        | x        |          |              |
| Telegram | x      | x        | x          |              |          |          |          |          |          | x        |              |
| Discord  | x      | x        | x          |              |          |          |          |          |          |          | x            |
| Slack    | x      | x        | x          | x            | x        | x        | x        | x        |          |          |              |

這讓 `qa-channel` 保持為廣泛的產品行為測試套件，而 Matrix、Telegram 和未來的即時傳輸則共用一個明確的傳輸合約檢查清單。

若要使用一次性 Linux VM 軌道而不將 Docker 引入 QA 路徑，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體，安裝相依元件，在客體內建置 OpenClaw，執行 `qa suite`，然後將正常的 QA 報告和摘要複製回主機上的 `.artifacts/qa-e2e/...`。它會重複使用主機上 `qa suite` 相同的場景選擇行為。主機和 Multipass 套件執行預設會以隔離的 gateway worker 並行執行多個選定的場景。`qa-channel` 預設並行數為 4，並以選定的場景數量為上限。使用 `--concurrency <count>` 來調整 worker 數量，或使用 `--concurrency 1` 進行序列執行。使用 `--pack personal-agent` 來執行個人助理基準測試套件。套件選取器會與重複的 `--scenario` 標誌累加使用：明確指定的場景會先執行，然後套件場景會依照套件順序執行，並移除重複項。當自訂 QA 執行器已提供 OpenTelemetry collector 設定，並希望將 OpenTelemetry 和 Prometheus 診斷冒煙測試場景一起選取時，請使用 `--pack observability`。當任何場景失敗時，指令會以非零狀態碼結束。當您想要在不結束的情況下取得產出時，請使用 `--allow-failures`。即時執行會轉發對客體而言實用的支援 QA auth 輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及存在的 `CODEX_HOME`。請將 `--output-dir` 保持在 repo 根目錄下，以便客體可以透過掛載的工作區寫回。

## Telegram、Discord 和 Slack QA 參考

Matrix 擁有一個[專屬頁面](/zh-Hant/concepts/qa-matrix)，因為其場景數量以及支援 Docker 的 homeserver 佈建。Telegram、Discord 和 Slack 規模較小——各有少數場景，沒有設定檔系統，針對既有的真實頻道——因此它們的參考資料位於此處。

### 共用的 CLI 標誌

這些軌道透過 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 註冊，並接受相同的標誌：

| 標誌                                  | 預設值                                                          | 說明                                                                              |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 僅執行此場景。可重複執行。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 報告/摘要/觀察到的訊息及輸出日誌的寫入位置。相對路徑是相對於 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 從中立的 cwd 呼叫時的儲存庫根目錄。                                               |
| `--sut-account <id>`                  | `sut`                                                           | QA 閘道配置中的暫時帳戶 ID。                                                      |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier` (舊版 `live-openai` 仍可使用)。                  |
| `--model <ref>` / `--alt-model <ref>` | 供應商預設值                                                    | 主要/備用模型參照。                                                               |
| `--fast`                              | 關閉                                                            | 供應商快速模式 (若支援)。                                                         |
| `--credential-source <env\|convex>`   | `env`                                                           | 請參閱 [Convex 憑證池](#convex-credential-pool)。                                 |
| `--credential-role <maintainer\|ci>`  | 在 CI 中為 `ci`，否則為 `maintainer`                            | 當 `--credential-source convex` 時使用的角色。                                    |

任何場景失敗時，每個通道皆會以非零代碼結束。`--allow-failures` 會寫入產出但不設定失敗的結束代碼。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

以兩個不同的機器人 (驅動程式 + SUT) 為目標，針對一個真實的私人 Telegram 群組。SUT 機器人必須具備 Telegram 使用者名稱；當兩個機器人都在 `@BotFather` 中啟用 **Bot-to-Bot Communication Mode** 時，bot-to-bot 觀察效果最佳。

當 `--credential-source env` 時的必要環境變數：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 數值聊天 ID (字串)。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

選用：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 會在觀察到的訊息產出中保留訊息內文 (預設為編輯)。

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

隱含的預設集合總是包含 canary、提及閘控、原生指令回覆、指令定址以及機器人到機器人的群組回覆。`mock-openai` 預設值還包括確定性回覆鏈和最終訊息串流檢查。`telegram-current-session-status-tool` 仍為可選，因為它只有在直接跟隨 canary 的串流執行緒中才穩定，而不是在任意原生指令回覆之後。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 列印當前的預設/可選分割以及回歸參考。

輸出構件：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包含每次回覆的 RTT（驅動程式傳送 → 觀察到的 SUT 回覆），從 canary 開始。
- `telegram-qa-observed-messages.json` - 內容已被編輯，除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

套件 RTT 比較使用相同的 Telegram 憑證合約，同時將其 RTT 樣本控制在 RTT 測試線路路徑上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

當設定 `--credential-source convex` 時，RTT Docker 包裝器會租用 `kind: "telegram"` 憑證，將租用的群組/驅動程式/SUT 機器人環境變數匯出到已安裝套件的執行中，對租約發送心跳，並在關機時釋放它。`--samples` 和 `--sample-timeout-ms` 仍會提供給 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在環境支援和 Convex 支援的 RTT 執行之間仍然可比較。

### Discord QA

```bash
pnpm openclaw qa discord
```

以一個真實的私人 Discord 公會頻道為目標，該頻道有兩個機器人：一個由測試線路控制的驅動機器人，以及一個由子 OpenClaw 網關透過內建的 Discord 外掛程式啟動的 SUT 機器人。驗證頻道提及處理、SUT 機器人已向 Discord 註冊原生 `/help` 指令，以及可選的 Mantis 證據情境。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必須與 Discord 傳回的 SUT bot 使用者 ID 符合（否則該路徑會快速失敗）。

選用：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 在觀察到的訊息產出中保留訊息內容。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 選擇 `discord-voice-autojoin` 的語音/舞台頻道；若未指定，場景會選取 SUT bot 看到的第一個可見語音/舞台頻道。

場景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 選用語音場景。單獨執行，啟用 `channels.discord.voice.autoJoin`，並驗證 SUT bot 目前的 Discord 語音狀態是否為目標語音/舞台頻道。Convex Discord 憑證可能包含選用的 `voiceChannelId`；否則執行器會探索伺服器中第一個可見的語音/舞台頻道。
- `discord-status-reactions-tool-only` - 選用 Mantis 場景。單獨執行，因為它會將 SUT 切換為僅使用工具的始終開啟伺服器回覆，回覆 `messages.statusReactions.enabled=true`，然後擷取 REST 反應時間軸以及 HTML/PNG 視覺產出。Mantis 之前/之後的報告也會將場景提供的 MP4 產出保留為 `baseline.mp4` 和 `candidate.mp4`。

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

輸出產出：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 除非設定 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否則內容會被編輯。
- 當狀態反應場景執行時的 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

目標是一個真實的私人 Slack 頻道，其中包含兩個不同的機器人：一個是由 harness 控制的驅動機器人，另一個是由子 OpenClaw gateway 透過內建的 Slack 外掛啟動的 SUT bot。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

選用：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 將訊息主體保留在觀察到的訊息工件中。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 啟用 Mantis 的視覺審核檢查點。執行器會寫入 `<scenario>.pending.json` 和
  `<scenario>.resolved.json`，然後等待匹配的 `.ack.json` 檔案。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 會覆寫檢查點確認逾時時間。預設值為 `120000`。

場景 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - 選用的原生 Slack 執行審核場景。
  透過 Gateway 請求執行審核，驗證 Slack 訊息是否具有
  原生審核按鈕，將其解析，並驗證已解析的 Slack 更新。
- `slack-approval-plugin-native` - 選用的原生 Slack 外掛程式審核場景。
  同時啟用執行和外掛程式審核轉發，使外掛程式事件
  不會被執行審核路由抑制，然後驗證相同的待處理/已解析
  原生 Slack UI 路徑。

輸出工件：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 除非設定了 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否則主體會被編輯。
- `approval-checkpoints/` - 僅當 Mantis 設定了
  `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 時；包含檢查點 JSON、
  確認 JSON 以及待處理/已解析的螢幕截圖。

#### 設定 Slack 工作區

該通道需要在同一個工作區中使用兩個不同的 Slack 應用程式，以及一個兩個機器人都已加入的頻道：

- `channelId` - 兩個機器人都已受邀加入的頻道之 `Cxxxxxxxxxx` id。請使用專用頻道；該通道每次執行時都會發文。
- `driverBotToken` - **驅動程式** 應用程式的機器人權杖 (`xoxb-...`)。
- `sutBotToken` - **SUT** 應用程式的機器人權杖 (`xoxb-...`)，它必須是與驅動程式分開的 Slack 應用程式，以便其機器人使用者 id 是唯一的。
- `sutAppToken` - SUT 應用程式的應用層級權杖 (`xapp-...`)，並具有 `connections:write`，供 Socket Mode 使用以便 SUT 應用程式能接收事件。

建議使用專門用於 QA 的 Slack 工作區，而不要重複使用生產環境的工作區。

下列 SUT 清單刻意將內建 Slack 外掛程式的生產環境安裝 (`extensions/slack/src/setup-shared.ts:10`) 縮減至即時 Slack QA 測試套件所涵蓋的權限和事件。若要查看使用者實際看到的生產頻道設定，請參閱 [Slack channel quick setup](/zh-Hant/channels/slack#quick-setup)；QA 驅動程式/SUT 配對是刻意分開的，因為該管道需要在同一個工作區中有兩個不同的機器人使用者 ID。

**1. 建立 Driver 應用程式**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 選擇 QA 工作區，貼上下列清單，然後按 _Install to Workspace_：

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

複製 _Bot User OAuth Token_ (`xoxb-...`) - 該權杖會變成 `driverBotToken`。Driver 只需要發布訊息並識別自己；不需要事件，也不需要 Socket Mode。

**2. 建立 SUT 應用程式**

在同一個工作區中重複 _Create New App → From a manifest_ 的步驟。此 QA 應用程式刻意使用內建 Slack 外掛程式生產環境清單 (`extensions/slack/src/setup-shared.ts:10`) 的較窄版本：省略了反應範圍和事件，因為即時 Slack QA 測試套件尚未涵蓋反應處理。

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

- _Install to Workspace_ → 複製 _Bot User OAuth Token_ → 該權杖會變成 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 新增範圍 `connections:write` → 儲存 → 複製 `xapp-...` 值 → 該值會變成 `sutAppToken`。

透過對每個權杖呼叫 `auth.test` 來驗證這兩個機器人是否有不同的使用者 ID。執行時間會根據使用者 ID 來區分 Driver 和 SUT；對這兩者重複使用同一個應用程式會立即導致提及閘門 失敗。

**3. 建立頻道**

在 QA 工作區中，建立一個頻道 (例如 `#openclaw-qa`) 並從頻道內邀請這兩個機器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

從 _頻道資訊 → 關於 → 頻道 ID_ 複製 `Cxxxxxxxxxx` id - 這將成為 `channelId`。公開頻道也可以；如果您使用私有頻道，這兩個應用程式都已經擁有 `groups:history`，因此測試工具的歷史紀錄讀取仍然會成功。

**4. 註冊憑證**

有兩個選項。使用環境變數進行單機除錯（設定四個 `OPENCLAW_QA_SLACK_*` 變數並傳遞 `--credential-source env`），或是將資料寫入共用的 Convex 集區，以便 CI 和其他維護者可以租用它們。

對於 Convex 集區，將這四個欄位寫入 JSON 檔案：

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

**5. 驗證端到端**

在本地執行該 lane，以確認兩個 bots 可以透過 broker 與彼此通訊：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

成功的執行會在 30 秒內完成，並且 `slack-qa-report.md` 會顯示 `slack-canary` 和 `slack-mention-gating` 的狀態皆為 `pass`。如果 lane 懸置約 90 秒並以 `Convex credential pool exhausted for kind "slack"` 結束，可能是集區為空或每行都被租用了 - `qa credentials list --kind slack --status all --json` 會告訴您是哪一種情況。

### WhatsApp QA

```bash
pnpm openclaw qa whatsapp
```

目標是兩個專用的 WhatsApp Web 帳號：一個是由測試工具控制的 driver 帳號，另一個是由子 OpenClaw gateway 透過內建的 WhatsApp 外掛啟動的 SUT 帳號。

當 `--credential-source env` 時所需的環境變數：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

選用：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 啟用 `whatsapp-mention-gating`。
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` 將訊息主體保留在 observed-message artifacts 中。

Scenarios (`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`)：

- `whatsapp-canary`
- `whatsapp-pairing-block`
- `whatsapp-mention-gating`
- `whatsapp-approval-exec-native` - 選用原生 WhatsApp 執行核准情境。透過 gateway 請求執行核准，驗證 WhatsApp 訊息是否具備原生反應核准功能，進行解析，並驗證已解析的 WhatsApp 後續追蹤。
- `whatsapp-approval-plugin-native` - 選用原生 WhatsApp 外掛程式核准情境。同時啟用執行與外掛程式核准轉發，然後驗證相同的待處理/已解析原生 WhatsApp 路徑。

輸出成品：

- `whatsapp-qa-report.md`
- `whatsapp-qa-summary.json`
- `whatsapp-qa-observed-messages.json` - 內容已編輯，除非 `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`。

### Convex 憑證集區

Telegram、Discord、Slack 和 WhatsApp 通道可以從共用的 Convex 集區租用憑證，而不是讀取上述的環境變數。傳遞 `--credential-source convex`（或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 會取得獨佔租約，在執行期間維持心跳，並在關閉時釋放它。集區種類為 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

Broker 在 `admin/add` 上驗證的 Payload 形狀：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必須是數字聊天 ID 字串。
- Telegram 真實使用者 (`kind: "telegram-user"`): `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 僅限 Mantis Telegram Desktop 證明。通用 QA Lab 通道不得取得此種類。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 電話號碼必須是不同的 E.164 字串。

Mantis Telegram Desktop 證明工作流程會為 TDLib CLI 驅動程式和 Telegram Desktop 見證各持有一個獨佔的 Convex `telegram-user` 租約，然後在發布證明後將其釋放。

當 PR 需要確定性的視覺差異時，Mantis 可以在 `main` 和 PR 頂端使用相同的模擬模型回覆，同時變更 Telegram 格式器或傳遞層。擷取預設值是針對 PR 註解調整的：標準 Crabbox 類別、24fps 桌面錄製、24fps 動態 GIF，以及 1920px 預覽寬度。前/後註解應該發布一個乾淨的套件，其中僅包含預期的 GIF。

Slack 通道也可以使用該集區。Slack Payload 形狀檢查目前位於 Slack QA 執行器中而非 broker；請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，並附上 Slack 通道 ID (例如 `Cxxxxxxxxxx`)。請參閱 [Setting up the Slack workspace](#setting-up-the-slack-workspace) 以進行應用程式和範圍佈建。

操作環境變數和 Convex broker 端點合約位於 [Testing → Shared Telegram credentials via Convex](/zh-Hant/help/testing#shared-telegram-credentials-via-convex-v1) (此章節名稱早於多通道集區；租用語意在所有種類間共享)。

## Repo-backed seeds

Seed 資產位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些有意放在 git 中，以便 QA 計畫對人員和代理程式都可見。

`qa-lab` 應保持為通用 markdown 執行器。每個情境 markdown 檔案是單次測試執行的真實來源，並應定義：

- 情境中繼資料
- 選用的類別、功能、通道和風險中繼資料
- 文件和程式碼參照
- 選用的外掛需求
- 選用的 gateway 設定修補檔
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重複使用執行時層允許保持通用和跨領域。例如，markdown 情境可以結合傳輸端輔助程式與瀏覽器端輔助程式，後者透過 Gateway `browser.request` 縫合點驅動內嵌控制 UI，而不需新增特殊情況執行器。

情境檔案應按產品功能分組，而非來源樹資料夾。當檔案移動時，請保持情境 ID 穩定；使用 `docsRefs` 和 `codeRefs` 進行實作可追蹤性。

基準清單應保持足夠廣泛以涵蓋：

- DM 和通道聊天
- 執行緒行為
- 訊息動作生命週期
- cron 回呼
- 記憶召回
- 模型切換
- 子代理移交
- 讀取 repo 與文件
- 一個小型建構任務，例如 Lobster Invaders

## 提供者模擬通道

`qa suite` 有兩個本機提供者模擬通道：

- `mock-openai` 是具備情境感知的 OpenClaw 模擬器。它仍是 repo 支援 QA 與一致性門控的預設
  確定性模擬通道。
- `aimock` 會啟動一個由 AIMock 支援的提供者伺服器，用於實驗性協定、
  測試固件、錄製/重放與混亂測試覆蓋。這是累加性的，並不會
  取代 `mock-openai` 情境分派器。

提供者通道的實作位於 `extensions/qa-lab/src/providers/` 下。
每個提供者擁有其預設值、本機伺服器啟動、Gateway 模型設定、
驗證設定檔暫存需求，以及即時/模擬功能標誌。共享的套件與
Gateway 程式碼應透過提供者註冊表路由，而非根據提供者名稱進行分支。

## 傳輸適配器

`qa-lab` 擁有用於 Markdown QA 情境的通用傳輸接縫。`qa-channel` 是該接縫上的首個適配器，但設計目標更廣泛：未來的真實或合成通道應接入同一個套件執行器，而非新增傳輸專屬的 QA 執行器。

在架構層級上，劃分如下：

- `qa-lab` 擁有通用情境執行、Worker 並行、產生品寫入與報告功能。
- 傳輸適配器擁有 Gateway 設定、就緒狀態、輸入與輸出觀察、傳輸動作，以及正規化的傳輸狀態。
- `qa/scenarios/` 下的 Markdown 情境檔案定義了測試執行；`qa-lab` 提供執行這些檔案的可重複使用執行時介面。

### 新增通道

將通道新增至 Markdown QA 系統僅需要兩件事：

1. 該通道的傳輸適配器。
2. 用於執行通道契約的情境套件。

當共享的 `qa-lab` 主機可以擁有此流程時，請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共享的主機機制：

- `openclaw qa` 指令根目錄
- 套件啟動與拆解
- Worker 並行
- 產生品寫入
- 報告生成
- 場景執行
- 較舊 `qa-channel` 場景的相容性別名

Runner 插件擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置閘道
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開對話紀錄和標準化的傳輸狀態
- 如何執行傳輸支援的動作
- 如何處理傳輸特定的重設或清理

採用新頻道的最低門檻：

1. 保持 `qa-lab` 為共享 `qa` 根目錄的擁有者。
2. 在共享的 `qa-lab` host seam 上實作傳輸 runner。
3. 將傳輸特定的機制保留在 runner 插件或頻道 harness 內。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根指令。Runner 插件應該在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出匹配的 `qaRunnerCliRegistrations` 陣列。保持 `runtime-api.ts` 輕量；延遲 CLI 和 runner 執行應保留在獨立的進入點後。
5. 在主題式的 `qa/scenarios/` 目錄下撰寫或調整 markdown 場景。
6. 針對新場景使用通用場景輔助函式。
7. 除非倉庫正在進行有意識的遷移，否則請保持現有的相容性別名正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於單一頻道傳輸，請將其保留在該 runner 插件或 plugin harness 中。
- 如果場景需要多個頻道都能使用的新功能，請新增通用輔助函式，而不是在 `suite.ts` 中新增頻道特定的分支。
- 如果行為僅對一種傳輸有意義，請保持場景為傳輸特定，並在場景合約中明確說明。

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

相容性別名仍可於現有情境中使用 —— `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` —— 但新情境的編寫應使用通用名稱。這些別名存在是為了避免一次性大規模遷移，而非作為未來的模式。

## 報告

`qa-lab` 會從觀察到的匯流排時間軸匯出 Markdown 協議報告。
此報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼仍處於受阻狀態
- 哪些後續情境值得新增

若要取得可用情境的清單 —— 這在評估後續工作範圍或接駁新傳輸時很有用 —— 請執行 `pnpm openclaw qa coverage`（加入 `--json` 以取得機器可讀的輸出）。
當為修改過的行為或檔案路徑選擇專注的驗證時，請執行 `pnpm openclaw qa coverage --match <query>`。
匹配報告會搜尋情境元資料、文件參照、程式碼參照、覆蓋範圍 ID、外掛程式和提供者需求，然後列印出符合的 `qa suite --scenario ...` 目標。
請將其視為輔助發現的工具，而非取代閘道；選取的情境仍需針對受測行為使用正確的提供者模式、即時傳輸、Multipass、Testbox 或發行版本通道。

若要進行字元與樣式檢查，請在多個即時模型參照上執行相同的情境，並撰寫一份已評判的 Markdown 報告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

此指令會執行本機 QA 閘道子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，然後執行一般使用者輪次，例如聊天、工作區協助和小型檔案任務。候選模型不應被告知它正在接受評估。該指令會保留每份完整逐字稿，記錄基本執行統計資料，然後在支援的情況下，以快速模式要求評審模型使用 `xhigh` 推理，根據自然度、氛圍和幽默感對執行進行排名。比較供應商時請使用 `--blind-judge-models`：評審提示仍會收到所有逐字稿和執行狀態，但候選參照會被替換為中性標籤（例如 `candidate-01`）；報告會在解析後將排名對應回真實參照。候選執行預設為 `high` 思考，針對 GPT-5.5 則使用 `medium`，而對於支援此功能的較舊 OpenAI 評估參照則使用 `xhigh`。若要覆寫特定候選項，請使用 `--model provider/model,thinking=<level>` 進行內聯設定。`--thinking <level>` 仍會設定全域後備值，而較舊的 `--model-thinking <provider/model=level>` 形式則為了相容性而予以保留。OpenAI 候選參照預設為快速模式，因此在供應商支援的情況下會使用優先處理。當單一候選項或評審需要覆寫時，請內聯新增 `,fast`、`,no-fast` 或 `,fast=false`。僅在您希望對每個候選模型強制開啟快速模式時，才傳遞 `--fast`。候選項和評審的持續時間會記錄在報告中用於基準分析，但評審提示會明確說明不要依速度排名。候選項和評審模型執行皆預設為並行數 16。當供應商限制或本機閘道壓力導致執行過於雜訊時，請降低 `--concurrency` 或 `--judge-concurrency`。當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-8`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（當未傳遞 `--model` 時）。當未傳遞 `--judge-model` 時，評審預設為 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-8,thinking=high`。

## 相關文件

- [Matrix QA](/zh-Hant/concepts/qa-matrix)
- [Personal agent benchmark pack](/zh-Hant/concepts/personal-agent-benchmark-pack)
- [QA Channel](/zh-Hant/channels/qa-channel)
- [Testing](/zh-Hant/help/testing)
- [Dashboard](/zh-Hant/web/dashboard)
