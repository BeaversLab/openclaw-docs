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

核准待處理的裝置配對請求。如果省略了 `requestId`，OpenClaw
會自動核准最近一筆待處理的請求。

注意：如果裝置使用變更的驗證詳細資料 (角色/範圍/公開金鑰)
重試配對，OpenClaw 會取代先前的待處理項目並發出新的
`requestId`。請在核准前立即執行 `openclaw devices list` 以使用目前的 ID。

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

輪替特定角色的裝置權杖 (可選擇更新範圍)。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

```
openclaw devices revoke --device <deviceId> --role node
```

## 通用選項

- `--url <url>`: Gateway WebSocket URL (若已設定則預設為 `gateway.remote.url`)。
- `--token <token>`: Gateway 權杖 (若需要)。
- `--password <password>`: Gateway 密碼 (密碼驗證)。
- `--timeout <ms>`: RPC 逾時。
- `--json`: JSON 輸出 (建議用於指令碼)。

注意：當您設定 `--url` 時，CLI 不會回退至設定或環境認證。
請明確傳遞 `--token` 或 `--password`。缺少明確的認證會導致錯誤。

## 注意事項

- 權杖輪替會傳回新的權杖 (敏感資訊)。請將其視為機密處理。
- 這些指令需要 `operator.pairing` (或 `operator.admin`) 範圍。
- `devices clear` 已被 `--yes` 故意限制。
- 如果在本地回環上無法使用配對範圍（且未傳遞明確的 `--url`），列表/批准可以使用本地配對後備方案。

## 令牌漂移恢復檢查清單

當控制 UI 或其他客戶端持續因 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 而失敗時，請使用此方法。

1. 確認目前的閘道令牌來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對的裝置並找出受影響的裝置 ID：

```bash
openclaw devices list
```

3. 旋轉受影響裝置的操作員令牌：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果旋轉還不夠，請移除過時的配對並再次批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共用令牌/密碼重試客戶端連線。

相關內容：

- [Dashboard 授權疑難排解](/en/web/dashboard#if-you-see-unauthorized-1008)
- [閘道疑難排解](/en/gateway/troubleshooting#dashboard-control-ui-connectivity)
