---
summary: "CLI 參考指南，適用於 `openclaw devices`（裝置配對 + 權杖輪替/撤銷）"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "裝置"
---

# `openclaw devices`

管理裝置配對請求和裝置範圍的權杖。

## 指令

### `openclaw devices list`

列出待處理的配對請求和已配對的裝置。

```
openclaw devices list
openclaw devices list --json
```

當裝置已配對時，擱置中的請求輸出會在裝置目前已核准的存取權限旁顯示請求的存取權限。這能讓範圍/角色升級變得明確，而不是看起來像是配對遺失。

### `openclaw devices remove <deviceId>`

移除一個已配對的裝置項目。

當您使用已配對的裝置權杖通過驗證時，非管理員呼叫者只能
移除**其自己的**裝置項目。移除其他裝置需要
`operator.admin`。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批次清除已配對的裝置。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

透過確切的 `requestId` 批准待處理的裝置配對請求。如果省略 `requestId`
或傳遞 `--latest`，OpenClaw 只會列印選定的待處理
請求並結束；驗證詳細資訊後，請使用確切的要求 ID 重新執行批准。

<Note>如果裝置以變更的驗證詳細資訊（角色、範圍或公鑰）重試配對，OpenClaw 將取代先前的待處理項目並發布新的 `requestId`。請在批准前立即執行 `openclaw devices list` 以使用目前的 ID。</Note>

如果裝置已經配對並要求更廣泛的範圍或更高的角色，
OpenClaw 將保留現有的批准，並建立一個新的待處理升級
請求。請檢閱 `openclaw devices list`
中的 `Requested` 與 `Approved` 欄，
或使用 `openclaw devices approve --latest` 在批准前預覽確切的升級內容。

如果 Gateway 明確設定為
`gateway.nodes.pairing.autoApproveCidrs`，來自符合條件的用戶端 IP 的首次 `role: node` 請求可以
在出現在此清單之前被批准。該策略預設為停用，且絕不適用於操作員/瀏覽器用戶端或升級
請求。

批准節點或其他非操作員設備角色需要 `operator.admin`。
僅當請求的操作員範圍保持在呼叫者自己的範圍內時，`operator.pairing` 才足以用於操作員設備批准。請參閱
[Operator scopes](/zh-Hant/gateway/operator-scopes) 以了解批准時的檢查。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` 首次執行批准

當新的 Paperclip 代理首次透過 `openclaw_gateway` 配接器連線時，Gateway 可能需要一次性設備配對批准，執行才能成功。如果 Paperclip 回報 `openclaw_gateway_pairing_required`，請批准待處理的設備並重試。

對於本地 Gateway，預覽最新的待處理請求：

```bash
openclaw devices approve --latest
```

預覽會列印出確切的 `openclaw devices approve <requestId>` 指令。驗證請求詳情，然後使用請求 ID 重新執行該指令以進行批准。

對於遠端 Gateway 或明確憑證，在預覽和批准時傳遞相同的選項：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

為避免重新啟動後需要重新批准，請在 Paperclip 配接器設定中保留持久的設備金鑰，而不是每次執行都產生新的暫時身分：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果批准一直失敗，請先執行 `openclaw devices list` 以確認待處理的請求是否存在。

### `openclaw devices reject <requestId>`

拒絕待處理的設備配對請求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

為特定角色輪換設備權杖（可選地更新範圍）。
目標角色必須已存在於該設備已批准的配對合約中；
輪換無法鑄造新的未批准角色。
如果您省略 `--scope`，稍後使用儲存的輪換權杖重新連線將重複使用
該權杖的快取批准範圍。如果您傳遞明確的 `--scope` 值，這些值
將成為未來快取權杖重新連線的儲存範圍集。
非管理員配對設備呼叫者只能輪換其**自己的**設備權杖。
目標權杖範圍集必須保持在呼叫者工作階段自己的操作員
範圍內；輪換無法鑄造或保留比呼叫者
現有更廣泛的操作員權杖。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式返回輪換元資料。如果呼叫者在透過該裝置權杖進行驗證時正在輪換自己的權杖，回應還會包含替換權杖，以便用戶端在重新連接之前將其保存。共享/管理員輪換不會回傳持有人權杖。

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

非管理員已配對裝置的呼叫者只能撤銷其**自己的**裝置權杖。
撤銷其他裝置的權杖需要 `operator.admin`。
目標權杖範圍集也必須符合呼叫者會話本身的
操作員範圍；僅配對的呼叫者無法撤銷管理員/寫入操作員權杖。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式返回撤銷結果。

## 通用選項

- `--url <url>`：Gateway WebSocket URL（配置時預設為 `gateway.remote.url`）。
- `--token <token>`：Gateway 權杖（如果需要）。
- `--password <password>`：Gateway 密碼（密碼驗證）。
- `--timeout <ms>`：RPC 逾時。
- `--json`：JSON 輸出（建議用於編寫腳本）。

<Warning>當您設定 `--url` 時，CLI 不會回退至設定或環境認證。請明確傳遞 `--token` 或 `--password`。缺少明確的認證會導致錯誤。</Warning>

## 備註

- 權杖輪換會返回一個新的權杖（敏感資訊）。請像對待機密資訊一樣對待它。
- 這些指令需要 `operator.pairing`（或 `operator.admin`）範圍。某些
  核准還要求呼叫者必須持有目標裝置將鑄造或繼承的操作員範圍。非操作員裝置角色需要
  `operator.admin`；請參閱 [Operator scopes](/zh-Hant/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是一個選用的 Gateway 原則，僅適用於
  全新節點裝置配對；它不會改變 CLI 核准權限。
- 權杖輪換和撤銷操作僅限於該裝置已核准的配對角色集和
  已核准的範圍基準。單獨的快取權杖項目並不會
  授予權杖管理目標。
- 對於配對裝置 token 工作階段，跨裝置管理僅限管理員：
  `remove`、`rotate` 和 `revoke` 僅限自己使用，除非呼叫者擁有
  `operator.admin`。
- Token 變更也限制在呼叫者的範圍內：僅配對的工作階段無法
  輪替或撤銷目前承載 `operator.admin` 或
  `operator.write` 的 token。
- `devices clear` 故意由 `--yes` 限制存取。
- 如果在本地回環上無法使用配對範圍（且未傳遞明確的 `--url`），列出/核准可以使用本地配對後備機制。
- `devices approve` 在鑄造 token 之前需要明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 僅預覽最新待處理的請求。

## Token 偏移恢復檢查清單

當 Control UI 或其他客戶端持續因 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 失敗時使用此檢查清單。

1. 確認目前的閘道 token 來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對的裝置並識別受影響的裝置 ID：

```bash
openclaw devices list
```

3. 為受影響的裝置輪替操作員 token：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果輪替不足，請移除過時的配對並再次核准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共享 token/密碼重試客戶端連線。

備註：

- 正常的重新連線驗證優先順序是：先為明確的共享 token/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置 token，最後是 bootstrap token。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢復可以在一次有界的重試中暫時同時發送共享 token 和儲存的裝置 token。
- `AUTH_SCOPE_MISMATCH` 表示裝置 token 已被識別但不包含請求的範圍集；在變更共享閘道驗證之前，請修正配對/範圍核准合約。

相關：

- [Dashboard 驗證疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相關

- [CLI 參考](/zh-Hant/cli)
- [節點](/zh-Hant/nodes)
