---
summary: "針對 Gateway、頻道、自動化、節點和瀏覽器的深入故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# Gateway 故障排除

本頁面是深入的手冊。
如果您優先需要快速分診流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

## 命令階層

請先按順序執行這些命令：

```exec
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

預期的健康訊號：

- `openclaw gateway status` 顯示 `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` 回報無阻斷性的配置/服務問題。
- `openclaw channels status --probe` 顯示已連線/就緒的頻道。

## Anthropic 429 長內容需要額外使用量

當日誌/錯誤包含以下內容時使用：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```exec
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 所選的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合長上下文使用資格。
- 僅在需要 1M beta 路徑的長時間工作階段/模型執行上，請求才會失敗。

修復選項：

1. 針對該模型停用 `context1m` 以回退至正常的上下文視窗。
2. 使用具有計費功能的 Anthropic API 金鑰，或在訂閱帳戶上啟用 Anthropic 額外使用量。
3. 設定回退模型，以便當 Anthropic 長上下文請求被拒絕時，執行能夠繼續。

相關：

- [/providers/anthropic](/zh-Hant/providers/anthropic)
- [/reference/token-use](/zh-Hant/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh-Hant/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 無回應

如果通道已啟動但沒有任何回應，請在重新連線任何項目之前檢查路由和政策。

```exec
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

尋找：

- 等待 DM 發送者配對。
- 群組提及閘控 (`requireMention`, `mentionPatterns`)。
- 頻道/群組允許清單不符。

常見特徵：

- `drop guild message (mention required` → 群組訊息被忽略，直到被提及。
- `pairing request` → 發送者需要批准。
- `blocked` / `allowlist` → 發送者/頻道已被策略過濾。

相關：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/pairing](/zh-Hant/channels/pairing)
- [/channels/groups](/zh-Hant/channels/groups)

## 儀表板控制介面連線

當儀表板/控制介面無法連線時，請驗證 URL、驗證模式和安全上下文假設。

```exec
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查：

- 正確的探測 URL 和儀表板 URL。
- 客戶端與閘道之間的驗證模式/權杖不符。
- 需要裝置身分的 HTTP 使用情況。

常見特徵：

- `device identity required` → 非安全內容或缺少裝置驗證。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  基於挑戰的裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 用戶端對當前交握
  簽署了錯誤的負載 (或過期時間戳記)。
- `AUTH_TOKEN_MISMATCH` 伴隨 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
- 該次重試後重複出現 `unauthorized` → 共用權杖/裝置權杖漂移；重新整理權杖設定並在需要時重新核准/輪替裝置權杖。
- `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

### 驗證細節代碼快速對應

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一個動作：

| 詳細代碼                     | 含義                                 | 建議的動作                                                                                                                                                 |
| ---------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送所需的共享令牌。         | 在客戶端中粘貼/設置令牌並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後粘貼到 Control UI 設置中。                                     |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與網關身份驗證令牌不匹配。   | 如果 `canRetryWithDeviceToken=true`，允許一次可信的重試。如果仍然失敗，請運行[令牌漂移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個設備的快取令牌已過期或已被撤銷。 | 使用 [devices CLI](/zh-Hant/cli/devices) 輪換/重新批准設備令牌，然後重新連接。                                                                             |
| `PAIRING_REQUIRED`           | 設備身分已知，但未獲准擔任此角色。   | 批准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                      |

設備驗證 v2 遷移檢查：

```exec
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽名錯誤，請更新連線的客戶端並驗證：

1. 等待 `connect.challenge`
2. 簽署綁定挑戰的負載
3. 使用相同的挑戰 nonce 發送 `connect.params.device.nonce`

相關：

- [/web/control-ui](/zh-Hant/web/control-ui)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/remote](/zh-Hant/gateway/remote)
- [/cli/devices](/zh-Hant/cli/devices)

## Gateway 服務未運行

當服務已安裝但進程無法保持運行時使用。

```exec
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

尋找：

- `Runtime: stopped` 並附帶退出提示。
- 服務配置不匹配 (`Config (cli)` vs `Config (service)`)。
- 端口/監聽器衝突。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` → 未啟用本機閘道模式。解決方法：在設定中設定 `gateway.mode="local"`（或執行 `openclaw configure`）。如果您是透過 Podman 使用專用的 `openclaw` 使用者來執行 OpenClaw，設定檔位於 `~openclaw/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有權杖/密碼的情況下進行非迴路綁定。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。

相關：

- [/gateway/background-process](/zh-Hant/gateway/background-process)
- [/gateway/configuration](/zh-Hant/gateway/configuration)
- [/gateway/doctor](/zh-Hant/gateway/doctor)

## 頻道已連線但訊息無法流動

如果頻道狀態為已連線但訊息流已停止，請專注於原則、權限以及頻道特定的傳遞規則。

```exec
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

尋找：

- DM 政策 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組白名單和提及要求。
- 缺少頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息被群組提及政策忽略。
- `pairing` / 待審批追蹤 → 發送者未獲批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道認證/權限問題。

相關：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/whatsapp](/zh-Hant/channels/whatsapp)
- [/channels/telegram](/zh-Hant/channels/telegram)
- [/channels/discord](/zh-Hant/channels/discord)

## Cron 與心跳遞送

如果 cron 或心跳沒有執行或沒有傳送，請先驗證排程器狀態，然後檢查傳送目標。

```exec
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

尋找：

- Cron 已啟用且存在下一次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器滴答失敗；請檢查檔案/日誌/執行時錯誤。
- `heartbeat skipped` 且具有 `reason=quiet-hours` → 在啟用時段視窗外。
- `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
- `heartbeat skipped` 配合 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，而 `agents.defaults.heartbeat.directPolicy` （或個別代理覆寫）設定為 `block`。

相關：

- [/automation/troubleshooting](/zh-Hant/automation/troubleshooting)
- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)

## 節點配對工具失敗

如果節點已配對但工具失敗，請隔離前景、權限和核准狀態。

```exec
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查項目：

- 節點上線並具備預期功能。
- 作業系統對相機/麥克風/位置/螢幕的權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須在前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → exec approval pending.
- `SYSTEM_RUN_DENIED: allowlist miss` → command blocked by allowlist.

相關：

- [/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)
- [/nodes/index](/zh-Hant/nodes/index)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)

## 瀏覽器工具失敗

當瀏覽器工具操作失敗但閘道本身健康時，請使用此指南。

```exec
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查：

- 有效的瀏覽器執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本地 Chrome 可用性。

常見特徵：

- `Failed to start Chrome CDP on port` → browser process failed to launch.
- `browser.executablePath not found` → configured path is invalid.
- `No Chrome tabs found for profile="user"` → the Chrome MCP attach profile has no open local Chrome tabs.
- `Browser attachOnly is enabled ... not reachable` → attach-only 設定檔沒有可到達的目標。

相關：

- [/tools/browser-linux-troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh-Hant/tools/browser)

## 如果您升級後突然出現問題

大多數升級後的問題是由於設定偏移或現在執行了更嚴格的預設值。

### 1) Auth 和 URL 覆寫行為已變更

```exec
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查項目：

- 如果 `gateway.mode=remote`，CLI 呼叫可能正在以遠端為目標，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的認證。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可到達但認證錯誤。

### 2) 繫結和認證防護措施更嚴格

```exec
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查項目：

- 非環回綁定（`lan`、`tailnet`、`custom`）需要設定驗證。
- 舊金鑰（例如 `gateway.token`）不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → 綁定與驗證不符。
- 執行時期執行時出現 `RPC probe: failed` → 閘道仍在運作，但目前的驗證/URL 無法存取。

### 3) 配對與裝置身分狀態變更

```exec
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 待審核的儀表板/節點裝置。
- 原則或身分變更後待審核的 DM 配對。

常見特徵：

- `device identity required` → 裝置驗證未滿足。
- `pairing required` → 必須審核傳送端/裝置。

如果在檢查後服務配置和運行時仍然不一致，請從同一個配置檔案/狀態目錄重新安裝服務元數據：

```exec
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [/gateway/pairing](/zh-Hant/gateway/pairing)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/background-process](/zh-Hant/gateway/background-process)
