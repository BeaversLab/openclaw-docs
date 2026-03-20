---
summary: "透過 Gateway HTTP 端點直接叫用單一工具"
read_when:
  - 在不執行完整 Agent 輪次的情況下呼叫工具
  - 建置需要工具原則執行的自動化作業
title: "工具叫用 API"
---

# 工具叫用 (HTTP)

OpenClaw 的 Gateway 提供了一個簡單的 HTTP 端點，可直接叫用單一工具。它始終處於啟用狀態，但受 Gateway 驗證和工具原則的限制。

- `POST /tools/invoke`
- 與 Gateway 相同的連接埠 (WS + HTTP 多工)：`http://<gateway-host>:<port>/tools/invoke`

預設最大 Payload 大小為 2 MB。

## 驗證

使用 Gateway 驗證設定。傳送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 如果設定 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點將傳回 `429` 並帶有 `Retry-After`。

## 請求主體

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
- `action` (字串，選填)：如果工具架構支援 `action` 且 args payload 省略了它，則會將其對應至 args。
- `args` (物件，選填)：工具特定的引數。
- `sessionKey` (字串，選填)：目標工作階段金鑰。如果省略或為 `"main"`，Gateway 將使用設定的主要工作階段金鑰 (遵守 `session.mainKey` 和預設 Agent，或全域範圍中的 `global`)。
- `dryRun` (布林值，選填)：保留供將來使用；目前會被忽略。

## 原則 + 路由行為

工具可用性會透過 Gateway Agent 使用的相同原則鍊進行篩選：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群組原則 (如果工作階段金鑰對應到群組或頻道)
- 子 Agent 原則 (當使用子 Agent 工作階段金鑰叫用時)

如果某個工具未被策略允許，該端點會傳回 **404**。

Gateway HTTP 預設也會套用一個強制拒絕清單（即使會話策略允許該工具）：

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

為了協助群組策略解析上下文，您可以選擇設定：

- `x-openclaw-message-channel: <channel>` (範例： `slack`， `telegram`)
- `x-openclaw-account-id: <accountId>` (當有多個帳戶時)

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (無效的請求或工具輸入錯誤)
- `401` → 未經授權
- `429` → 驗證速率受限（已設定 `Retry-After`）
- `404` → 工具無法使用（找不到或未在允許清單中）
- `405` → 不允許的方法
- `500` → `{ ok: false, error: { type, message } }` (未預期的工具執行錯誤；訊息已過濾)

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

import en from "/components/footer/en.mdx";

<en />
