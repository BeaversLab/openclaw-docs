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
  <Step title="執行簡單的 Agent 輪次">
    ```bash
    openclaw agent --agent main --message "What is the weather today?"
    ```

    這會透過 Gateway 發送訊息並列印回覆。

  </Step>

  <Step title="指定特定的 Agent 或 Session">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"

    # Target an exact session key
    openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
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
| `--session-key \<key\>`       | 使用明確的 Session 金鑰                           |
| `--agent \<id\>`              | 鎖定已設定的 Agent（使用其 `main` session）       |
| `--session-id \<id\>`         | 依 ID 重用現有的 Session                          |
| `--local`                     | 強制使用本地內嵌執行階段（跳過 Gateway）          |
| `--deliver`                   | 將回覆發送到聊天頻道                              |
| `--channel \<name\>`          | 傳遞頻道（whatsapp、telegram、discord、slack 等） |
| `--reply-to \<target\>`       | 傳遞目標覆寫                                      |
| `--reply-channel \<name\>`    | 傳遞頻道覆寫                                      |
| `--reply-account \<id\>`      | 傳遞帳號 ID 覆寫                                  |
| `--thinking \<level\>`        | 為選定的模型設定檔設定思考層級                    |
| `--verbose \<on\|full\|off\>` | 設定詳細輸出層級                                  |
| `--timeout \<seconds\>`       | 覆寫 Agent 逾時時間                               |
| `--json`                      | 輸出結構化 JSON                                   |

## 行為

- 預設情況下，CLI 會 **透過 Gateway** 執行。加入 `--local` 以強制在
  當前機器上使用內嵌執行階段。
- 如果無法連線到 Gateway，CLI 將 **退回** 到本地內嵌執行。
- Session 選擇：`--to` 會推導出 Session 金鑰（群組/頻道目標
  會保持隔離；直接聊天則會合併為 `main`）。
- `--session-key` 選取一個明確的金鑰。帶有 Agent 前綴的金鑰必須使用
  `agent:<agent-id>:<session-key>`，且當兩者都提供時，`--agent` 必須符合該 agent id。當提供純非哨兵金鑰時，其範圍限定於 `--agent`；例如，`--agent ops --session-key incident-42` 路由至
  `agent:ops:incident-42`。若沒有 `--agent`，純非哨兵金鑰會限定範圍至設定的預設 agent。字面意義的 `global` 和 `unknown` 只有在未提供 `--agent` 時才保持無範圍限制；在這種情況下，內嵌的後備機制和儲存庫所有權會使用設定的預設 agent。
- Thinking 和 verbose 標誌會持續保留在 session store 中。
- 輸出：預設為純文字，或是使用 `--json` 取得結構化酬載和元資料。
- 使用 `--json --deliver` 時，JSON 會包含已發送、已抑制、部分發送和發送失敗的傳遞狀態。請參閱
  [JSON 傳遞狀態](/zh-Hant/cli/agent#json-delivery-status)。

## 範例

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Exact session key
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"

# Legacy key scoped to an agent
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## 相關

<CardGroup cols={2}>
  <Card title="Agent CLI 參考" href="/zh-Hant/cli/agent" icon="terminal">
    完整的 `openclaw agent` 標誌和選項參考。
  </Card>
  <Card title="Sub-agents" href="/zh-Hant/tools/subagents" icon="users">
    背景子 agent 生成。
  </Card>
  <Card title="Sessions" href="/zh-Hant/concepts/session" icon="comments">
    Session 金鑰的運作方式，以及 `--to`、`--agent` 和 `--session-id` 如何解析它們。
  </Card>
  <Card title="Slash commands" href="/zh-Hant/tools/slash-commands" icon="slash">
    在 agent sessions 中使用的原生命令目錄。
  </Card>
</CardGroup>
