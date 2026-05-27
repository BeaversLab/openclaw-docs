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

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

## Paperclip / `openclaw_gateway` 首次執行批准

當新的 Paperclip 代理程式首次透過 `openclaw_gateway` 配接器連線時，Gateway 可能需要一次性裝置配對批准，執行才能成功。如果 Paperclip 回報 `openclaw_gateway_pairing_required`，請批准待處理的裝置並重試。

對於本機 Gateway，請預覽最新的待處理請求：

```bash
openclaw devices approve --latest
```

預覽會列印確切的 `openclaw devices approve <requestId>` 指令。驗證請求詳細資訊，然後使用請求 ID 重新執行該指令以進行核准。

對於遠端閘道或明確認證，在預覽和核准時請傳遞相同的選項：

```bash
openclaw devices approve --latest --url <gateway-ws-url> --token <gateway-token>
```

為避免重新啟動後需重新核准，請在 Paperclip 配接器組態中保留持久的裝置金鑰，而不是每次執行都產生新的暫時性身分識別：

```json
{
  "adapterConfig": {
    "devicePrivateKeyPem": "<ed25519-private-key-pkcs8-pem>"
  }
}
```

如果核准持續失敗，請先執行 `openclaw devices list` 以確認存在待處理的請求。

### `openclaw devices reject <requestId>`

拒絕待處理的裝置配對請求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

輪替特定角色的裝置權杖（選擇性更新範圍）。
目標角色必須已存在於該裝置的已核准配對合約中；
輪替無法鑄造新的未核准角色。
如果您省略 `--scope`，稍後使用儲存的輪替權杖重新連線將會重複使用
該權杖的快取已核准範圍。如果您傳遞明確的 `--scope` 值，這些值
將成為未來快取權杖重新連線的儲存範圍集。
非管理員配對裝置呼叫者只能輪替其**自身**的裝置權杖。
目標權杖範圍集必須保持在呼叫者工作階段本身的操作員
範圍內；輪替無法鑄造或保留比呼叫者已有的權杖更廣泛的操作員權杖。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式傳回輪替中繼資料。如果呼叫者在透過
該裝置權杖進行驗證時輪替其自身的權杖，回應也會包含替換
權杖，以便用戶端能在重新連線前將其保存。共用/管理員輪替
不會回應不記名權杖。

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

非管理員配對裝置呼叫者只能撤銷其**自身**的裝置權杖。
撤銷其他裝置的權杖需要 `operator.admin`。
目標權杖範圍集也必須符合呼叫者工作階段本身的
操作員範圍；僅具備配對權限的呼叫者無法撤銷管理員/寫入操作員權杖。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式傳回撤銷結果。

## 通用選項

- `--url <url>`：閘道 WebSocket URL（設定後預設為 `gateway.remote.url`）。
- `--token <token>`：閘道權杖（如果需要）。
- `--password <password>`：閘道密碼（密碼驗證）。
- `--timeout <ms>`: RPC 逾時。
- `--json`: JSON 輸出（建議用於腳本）。

<Warning>當您設定 `--url` 時，CLI 不會回退至設定檔或環境變數憑證。請明確傳遞 `--token` 或 `--password`。缺少明確憑證將會導致錯誤。</Warning>

## 注意事項

- Token 輪換會傳回一個新的 token（敏感資訊）。請將其視為機密處理。
- 這些指令需要 `operator.pairing`（或 `operator.admin`）範圍。部分
  核准也要求呼叫者持有目標設備將鑄造或繼承的 operator 範圍；請參閱 [Operator 範圍](/zh-Hant/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是一個選用的 Gateway 原則，僅
  適用於全新的節點設備配對；它不會變更 CLI 核准權限。
- Token 輪換與撤銷限制在該設備已核准的配對角色集和
  已核准的範圍基線內。一個孤立的快取 token 項目並不會
  授予 token 管理目標。
- 對於已配對設備的 token 會話，跨設備管理僅限管理員：
  `remove`、`rotate` 和 `revoke` 僅限自己使用，除非呼叫者擁有
  `operator.admin`。
- Token 變更也受限於呼叫者範圍：僅配對的會話無法
  輪換或撤銷目前攜帶 `operator.admin` 或
  `operator.write` 的 token。
- `devices clear` 故意受到 `--yes` 的限制。
- 如果在本地回送無法使用配對範圍（且未傳遞明確的 `--url`），list/approve 可以使用本地配對備援。
- `devices approve` 在鑄造 token 之前需要明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 僅會預覽最新的待處理請求。

## Token 偏移復原檢查清單

當 Control UI 或其他客戶端持續失敗並顯示 `AUTH_TOKEN_MISMATCH`、`AUTH_DEVICE_TOKEN_MISMATCH` 或 `AUTH_SCOPE_MISMATCH` 時，請使用此功能。

1. 確認目前的 gateway token 來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對設備並識別受影響的設備 ID：

```bash
openclaw devices list
```

3. 輪換受影響裝置的操作員 token：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果輪換不足，請移除過時的配對並再次批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共用 token/密碼重試客戶端連線。

備註：

- 正常重新連線的驗證優先順序為：先明確共用 token/密碼，其次是明確 `deviceToken`，接著是儲存的裝置 token，最後是啟動 token。
- 受信任的 `AUTH_TOKEN_MISMATCH` 復原可以暫時在單次受限的重試中同時傳送共用 token 和儲存的裝置 token。
- `AUTH_SCOPE_MISMATCH` 表示裝置 token 已被識別但不具備所請求的範圍集；在更改共用閘道驗證之前，請先修正配對/範圍批准合約。

相關：

- [Dashboard 驗證疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相關

- [CLI 參考](/zh-Hant/cli)
- [節點](/zh-Hant/nodes)
