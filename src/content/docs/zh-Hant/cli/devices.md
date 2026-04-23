---
summary: "CLI 參考資料 `openclaw devices` (裝置配對 + 權杖輪替/撤銷)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "devices"
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

注意：如果裝置使用變更的驗證詳細資訊（角色/範圍/公開金鑰）重試配對，OpenClaw 將取代先前的待處理條目並發出新的 `requestId`。請在批准前立即執行 `openclaw devices list` 以使用目前的 ID。

如果裝置已經配對並且要求更廣泛的範圍或更廣泛的角色，OpenClaw 會保留現有的核准，並建立一個新的擱置升級請求。請檢閱 `openclaw devices list` 中的 `Requested` 與 `Approved` 欄位，或使用 `openclaw devices approve --latest` 在核准之前預覽確切的升級內容。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒絕擱置中的裝置配對請求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

輪換特定角色的裝置權杖（選擇性更新範圍）。目標角色必須已存在於該裝置的已核准配對合約中；輪換無法鑄造新的未核准角色。如果您省略 `--scope`，後續使用儲存的輪換權杖重新連線將會重複使用該權杖的快取已核准範圍。如果您傳遞明確的 `--scope` 值，這些值將成為未來快取權杖重新連線的儲存範圍集合。非管理員已配對裝置的呼叫者只能輪換**自己的**裝置權杖。此外，任何明確的 `--scope` 值必須保持在呼叫者會話自己的操作員範圍內；輪換無法鑄造比呼叫者現有權限更廣泛的操作員權杖。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式傳回新的權杖內容。

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

非管理員已配對裝置的呼叫者只能撤銷**自己的**裝置權杖。撤銷其他裝置的權杖需要 `operator.admin`。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式傳回撤銷結果。

## 通用選項

- `--url <url>`：閘道 WebSocket URL（設定時預設為 `gateway.remote.url`）。
- `--token <token>`：閘道權杖（如果需要）。
- `--password <password>`：閘道密碼（密碼驗證）。
- `--timeout <ms>`：RPC 逾時。
- `--json`：JSON 輸出（建議用於腳本）。

注意：當您設定 `--url` 時，CLI 不會回退至設定檔或環境變數憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確憑證將視為錯誤。

## 注意事項

- Token 輪換會傳回一個新的 token（敏感資訊）。請將其視為機密處理。
- 這些指令需要 `operator.pairing`（或 `operator.admin`）範圍。
- Token 輪換會保持在該裝置已核准的配對角色集和已核准範圍
  基準內。零散的快取 token 項目不會授予新的
  輪換目標。
- 對於已配對裝置的 token 工作階段，跨裝置管理僅限管理員：
  `remove`、`rotate` 和 `revoke` 僅限本人使用，除非呼叫者具有
  `operator.admin`。
- `devices clear` 受 `--yes` 限制是有意為之。
- 如果在本地回送 無法使用配對範圍（且未傳遞明確的 `--url`），list/approve 可以使用本地配對回退機制。
- `devices approve` 需要在產生 token 之前提供明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 僅會預覽最新的待處理請求。

## Token 偏差恢復檢查清單

當 Control UI 或其他客戶端持續因 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 而失敗時，請使用此方法。

1. 確認目前的 gateway token 來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對裝置並識別受影響的裝置 ID：

```bash
openclaw devices list
```

3. 輪換受影響裝置的操作員 token：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果輪換不足，請移除過時的配對並再次核准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共用 token/密碼重試客戶端連線。

備註：

- 正常的重新連線驗證優先順序為：首先是明確的共用 token/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置 token，最後是 bootstrap token。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢復可以在一次有界的重試中，暫時同時傳送共用 token 和儲存的裝置 token。

相關連結：

- [Dashboard 驗證疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)
