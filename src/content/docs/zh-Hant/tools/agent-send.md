---
summary: "從 CLI 執行代理回合，並選擇性地將回覆傳送至頻道"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Agent send"
---

`openclaw agent` 從命令列執行單一 agent 輪次，無需傳入的聊天訊息。將其用於腳本化工作流程、測試和程式化傳遞。

## 快速入門

<Steps>
  <Step title="執行簡單的 agent 週期">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    這會透過 Gateway 發送訊息並列印回覆。

  </Step>

  <Step title="指定特定 agent 或 session">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="將回覆遞送到頻道">
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

| 標誌                          | 描述                                              |
| ----------------------------- | ------------------------------------------------- |
| `--message \<text\>`          | 要發送的訊息（必填）                              |
| `--to \<dest\>`               | 從目標（電話、聊天 ID）推導 session 金鑰          |
| `--agent \<id\>`              | 目標指定已配置的 agent (使用其 `main` session)    |
| `--session-id \<id\>`         | 依 ID 重複使用現有的 session                      |
| `--local`                     | 強制使用本機內嵌執行階段（跳過 Gateway）          |
| `--deliver`                   | 將回覆發送到聊天頻道                              |
| `--channel \<name\>`          | 遞送頻道（whatsapp、telegram、discord、slack 等） |
| `--reply-to \<target\>`       | 遞送目標覆寫                                      |
| `--reply-channel \<name\>`    | 遞送頻道覆寫                                      |
| `--reply-account \<id\>`      | 遞送帳戶 ID 覆寫                                  |
| `--thinking \<level\>`        | 設定所選模型設定檔的思考層級                      |
| `--verbose \<on\|full\|off\>` | 設定詳細層級                                      |
| `--timeout \<seconds\>`       | 覆寫 agent 逾時                                   |
| `--json`                      | 輸出結構化 JSON                                   |

## 行為

- 預設情況下，CLI 會 **透過 Gateway** 執行。新增 `--local` 以強制使用
  當前機器上的嵌入式執行環境。
- 如果 Gateway 無法連線，CLI 將**回退**到本機內嵌執行。
- Session 選擇：`--to` 導出 session 金鑰 (群組/頻道目標
  會保持隔離；直接聊天則合併為 `main`)。
- 思考和詳細標誌會持續存在於 session store 中。
- 輸出：預設為純文字，或是使用 `--json` 取得結構化 payload + 中繼資料。

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

<CardGroup cols={2}>
  <Card title="Agent CLI 參考資料" href="/zh-Hant/cli/agent" icon="terminal">
    完整的 `openclaw agent` flag 和選項參考資料。
  </Card>
  <Card title="Sub-agents" href="/zh-Hant/tools/subagents" icon="users">
    背景子 agent 生成。
  </Card>
  <Card title="Sessions" href="/zh-Hant/concepts/session" icon="comments">
    Session 金鑰的運作方式，以及 `--to`、`--agent` 和 `--session-id` 如何解析它們。
  </Card>
  <Card title="斜線指令" href="/zh-Hant/tools/slash-commands" icon="slash">
    在 agent sessions 中使用的原生指令目錄。
  </Card>
</CardGroup>
