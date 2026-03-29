---
summary: "透過 Gateway HTTP 端點直接叫用單一工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools Invoke API"
---

# Tools Invoke (HTTP)

OpenClaw 的 Gateway 提供了一個簡單的 HTTP 端點，用於直接叫用單一工具。它始終啟用，並使用 Gateway 驗證以及工具策略，但傳遞 Gateway bearer 驗證的呼叫者會被視為該 gateway 的受信任操作員。

- `POST /tools/invoke`
- 與 Gateway (WS + HTTP 多路複用) 使用相同的連接埠：`http://<gateway-host>:<port>/tools/invoke`

預設的最大 payload 大小為 2 MB。

## 驗證

使用 Gateway 驗證配置。傳送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 如果配置了 `gateway.auth.rateLimit` 並且發生了過多的驗證失敗，端點會傳回 `429` 並帶有 `Retry-After`。
- 請將此憑證視為該 gateway 的完整存取操作員機密。它不是針對更狹隘 `/tools/invoke` 角色的範圍 API token。

## 請求內容

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

欄位：

- `tool` (字串，必填)：要叫用的工具名稱。
- `action` (字串，選填)：如果工具架構支援 `action` 且 args payload 中省略了它，則會將其對應到 args 中。
- `args` (物件，選填)：工具特定的引數。
- `sessionKey` (字串，選填)：目標 session 金鑰。如果省略或為 `"main"`，Gateway 將使用配置的主要 session 金鑰 (遵守 `session.mainKey` 和預設代理程式，或全域範圍中的 `global`)。
- `dryRun` (布林值，選填)：保留供將來使用；目前會被忽略。

## 策略 + 路由行為

工具可用性會透過 Gateway 代理程式使用的相同策略鏈進行過濾：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群組原則（如果 session key 對應到群組或頻道）
- 子代理程式原則（當使用子代理程式 session key 呼叫時）

如果原則不允許某個工具，端點會傳回 **404**。

重要的邊界說明：

- `POST /tools/invoke` 與其他 Gateway HTTP API（例如 `/v1/chat/completions`、`/v1/responses` 和 `/api/channels/*`）位於相同的信任操作員類別中。
- 執行核可是操作員防護機制，而非此 HTTP 端點的額外授權邊界。如果工具可透過 Gateway 驗證 + 工具原則在此處存取，`/tools/invoke` 不會新增額外的逐次呼叫核可提示。
- 請勿與不受信任的呼叫者分享 Gateway 持有人憑證。如果您需要在信任邊界之間區隔，請執行個別的閘道（理想情況下使用個別的 OS 使用者/主機）。

Gateway HTTP 預設也會套用硬式拒絕清單（即使 session 原則允許該工具）：

- `cron`
- `sessions_spawn`
- `sessions_send`
- `gateway`
- `whatsapp_login`

您可以透過 `gateway.tools` 自訂此拒絕清單：

```json5
{
  gateway: {
    tools: {
      // Additional tools to block over HTTP /tools/invoke
      deny: ["browser"],
      // Remove tools from the default deny list
      allow: ["gateway"],
    },
  },
}
```

為協助群組原則解析語境，您可以選擇性設定：

- `x-openclaw-message-channel: <channel>`（範例：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（當存在多個帳戶時）

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（無效請求或工具輸入錯誤）
- `401` → 未授權
- `429` → 驗證速率受限（已設定 `Retry-After`）
- `404` → 工具無法使用（未找到或未列於允許清單）
- `405` → 不允許的方法
- `500` → `{ ok: false, error: { type, message } }`（未預期的工具執行錯誤；已清理訊息）

## 範例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
