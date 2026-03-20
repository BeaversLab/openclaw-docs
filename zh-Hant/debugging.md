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
pnpm gateway:watch --force
```

This maps to:

```bash
tsx watch src/entry.ts gateway --force
```

Add any gateway CLI flags after `gateway:watch` and they will be passed through
on each restart.

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

1. **Profile isolation** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (browser/canvas shift accordingly)

2. **Dev bootstrap** (`gateway --dev`)
   - Writes a minimal config if missing (`gateway.mode=local`, bind loopback).
   - Sets `agent.workspace` to the dev workspace.
   - Sets `agent.skipBootstrap=true` (no BOOTSTRAP.md).
   - 如果缺失則植入工作區檔案：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 預設身分：**C3‑PO**（協議機器人）。
   - 在開發模式下略過頻道提供者（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（重新開始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** 設定檔旗標，會被某些執行器吞掉。
如果您需要明確指定，請使用環境變數形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、會話以及開發工作區（使用
`trash`，而非 `rm`），然後重建預設的開發設定。

提示：如果非開發版閘道器已在執行中（launchd/systemd），請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流日誌

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助手串流**。
這是查看推理是否以純文字增量形式（或作為獨立的思考區塊）到達的最佳方式。

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

## 原始區塊日誌 (pi-mono)

為了在被解析為區塊之前擷取 **原始 OpenAI 相容區塊**，
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
> `openai-completions` 提供者的程序輸出。

## 安全注意事項

- 原始串流日誌可能包含完整的提示詞、工具輸出和用戶數據。
- 將日誌保留在本地，並在偵錯後刪除它們。
- 如果您分享日誌，請先清除機密和個人資訊（PII）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
