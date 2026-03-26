---
summary: "直接 `openclaw agent` CLI 執行（可選擇是否傳遞）"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent` (直接代理執行)

`openclaw agent` 執行單一代理輪次，無需傳入聊天訊息。
預設情況下，它會 **透過 Gateway** 執行；請新增 `--local` 以強制使用
當前機器上的嵌入式執行環境。

## 行為

- 必要：`--message <text>`
- Session 選擇：
  - `--to <dest>` 推導 session 金鑰（群組/頻道目標會保持隔離；直接聊天則會合併為 `main`），**或**
  - `--session-id <id>` 依 ID 重複使用現有 session，**或**
  - `--agent <id>` 直接目標指向已配置的代理（使用該代理的 `main` session 金鑰）
- 執行與正常傳入回覆相同的嵌入式代理執行環境。
- Thinking/verbose 旗標會持續存入 session 儲存區。
- 輸出：
  - 預設：列印回覆文字（加上 `MEDIA:<url>` 行）
  - `--json`：列印結構化 payload + 中繼資料
- 可選擇使用 `--deliver` + `--channel` 傳遞回頻道（目標格式符合 `openclaw message --target`）。
- 使用 `--reply-channel`/`--reply-to`/`--reply-account` 覆寫傳遞設定，而不變更 session。

若無法連線至 Gateway，CLI 將 **回退** 至嵌入式本機執行。

## 範例

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 旗標

- `--local`：本機執行（需在 shell 中設定模型提供者 API 金鑰）
- `--deliver`：將回覆傳送至所選頻道
- `--channel`：傳遞頻道（`whatsapp|telegram|discord|googlechat|slack|signal|imessage`，預設：`whatsapp`）
- `--reply-to`：傳遞目標覆寫
- `--reply-channel`：傳遞頻道覆寫
- `--reply-account`：傳遞帳戶 ID 覆寫
- `--thinking <off|minimal|low|medium|high|xhigh>`：持續儲存思考層級（僅限 GPT-5.2 + Codex 模型）
- `--verbose <on|full|off>`：保存詳細層級
- `--timeout <seconds>`：覆寫代理逾時
- `--json`：輸出結構化 JSON

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
