---
summary: "偵錯工具：監看模式、原始模型串流以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "偵錯"
---

# 除錯

本頁面涵蓋串流輸出的除錯輔助工具，特別是當供應商將推理內容混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定 **僅限執行時期** 的設定覆寫（記憶體，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 啟用。
當您需要切換冷門設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的設定。

## 工作階段追蹤輸出

當您想要在單一工作階段中查看外掛程式擁有的追蹤/偵錯行，而不啟用完整詳細模式時，請使用 `/trace`。

範例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 進行外掛程式診斷，例如 Active Memory 偵錯摘要。
請繼續使用 `/verbose` 來顯示正常的詳細狀態/工具輸出，並繼續使用
`/debug` 進行僅限執行時期的設定覆寫。

## 閘道監看模式

為了快速迭代，請在檔案監看器下執行閘道：

```bash
pnpm gateway:watch
```

這對應至：

```bash
node scripts/watch-node.mjs gateway --force
```

當 `src/` 下的建置相關檔案、擴充功能原始檔案、
擴充功能 `package.json` 和 `openclaw.plugin.json` 中繼資料、`tsconfig.json`、
`package.json` 以及 `tsdown.config.ts` 變更時，監看器會重新啟動。
擴充功能中繼資料變更會重新啟動閘道，而不會強制進行 `tsdown` 重建；來源和設定變更
仍然會先重建 `dist`。

在 `gateway:watch` 之後新增任何閘道 CLI 標誌，它們將會在每次重新啟動時被傳遞。
現在，針對相同的儲存庫/標誌集重新執行相同的監看指令會取代舊的監看器，而不是留下重複的監看器父程序。

## 開發設定檔 + 開發閘道 (--dev)

使用開發設定檔來隔離狀態並啟動一個安全、可拋棄的設定以進行
偵錯。有 **兩個** `--dev` 標誌：

- **全域 `--dev` (profile)：** 將狀態隔離在 `~/.openclaw-dev` 下，並將
  gateway 連接埠預設為 `19001` (衍生連接埠隨之變更)。
- **`gateway --dev`：** 指示 Gateway 在遺失時自動建立預設設定 +
  工作區\*\* (並跳過 BOOTSTRAP.md)。

建議流程 (dev profile + dev bootstrap)：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

這會做什麼：

1. **Profile 隔離** (全域 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/canvas 隨之變更)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果遺失則寫入最小設定 (`gateway.mode=local`，繫結 loopback)。
   - 將 `agent.workspace` 設定為 dev 工作區。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果遺失則植入工作區檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (protocol droid)。
   - 在 dev 模式下跳過通道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (全新開始)：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** profile 標誌，會被某些 runner 吞掉。
如果您需要明確指定，請使用環境變數形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、工作階段和 dev 工作區 (使用
`trash`，而非 `rm`)，然後重新建立預設 dev 設定。

提示：如果非 dev gateway 已在執行中 (launchd/systemd)，請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流記錄

OpenClaw 可以在任何篩選/格式化之前記錄 **原始 assistant 串流**。
這是查看推理是否以純文字增量 到達
(或作為獨立的思考區塊) 的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --raw-stream
```

可選的路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等價的環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

為了在將 **原始 OpenAI 相容區塊** 解析為區塊之前進行捕獲，
pi-mono 提供了一個獨立的記錄器：

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

- 原始串流日誌可能包含完整的提示、工具輸出和用戶數據。
- 請將日誌保留在本地，並在偵錯後將其刪除。
- 如果您分享日誌，請先清除機密資訊和個人識別資訊 (PII)。
