---
summary: "偵錯工具：監看模式、原始模型串流以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "偵錯"
---

# 偵錯

本頁涵蓋了串流輸出的偵錯輔助工具，特別是當提供者將推理混合到一般文字中時。

## 執行時期偵錯覆寫

在聊天中使用 `/debug` 來設定 **僅限執行時期** 的設定覆寫（記憶體中，而非磁碟）。
`/debug` 預設為停用；請透過 `commands.debug: true` 啟用。
當您需要切換不明顯的設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 清除所有覆寫並返回到磁碟上的設定。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch --force
```

這對應到：

```bash
tsx watch src/entry.ts gateway --force
```

在 `gateway:watch` 之後新增任何 gateway CLI 標誌，它們將會在每次重新啟動時
被傳遞過去。

## Dev 設定檔 + dev gateway (--dev)

使用 dev 設定檔來隔離狀態，並啟動一個安全、可拋棄的設定進行
偵錯。這裡有 **兩個** `--dev` 標誌：

- **全域 `--dev` (profile)：** 在 `~/.openclaw-dev` 下隔離狀態並
  將 gateway 連接埠預設為 `19001` (衍生的連接埠會隨之移動)。
- **`gateway --dev`：告知 Gateway 在缺失時自動建立預設設定 +
  工作區** (並跳過 BOOTSTRAP.md)。

建議流程 (dev profile + dev bootstrap)：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

其作用：

1. **設定檔隔離** (全域 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/canvas 隨之移動)

2. **Dev bootstrap** (`gateway --dev`)
   - 若缺失則寫入最小設定 (`gateway.mode=local`, 繫結 loopback)。
   - 將 `agent.workspace` 設定為 dev 工作區。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺少，則植入工作區檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身份：**C3‑PO** (protocol droid)。
   - 在開發模式中跳過通道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (全新開始)：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** 配置文件標誌，會被某些運行器吞噬。
如果您需要明確指定，請使用環境變數形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除配置、憑證、會話和開發工作區 (使用
`trash`，而不是 `rm`)，然後重新建立預設的開發設定。

提示：如果非開發閘道器正在運行中 (launchd/systemd)，請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流日誌記錄

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助手串流**。
這是檢查推理是否以純文字增量形式到達
(或是作為獨立的思考區塊) 的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --force --raw-stream
```

可選路徑覆寫：

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對應的環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊日誌記錄

為了在 **原始 OpenAI 相容區塊** 被解析為區塊之前進行擷取，
pi-mono 揭示了一個獨立的記錄器：

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
> `openai-completions` 提供者的程序輸出。

## 安全注意事項

- 原始串流日誌可能包含完整的提示詞、工具輸出和用戶數據。
- 將日誌保存在本地，並在除錯後刪除它們。
- 如果您分享日誌，請先清除機密和個人隱私數據 (PII)。
