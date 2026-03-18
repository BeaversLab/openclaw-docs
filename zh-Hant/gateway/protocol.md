---
summary: "Gateway WebSocket protocol: handshake, frames, versioning"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway Protocol"
---

# Gateway protocol (WebSocket)

The Gateway WS protocol is the **single control plane + node transport** for
OpenClaw. All clients (CLI, web UI, macOS app, iOS/Android nodes, headless
nodes) connect over WebSocket and declare their **role** + **scope** at
handshake time.

## Transport

- WebSocket, text frames with JSON payloads.
- First frame **must** be a `connect` request.

## Handshake (connect)

Gateway → Client (pre-connect challenge):

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Client → Gateway:

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

Gateway → Client:

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

When a device token is issued, `hello-ok` also includes:

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### Node example

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

## Framing

- **Request**: `{type:"req", id, method, params}`
- **Response**: `{type:"res", id, ok, payload|error}`
- **Event**: `{type:"event", event, payload, seq?, stateVersion?}`

Side-effecting methods require **idempotency keys** (see schema).

## Roles + scopes

### Roles

- `operator` = control plane client (CLI/UI/automation).
- `node` = capability host (camera/screen/canvas/system.run).

### Scopes (operator)

Common scopes:

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

Method scope is only the first gate. Some slash commands reached through
`chat.send` apply stricter command-level checks on top. For example, persistent
`/config set` and `/config unset` writes require `operator.admin`.

### Caps/commands/permissions (node)

Nodes declare capability claims at connect time:

- `caps`: high-level capability categories.
- `commands`: command allowlist for invoke.
- `permissions`: granular toggles (e.g. `screen.record`, `camera.capture`).

The Gateway treats these as **claims** and enforces server-side allowlists.

## Presence

- `system-presence` returns entries keyed by device identity.
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，因此即使裝置同時以 **operator** 和 **node** 連線，UI 也能顯示每個裝置的單一行。

### Node 輔助方法

- 節點可以呼叫 `skills.bins` 以取得目前的技能可執行檔列表，用於自動允許檢查。

### Operator 輔助方法

- 操作員可以呼叫 `tools.catalog` (`operator.read`) 以取得代理程式的執行階段工具目錄。回應包含分組的工具和來源中繼資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛擁有者
  - `optional`：外掛工具是否為選用

## 執行批准

- 當執行請求需要批准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 進行解決 (需要 `operator.approvals` 範圍)。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan` (標準 `argv`/`cwd`/`rawCommand`/session 中繼資料)。缺少 `systemRunPlan` 的請求將被拒絕。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不符的版本。
- Schema 和模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 驗證

- 如果設定了 `OPENCLAW_GATEWAY_TOKEN` (或 `--token`)，`connect.params.auth.token` 必須相符，否則 socket 將會關閉。
- 配對後，閘道會發行一個範圍限定於連線角色 + 範圍的 **裝置權杖**。它會在 `hello-ok.auth.deviceToken` 中傳回，客戶端應將其保存以供未來連線使用。
- 裝置令牌可以透過 `device.token.rotate` 和
  `device.token.revoke` 輪換/撤銷（需要 `operator.pairing` 權限範圍）。
- 驗證失敗包括 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 針對 `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以嘗試使用快取的每裝置令牌進行一次有限的重試。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並顯示操作員操作指引。

## 裝置身分 + 配對

- 節點應包含從金鑰對指紋衍生出的穩定裝置身分 (`device.id`)。
- 閘道會針對每個裝置和角色發出令牌。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- **本機** 連線包括回送位址和閘道主機自己的 tailnet 位址
  (因此同主機 tailnet 繫結仍然可以自動核准)。
- 所有 WS 客戶端必須在 `connect` 期間包含 `device` 身分 (操作員 + 節點)。
  控制 UI 僅在以下模式中可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (緊急破窗，嚴重的安全性降級)。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置驗證遷移診斷

對於仍使用前置挑戰簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回
`DEVICE_AUTH_*` 詳細代碼以及穩定的 `error.details.reason`。

常見遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                       |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce` (或傳送空白)。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。   |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽章負載與 v2 負載不匹配。                 |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 已簽署的時間戳超出允許的偏誤範圍。         |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不匹配。             |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/規範化失敗。                      |

遷移目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 負載進行簽署。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 偏好的簽章負載是 `v3`，它除了裝置/客戶端/角色/範圍/令牌/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽章為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍會控制指令策略。

## TLS + 固定

- WS 連線支援 TLS。
- 客戶端可選擇性地固定閘道憑證指紋（請參閱 `gateway.tls` 配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、代理、會話、節點、核准等）。具體的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
