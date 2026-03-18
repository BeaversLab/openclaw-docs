---
summary: "偵錯工具：監看模式、原始模型串流，以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "偵錯"
---

# 偵錯

本頁面涵蓋了用於串流輸出的偵錯輔助工具，特別是當提供者將推理混合到正常文字中時。

## 執行階段偵錯覆寫

在聊天中使用 `/debug` 來設定**僅限執行階段** 的配置覆寫（記憶體，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 來啟用。
當您需要切換不明顯的設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的配置。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch
```

這對應到：

```bash
node scripts/watch-node.mjs gateway --force
```

監看器會在 `src/` 下的建置相關檔案、擴充功能原始碼檔案、
擴充功能 `package.json` 和 `openclaw.plugin.json` 元資料、`tsconfig.json`、
`package.json` 和 `tsdown.config.ts` 變更時重新啟動。擴充功能元資料變更會重新啟動
gateway，而不會強制進行 `tsdown` 重新建置；來源和配置變更仍然
會先重新建置 `dist`。

在 `gateway:watch` 之後加入任何 gateway CLI 旗標，它們將會在
每次重新啟動時被傳遞。

## Dev 設定檔 + dev gateway (--dev)

使用 dev 設定檔來隔離狀態，並啟動一個安全、可拋棄的設定以進行
偵錯。有 **兩個** `--dev` 旗標：

- **全域 `--dev` (設定檔)：** 在 `~/.openclaw-dev` 下隔離狀態並
  將 gateway 預設連接埠設為 `19001` (衍生的連接埠會隨之變動)。
- **`gateway --dev`：告訴 Gateway 在缺少時自動建立預設配置 +
  工作區** (並跳過 BOOTSTRAP.md)。

建議流程 (dev 設定檔 + dev bootstrap)：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

這樣做的效果：

1. **設定檔隔離** (全域 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（瀏覽器/canvas 相應地移動）

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺少配置，則寫入最小配置（`gateway.mode=local`，綁定 loopback）。
   - 將 `agent.workspace` 設置為開發工作區。
   - 設置 `agent.skipBootstrap=true`（無 BOOTSTRAP.md）。
   - 如果缺少工作區文件則進行植入：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO**（protocol droid）。
   - 在開發模式下跳過頻道提供者（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（重新開始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** profile 標誌，會被某些運行器吞掉。
如果需要明確指定，請使用環境變量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除配置、憑證、會話和開發工作區（使用
`trash`，而非 `rm`），然後重新建立預設的開發設置。

提示：如果非開發 Gateway 已經在運行（launchd/systemd），請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流日誌 (OpenClaw)

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助手串流**。
這是查看推理是否以純文本增量形式到達（或作為單獨的思考區塊）的最佳方式。

透過 CLI 啟用它：

```bash
pnpm gateway:watch --raw-stream
```

可選路徑覆蓋：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效的環境變量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊日誌 (pi-mono)

為了在將 **原始 OpenAI 相容區塊** 解析為區塊之前捕獲它們，
pi-mono 公開了一個單獨的記錄器：

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
> `openai-completions` provider 的程序發出。

## 安全注意事項

- 原始串流日誌可能包含完整的提示、工具輸出和用戶數據。
- 請將日誌保存在本地，並在除錯後將其刪除。
- 如果您分享日誌，請先清除機密和個人身份資訊 (PII)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
