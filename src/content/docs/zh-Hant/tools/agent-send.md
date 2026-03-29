---
summary: "從 CLI 執行代理回合，並選擇性地將回覆傳送至頻道"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Agent Send"
---

# Agent Send

`openclaw agent` 從命令列執行單一代理回合，而不需要
傳入的聊天訊息。將其用於腳本工作流程、測試
和程式化傳送。

## 快速入門

<Steps>
  <Step title="執行簡單的代理回合">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    這會透過 Gateway 傳送訊息並列印回覆。

  </Step>

  <Step title="指定特定的代理或工作階段">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="將回覆傳送到頻道">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## 標誌

| 標誌                          | 說明                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `--message \<text\>`          | 要傳送的訊息（必要）                                   |
| `--to \<dest\>`               | 從目標（電話、聊天 ID）推導工作階段金鑰                |
| `--agent \<id\>`              | 以已設定的代理為目標（使用其 `main` 工作階段）         |
| `--session-id \<id\>`         | 依 ID 重複使用現有的工作階段                           |
| `--local`                     | 強制使用本機嵌入式執行時期（跳過 Gateway）             |
| `--deliver`                   | 將回覆傳送到聊天頻道                                   |
| `--channel \<name\>`          | 傳送頻道（whatsapp、telegram、discord、slack 等）      |
| `--reply-to \<target\>`       | 傳送目標覆寫                                           |
| `--reply-channel \<name\>`    | 傳送頻道覆寫                                           |
| `--reply-account \<id\>`      | 傳送帳號 ID 覆寫                                       |
| `--thinking \<level\>`        | 設定思考等級（off、minimal、low、medium、high、xhigh） |
| `--verbose \<on\|full\|off\>` | 設定詳細等級                                           |
| `--timeout \<seconds\>`       | 覆寫代理逾時                                           |
| `--json`                      | 輸出結構化 JSON                                        |

## 行為

- 根據預設，CLI 會**透過 Gateway** 執行。新增 `--local` 以強制
  在目前機器上使用嵌入式執行時期。
- 如果無法連線到 Gateway，CLI 將**還原**至本機嵌入式執行。
- 會話選擇：`--to` 推導會話金鑰（群組/頻道目標
  保持隔離；直接聊天會折疊為 `main`）。
- 思考和詳細標誌會持久化到會話存儲中。
- 輸出：預設為純文本，或是用於結構化載荷 + 元數據的 `--json`。

## 範例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相關

- [Agent CLI 參考](/en/cli/agent)
- [子代理](/en/tools/subagents) — 後台子代理生成
- [會話](/en/concepts/session) — 會話金鑰的工作原理
