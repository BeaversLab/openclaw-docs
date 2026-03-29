---
summary: "Gateway WebSocket 協定：握手、框架、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway 協定"
---

# Gateway 協定 (WebSocket)

Gateway WS 協定是 OpenClaw 的 **單一控制平面 + 節點傳輸**。
所有客戶端（CLI、網頁 UI、macOS 應用程式、iOS/Android 節點、無頭
節點）透過 WebSocket 連線，並在握手時宣告其 **角色** + **範圍**。

## 傳輸

- WebSocket，具有 JSON 載荷的文字框架。
- 第一個框架 **必須** 是一個 `connect` 請求。

## 握手 (連線)

Gateway → 用戶端 (連線前挑戰)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

用戶端 → Gateway：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → 用戶端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

當發出裝置權杖時，`hello-ok` 也包括：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### 節點範例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 框架

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **等冪性金鑰** (請參閱綱目)。

## 角色 + 範圍

### 角色

- `operator` = 控制平面客戶端 (CLI/UI/自動化)。
- `node` = 功能主機 (相機/螢幕/canvas/system.run)。

### 範圍 (操作員)

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

方法範圍僅是第一道關卡。透過 `chat.send` 到達的某些斜線指令會在此之上套用更嚴格的指令層級檢查。例如，持久性 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

### 功能/指令/權限 (節點)

節點在連線時宣告功能聲明：

- `caps`：高層級功能類別。
- `commands`：用於調用的指令允許清單。
- `permissions`：細微切換 (例如 `screen.record`、`camera.capture`)。

Gateway 將這些視為 **聲明** 並強制執行伺服器端允許清單。

## 狀態

- `system-presence` 會傳回以裝置身分為鍵的項目。
- Presence 條目包含 `deviceId`、`roles` 和 `scopes`，以便 UI 即使在裝置同時以 **operator** 和 **node** 身份連接時，也能針對每個裝置顯示單一行。

### Node 輔助方法

- 節點可以呼叫 `skills.bins` 來取得目前的技能可執行檔清單，以進行自動允許檢查。

### Operator 輔助方法

- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來取得代理程式的執行階段工具目錄。回應包括分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛擁有者
  - `optional`：外掛工具是否為選用
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來取得會話的執行階段有效工具清單。
  - `sessionKey` 是必要的。
  - 閘道會從伺服器端的會話推斷受信任的執行階段內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應的作用範圍限定於會話，並反映目前主動對話可以使用的內容，包括核心、外掛和通道工具。

## 執行批准

- 當執行請求需要批准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 來解決 (需要 `operator.approvals` 作用域)。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan` (標準的 `argv`/`cwd`/`rawCommand`/session 元資料)。缺少 `systemRunPlan` 的請求會被拒絕。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不相符的項目。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 驗證

- 如果設定了 `OPENCLAW_GATEWAY_TOKEN` (或 `--token`)，`connect.params.auth.token`
  必須匹配，否則 socket 會關閉。
- 配對後，Gateway 會發布一個限定於連線
  角色 + 範圍的 **device token**。它會在 `hello-ok.auth.deviceToken` 中返回，客戶端應將其
  持久化以供未來連線使用。
- Device tokens 可以透過 `device.token.rotate` 和
  `device.token.revoke` 輪替/撤銷 (需要 `operator.pairing` 範圍)。
- Auth 失敗包括 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 客戶端對於 `AUTH_TOKEN_MISMATCH` 的行為：
  - 受信任的客戶端可以嘗試使用快取的 per-device token 進行一次有限的重新嘗試。
  - 如果該重新嘗試失敗，客戶端應停止自動重新連線迴圈，並顯示操作員操作指引。

## Device identity + pairing

- Nodes 應包含穩定的 device identity (`device.id`)，該身份衍生自
  keypair fingerprint。
- Gateways 會針對每個 device + role 發布 token。
- 除非啟用了本機自動核准，否則新的 device IDs 需要配對核准。
- **Local** 連線包括 loopback 和 gateway host 自己的 tailnet address
  (因此同主機 tailnet binds 仍然可以自動核准)。
- 所有 WS 客戶端必須在 `connect` 期間包含 `device` 身份 (operator + node)。
  Control UI 僅可在以下模式中省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限 localhost 的不安全 HTTP 相容性。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass，嚴重的安全性降級)。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### Device auth migration diagnostics

對於仍使用 pre-challenge 簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下返回
`DEVICE_AUTH_*` 詳細代碼，並附帶穩定的 `error.details.reason`。

常見的遷移失敗：

| Message                     | details.code                     | details.reason           | Meaning                                     |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或發送空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用過時/錯誤的 nonce 進行簽署。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽章 Payload 與 v2 Payload 不符。           |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳超出允許的偏差範圍。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                       |

遷移目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 payload 進行簽署。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 首選的簽章 Payload 為 `v3`，它除了 device/client/role/scopes/token/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 為了相容性，舊版 `v2` 簽章仍被接受，但在重新連線時，配對裝置的元資料固定仍會控制指令策略。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 客戶端可以選擇固定閘道憑證指紋（請參閱 `gateway.tls`
  配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、
代理、工作階段、節點、審核等）。確切的介面定義於 `src/gateway/protocol/schema.ts` 中的 TypeBox schemas。
