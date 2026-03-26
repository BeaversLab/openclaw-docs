---
summary: "透過 Gateway HTTP 端點直接叫用單一工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools Invoke API"
---

# Tools Invoke (HTTP)

OpenClaw 的 Gateway 提供了一個簡單的 HTTP 端點，用於直接叫用單一工具。它始終啟用，但受 Gateway 驗證和工具策略限制。

- `POST /tools/invoke`
- 與 Gateway (WS + HTTP multiplex) 相同的連接埠：`http://<gateway-host>:<port>/tools/invoke`

預設最大 Payload 大小為 2 MB。

## Authentication

使用 Gateway 驗證配置。發送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多認證失敗，端點會傳回帶有 `Retry-After` 的 `429`。

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
- `action` (字串，選填)：如果工具架構支援 `action` 且參數承載中省略了該欄位，則會將其對應至參數中。
- `args` (物件，選填)：工具專屬的引數。
- `sessionKey` (字串，選填)：目標工作階段金鑰。如果省略或為 `"main"`，閘道會使用設定的主要工作階段金鑰 (遵循 `session.mainKey` 和預設代理程式，或全域範圍中的 `global`)。
- `dryRun` (布林值，選填)：保留供將來使用；目前會被忽略。

## 原則 + 路由行為

工具可用性會透過與 Gateway 代理程式相同的原則鏈進行篩選：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群組原則（如果工作階段金鑰對應到群組或頻道）
- 子代理程式原則（當使用子代理程式工作階段金鑰進行調用時）

如果原則不允許某個工具，端點會回傳 **404**。

Gateway HTTP 預設也會套用硬式拒絕清單（即使工作階段原則允許該工具）：

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

為了協助群組原則解析內容，您可以選擇性設定：

- `x-openclaw-message-channel: <channel>` （範例：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>` （當存在多個帳戶時）

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` （無效的請求或工具輸入錯誤）
- `401` → 未授權
- `429` → 認證速率限制（已設定 `Retry-After`）
- `404` → 工具無法使用（找不到或未在允許清單中）
- `405` → 不允許的方法
- `500` → `{ ok: false, error: { type, message } }` （非預期的工具執行錯誤；已清理訊息）

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
