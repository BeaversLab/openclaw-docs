---
summary: "Debugging tools: watch mode, raw model streams, and tracing reasoning leakage"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "Debugging"
---

# Debugging

This page covers debugging helpers for streaming output, especially when a
provider mixes reasoning into normal text.

## Runtime debug overrides

Use `/debug` in chat to set **runtime-only** config overrides (memory, not disk).
`/debug` is disabled by default; enable with `commands.debug: true`.
This is handy when you need to toggle obscure settings without editing `openclaw.json`.

Examples:

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` clears all overrides and returns to the on-disk config.

## Gateway watch mode

For fast iteration, run the gateway under the file watcher:

```bash
pnpm gateway:watch
```

This maps to:

```bash
node scripts/watch-node.mjs gateway --force
```

The watcher restarts on build-relevant files under `src/`, extension source files,
extension `package.json` and `openclaw.plugin.json` metadata, `tsconfig.json`,
`package.json`, and `tsdown.config.ts`. Extension metadata changes restart the
gateway without forcing a `tsdown` rebuild; source and config changes still
rebuild `dist` first.

Add any gateway CLI flags after `gateway:watch` and they will be passed through on
each restart.

## Dev profile + dev gateway (--dev)

Use the dev profile to isolate state and spin up a safe, disposable setup for
debugging. There are **two** `--dev` flags:

- **Global `--dev` (profile):** isolates state under `~/.openclaw-dev` and
  defaults the gateway port to `19001` (derived ports shift with it).
- **`gateway --dev`: tells the Gateway to auto-create a default config +
  workspace** when missing (and skip BOOTSTRAP.md).

Recommended flow (dev profile + dev bootstrap):

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

If you don’t have a global install yet, run the CLI via `pnpm openclaw ...`.

What this does:

1. **設定檔隔離** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/canvas 隨之變更)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺少設定，則寫入最小設定 (`gateway.mode=local`, bind loopback)。
   - 將 `agent.workspace` 設定為 dev workspace。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺少 workspace 檔案，則植入它們：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (protocol droid)。
   - 在 dev 模式下略過頻道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程 (全新開始)：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** 設定檔標誌，且會被某些 runner 吞掉。
如果您需要明確指定，請使用 env var 形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、工作階段和 dev workspace (使用
`trash`，而非 `rm`)，然後重新建立預設的 dev 設定。

提示：如果非 dev gateway 已在執行中 (launchd/systemd)，請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流記錄 (OpenClaw)

OpenClaw 可以在任何篩選/格式化之前記錄 **原始助理串流**。
這是檢查推理是否以純文字增量形式到達
(或是作為獨立的思考區塊) 的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --raw-stream
```

可選的路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對等的環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

若要在將 **原始 OpenAI 相容區塊** 解析為區塊之前進行擷取，
pi-mono 會公開一個獨立的記錄器：

```bash
PI_RAW_STREAM=1
```

可選的路徑：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：這僅由使用 pi-mono
> `openai-completions` 提供者的程序發出。

## 安全注意事項

- 原始串流記錄可能包含完整的提示、工具輸出和使用者資料。
- 請將記錄保留在本地，並在除錯後將其刪除。
- 如果您分享記錄，請先清除機密和個人資訊。

import en from "/components/footer/en.mdx";

<en />
