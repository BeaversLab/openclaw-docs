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

待處理請求的輸出包含請求的角色和範圍，以便在您核准之前檢視核准內容。

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

輪換特定角色的裝置權杖（可選更新範圍）。目標角色必須已存在於該裝置的批准配對合約中；輪換無法建立新的未批准角色。如果您省略 `--scope`，後續使用儲存的輪換權杖重新連線將重複使用該權杖的快取批准範圍。如果您傳遞明確的 `--scope` 值，這些值將成為未來快取權杖重新連線的儲存範圍集。非管理員已配對裝置呼叫者只能輪換其**自己的**裝置權杖。此外，任何明確的 `--scope` 值必須保持在呼叫者會話自己的操作員範圍內；輪換無法建立比呼叫者已有的更廣泛的操作員權杖。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

以 JSON 格式回傳新的權杖承載。

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

非管理員已配對裝置呼叫者只能撤銷其**自己的**裝置權杖。撤銷其他裝置的權杖需要 `operator.admin`。

```
openclaw devices revoke --device <deviceId> --role node
```

以 JSON 格式回傳撤銷結果。

## 通用選項

- `--url <url>`：Gateway WebSocket URL（配置時預設為 `gateway.remote.url`）。
- `--token <token>`：Gateway 權杖（如果需要）。
- `--password <password>`：Gateway 密碼（密碼驗證）。
- `--timeout <ms>`：RPC 逾時。
- `--json`：JSON 輸出（建議用於編寫腳本）。

注意：當您設定 `--url` 時，CLI 不會回退至配置或環境憑證。請明確傳遞 `--token` 或 `--password`。缺少明確的憑證是錯誤。

## 注意事項

- Token 輪替會傳回新的 token (敏感)。請將其視為秘密處理。
- 這些指令需要 `operator.pairing`（或 `operator.admin`）範圍。
- Token 輪替會保留在該裝置已核准的配對角色集和已核准的範圍基準內。孤立的快取 token 項目不會授與新的輪替目標。
- 對於配對裝置 token 工作階段，跨裝置管理僅限管理員：
  `remove`、`rotate` 和 `revoke` 僅限自己，除非呼叫者擁有
  `operator.admin`。
- `devices clear` 故意由 `--yes` 限制存取。
- 如果本機回送上無法使用配對範圍（且未傳遞明確的 `--url`），list/approve 可以使用本機配對後援。
- `devices approve` 在鑄造 token 之前需要明確的請求 ID；省略 `requestId` 或傳遞 `--latest` 僅預覽最新的待處理請求。

## Token 偏差恢復檢查清單

當 Control UI 或其他客戶端持續因 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 而失敗時，請使用此方法。

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

5. 使用目前的共用 token/密碼重試客戶端連線。

注意事項：

- 正常的重新連線驗證優先順序是：明確的共用 token/密碼優先，然後是明確的 `deviceToken`，接著是儲存的裝置 token，最後是 bootstrap token。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢復可以在一次有限的重試中，暫時一起發送共用 token 和儲存的裝置 token。

相關連結：

- [儀表板驗證疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [閘道疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)
