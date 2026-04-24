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

- Agent send 工具：[Agent send](/zh-Hant/tools/agent-send)

## 選項

- `-m, --message <text>`：必需的訊息主體
- `-t, --to <dest>`：用於推導 session 金鑰的收件者
- `--session-id <id>`：明確的 session ID
- `--agent <id>`：代理程式 ID；會覆寫路由綁定
- `--thinking <level>`：代理思維等級 (`off`、`minimal`、`low`、`medium`、`high`，加上供應商支援的自訂等級，例如 `xhigh`、`adaptive` 或 `max`)
- `--verbose <on|off>`：為此階段持續保留詳細程度
- `--channel <channel>`：傳遞通道；省略則使用主要階段通道
- `--reply-to <target>`：傳遞目標覆寫
- `--reply-channel <channel>`：傳遞通道覆寫
- `--reply-account <id>`：傳遞帳號覆寫
- `--local`：直接執行內嵌代理 (於插件註冊表預載之後)
- `--deliver`：將回覆傳回至選定的通道/目標
- `--timeout <seconds>`：覆寫代理逾時 (預設為 600 或設定值)
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

- 當 Gateway 要求失敗時，Gateway 模式會回退至內嵌代理。使用 `--local` 以強制預先執行內嵌模式。
- `--local` 仍會先預載插件註冊表，因此插件提供的供應商、工具和通道在內嵌執行期間仍可使用。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響回覆傳遞，而非階段路由。
- 當此指令觸發 `models.json` 重新生成時，SecretRef 管理的供應商憑證會以非秘密標記 (例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`) 持續保存，而非已解析的秘密明文。
- 標記寫入是以來源為權威的：OpenClaw 會持續保存來自作用中來源設定快照的標記，而非來自解析後的執行時期秘密值。
