---
summary: "透過 Gateway HTTP 端點直接叫用單一工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools Invoke API"
---

# Tools Invoke (HTTP)

OpenClaw 的 Gateway 提供了一個簡單的 HTTP 端點，用於直接調用單個工具。它始終啟用，並使用 Gateway 身份驗證以及工具策略。與 OpenAI 相容的 `/v1/*` 表層類似，共用密碼 bearer auth 被視為整個 gateway 的受信任操作員存取權限。

- `POST /tools/invoke`
- 與 Gateway (WS + HTTP multiplex) 位於相同連接埠：`http://<gateway-host>:<port>/tools/invoke`

預設的最大 payload 大小為 2 MB。

## 驗證

使用 Gateway 驗證配置。

常見的 HTTP 驗證方式：

- 共享金鑰驗證 (`gateway.auth.mode="token"` 或 `"password"`)：
  `Authorization: Bearer <token-or-password>`
- 受信任的身分識別 HTTP 驗證 (`gateway.auth.mode="trusted-proxy"`)：
  透過配置的身分感知代理路由，並讓其注入
  必要的身分標頭
- private-ingress 開放驗證 (`gateway.auth.mode="none"`)：
  不需要驗證標頭

備註：

- 當使用 `gateway.auth.mode="token"` 時，使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當使用 `gateway.auth.mode="password"` 時，使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 當使用 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自於
  配置的非本機受信任代理來源；同主機的本機代理
  不滿足此模式。
- 如果配置了 `gateway.auth.rateLimit` 並且發生太多驗證失敗，端點會回傳帶有 `Retry-After` 的 `429`。

## 安全邊界 (重要)

將此端點視為 Gateway 執行個體的 **完整操作員存取** 介面。

- 此處的 HTTP 持有者驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway 權杖/密碼應被視為擁有者/操作員憑證。
- 對於共享金鑰驗證模式 (`token` 和 `password`)，即使呼叫端發送較狹隘的 `x-openclaw-scopes` 標頭，端點仍會恢復正常的完整操作員預設值。
- 共享金鑰驗證也會將此端點上的直接工具調用視為擁有者發送者回合。
- 受信任的身分識別 HTTP 模式 (例如受信任的代理驗證或 private ingress 上的 `gateway.auth.mode="none"`) 會在存在時遵守 `x-openclaw-scopes`，否則會回退到正常的操作員預設範圍集。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公開網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享的 Gateway 操作員金鑰
  - 忽略較狹隘的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將在此端點上直接呼叫工具視為擁有者-發送者輪次
- 承載受信任身分的 HTTP 模式（例如受信任的代理程式驗證，或私人入口上的 `gateway.auth.mode="none"`）
  - 驗證某個外部的受信任身分或部署邊界
  - 當標頭存在時，遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的操作員預設範圍集
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語義

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

- `tool` (字串，必填)：要呼叫的工具名稱。
- `action` (字串，選填)：如果工具架構支援 `action` 且參數載荷中省略了該欄位，則會將其對應至 args。
- `args` (物件，選填)：工具特定的引數。
- `sessionKey` (字串，選填)：目標 session 金鑰。如果省略或為 `"main"`，Gateway 將使用設定好的主 session 金鑰（遵守 `session.mainKey` 和預設 agent，或全域範圍內的 `global`）。
- `dryRun` (布林值，選填)：保留供將來使用；目前會被忽略。

## 原則 + 路由行為

工具可用性會透過與 Gateway 代理程式相同的原則鏈進行篩選：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群組原則（如果 session 金鑰對應到群組或頻道）
- 子代理程式原則（當使用子代理程式 session 金鑰呼叫時）

如果原則不允許使用某個工具，端點會傳回 **404**。

重要邊界備註：

- 執行核准是操作員防護措施，並非此 HTTP 端點的獨立授權邊界。如果某個工具可透過 Gateway 驗證 + 工具原則在此處存取，`/tools/invoke` 不會額外增加每次呼叫的核准提示。
- 請勿與不受信任的呼叫者分享 Gateway 承載憑證。如果您需要在信任邊界之間進行分隔，請執行個別的 Gateway（理想情況下也使用個別的 OS 使用者/主機）。

Gateway HTTP 預設也會套用強制拒絕清單（即使會話政策允許該工具）：

- `exec` — 直接命令執行 (RCE surface)
- `spawn` — 任意子程序建立 (RCE surface)
- `shell` — Shell 命令執行 (RCE surface)
- `fs_write` — 對主機進行任意檔案變更
- `fs_delete` — 對主機進行任意檔案刪除
- `fs_move` — 對主機進行任意檔案移動/重新命名
- `apply_patch` — 套用補丁可以重寫任意檔案
- `sessions_spawn` — 會話編排；遠端產生代理程式即為 RCE
- `sessions_send` — 跨會話訊息注入
- `cron` — 持久性自動化控制平面
- `gateway` — Gateway 控制平面；防止透過 HTTP 重新設定
- `nodes` — 節點命令中繼可存取配對主機上的 system.run
- `whatsapp_login` — 需要終端機 QR 掃描的互動式設定；在 HTTP 上會停滯

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

為協助群組政策解析上下文，您可以選擇設定：

- `x-openclaw-message-channel: <channel>` (範例：`slack`、`telegram`)
- `x-openclaw-account-id: <accountId>` (當存在多個帳戶時)

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (無效的請求或工具輸入錯誤)
- `401` → 未授權
- `429` → 驗證速率受限 (`Retry-After` 已設定)
- `404` → 工具無法使用 (找不到或未在允許清單中)
- `405` -> 不允許的方法
- `500` → `{ ok: false, error: { type, message } }` (未預期的工具執行錯誤；已清理訊息)

## 範例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
