---
summary: "`openclaw agent` 的 CLI 參考（透過 Gateway 發送一個 agent 週期）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

透過 Gateway 執行 agent 週期（嵌入式請使用 `--local`）。
使用 `--agent <id>` 直接指定已設定的 agent。

至少傳遞一個 session 選擇器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相關：

- Agent send 工具：[Agent send](/zh-Hant/tools/agent-send)

## 選項

- `-m, --message <text>`：必需的訊息主體
- `-t, --to <dest>`：用於推導 session 金鑰的收件者
- `--session-id <id>`：明確的 session ID
- `--agent <id>`：代理程式 ID；會覆寫路由綁定
- `--model <id>`：此次執行的模型覆寫（`provider/model` 或模型 id）
- `--thinking <level>`：代理程式思考層級（`off`、`minimal`、`low`、`medium`、`high`，加上供應商支援的自訂層級，例如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：保存對話的詳細層級
- `--channel <channel>`：傳遞頻道；省略以使用主對話頻道
- `--reply-to <target>`：傳遞目標覆寫
- `--reply-channel <channel>`：傳遞頻道覆寫
- `--reply-account <id>`：傳遞帳號覆寫
- `--local`：直接執行內建代理程式（在載入外掛程式註冊表之後）
- `--deliver`：將回覆傳送回選定的頻道/目標
- `--timeout <seconds>`：覆寫代理程式逾時時間（預設為 600 或設定值）
- `--json`：輸出 JSON

## 範例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 備註

- 當 Gateway 要求失敗時，Gateway 模式會回退到內建代理程式。使用 `--local` 強制一開始就執行內建模式。
- `--local` 仍然會先預載外掛程式註冊表，因此外掛程式提供的供應商、工具和頻道在內建執行期間仍然可用。
- 每次呼叫 `openclaw agent` 都會被視為一次性執行。為該次執行開啟的隨附或使用者設定的 MCP 伺服器會在回覆後結束，即使該指令使用 Gateway 路徑也是如此，因此 stdio MCP 子程序不會在腳本呼叫之間保持運作。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響的是回覆傳遞，而非對話路由。
- `--json` 會保留 stdout 給 JSON 回應使用。Gateway、外掛程式和內建回退的診斷資訊會被導向至 stderr，以便腳本能直接解析 stdout。
- 嵌入式後備 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便腳本能夠區分後備執行與 Gateway 執行。
- 當此指令觸發 `models.json` 重新生成時，由 SecretRef 管理的提供者憑證會以非秘密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）形式保存，而非已解析的秘密明文。
- 標記寫入以來源為準：OpenClaw 保存的是來自活動來源配置快照的標記，而非來自已解析的執行時期秘密值。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Agent 執行時期](/zh-Hant/concepts/agent)
