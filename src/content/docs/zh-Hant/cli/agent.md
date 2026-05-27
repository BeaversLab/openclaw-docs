---
summary: "CLI 參考資料用於 `openclaw agent`（透過 Gateway 發送一次 agent 轉換）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

透過 Gateway 執行 agent 轉換（嵌入式使用 `--local`）。
使用 `--agent <id>` 直接指向已設定的 agent。

至少傳遞一個 session 選擇器：

- `--to <dest>`
- `--session-key <key>`
- `--session-id <id>`
- `--agent <id>`

相關：

- Agent send 工具：[Agent send](/zh-Hant/tools/agent-send)

## 選項

- `-m, --message <text>`：必要的訊息內容
- `-t, --to <dest>`：用於推匯出 session 金鑰的收件者
- `--session-key <key>`：用於路由的明確 session 金鑰
- `--session-id <id>`：明確的 session ID
- `--agent <id>`：agent ID；會覆寫路由綁定
- `--model <id>`：此次執行的模型覆寫（`provider/model` 或模型 ID）
- `--thinking <level>`：agent 思考層級（`off`、`minimal`、`low`、`medium`、`high`，加上供應商支援的自訂層級，例如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：為此 session 保存詳細層級
- `--channel <channel>`：傳遞通道；省略則使用主要的 session 通道
- `--reply-to <target>`：傳遞目標覆寫
- `--reply-channel <channel>`：傳遞通道覆寫
- `--reply-account <id>`：傳遞帳號覆寫
- `--local`：直接執行內嵌 agent（在插件註冊表預載之後）
- `--deliver`：將回覆傳回至選定的通道/目標
- `--timeout <seconds>`：覆寫 agent 逾時時間（預設為 600 或設定值）
- `--json`：輸出 JSON

## 範例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 備註

- 當 Gateway 請求失敗時，Gateway 模式會回退至內嵌 agent。使用 `--local` 可強制預先執行內嵌模式。
- `--local` 仍會先預載插件註冊表，因此由插件提供的提供者、工具和通道在內嵌執行期間仍可使用。
- `--local` 和嵌入式回退執行被視為一次性執行。針對該本機程序綁定的 MCP 回送資源和預熱的 Claude stdio 會話會在回覆後被釋放，因此腳本調用不會讓本機子程序保持活躍。
- 由 Gateway 支援的執行會將 Gateway 擁有的 MCP 回送資源留在執行中的 Gateway 程序下；舊版客戶端可能仍會發送歷史清理標誌，但 Gateway 會將其接受為一個相容性的無操作（no-op）。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響回覆傳遞，而非會話路由。
- `--session-key` 選擇明確的會話金鑰。帶有 Agent 前綴的金鑰必須使用 `agent:<agent-id>:<session-key>`，並且當同時提供時，`--agent` 必須與該金鑰的 agent ID 相符。裸的非哨兵金鑰在提供時會限定範圍至 `--agent`，否則限定為配置的預設 Agent；例如，`--agent ops --session-key incident-42` 路由至 `agent:ops:incident-42`。字面意義的 `global` 和 `unknown` 僅在未提供 `--agent` 時才保持無範圍限制；在這種情況下，嵌入式回退和儲存所有權會使用配置的預設 Agent。
- `--json` 將 stdout 保留給 JSON 回應。Gateway、外掛和嵌入式回退的診斷資訊會被路由至 stderr，以便腳本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便腳本能區分回退執行與 Gateway 執行。
- 如果 Gateway 接受了一個 Agent 執行，但 CLI 在等待最終回覆時超時，嵌入式回退會使用一個新的明確 `gateway-fallback-*` 會話/執行 ID，並回報 `meta.fallbackReason: "gateway_timeout"` 以及回退會話欄位。這避免了與 Gateway 擁有的逐字稿鎖產生競爭，或無聲地替換原始路由的對話會話。
- 對於由 Gateway 支援的執行，`SIGTERM` 和 `SIGINT` 會中斷正在等待的 CLI 請求。如果 Gateway 已經接受該執行，CLI 也會在退出前針對該已接受的執行 ID 發送 `chat.abort`。本機 `--local` 執行和嵌入式後備執行會收到相同的中止訊號，但不會發送 `chat.abort`。如果在原始 agent 執行仍處於活動狀態時，重複的 `--run-id` 到達 Gateway，重複的回應會回報 `status: "in_flight"`，並且非 JSON 的 CLI 會列印 stderr 診斷訊息而不是空白的回覆。對於外部的 cron/systemd 包裝器，請保留外部強制終止的防線，例如 `timeout -k 60 600 openclaw agent ...`，以便如果關閉程序無法完成排空，監督程序仍然可以回收該程序。
- 當此指令觸發 `models.json` 重新生成時，由 SecretRef 管理的提供者憑證會以非機密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）的形式保存，而不是已解析的機密明文。
- 標記寫入是以原始碼為準的：OpenClaw 會從作用中的來源設定快照保存標記，而不是從已解析的執行時期機密值。

## JSON 傳遞狀態

使用 `--json --deliver` 時，CLI JSON 回應可能包含頂層 `deliveryStatus`，以便腳本區分已傳遞、已抑制、部分和失敗的發送：

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

`deliveryStatus.status` 是 `sent`、`suppressed`、`partial_failed` 或 `failed` 之一。`suppressed` 表示傳遞是有意不發送的，例如訊息發送的 hook 取消了它，或者是沒有可見的結果；這仍然是終結性的不重試結果。`partial_failed` 表示在後續的 payload 失敗之前，至少有一個 payload 已發送。`failed` 表示沒有完成持久的發送或傳遞預檢失敗。

由 Gateway 支援的 CLI 回應也會保留原始的 Gateway 結果形狀，其中相同的物件可在 `result.deliveryStatus` 取得。

通用欄位：

- `requested`：當物件存在時始終為 `true`。
- `attempted`：在持久發送路徑運行後為 `true`；對於預檢失敗或無可見承載則為 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 與 `status: "partial_failed"` 配對。
- `reason`：來自持久傳遞或預檢驗證的小寫蛇形命名原因。已知原因包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失敗的持久發送也可能報告失敗階段。將未知值視為不透明，因為該集合可能會擴展。
- `resultCount`：可用時的通道發送結果數量。
- `sentBeforeError`：當部分失敗在錯誤之前發送了至少一個承載時為 `true`。
- `error`：失敗或部分失敗發送的布林值 `true`。
- `errorMessage`：僅在捕獲到底層傳遞錯誤訊息時包含。預檢失敗帶有 `error` 和 `reason` 但沒有 `errorMessage`。
- `payloadOutcomes`：可選的每個承載結果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError` 或可用的掛接元數據。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Agent 執行時](/zh-Hant/concepts/agent)
