---
summary: "CLI reference for `openclaw devices` (device pairing + token rotation/revocation)"
read_when:
  - 您正在批准裝置配對請求
  - 您需要輪換或撤銷裝置權杖
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

批准待處理的裝置配對請求。如果省略 `requestId`，OpenClaw
會自動批准最近的待處理請求。

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

輪替特定角色的裝置權杖（可選更新範圍）。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `openclaw devices revoke --device <id> --role <role>`

撤銷特定角色的裝置權杖。

```
openclaw devices revoke --device <deviceId> --role node
```

## 通用選項

- `--url <url>`：Gateway WebSocket URL（設定時預設為 `gateway.remote.url`）。
- `--token <token>`：Gateway 權杖（如果需要）。
- `--password <password>`：Gateway 密碼（密碼驗證）。
- `--timeout <ms>`：RPC 逾時。
- `--json`：JSON 輸出（建議用於腳本）。

注意：當您設定 `--url` 時，CLI 不會回退到設定或環境憑證。
明確傳遞 `--token` 或 `--password`。缺少明確的憑證會導致錯誤。

## 備註

- 權杖輪替會傳回一個新的權杖（敏感）。請將其視為密碼處理。
- 這些指令需要 `operator.pairing`（或 `operator.admin`）範圍。
- `devices clear` 故意受到 `--yes` 的限制。
- 如果在本地回環上無法使用配對範圍（且未傳遞明確的 `--url`），列表/核准可以使用本地配對後備方案。

## 權杖漂移恢復檢查清單

當 Control UI 或其他客戶端持續失敗並顯示 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 時使用。

1. 確認目前的閘道權杖來源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配對裝置並識別受影響的裝置 ID：

```bash
openclaw devices list
```

3. 為受影響的裝置輪替操作員權杖：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果輪替還不夠，請移除過時的配對並再次核准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用目前的共用權杖/密碼重試客戶端連線。

相關：

- [Dashboard 授權疑難排解](/zh-Hant/web/dashboard#if-you-see-unauthorized-1008)
- [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#dashboard-control-ui-connectivity)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
