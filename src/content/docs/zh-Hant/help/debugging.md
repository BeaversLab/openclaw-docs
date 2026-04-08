---
summary: "除錯工具：監看模式、原始模型串流，以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

# 除錯

本頁面涵蓋串流輸出的除錯輔助工具，特別是當供應商將推理內容混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定**僅限執行時期**的配置覆寫（記憶體中，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 啟用。
當您需要切換不常用的設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並回到磁碟上的配置。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch
```

這對應至：

```bash
node scripts/watch-node.mjs gateway --force
```

監看器會在 `src/` 下的建置相關檔案、擴充功能原始檔、
擴充功能 `package.json` 與 `openclaw.plugin.json` 中繼資料、`tsconfig.json`、
`package.json` 和 `tsdown.config.ts` 變更時重新啟動。
擴充功能中繼資料變更會重新啟動 gateway，而不會強制進行 `tsdown` 重新建置；
原始碼和配置變更仍會先重新建置 `dist`。

在 `gateway:watch` 之後新增任何 gateway CLI 旗標，它們將在每次重新啟動時被傳遞。現在，針對同一個儲存庫/旗標組重新執行相同的監視指令會取代較舊的監視器，而不會留下重複的監視器父行程。

## Dev 設定檔 + dev gateway (--dev)

使用 dev 設定檔來隔離狀態，並啟動安全的、可拋棄的設定進行除錯。
共有 **兩個** `--dev` 標誌：

- **全域 `--dev`（設定檔）：** 將狀態隔離在 `~/.openclaw-dev` 下，並
  將 gateway 連接埠預設為 `19001`（衍生連接埠會隨之變動）。
- **`gateway --dev`：** 告訴 Gateway 在缺少時自動建立預設配置 +
  workspace\*\*（並跳過 BOOTSTRAP.md）。

建議流程（dev 設定檔 + dev 引導程序）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

這會做什麼：

1. **設定檔隔離**（全域 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/畫布隨之移動)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺少設定，則寫入最小設定 (`gateway.mode=local`，綁定 loopback)。
   - 將 `agent.workspace` 設定為開發工作區。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺少工作區檔案，則植入種子：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (protocol droid)。
   - 在開發模式下略過頻道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (重新開始)：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** 設定檔旗標，且會被某些執行器吞噬。
如果您需要明確指定，請使用環境變數形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、工作階段和開發工作區 (使用
`trash`，而非 `rm`)，然後重新建立預設開發環境。

提示：如果非開發的 Gateway 已經在執行中 (launchd/systemd)，請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流記錄 (OpenClaw)

OpenClaw 可以在任何篩選/格式化之前記錄 **原始助手串流**。
這是查看推理是否以純文字增量形式到達 (或是作為獨立的思考區塊) 的最佳方式。

透過 CLI 啟用它：

```bash
pnpm gateway:watch --raw-stream
```

可選路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對等環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

為了在將 **原始 OpenAI 相容區塊** 解析為區塊之前擷取它們，
pi-mono 公開了一個獨立的記錄器：

```bash
PI_RAW_STREAM=1
```

可選路徑：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：這僅由使用 pi-mono 的
> `openai-completions` 提供者的程序發出。

## 安全注意事項

- 原始串流記錄可能包含完整的提示詞、工具輸出和使用者資料。
- 請將記錄保留在本機，並在偵錯後將其刪除。
- 如果您分享記錄，請先清除機密和個人資訊。
