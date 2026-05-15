---
summary: "CLI 參考資料 `openclaw devices` (裝置配對 + 權杖輪替/撤銷)"
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

當您使用配對的裝置權杖進行驗證時，非管理員呼叫者只能移除**他們自己的**裝置項目。移除其他裝置需要 `operator.admin`。

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

透過確切的 `requestId` 批准待處理的裝置配對請求。如果省略 `requestId` 或傳遞 `--latest`，OpenClaw 只會列印選定的待處理請求並結束；在驗證詳細資訊後，使用確切的請求 ID 重新執行批准。

<Note>如果裝置使用變更的驗證詳細資料（角色、範圍或公開金鑰）重試配對，OpenClaw 將取代先前的待處理項目並發出新的 `requestId`。請在核准前立即執行 `openclaw devices list` 以使用目前的 ID。</Note>

如果裝置已經配對並且要求更廣泛的範圍或更廣泛的角色，OpenClaw 會保留現有的核准，並建立一個新的擱置升級請求。請檢閱 `openclaw devices list` 中的 `Requested` 與 `Approved` 欄位，或使用 `openclaw devices approve --latest` 在核准之前預覽確切的升級內容。

如果 Gateway 已明確設定為
`gateway.nodes.pairing.autoApproveCidrs`，來自符合的
用戶端 IP 的初次 `role: node` 請求可在出現於此清單前獲得核准。該原則
預設為停用，且絕不適用於操作員/瀏覽器用戶端或升級
請求。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒絕待處理的裝置配對請求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

輪替特定角色的裝置權杖（選擇性更新範圍）。
目標角色必須已存在於該裝置的核准配對合約中；
輪替無法鑄造新的未核准角色。
如果您省略 `--scope`，稍後使用儲存的輪替權杖重新連線將重複使用
該權杖的快取已核准範圍。如果您傳遞明確的 `--scope` 值，這些值
將成為未來快取權杖重新連線的儲存範圍集。
非管理員配對裝置的呼叫者只能輪替其**自己的**裝置權杖。
目標權杖範圍集必須保持在呼叫者工作階段自身的操作員
範圍內；輪替無法鑄造或保留比呼叫者目前擁有的範圍
更廣泛的操作員權杖。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 形式傳回輪替中繼資料。如果呼叫者在透過該
裝置權杖進行驗證時輪替其自身的權杖，回應也會包含取代
權杖，以便用戶端在重新連線前保存該權杖。共享/管理員
輪替不會回應持有人權杖。

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

非管理員配對裝置的呼叫者只能撤銷其**自己的**裝置權杖。
撤銷其他裝置的權杖需要 `operator.admin`。
目標權杖範圍集也必須符合呼叫者工作階段自身的
操作員範圍；僅配對的呼叫者無法撤銷管理員/寫入操作員權杖。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 形式傳回撤銷結果。

## 通用選項

- `--url <url>`：Gateway WebSocket URL（設定時預設為 `gateway.remote.url`）。
- `--token <token>`：Gateway 權杖（如有需要）。
- `--password <password>`：Gateway 密碼（密碼驗證）。
- `--timeout <ms>`：RPC 逾時。
- `--json`：JSON 輸出（建議用於腳本）。

<Warning>當您設定 `--url` 時，CLI 不會回退至設定檔或環境變數憑證。請明確傳遞 `--token` 或 `--password`。缺少明確的憑證將會導致錯誤。</Warning>

## 注意事項

- 權杖輪換會傳回一個新的權杖（敏感性資訊）。請將其視為機密處理。
- 這些指令需要 `operator.pairing` (或 `operator.admin`) 範圍。部分
  核准作業也要求呼叫者持有目標裝置將鑄造或繼承的 operator 範圍；請參閱 [Operator 範圍](/zh-Hant/gateway/operator-scopes)。
- `gateway.nodes.pairing.autoApproveCidrs` 是一個選用的 Gateway 原則，僅適用於
  全新的節點裝置配對；它不會改變 CLI 的核准權限。
- 權杖輪換和撤銷僅限於該裝置已核准的配對角色集合和
  已核准的範圍基準。一個遺留的快取權杖項目並不會
  授予權杖管理目標。
- 對於已配對裝置的權杖階段，跨裝置管理僅限管理員：
  `remove`、`rotate` 和 `revoke` 僅限自身使用，除非呼叫者擁有
  `operator.admin`。
- 權杖變更也受限於呼叫者範圍：僅具備配對權限的階段無法
  輪換或撤銷目前具有 `operator.admin` 或
  `operator.write` 的權杖。
- `devices clear` 故意由 `--yes` 進行控管。
- 如果在本地回環上無法使用配對範圍（且未傳遞明確的 `--url`），列出/核准可以使用本地配對回退機制。
- `devices approve` 在製作權杖前需要明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 僅會預覽最新的待處理請求。

## 權杖漂移恢復檢查清單

當 Control UI 或其他客戶端持續失敗並顯示 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 時，請使用此方法。

1. 確認目前的 gateway 權杖來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對的裝置並找出受影響的裝置 ID：

```bash
openclaw devices list
```

3. 為受影響的裝置輪換操作員權杖：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果輪換還不夠，請移除過時的配對並再次核准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共用權杖/密碼重試客戶端連線。

備註：

- 正常重新連線驗證的優先順序是：先明確指定的共用權杖/密碼，然後是明確指定的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
- 受信任的 `AUTH_TOKEN_MISMATCH` 復原可以在單次有界重試中，暫時同時傳送共用權杖和儲存的裝置權杖。

相關：

- [Dashboard 驗證疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [節點](/zh-Hant/nodes)
