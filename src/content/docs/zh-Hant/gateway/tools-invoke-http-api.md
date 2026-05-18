---
summary: "透過 Gateway HTTP 端點直接叫用單一工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools invoke API"
---

OpenClaw 的 Gateway 提供了一個簡單的 HTTP 端點，用於直接調用單個工具。它始終啟用並使用 Gateway 驗證加上工具策略。就像 OpenAI 相容的 `/v1/*` 介面一樣，共享密碼 bearer 驗證被視為對整個 gateway 的可信操作員存取權限。

- `POST /tools/invoke`
- 與 Gateway (WS + HTTP 多工) 相同的連接埠：`http://<gateway-host>:<port>/tools/invoke`

預設的最大 Payload 大小為 2 MB。

## 驗證

使用 Gateway 驗證設定。

常見的 HTTP 驗證路徑：

- 共享密碼驗證 (`gateway.auth.mode="token"` 或 `"password"`)：
  `Authorization: Bearer <token-or-password>`
- 可信的身份識別 HTTP 驗證 (`gateway.auth.mode="trusted-proxy"`)：
  透過設定的身份感知代理進行路由，並讓其注入
  所需的身份標頭
- private-ingress 開放驗證 (`gateway.auth.mode="none"`)：
  不需要驗證標頭

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 當 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自
  已設定的可信代理來源；同主機 loopback 代理需要明確的
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 繞過代理的內部同主機呼叫者可以使用
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作為本機直接
  備援方案。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 標頭證據
  都會使請求保持在受信任代理路徑上。
- 如果已設定 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並附帶 `Retry-After`。

## 安全邊界 (重要)

將此端點視為 Gateway 執行個體的 **完整操作員存取** 介面。

- 此處的 HTTP 持有者驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway 權杖/密碼應被視為擁有者/操作員憑證。
- 對於共用金鑰驗證模式（`token` 和 `password`），即使呼叫者發送了更狹隘的 `x-openclaw-scopes` 標頭，端點也會恢復正常的完整操作員預設值。
- 共享金鑰驗證也會將此端點上的直接工具調用視為擁有者發送者回合。
- 受信任的身分承載 HTTP 模式（例如受信任的代理驗證，或私人入口點上的 `gateway.auth.mode="none"`）會在存在時遵循 `x-openclaw-scopes`，否則會回退到正常的操作員預設範圍集。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公開網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享的 Gateway 操作員金鑰
  - 忽略較狹隘的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將在此端點上直接呼叫工具視為擁有者-發送者輪次
- 受信任的身分承載 HTTP 模式（例如受信任的代理驗證，或私人入口點上的 `gateway.auth.mode="none"`）
  - 驗證某個外部的受信任身分或部署邊界
  - 當標頭存在時遵循 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的操作員預設範圍集
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

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
- `action` (字串，選填)：如果工具結構支援 `action` 且參數載荷中省略了它，則會對應至參數中。
- `args` (物件，選填)：工具特定參數。
- `sessionKey` (字串，選填)：目標 session 金鑰。如果省略或為 `"main"`，Gateway 會使用已設定好的主要 session 金鑰（遵守 `session.mainKey` 和預設 agent，或全域範圍中的 `global`）。
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

- 執行核准是操作員防護機制，並非此 HTTP 端點的額外授權邊界。如果工具可透過 Gateway 驗證 + 工具政策在此處存取，`/tools/invoke` 不會增加額外的單次呼叫核准提示。
- 如果 `exec` 可在此處存取，請將其視為變動性的 shell 介面。拒絕 `write`、`edit`、`apply_patch` 或 HTTP 檔案系統寫入工具，並不會使 shell 執行變成唯讀。
- 請勿與未受信任的呼叫者分享 Gateway bearer 憑證。如果您需要跨越信任邊界進行隔離，請執行個別的 gateway（理想情況下應為不同的 OS 使用者/主機）。

Gateway HTTP 預設也會套用硬式拒絕清單（即使 session 政策允許該工具）：

- `exec` - 直接指令執行 (RCE 介面)
- `spawn` - 任意子程序建立 (RCE 介面)
- `shell` - shell 指令執行 (RCE 介面)
- `fs_write` - 主機上的任意檔案變更
- `fs_delete` - 主機上的任意檔案刪除
- `fs_move` - 主機上的任意檔案移動/重新命名
- `apply_patch` - 套用補丁可重寫任意檔案
- `sessions_spawn` - session 編排；遠端產生 agent 屬於 RCE
- `sessions_send` - 跨 session 訊息注入
- `cron` - 持續性自動化控制平面
- `gateway` - gateway 控制平面；防止透過 HTTP 進行重新設定
- `nodes` - 節點命令中繼可到達已配對主機上的 system.run
- `whatsapp_login` - 需要終端機 QR 掃描的互動式設定；在 HTTP 上會掛起

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

為協助群組原則解析上下文，您可以選擇設定：

- `x-openclaw-message-channel: <channel>` (例如：`slack`、`telegram`)
- `x-openclaw-account-id: <accountId>` (當存在多個帳戶時)

## 回應

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (無效請求或工具輸入錯誤)
- `401` → 未授權
- `429` → 驗證速率受限 (已設定 `Retry-After`)
- `404` → 工具無法使用 (找不到或未列入允許列表)
- `405` → 不允許的方法
- `500` → `{ ok: false, error: { type, message } }` (非預期的工具執行錯誤；訊息已過濾)

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

## 相關

- [Gateway 通訊協定](/zh-Hant/gateway/protocol)
- [工具和外掛程式](/zh-Hant/tools)
