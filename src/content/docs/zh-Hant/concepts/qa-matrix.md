---
summary: "Docker 支援的 Matrix 即時 QA 通道的維護者參考：CLI、設定檔、環境變數、情境和輸出成品。"
read_when:
  - Running pnpm openclaw qa matrix locally
  - Adding or selecting Matrix QA scenarios
  - Triaging Matrix QA failures, timeouts, or stuck cleanup
title: "Matrix QA"
---

Matrix QA 通道針對 Docker 中的一次性 Tuwunel homeserver 執行內建的 `@openclaw/matrix` 外掛程式，並包含暫時的驅動程式、SUT 和觀察者帳戶以及預先植入的房間。這是 Matrix 的即時傳輸真實覆蓋範圍。

這是僅供維護者使用的工具。封裝的 OpenClaw 版本刻意省略了 `qa-lab`，因此 `openclaw qa` 僅可透過原始碼結帳取得。原始碼結帳會直接載入內建的執行器 — 無需安裝外掛程式的步驟。

如需更廣泛的 QA 框架背景，請參閱 [QA 概觀](/zh-Hant/concepts/qa-e2e-automation)。

## 快速入門

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

單純的 `pnpm openclaw qa matrix` 會執行 `--profile all` 並且不會在第一次失敗時停止。請使用 `--profile fast --fail-fast` 作為發布閘道；當平行執行完整清單時，請使用 `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` 將目錄分片。

## 通道的用途

1. 在 Docker 中佈建一次性 Tuwunel homeserver（預設映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`、伺服器名稱 `matrix-qa.test`、連接埠 `28008`）。
2. 註冊三個暫時使用者 — `driver`（傳送輸入流量）、`sut`（受測的 OpenClaw Matrix 帳戶）、`observer`（第三方流量擷取）。
3. 植入所選情境所需的房間（主要、執行緒、媒體、重新啟動、次要、允許清單、E2EE、驗證 DM 等）。
4. 啟動子 OpenClaw 閘道，並將真實的 Matrix 外掛程式範圍限定於 SUT 帳戶；子程序中不會載入 `qa-channel`。
5. 依序執行情境，透過驅動程式/觀察者 Matrix 用戶端觀察事件。
6. 拆除 homeserver，撰寫報告和摘要成品，然後結束。

## CLI

```text
pnpm openclaw qa matrix [options]
```

### 常見旗標

| 旗標                  | 預設值                                        | 說明                                                                          |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | 情境設定檔。請參閱 [設定檔](#profiles)。                                      |
| `--fail-fast`         | off                                           | 在第一個檢查或場景失敗時停止。                                                |
| `--scenario <id>`     | ——                                            | 僅執行此場景。可重複使用。請參閱[場景](#scenarios)。                          |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | 寫入報告、摘要、觀察事件和輸出日誌的位置。相對路徑相對於 `--repo-root` 解析。 |
| `--repo-root <path>`  | `process.cwd()`                               | 從中性工作目錄調用時的儲存庫根目錄。                                          |
| `--sut-account <id>`  | `sut`                                         | QA 閘道配置中的 Matrix 帳戶 ID。                                              |

### 提供者標誌

此通道使用真實的 Matrix 傳輸，但模型提供者是可配置的：

| 標誌                     | 預設值          | 描述                                                                                                         |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `--provider-mode <mode>` | `live-frontier` | 用於確定性模擬分派的 `mock-openai` 或用於即時前沿提供者的 `live-frontier`。舊版別名 `live-openai` 仍然有效。 |
| `--model <ref>`          | 提供者預設值    | 主要 `provider/model` 參考。                                                                                 |
| `--alt-model <ref>`      | 提供者預設值    | 場景中途切換時使用的替代 `provider/model` 參考。                                                             |
| `--fast`                 | 關閉            | 在支援的情況下啟用提供者快速模式。                                                                           |

Matrix QA 不接受 `--credential-source` 或 `--credential-role`。此通道會在本地配置一次性使用者；沒有共享憑證池可供租用。

## 設定檔

選取的設定檔決定執行哪些場景。

| 設定檔       | 用途                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `all` (預設) | 完整目錄。緩慢但窮盡。                                                                                                 |
| `fast`       | 執行即時傳輸契約的發布門控子集：金絲雀、提及門控、允許清單封鎖、回覆形狀、重啟恢復、執行續追蹤、執行續隔離、反應觀察。 |
| `transport`  | 傳輸層級的執行續、DM、房間、自動加入、提及/允許清單場景。                                                              |
| `media`      | 圖片、音訊、影片、PDF、EPUB 附件涵蓋範圍。                                                                             |
| `e2ee-smoke` | 最小 E2EE 涵蓋範圍 — 基本加密回覆、執行續追蹤、引導成功。                                                              |
| `e2ee-deep`  | 窮盡的 E2EE 狀態遺失、備份、金鑰與復原情境。                                                                           |
| `e2ee-cli`   | 透過 QA 隨機測試驅動的 `openclaw matrix encryption setup` 與 `verify *` CLI 情境。                                     |

確切對應關係存於 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`。

## 情境

完整的情境 ID 清單是 `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15` 中的 `MatrixQaScenarioId` 聯集。分類包含：

- 串接 — `matrix-thread-*`、`matrix-subagent-thread-spawn`
- 頂層 / 私訊 / 房間 — `matrix-top-level-reply-shape`、`matrix-room-*`、`matrix-dm-*`
- 媒體 — `matrix-media-type-coverage`、`matrix-room-image-understanding-attachment`、`matrix-attachment-only-ignored`、`matrix-unsupported-media-safe`
- 路由 — `matrix-room-autojoin-invite`、`matrix-secondary-room-*`
- 反應 — `matrix-reaction-*`
- 重啟與重播 — `matrix-restart-*`、`matrix-stale-sync-replay-dedupe`、`matrix-room-membership-loss`、`matrix-homeserver-restart-resume`、`matrix-initial-catchup-then-incremental`
- 提及閘控與允許清單 — `matrix-mention-*`、`matrix-allowlist-*`、`matrix-multi-actor-ordering`、`matrix-inbound-edit-*`、`matrix-mxid-prefixed-command-block`、`matrix-observer-allowlist-override`
- E2EE — `matrix-e2ee-*`（基本回覆、串接後續、引導、復原金鑰生命週期、狀態遺失變體、伺服器備份行為、裝置衛生、SAS / QR / 私訊驗證、重啟、修訂）
- E2EE CLI — `matrix-e2ee-cli-*`（加密設定、等冪設定、引導失敗、復原金鑰生命週期、多帳號、閘道回覆來回、自我驗證）

傳入 `--scenario <id>`（可重複）以執行精選集合；結合 `--profile all` 以忽略設定檔閘控。

## 環境變數

| 變數                                    | 預設值                                    | 效果                                                                                                                                     |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000`（30 分鐘）                      | 整個執行過程的硬性上限。                                                                                                                 |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | 負向無回覆斷言的安靜時間視窗。被限制為執行逾時 `≤`。                                                                                     |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Docker 拆卸的界限。故障表面包括修復 `docker compose ... down --remove-orphans` 指令。                                                    |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | 在針對不同的 Tuwunel 版本進行驗證時，覆寫 homeserver 映像檔。                                                                            |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | on                                        | `0` 會在 stderr 上讓 `[matrix-qa] ...` 進度列靜音。`1` 會強制開啟它們。                                                                  |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | redacted                                  | `1` 會保留 `matrix-qa-observed-events.json` 中的訊息主體和 `formatted_body`。預設會編輯以保護 CI 成品。                                  |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | off                                       | `1` 會在寫入成品後跳過確定性 `process.exit`。預設會強制退出，因為 matrix-js-sdk 的原生加密控制代碼可能會讓事件迴圈在成品完成後繼續運作。 |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | unset                                     | 當由外部啟動器設定時（例如 `scripts/run-node.mjs`），Matrix QA 會重用該日誌路徑，而不是啟動自己的 tee。                                  |

## 輸出成品

寫入至 `--output-dir`：

- `matrix-qa-report.md` — Markdown 協議報告（通過、失敗、跳過的內容及原因）。
- `matrix-qa-summary.json` — 適合 CI 解析和儀表板的結構化摘要。
- `matrix-qa-observed-events.json` — 從驅動程式和觀察者客戶端觀察到的 Matrix 事件。除非 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`，否則主體會被編輯。
- `matrix-qa-output.log` — 執行期間合併的 stdout/stderr。如果設定了 `OPENCLAW_RUN_NODE_OUTPUT_LOG`，則會改用外部啟動器的日誌。

預設輸出目錄是 `<repo>/.artifacts/qa-e2e/matrix-<timestamp>`，因此連續執行不會互相覆蓋。

## 排查提示

- **執行接近結束時掛起：** `matrix-js-sdk` 原生加密控制代碼的生命週期可能超過測試套件。預設會在寫入產出後強制執行乾淨的 `process.exit`；如果您已取消設定 `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`，請預期程序會滯留。
- **清理錯誤：** 尋找列印出的恢復指令（一個 `docker compose ... down --remove-orphans` 呼叫）並手動執行它以釋放 homeserver 連接埠。
- **CI 中不穩定的否定斷言視窗：** 當 CI 速度很快時降低 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS`（預設為 8 秒）；在緩慢的共享執行器上則調高它。
- **錯誤報告需要編輯過的內容：** 使用 `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` 重新執行並附上 `matrix-qa-observed-events.json`。請將產生的產出視為敏感資料。
- **不同的 Tuwunel 版本：** 將 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 指向受測版本。此通道只會檢入固定預設映像檔。

## 即時傳輸合約

Matrix 是三個即時傳輸通道之一，這三個通道共用一個定義於 [QA 概觀 → 即時傳輸覆蓋率](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage) 的單一合約檢查清單。`qa-channel` 仍是廣泛的綜合測試套件，且有意不包含在該矩陣中。

## 相關

- [QA 概觀](/zh-Hant/concepts/qa-e2e-automation) — 整體 QA 堆疊與即時傳輸合約
- [QA Channel](/zh-Hant/channels/qa-channel) — 用於支援儲存庫情境的綜合通道適配器
- [測試](/zh-Hant/help/testing) — 執行測試與新增 QA 覆蓋率
- [Matrix](/zh-Hant/channels/matrix) — 受測試的通道外掛程式
