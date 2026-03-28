---
summary: "除錯工具：監視模式、原始模型串流與追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

# 除錯

本頁涵蓋串流輸出的除錯輔助功能，特別是當提供者將推理內容混入正常文字時。

## 執行階段除錯覆寫

在聊天中使用 `/debug` 來設定**僅限執行階段**的設定覆寫（記憶體，非磁碟）。
`/debug` 預設為停用；使用 `commands.debug: true` 啟用。
當您需要切換冷門設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並回到磁碟上的設定。

## Gateway 監視模式

為了快速迭代，請在檔案監視器下執行 gateway：

```exec
pnpm gateway:watch
```

這對應至：

```exec
node scripts/watch-node.mjs gateway --force
```

監視器會針對 `src/` 下的建置相關檔案、擴充功能原始碼檔案、
擴充功能 `package.json` 與 `openclaw.plugin.json` 元資料、`tsconfig.json`、
`package.json` 和 `tsdown.config.ts` 進行重啟。擴充功能元資料變更會重啟
Gateway，而不需強制 `tsdown` 重新建置；來源與設定變更仍然會
先重新建置 `dist`。

在 `gateway:watch` 之後新增任何 Gateway CLI 旗標，它們將會在每次重啟時
被傳遞下去。

## Dev profile + dev gateway (--dev)

使用 dev profile 來隔離狀態並啟動安全、可捨棄的設定以進行
除錯。共有 **兩個** `--dev` 旗標：

- **Global `--dev` (profile):** isolates state under `~/.openclaw-dev` and
  defaults the gateway port to `19001` (derived ports shift with it).
- **`gateway --dev`: tells the Gateway to auto-create a default config +
  workspace** when missing (and skip BOOTSTRAP.md).

Recommended flow (dev profile + dev bootstrap):

```exec
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

If you don’t have a global install yet, run the CLI via `pnpm openclaw ...`.

What this does:

1. **Profile isolation** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (browser/canvas shift accordingly)

2. **Dev bootstrap** (`gateway --dev`)
   - Writes a minimal config if missing (`gateway.mode=local`, bind loopback).
   - 將 `agent.workspace` 設定為 dev 工作區。
   - 設定 `agent.skipBootstrap=true`（無 BOOTSTRAP.md）。
   - 如果缺少工作區檔案則進行種子設定：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO**（protocol droid）。
   - 在 dev 模式下跳過通道提供者（`OPENCLAW_SKIP_CHANNELS=1`）。

重設流程（重新開始）：

```exec
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **global** 設定檔旗標，會被某些 runner 吞掉。
如果您需要完整拼寫，請使用環境變數格式：

```exec
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、工作階段和 dev 工作區（使用
`trash`，而非 `rm`），然後重建預設的 dev 設定。

提示：如果非開發版本的 Gateway 已經在執行（launchd/systemd），請先停止它：

```exec
openclaw gateway stop
```

## 原始串流記錄

OpenClaw 可以在任何過濾/格式化之前記錄**原始助理串流**。
這是檢查推理內容是否以純文字增量
（或獨立的思考區塊）到達的最佳方式。

透過 CLI 啟用：

```exec
pnpm gateway:watch --raw-stream
```

可選的路徑覆蓋：

```exec
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對應的環境變數：

```exec
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

為了擷取在解析為區塊之前的**原始 OpenAI 相容區塊**，
pi-mono 提供了一個獨立的記錄器：

```exec
PI_RAW_STREAM=1
```

可選路徑：

```exec
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：這僅由使用 pi-mono 的
> `openai-completions` 提供者的程序發出。

## 安全注意事項

- 原始串流記錄可能包含完整的提示詞、工具輸出和用戶數據。
- 請將記錄檔保留在本地，並在除錯後將其刪除。
- 如果您分享記錄檔，請先清除機密資訊和個人識別資訊 (PII)。
