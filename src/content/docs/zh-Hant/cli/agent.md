---
summary: "`openclaw agent` 的 CLI 參考（透過 Gateway 發送一個 agent 週期）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

透過 Gateway 執行 agent 週期（嵌入式請使用 `--local`）。
使用 `--agent <id>` 直接指定已設定的 agent。

至少傳遞一個 session 選擇器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相關：

- Agent send 工具：[Agent send](/en/tools/agent-send)

## 選項

- `-m, --message <text>`：必需的訊息主體
- `-t, --to <dest>`：用於推導 session 金鑰的收件者
- `--session-id <id>`：明確的 session ID
- `--agent <id>`：代理程式 ID；會覆寫路由綁定
- `--thinking <off|minimal|low|medium|high|xhigh>`：代理程式思考等級
- `--verbose <on|off>`：持續保存該 session 的詳細等級
- `--channel <channel>`：傳遞管道；省略以使用主要的 session 管道
- `--reply-to <target>`：傳遞目標覆寫
- `--reply-channel <channel>`：傳遞管道覆寫
- `--reply-account <id>`：傳遞帳號覆寫
- `--local`：直接執行嵌入式代理程式（於外掛程式登錄檔預載之後）
- `--deliver`：將回覆傳回至選定的管道/目標
- `--timeout <seconds>`：覆寫代理程式逾時（預設 600 或設定值）
- `--json`：輸出 JSON

## 範例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 備註

- 當 Gateway 要求失敗時，Gateway 模式會退回到嵌入式代理程式。使用 `--local` 可在開頭強制執行嵌入式執行。
- `--local` 仍然會先預載外掛程式登錄檔，因此外掛程式提供的提供者、工具和管道在嵌入式執行期間仍可使用。
- `--channel`、`--reply-channel` 和 `--reply-account` 會影響回覆傳遞，而非 session 路由。
- 當此指令觸發 `models.json` 重新生成時，由 SecretRef 管理的提供者憑證會以非秘密標記形式持續保存（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而非解析後的秘密純文字。
- 標記寫入是以來源為權威的：OpenClaw 會持續保存來自作用中來源設定快照的標記，而非來自解析後的執行時期秘密值。
