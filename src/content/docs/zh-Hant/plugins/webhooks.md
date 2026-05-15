---
summary: "Webhooks 外掛程式：受信任外部自動化的已驗證 TaskFlow 進入點"
read_when:
  - You want to trigger or drive TaskFlows from an external system
  - You are configuring the bundled webhooks plugin
title: "Webhooks 外掛程式"
---

Webhooks 外掛程式新增經過驗證的 HTTP 路由，將外部自動化系統連結至 OpenClaw TaskFlows。

當您希望信賴的系統（例如 Zapier、n8n、CI 工作或內部服務）能夠建立並驅動受管理的 TaskFlows，而無需先撰寫自訂外掛程式時，請使用此外掛程式。

## 執行位置

Webhooks 外掛程式執行於 Gateway 程序內部。

如果您的 Gateway 執行於另一台機器上，請在該 Gateway 主機上安裝並設定此外掛程式，然後重新啟動 Gateway。

## 設定路由

在 `plugins.entries.webhooks.config` 下設定組態：

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

路由欄位：

- `enabled`：選用，預設為 `true`
- `path`：選用，預設為 `/plugins/webhooks/<routeId>`
- `sessionKey`：擁有綁定 TaskFlows 的必要 session
- `secret`：必要的共用金鑰或 SecretRef
- `controllerId`：已建立受管理流程的選用控制器 ID
- `description`：選用的操作員備註

支援的 `secret` 輸入：

- 純字串
- 帶有 `source: "env" | "file" | "exec"` 的 SecretRef

如果依賴金鑰的路由在啟動時無法解析其金鑰，外掛程式將跳過該路由並記錄警告，而不會暴露損壞的端點。

## 安全模型

每個路由都被信任以其設定之 `sessionKey` 的 TaskFlow 權限進行操作。

這意味著該路由可以檢查和變更該 session 擁有的 TaskFlows，因此您應該：

- 為每個路由使用強式且唯一的金鑰
- 優先使用金鑰參考，而非內嵌純文字金鑰
- 將路由綁定至符合工作流程的最狹隘 session
- 僅暴露您所需的特定 webhook 路徑

外掛程式會套用：

- 共用金鑰驗證
- 請求主體大小與逾時防護
- 固定視窗速率限制
- 進行中請求限制
- 透過 `api.runtime.tasks.managedFlows.bindSession(...)` 進行擁有者綁定的 TaskFlow 存取

## 請求格式

發送包含以下內容的 `POST` 請求：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

範例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支援的動作

外掛程式目前接受這些 JSON `action` 值：

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

為路由繫結的工作階段建立受管 TaskFlow。

範例：

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

在現有的受管 TaskFlow 中建立受管子任務。

允許的執行環境為：

- `subagent`
- `acp`

範例：

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## 回應格式

成功的回應會傳回：

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

被拒絕的請求會傳回：

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

此外掛程式會刻意從 webhook 回應中清除擁有者/工作階段元資料。

## 相關文件

- [Plugin runtime SDK](/zh-Hant/plugins/sdk-runtime)
- [Hooks and webhooks overview](/zh-Hant/automation/hooks)
- [CLI webhooks](/zh-Hant/cli/webhooks)
