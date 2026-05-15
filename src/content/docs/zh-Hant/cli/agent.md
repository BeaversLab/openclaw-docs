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
- `--local` 和嵌入式備援執行被視為一次性執行。為該本機程序開啟的捆綁 MCP 環回資源和熱 Claude stdio 會話在回覆後會被淘汰，因此腳本呼叫不會讓本機子進程保持活躍。
- 由 Gateway 支援的執行會將 Gateway 擁有的 MCP 環回資源保留在執行中的 Gateway 進程下；舊版客戶端可能仍會發送歷史清理標誌，但 Gateway 會將其視為相容性的無操作（no-op）來接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響的是回覆傳遞，而非會話路由。
- `--json` 將 stdout 保留給 JSON 回應。Gateway、外掛程式和嵌入式備援的診斷資訊會路由到 stderr，以便腳本能直接解析 stdout。
- 嵌入式備援 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，因此腳本可以區分備援執行和 Gateway 執行。
- 如果 Gateway 接受了 agent 執行，但 CLI 等待最終回應時逾時，嵌入式備援會使用新的明確 `gateway-fallback-*` 會話/執行 ID 並回報 `meta.fallbackReason: "gateway_timeout"` 以及備援會話欄位。這可避免與 Gateway 擁有的文字記錄鎖產生競爭，或靜默替換原始路由的對話會話。
- 當此指令觸發 `models.json` 重新生成時，SecretRef 管理的提供者憑證會以非祕密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是已解析的祕密明文。
- 標記寫入是以來源為準的：OpenClaw 從使用中的來源配置快照持久化標記，而非從已解析的執行時祕密值。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Agent 執行時](/zh-Hant/concepts/agent)
