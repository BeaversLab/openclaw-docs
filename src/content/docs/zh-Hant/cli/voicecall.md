---
summary: "CLI 參考資料，適用於 `openclaw voicecall`（voice-call 外掛指令介面）"
read_when:
  - You use the voice-call plugin and want every CLI entry point
  - You need flag tables and defaults for setup, smoke, call, continue, speak, dtmf, end, status, tail, latency, expose, and start
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一個由外掛提供的指令。只有在安裝並啟用 voice-call 外掛後才會顯示。

當 Gateway 正在執行時，操作指令（`call`、`start`、`continue`、`speak`、`dtmf`、`end`、`status`）會路由至該 Gateway 的 voice-call 執行時期。如果無法連線到任何 Gateway，它們會回退到獨立的 CLI 執行時期。

## 子指令

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| 子指令     | 描述                                                        |
| ---------- | ----------------------------------------------------------- |
| `setup`    | 顯示提供者和 webhook 的就緒檢查。                           |
| `smoke`    | 執行就緒檢查；僅在使用 `--yes` 時撥打實際測試通話。         |
| `call`     | 發起外語音通話。                                            |
| `start`    | `call` 的別名，其中 `--to` 為必要項，`--message` 為選用項。 |
| `continue` | 說出一則訊息並等待下一個回應。                              |
| `speak`    | 說出一則訊息而不等待回應。                                  |
| `dtmf`     | 傳送 DTMF 數字至進行中的通話。                              |
| `end`      | 掛斷進行中的通話。                                          |
| `status`   | 檢查進行中的通話（或透過 `--call-id` 檢查單一通話）。       |
| `tail`     | 追蹤 `calls.jsonl`（在提供者測試期間很有用）。              |
| `latency`  | 彙總來自 `calls.jsonl` 的延遲指標。                         |
| `expose`   | 切換 webhook 端點的 Tailscale serve/funnel。                |

## 設定與初步測試

### `setup`

預設會列印人類可讀的就緒檢查。針對腳本請傳入 `--json`。

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

執行相同的就緒檢查。除非同時存在 `--to` 和 `--yes`，否則不會撥打實際電話。

| 旗標               | 預設值                            | 描述                                   |
| ------------------ | --------------------------------- | -------------------------------------- |
| `-t, --to <phone>` | (無)                              | 即時煙霧測試要撥打的電話號碼。         |
| `--message <text>` | `OpenClaw voice call smoke test.` | 在煙霧測試通話期間要說出的訊息。       |
| `--mode <mode>`    | `notify`                          | 通話模式：`notify` 或 `conversation`。 |
| `--yes`            | `false`                           | 實際撥打即時外撥電話。                 |
| `--json`           | `false`                           | 列印機器可讀取的 JSON。                |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

<Note>對於外部提供者 (`twilio`, `telnyx`, `plivo`)，`setup` 和 `smoke` 需要來自 `publicUrl`、通道或 Tailscale 曝露的公開 webhook URL。回送或私有伺服器回退會被拒絕，因為電信業者無法連線至該處。</Note>

## 通話生命週期

### `call`

發起外撥語音通話。

| 旗標                   | 必填 | 預設值            | 描述                                                               |
| ---------------------- | ---- | ----------------- | ------------------------------------------------------------------ |
| `-m, --message <text>` | 是   | (無)              | 通話連線時要說出的訊息。                                           |
| `-t, --to <phone>`     | 否   | config `toNumber` | 要撥打的 E.164 電話號碼。                                          |
| `--mode <mode>`        | 否   | `conversation`    | 通話模式：`notify` (訊息說完後掛斷) 或 `conversation` (保持連線)。 |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

### `start`

`call` 的別名，具有不同的預設旗標形狀。

| 旗標               | 必填 | 預設值         | 描述                                   |
| ------------------ | ---- | -------------- | -------------------------------------- |
| `--to <phone>`     | 是   | (無)           | 要撥打的電話號碼。                     |
| `--message <text>` | 否   | (無)           | 通話連線時要說出的訊息。               |
| `--mode <mode>`    | 否   | `conversation` | 通話模式：`notify` 或 `conversation`。 |

### `continue`

說出訊息並等待回應。

| 旗標               | 必填 | 描述           |
| ------------------ | ---- | -------------- |
| `--call-id <id>`   | 是   | 通話 ID。      |
| `--message <text>` | 是   | 要朗讀的訊息。 |

### `speak`

朗讀訊息而不等待回應。

| 標誌               | 必要 | 說明           |
| ------------------ | ---- | -------------- |
| `--call-id <id>`   | 是   | 通話 ID。      |
| `--message <text>` | 是   | 要朗讀的訊息。 |

### `dtmf`

向進行中的通話發送 DTMF 數字。

| 標誌                | 必要 | 說明                                     |
| ------------------- | ---- | ---------------------------------------- |
| `--call-id <id>`    | 是   | 通話 ID。                                |
| `--digits <digits>` | 是   | DTMF 數字（例如 `ww123456#` 代表等待）。 |

### `end`

掛斷進行中的通話。

| 標誌             | 必要 | 說明      |
| ---------------- | ---- | --------- |
| `--call-id <id>` | 是   | 通話 ID。 |

### `status`

檢查進行中的通話。

| 標誌             | 預設值  | 說明                   |
| ---------------- | ------- | ---------------------- |
| `--call-id <id>` | （無）  | 將輸出限制為單一通話。 |
| `--json`         | `false` | 列印機器可讀的 JSON。  |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## 日誌與指標

### `tail`

追蹤 voice-call JSONL 日誌。啟動時列印最後 `--since` 行，然後隨著寫入串流新行。

| 標誌            | 預設值           | 說明                     |
| --------------- | ---------------- | ------------------------ |
| `--file <path>` | 從插件儲存庫解析 | `calls.jsonl` 的路徑。   |
| `--since <n>`   | `25`             | 開始追蹤前要列印的行數。 |
| `--poll <ms>`   | `250`（最少 50） | 輪詢間隔（毫秒）。       |

### `latency`

總結 `calls.jsonl` 中的 turn-latency 和 listen-wait 指標。輸出是包含 `recordsScanned`、`turnLatency` 和 `listenWait` 總結的 JSON。

| 標誌            | 預設值           | 說明                   |
| --------------- | ---------------- | ---------------------- |
| `--file <path>` | 從插件儲存庫解析 | `calls.jsonl` 的路徑。 |
| `--last <n>`    | `200`（最少 1）  | 要分析的最近記錄數量。 |

## 公開 Webhooks

### `expose`

啟用、停用或變更語音 webhook 的 Tailscale serve/funnel 設定。

| 標誌                  | 預設值                                  | 說明                                            |
| --------------------- | --------------------------------------- | ----------------------------------------------- |
| `--mode <mode>`       | `funnel`                                | `off`、`serve` (tailnet) 或 `funnel` (public)。 |
| `--path <path>`       | 設定 `tailscale.path` 或 `--serve-path` | 要暴露的 Tailscale 路徑。                       |
| `--port <port>`       | 設定 `serve.port` 或 `3334`             | 本機 webhook 連接埠。                           |
| `--serve-path <path>` | 設定 `serve.path` 或 `/voice/webhook`   | 本機 webhook 路徑。                             |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>僅將 webhook 端點暴露給您信任的網路。盡可能優先使用 Tailscale Serve 而非 Funnel。</Warning>

## 相關

- [CLI 參考](/zh-Hant/cli)
- [語音通話外掛](/zh-Hant/plugins/voice-call)
