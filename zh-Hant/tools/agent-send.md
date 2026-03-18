---
summary: "直接的 `openclaw agent` CLI 執行（可選傳遞）"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent` (直接 agent 執行)

`openclaw agent` 執行單一 agent 週期，而無需傳入聊天訊息。
預設情況下它會 **通過 Gateway**；新增 `--local` 以強制在
當前機器上使用嵌入式 runtime。

## 行為

- 必要：`--message <text>`
- Session 選擇：
  - `--to <dest>` 推導 session 金鑰（群組/頻道目標保持隔離；直接聊天折疊為 `main`），**或**
  - `--session-id <id>` 透過 ID 重複使用現有 session，**或**
  - `--agent <id>` 直接鎖定已設定的 agent（使用該 agent 的 `main` session 金鑰）
- 執行與一般傳入回覆相同的嵌入式 agent runtime。
- Thinking/verbose 標記會持續保留到 session 存儲中。
- 輸出：
  - 預設：列印回覆文字（加上 `MEDIA:<url>` 行）
  - `--json`：列印結構化 payload + 元數據
- 可選透過 `--deliver` + `--channel` 傳遞回頻道（目標格式符合 `openclaw message --target`）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆蓋傳遞設定而不變更 session。

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

- `--local`：在本機執行（需要在您的 shell 中提供模型提供者 API 金鑰）
- `--deliver`：將回覆發送到選定的頻道
- `--channel`：傳遞頻道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，預設：`whatsapp`）
- `--reply-to`：傳遞目標覆蓋
- `--reply-channel`：傳遞頻道覆蓋
- `--reply-account`：傳遞帳戶 ID 覆蓋
- `--thinking <off|minimal|low|medium|high|xhigh>`：持續保留思考層級（僅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：保留詳細輸出層級
- `--timeout <seconds>`：覆寫代理逾時
- `--json`：輸出結構化 JSON

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
