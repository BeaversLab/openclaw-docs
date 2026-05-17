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
- `--session-id <id>`
- `--agent <id>`

相關：

- Agent 傳送工具：[Agent send](/zh-Hant/tools/agent-send)

## 選項

- `-m, --message <text>`：必要的訊息主體
- `-t, --to <dest>`：用於推匯出會話金鑰的收件者
- `--session-id <id>`：明確的會話 ID
- `--agent <id>`：代理程式 ID；會覆寫路由綁定
- `--model <id>`：此執行的模型覆寫（`provider/model` 或模型 ID）
- `--thinking <level>`：代理程式思考層級（`off`、`minimal`、`low`、`medium`、`high`，以及供應商支援的自訂層級，例如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`：保存會話的詳細層級
- `--channel <channel>`：傳遞通道；省略則使用主會話通道
- `--reply-to <target>`：傳遞目標覆寫
- `--reply-channel <channel>`：傳遞通道覆寫
- `--reply-account <id>`：傳遞帳戶覆寫
- `--local`：直接執行嵌入式代理程式（於外掛程式登錄表預載之後）
- `--deliver`：將回覆傳送回所選的通道/目標
- `--timeout <seconds>`：覆寫代理程式逾時（預設為 600 或組態值）
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

- 當 Gateway 請求失敗時，Gateway 模式會退回到嵌入式代理程式。使用 `--local` 可強制從一開始就執行嵌入式版本。
- `--local` 仍會先預載外掛程式註冊表，因此外掛程式提供的提供者、工具和通道在內嵌執行期間保持可用。
- `--local` 和內嵌後援執行被視為一次性執行。為該本機程序開啟的綑綁 MCP 回送資源和預熱 Claude stdio 會話會在回覆後被淘汰，因此腳本叫用不會讓本機子程序保持運作。
- 由 Gateway 支援的執行會將 Gateway 擁有的 MCP 環回資源保留在執行中的 Gateway 進程下；舊版客戶端可能仍會發送歷史清理標誌，但 Gateway 會將其視為相容性的無操作（no-op）來接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影響回覆傳遞，而非會話路由。
- `--json` 將 stdout 保留給 JSON 回應。Gateway、外掛程式和內嵌後援診斷會路由到 stderr，以便腳本直接解析 stdout。
- 內嵌後援 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便腳本區分後援執行與 Gateway 執行。
- 如果 Gateway 接受代理程式執行，但 CLI 等待最終回覆時逾時，內嵌後援會使用全新的明確 `gateway-fallback-*` 會話/執行 ID，並回報 `meta.fallbackReason: "gateway_timeout"` 以及後援會話欄位。這可避免競爭 Gateway 擁有的文字記錄鎖定，或無聲取代原始路由的對話會話。
- 當此指令觸發 `models.json` 重新生成時，SecretRef 管理的提供者憑證會以非秘密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持續保存，而非已解析的秘密明文。
- 標記寫入是以來源為準的：OpenClaw 從使用中的來源配置快照持久化標記，而非從已解析的執行時祕密值。

## JSON 傳遞狀態

使用 `--json --deliver` 時，CLI JSON 回應可能包含頂層 `deliveryStatus`，以便腳本區分已傳遞、已隱藏、部分和失敗的傳送：

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

`deliveryStatus.status` 是 `sent`、`suppressed`、`partial_failed` 或 `failed` 之一。`suppressed` 表示傳遞被有意未發送，例如訊息發送鉤子取消了它或沒有可見結果；這仍然是一個終止性的不可重試結果。`partial_failed` 表示在後續 Payload 失敗之前至少發送了一個 Payload。`failed` 表示沒有完成持久發送或傳遞預檢失敗。

由 Gateway 支援的 CLI 回應也會保留原始 Gateway 結果形狀，其中相同的物件位於 `result.deliveryStatus`。

常見欄位：

- `requested`：當物件存在時始終為 `true`。
- `attempted`：持久發送路徑運行之後為 `true`；對於預檢失敗或沒有可見 Payload 則為 `false`。
- `succeeded`：`true`、`false` 或 `"partial"`；`"partial"` 與 `status: "partial_failed"` 配對。
- `reason`：來自持久傳遞或預檢驗證的小寫蛇形命名原因。已知原因包括 `cancelled_by_message_sending_hook`、`no_visible_payload`、`no_visible_result`、`channel_resolved_to_internal`、`unknown_channel`、`invalid_delivery_target` 和 `no_delivery_target`；失敗的持久發送也可能報告失敗階段。將未知值視為不透明，因為該集合可以擴展。
- `resultCount`：可用時的通道發送結果數量。
- `sentBeforeError`：當部分失敗在錯誤之前發送了至少一個 Payload 時為 `true`。
- `error`：對於失敗或部分失敗的發送，布林值為 `true`。
- `errorMessage`：僅在捕獲到基礎傳遞錯誤訊息時包含。準備失敗會帶有 `error` 和 `reason` 但沒有 `errorMessage`。
- `payloadOutcomes`：可選的每個 Payload 結果，包含 `index`、`status`、`reason`、`resultCount`、`error`、`stage`、`sentBeforeError` 或可用的 Hook 中繼資料。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Agent 執行時期](/zh-Hant/concepts/agent)
