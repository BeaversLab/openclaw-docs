---
summary: "Direct `openclaw agent` CLI runs (with optional delivery)"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent` (direct agent runs)

`openclaw agent` runs a single agent turn without needing an inbound chat message.
By default it goes **through the Gateway**; add `--local` to force the embedded
runtime on the current machine.

## 行為

- Required: `--message <text>`
- Session 選擇：
  - `--to <dest>` derives the session key (group/channel targets preserve isolation; direct chats collapse to `main`), **or**
  - `--session-id <id>` reuses an existing session by id, **or**
  - `--agent <id>` targets a configured agent directly (uses that agent's `main` session key)
- 執行與一般傳入回覆相同的嵌入式 agent runtime。
- Thinking/verbose 標記會持續保留到 session 存儲中。
- 輸出：
  - default: prints reply text (plus `MEDIA:<url>` lines)
  - `--json`: prints structured payload + metadata
- Optional delivery back to a channel with `--deliver` + `--channel` (target formats match `openclaw message --target`).
- Use `--reply-channel`/`--reply-to`/`--reply-account` to override delivery without changing the session.

如果 Gateway 無法連線，CLI 將 **回退** 到嵌入式本機執行。

## 範例

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 標記

- `--local`: run locally (requires model provider API keys in your shell)
- `--deliver`: send the reply to the chosen channel
- `--channel`: delivery channel (`whatsapp|telegram|discord|googlechat|slack|signal|imessage`, default: `whatsapp`)
- `--reply-to`: delivery target override
- `--reply-channel`: delivery channel override
- `--reply-account`: delivery account id override
- `--thinking <off|minimal|low|medium|high|xhigh>`: persist thinking level (GPT-5.2 + Codex models only)
- `--verbose <on|full|off>`: persist verbose level
- `--timeout <seconds>`: override agent timeout
- `--json`: output structured JSON

import en from "/components/footer/en.mdx";

<en />
