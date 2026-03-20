---
summary: "Gateway WebSocket 協定：交握、幀、版本控制"
read_when:
  - 正在實作或更新 Gateway WS 用戶端
  - 除錯協定不匹配或連線失敗
  - 重新產生協定 schema/models
title: "Gateway Protocol"
---

# Gateway 協定 (WebSocket)

Gateway WS 協定是 OpenClaw 的 **單一控制平面 + 節點傳輸**。所有用戶端（CLI、網頁 UI、macOS 應用程式、iOS/Android 節點、無頭節點）都透過 WebSocket 連線，並在交握時宣告其 **角色** + **範圍**。

## 傳輸

- WebSocket，具 JSON 載荷的文字幀。
- 第一個幀 **必須** 是 `connect` 請求。

## 交握 (連線)

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

當發出裝置權杖時，`hello-ok` 也會包含：

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

## 幀處理

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **等冪性金鑰** (見 schema)。

## 角色 + 範圍

### 角色

- `operator` = 控制平面用戶端 (CLI/UI/自動化)。
- `node` = 功能主機 (camera/screen/canvas/system.run)。

### 範圍 (操作員)

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

方法範圍只是第一道關卡。透過 `chat.send` 存取的某些斜線指令會在頂部套用更嚴格的指令層級檢查。例如，持續性 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

### 功能/指令/權限 (節點)

節點在連線時宣告功能宣告：

- `caps`：高層級功能類別。
- `commands`：用於叫用的指令允許清單。
- `permissions`：細粒度切換 (例如 `screen.record`、`camera.capture`)。

Gateway 將這些視為 **宣告** 並強制執行伺服器端允許清單。

## Presence

- `system-presence` 傳回以裝置身分為鍵的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，因此即使當裝置同時以 **operator** 和 **node** 身分連線時，UI 仍能針對每個裝置顯示單一行。

### Node 輔助方法

- Node 可以呼叫 `skills.bins` 以取得目前的技能可執行檔清單，用於自動允許檢查。

### Operator 輔助方法

- Operator 可以呼叫 `tools.catalog` (`operator.read`) 以取得代理程式的執行階段工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛擁有者
  - `optional`：外掛工具是否為選用

## 執行核准

- 當執行請求需要核准時，閘道會廣播 `exec.approval.requested`。
- Operator 用戶端會呼叫 `exec.approval.resolve` 來解決 (需要 `operator.approvals` scope)。

- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan` (標準 `argv`/`cwd`/`rawCommand`/session 元資料)。缺少 `systemRunPlan` 的請求將被拒絕。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 用戶端會傳送 `minProtocol` + `maxProtocol`；伺服器會拒絕不符合的版本。
- Schemas 和模型是從 TypeBox 定義產生的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 驗證

- 如果設定了 `OPENCLAW_GATEWAY_TOKEN` (或 `--token`)，`connect.params.auth.token` 必須符合，否則 socket 將會關閉。
- 配對後，閘道會發出一個範圍限定於連線角色 + scopes 的 **device token**。它會在 `hello-ok.auth.deviceToken` 中傳回，並應由用戶端保存以供未來連線使用。
- 裝置令牌可以透過 `device.token.rotate` 和 `device.token.revoke` 進行輪替/撤銷（需要 `operator.pairing` 權限範圍）。
- 驗證失敗包括 `error.details.code` 以及復原提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 針對 `AUTH_TOKEN_MISMATCH` 的用戶端行為：
  - 受信任的用戶端可以使用快取的每裝置令牌嘗試一次有限的重新連線。
  - 如果該次重新連線失敗，用戶端應停止自動重新連線迴圈，並顯示操作員操作指引。

## 裝置身分 + 配對

- 節點應包含穩定的裝置身分 (`device.id`)，該身分衍生自金鑰對指紋。
- 閘道會針對每個裝置 + 角色發出令牌。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- **本機** 連線包含 loopback 和閘道主機自己的 tailnet 位址（因此同主機 tailnet 繫結仍可自動核准）。
- 所有 WS 用戶端都必須在 `connect` 期間包含 `device` 身分（操作員 + 節點）。控制 UI 僅能在這些模式下省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` （緊急權限，嚴重的安全性降級）。
- 所有連線都必須簽署伺服器提供的 `connect.challenge` nonce。

### 裝置驗證遷移診斷

對於仍使用挑戰前簽署行為的舊版用戶端，`connect` 現在會在 `error.details.code` 下回傳 `DEVICE_AUTH_*` 詳細代碼，並附上穩定的 `error.details.reason`。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                      |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 用戶端遺漏 `device.nonce`（或傳送空值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 用戶端使用過時/錯誤的 nonce 進行簽署。    |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽章內容不符合 v2 內容。                  |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽章時間戳超出允許的偏差範圍。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 不符合公開金鑰指紋。          |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公開金鑰格式/正規化失敗。                 |

遷移目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 內容進行簽章。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 偏好的簽章內容為 `v3`，其綁定了 `platform` 和 `deviceFamily`
  以及 device/client/role/scopes/token/nonce 欄位。
- 舊版 `v2` 簽章為相容性仍被接受，但在重新連線時，配對裝置
  中繼資料固定仍控制指令原則。

## TLS + 固定

- WS 連線支援 TLS。
- 客戶端可選擇固定閘道憑證指紋 (參見 `gateway.tls`
  設定加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`)。

## 範圍

此協定公開了 **完整的閘道 API** (狀態、頻道、模型、聊天、
代理、工作階段、節點、審核等)。確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
