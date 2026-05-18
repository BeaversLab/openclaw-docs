---
summary: "透過內建的可選 admin-http-rpc 外掛程式公開選取的 Gateway 控制平面方法"
read_when:
  - Building host tooling that cannot use the Gateway WebSocket RPC client
  - Exposing Gateway admin automation behind a private trusted ingress
  - Auditing the security model for HTTP access to Gateway methods
title: "Admin HTTP RPC 外掛程式"
---

內建的 `admin-http-rpc` 外掛程式透過 HTTP 公開選取的 Gateway 控制平面方法，供無法使用一般 Gateway WebSocket RPC 用戶端的信任主機自動化使用。

此外掛程式包含在 OpenClaw 中，但預設為關閉。停用時，不會註冊路由。啟用時，它會新增：

- `POST /api/v1/admin/rpc`
- 與 Gateway 相同的監聽器：`http://<gateway-host>:<port>/api/v1/admin/rpc`

僅針對私人主機工具、tailnet 自動化或信任的內部入站啟用它。請勿將此路由直接公開至公開網際網路。

## 啟用前

Admin HTTP RPC 是完整的操作員控制平面介面。任何通過 Gateway HTTP 驗證的呼叫者都可以叫用此頁面上允許清單中的方法。

在以下所有條件皆為真時使用：

- 呼叫者受信任可操作 Gateway。
- 呼叫者無法使用 WebSocket RPC 用戶端。
- 該路由僅可在 loopback、tailnet 或私人已驗證入站上連線。
- 您已檢閱允許的方法，且它們符合您計畫執行的自動化。

對於可保持 Gateway WebSocket 連線開啟的 OpenClaw 用戶端和互動式工具，請使用 WebSocket RPC 路徑。

## 啟用

啟用內建外掛程式：

<Tabs>
  <Tab title="CLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    openclaw gateway restart
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      plugins: {
        entries: {
          "admin-http-rpc": { enabled: true },
        },
      },
    }
    ```
  </Tab>
</Tabs>

路由會在外掛程式啟動期間註冊。變更外掛程式設定後請重新啟動 Gateway。

當您不再需要 HTTP 介面時停用它：

```bash
openclaw plugins disable admin-http-rpc
openclaw gateway restart
```

## 驗證路由

使用 `health` 作為最小安全要求：

```bash
curl -sS http://<gateway-host>:<port>/api/v1/admin/rpc \
  -H 'Authorization: Bearer <gateway-token>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"health","params":{}}'
```

成功的回應具有 `ok: true`：

```json
{
  "id": "generated-request-id",
  "ok": true,
  "payload": {
    "status": "ok"
  }
}
```

當外掛程式停用時，路由會傳回 `404`，因為它尚未註冊。

## 驗證

外掛程式路由使用 Gateway HTTP 驗證。

常見的驗證路徑：

- 共用金鑰驗證 (`gateway.auth.mode="token"` 或 `"password"`)：`Authorization: Bearer <token-or-password>`
- 信任的身分承載 HTTP 驗證 (`gateway.auth.mode="trusted-proxy"`)：透過已設定的身分感知代理進行路由，並讓其注入所需的身分標頭
- 私有入口開放驗證 (`gateway.auth.mode="none"`)：不需要驗證標頭

## 安全模型

將此外掛程式視為完整的 Gateway 操作員介面。

- 啟用此外掛程式即有意提供對 `/api/v1/admin/rpc` 處白名單管理 RPC 方法的存取權。
- 此外掛程式宣告保留的 `contracts.gatewayMethodDispatch: ["authenticated-request"]` manifest 契約，以便其已透過 Gateway 驗證的 HTTP 路由能在處理程序中調度控制平面方法。
- 共用金鑰持有人驗證證明擁有 gateway 操作員金鑰。
- 對於 `token` 和 `password` 驗證，較狹隘的 `x-openclaw-scopes` 標頭會被忽略，並恢復正常的完整操作員預設值。
- 信任的身分承載 HTTP 模式在存在時會遵守 `x-openclaw-scopes`。
- `gateway.auth.mode="none"` 表示如果啟用了此外掛程式，此路由即未經驗證。僅在您完全信任的私有入口後方使用。
- 在外掛程式路由驗證通過後，請求會透過與 WebSocket RPC 相同的 Gateway 方法處理程序和範圍檢查進行調度。
- 將此路由保留在 loopback、tailnet 或私有信任入口上。不要將其直接暴露於公共網際網路。
- 外掛程式 manifest 契約不是沙盒。它們可防止意外使用保留的 SDK 輔助程式；信任的外掛程式仍在 Gateway 處理程序中執行。

當呼叫者跨越信任邊界時，請使用不同的閘道。

## 請求

```http
POST /api/v1/admin/rpc
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "id": "optional-request-id",
  "method": "health",
  "params": {}
}
```

欄位：

- `id` (字串，選用)：複製到回應中。如果省略，則會產生 UUID。
- `method` (字串，必要)：允許的 Gateway 方法名稱。
- `params` (任意，選用)：方法特定參數。

預設的最大請求主體大小為 1 MB。

## 回應

成功回應使用 Gateway RPC 形狀：

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Gateway 方法錯誤使用：

```json
{
  "id": "optional-request-id",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "bad params"
  }
}
```

HTTP 狀態盡可能遵循 Gateway 錯誤。例如，`INVALID_REQUEST` 傳回 `400`，而 `UNAVAILABLE` 傳回 `503`。

## 允許的方法

- discovery: `commands.list`
  傳回此外掛程式允許的 HTTP RPC 方法名稱。
- gateway: `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`
- config: `config.get`, `config.schema`, `config.schema.lookup`, `config.set`, `config.patch`, `config.apply`
- channels: `channels.status`, `channels.start`, `channels.stop`, `channels.logout`
- models: `models.list`, `models.authStatus`
- agents: `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- approvals: `exec.approvals.get`, `exec.approvals.set`, `exec.approvals.node.get`, `exec.approvals.node.set`
- cron: `cron.status`, `cron.list`, `cron.get`, `cron.runs`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`
- devices: `device.pair.list`, `device.pair.approve`, `device.pair.reject`, `device.pair.remove`
- nodes: `node.list`, `node.describe`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, `node.rename`
- tasks: `tasks.list`, `tasks.get`, `tasks.cancel`
- diagnostics: `doctor.memory.status`, `update.status`

其他 Gateway 方法會被封鎖，直到被刻意加入為止。

## WebSocket 比較

正常的 Gateway WebSocket RPC 路徑仍然是 OpenClaw 用戶端的首選控制平面 API。僅針對需要請求/回應 HTTP 介面的主機工具使用 Admin HTTP RPC。

沒有受信任裝置身分的共享權杖 (Shared-token) WebSocket 用戶端無法在連線時自行宣告管理員範圍 (admin scopes)。管理員 HTTP RPC 刻意遵循現有的受信任 HTTP 操作員模型：當啟用外掛程式時，共享密鑰承載驗證 (shared-secret bearer auth) 會被視為此管理員介面的完整操作員存取權限。

## 疑難排解

`404 Not Found`

：此外掛程式已停用、啟用後 Gateway 尚未重新啟動，或請求發送至不同的 Gateway 處理程序。

`401 Unauthorized`

：請求未滿足 Gateway HTTP 驗證。請檢查承載權杖 (bearer token) 或受信任代理身分標頭。

`400 INVALID_REQUEST`

：請求主體不是有效的 JSON、缺少 `method` 欄位，或是方法不在外掛程式允許清單中。

`503 UNAVAILABLE`

：Gateway 方法處理程式無法使用。請檢查 Gateway 記錄，並在 Gateway 完成啟動後重試。

## 相關連結

- [操作員範圍](/zh-Hant/gateway/operator-scopes)
- [Gateway 安全性](/zh-Hant/gateway/security)
- [遠端存取](/zh-Hant/gateway/remote)
- [外掛程式清單](/zh-Hant/plugins/manifest#contracts)
- [SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)
