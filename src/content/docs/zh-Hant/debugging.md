---
summary: "除錯工具：監看模式、原始模型串流，以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

# 除錯

本頁涵蓋用於串流輸出的除錯輔助工具，特別是當提供者將推理內容混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定**僅限執行時期** 的組態覆寫（記憶體，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 啟用。
當您需要切換冷門設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的組態。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```exec
pnpm gateway:watch --force
```

這對應至：

```exec
tsx watch src/entry.ts gateway --force
```

在 `gateway:watch` 之後新增任何 gateway CLI 標誌，它們將會在每次重啟時被傳遞。

## Dev profile + dev gateway (--dev)

使用 dev profile 來隔離狀態並啟動一個安全的、可拋棄的設定用於
debugging。有 **兩個** `--dev` 標誌：

- **全域 `--dev` (profile):** 在 `~/.openclaw-dev` 下隔離狀態並
  將 gateway 連接埠預設為 `19001` (衍生連接埠隨之變動)。
- **`gateway --dev`：告訴 Gateway 在缺少時自動建立預設設定 +
  workspace** (並跳過 BOOTSTRAP.md)。

建議流程 (dev profile + dev bootstrap)：

```exec
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

這樣做的作用：

1. **Profile 隔離** (全域 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/畫布相應移動)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺失，寫入最小設定 (`gateway.mode=local`, 繫結回送位址)。
   - 將 `agent.workspace` 設定為 dev 工作區。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺失，植入工作區檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (通訊機器人)。
   - 在 dev 模式下略過頻道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (全新開始)：

```exec
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** 設定檔標誌，且會被某些執行器「吃掉」。
如果您需要明確指定，請使用環境變數形式：

```exec
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、工作階段和開發工作區（使用
`trash`，而非 `rm`），然後重建預設的開發環境。

提示：如果非開發版本的 Gateway 已在執行中（launchd/systemd），請先將其停止：

```exec
openclaw gateway stop
```

## 原始串流記錄

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助手串流**。
這是查看推理內容是否以純文字增量形式
（或作為獨立的思考區塊）到達的最佳方式。

透過 CLI 啟用：

```exec
pnpm gateway:watch --force --raw-stream
```

可選的路徑覆寫：

```exec
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對等的环境變數：

```exec
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄

為了在將 **原始 OpenAI 相容區塊** 解析為區塊之前進行擷取，
pi-mono 提供了一個獨立的記錄器：

```exec
PI_RAW_STREAM=1
```

選用路徑：

```exec
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：這僅由使用 pi-mono 的
> `openai-completions` 提供者的程序發出。

## 安全注意事項

- 原始串流日誌可能包含完整的提示詞、工具輸出和使用者資料。
- 請將日誌保留在本地，並在除錯後將其刪除。
- 如果您分享日誌，請先清除機密資訊和個人識別資訊 (PII)。
