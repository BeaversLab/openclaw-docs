---
summary: "Gateway WebSocket 協定：交握、幀、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway 協定"
---

# Gateway 協定 (WebSocket)

Gateway WS 協定是 OpenClaw 的**單一控制平面 + 節點傳輸**。所有客戶端（CLI、網頁 UI、macOS 應用、iOS/Android 節點、無頭節點）都通過 WebSocket 連接，並在交握時聲明它們的**角色** + **範圍**。

## 傳輸

- WebSocket，帶有 JSON 載荷的文本幀。
- 第一幀**必須**是 `connect` 請求。

## 交握 (連接)

Gateway → 客戶端 (連接前挑戰)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客戶端 → Gateway：

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

Gateway → 客戶端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

當發出設備令牌時，`hello-ok` 還包括：

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

## 幀

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

產生副作用的方法需要**冪等鍵（idempotency keys）**（請參閱架構定義）。

## 角色 + 範圍

### 角色

- `operator` = 控制平面客戶端 (CLI/UI/自動化)。
- `node` = 功能主機 (camera/screen/canvas/system.run)。

### 範圍 (operator)

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

方法範圍只是第一道關卡。透過 `chat.send` 到達的部分斜線指令會在頂部套用更嚴格的指令級別檢查。例如，持續性 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

### 功能/指令/權限 (node)

節點在連接時聲明功能聲明：

- `caps`：高層級功能類別。
- `commands`：用於呼叫的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

Gateway 將這些視為**聲明 (claims)** 並執行伺服器端允許清單。

## 上線狀態 (Presence)

- `system-presence` 會傳回以裝置身分為鍵值的項目。
- 上線狀態項目包含 `deviceId`、`roles` 和 `scopes`，因此即使裝置同時以 **operator** 和 **node** 連線，UI 也能顯示每個裝置的單一行。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來擷取目前的技能可執行檔清單，以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `tools.catalog` (`operator.read`) 以取得代理程式的執行時期工具目錄。回應包含分組的工具和來源元資料：
  - `source`: `core` 或 `plugin`
  - `pluginId`: 當 `source="plugin"` 時的外掛擁有者
  - `optional`: 外掛工具是否為選用

## 執行核准

- 當執行請求需要核准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 來解決（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（規範的 `argv`/`cwd`/`rawCommand`/session metadata）。缺少 `systemRunPlan` 的請求會被拒絕。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不匹配的請求。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 身份驗證

- 如果設定了 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`
  必須匹配，否則會關閉 socket。
- 配對後，Gateway 會發出一個針對連接角色 + 作用域範圍的 **device token**。它會在 `hello-ok.auth.deviceToken` 中返回，客戶端應將其持久化以用於未來的連接。
- Device tokens 可以透過 `device.token.rotate` 和 `device.token.revoke` 輪換/撤銷（需要 `operator.pairing` 作用域）。
- Auth 失敗包括 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 客戶端對於 `AUTH_TOKEN_MISMATCH` 的行為：
  - 受信任的客戶端可以使用快取的每設備 token 嘗試一次有限的重試。
  - 如果重試失敗，客戶端應停止自動重連循環並顯示操作員操作指引。

## 裝置身分 + 配對

- 節點應包含穩定的裝置身分 (`device.id`)，該身分衍生自
  金鑰對指紋。
- 閘道會針對每個裝置 + 角色發出權杖。
- 除非啟用本地自動核准，否則新的裝置 ID 需要配對核准。
- **本地** 連線包含回送地址以及閘道主機自己的 tailnet 位址
  (因此同主機的 tailnet 繫結仍可自動核准)。
- 所有 WS 客戶端在 `connect` 期間必須包含 `device` 身分 (操作員 + 節點)。
  控制介面僅可在以下模式中省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 僅用於本地主機的不安全 HTTP 相容性。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass，嚴重的安全性降級)。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置驗證遷移診斷

對於仍使用先挑戰簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回具有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                            |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或發送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用過時/錯誤的 nonce 進行簽署。          |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽章 payload 與 v2 payload 不符。               |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽章時間戳超出允許的偏差範圍。                  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                    |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                           |

遷移目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 payload 進行簽章。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 首選的簽名 payload 是 `v3`，它除了 device/client/role/scopes/token/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 為了相容性，舊版的 `v2` 簽名仍被接受，但在重新連線時，配對裝置的中繼資料固定仍控制著指令政策。

## TLS + 憑證固定 (pinning)

- WS 連線支援 TLS。
- 客戶端可以選擇性地固定 Gateway 憑證指紋（請參閱 `gateway.tls` 設定以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍 (Scope)

此協定暴露了 **完整的 gateway API**（狀態、頻道、模型、聊天、代理、工作階段、節點、核准等）。確切的介面定義於 `src/gateway/protocol/schema.ts` 中的 TypeBox schemas。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
