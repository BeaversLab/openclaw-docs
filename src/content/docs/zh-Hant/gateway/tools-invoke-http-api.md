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

使用 Gateway 驗證配置。傳送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 如果設定了 `gateway.auth.rateLimit` 並且發生過多驗證失敗，端點會傳回 `429` 以及 `Retry-After`。

## 安全邊界 (重要)

請將此端點視為 gateway 實例的 **完整操作員存取 (full operator-access)** 表層。

- 此處的 HTTP bearer auth 並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway 權杖/密碼應被視為擁有者/操作員憑證。
- 對於共用密碼驗證模式 (`token` 和 `password`)，即使呼叫方發送了較狹窄的 `x-openclaw-scopes` 標頭，端點也會恢復正常的完整操作員預設值。
- 共用密碼驗證也會將此端點上的直接工具調用視為擁有者發送者 (owner-sender) 輪次。
- 受信任的身份承載 HTTP 模式 (例如受信任的 proxy 驗證或私有入口上的 `gateway.auth.mode="none"`) 仍然遵守請求上聲明的操作員範圍。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共用的 gateway 操作員密碼
  - 忽略較狹窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集
  - 將此端點上的直接工具調用視為擁有者發送者輪次
- 受信任的身份承載 HTTP 模式 (例如受信任的 proxy 驗證，或私有入口上的 `gateway.auth.mode="none"`)
  - 驗證某個外部受信任的身分識別或部署邊界
  - 遵守宣告的 `x-openclaw-scopes` 標頭
  - 只有當 `operator.admin` 實際存在於那些宣告的範圍中時，才會獲得擁有者語意

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
- `action` (字串，選填)：如果工具架構支援 `action` 且 args 承載中省略了它，則會將其對應至 args。
- `args` (物件，選填)：工具特定引數。
- `sessionKey` (字串，選填)：目標工作階段金鑰。如果省略或為 `"main"`，Gateway 會使用設定的主要工作階段金鑰 (遵守 `session.mainKey` 和預設代理程式，或是全域範圍中的 `global`)。
- `dryRun` (布林值，選填)：保留供未來使用；目前會被忽略。

## 原則 + 路由行為

工具可用性會透過 Gateway 代理程式使用的相同原則鏈進行篩選：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 群組原則 (如果工作階段金鑰對應到群組或頻道)
- 子代理程式原則 (使用子代理程式工作階段金鑰叫用時)

如果原則不允許使用某個工具，端點會傳回 **404**。

重要的邊界說明：

- 執行核准 (Exec approvals) 是操作員防護措施，而非此 HTTP 端點的個別授權邊界。如果工具可以透過 Gateway 驗證 + 工具原則在此處存取，`/tools/invoke` 不會新增額外的每次叫用核准提示。
- 請勿與不受信任的呼叫者共用 Gateway 持有者認證。如果您需要在信任邊界之間進行區隔，請執行個別的 Gateway (且最好是分開的 OS 使用者/主機)。

Gateway HTTP 預設也會套用硬式拒絕清單 (即使工作階段原則允許該工具)：

- `exec` — 直接指令執行 (RCE 攻击面)
- `spawn` — 任意子程序建立 (RCE 攻击面)
- `shell` — Shell 指令執行 (RCE 攻击面)
- `fs_write` — 主機上的任意檔案變更
- `fs_delete` — 主機上的任意檔案刪除
- `fs_move` — 主機上的任意檔案移動/重新命名
- `apply_patch` — 修補程式套用可以重寫任意檔案
- `sessions_spawn` — 會話編排；遠端產生代理程式即為 RCE
- `sessions_send` — 跨會話訊息注入
- `cron` — 持久化自動化控制平面
- `gateway` — 閘道控制平面；防止透過 HTTP 進行重新設定
- `nodes` — 節點命令中繼可以到達配對主機上的 system.run
- `whatsapp_login` — 需要終端機 QR 掃描的互動式設定；在 HTTP 上會掛起

您可以透過 `gateway.tools` 自訂此拒絕列表：

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

為了協助群組原則解析上下文，您可以選擇性設定：

- `x-openclaw-message-channel: <channel>` (範例: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (當存在多個帳戶時)

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (無效請求或工具輸入錯誤)
- `401` → 未授權
- `429` → 驗證速率受限 (`Retry-After` 已設定)
- `404` → 工具不可用 (未找到或未在允許列表中)
- `405` → 方法不允許
- `500` → `{ ok: false, error: { type, message } }` (意外工具執行錯誤；已清理訊息)

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
