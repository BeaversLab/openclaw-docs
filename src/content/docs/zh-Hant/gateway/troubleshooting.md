---
summary: "針對閘道、通道、自動化、節點和瀏覽器的深度疑難排解手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "疑難排解"
---

# 閘道疑難排解

此頁面是深層操作手冊。
如果您想要先進行快速分流流程，請從 [/help/troubleshooting](/en/help/troubleshooting) 開始。

## 指令階梯

請先按以下順序執行這些指令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

預期的健康訊號：

- `openclaw gateway status` 顯示 `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` 回報沒有阻塞性的設定/服務問題。
- `openclaw channels status --probe` 顯示已連線/就緒的通道。

## Anthropic 429 長語境需要額外使用量

當日誌/錯誤包含以下內容時使用：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

檢查：

- 選取的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合長語境使用的資格。
- 請求僅在需要 1M beta 路徑的長工作階段/模型執行時失敗。

修復選項：

1. 停用該模型的 `context1m` 以回退至正常的語境視窗。
2. 使用具有計費功能的 Anthropic API 金鑰，或在訂閱帳戶上啟用 Anthropic 額外使用量。
3. 設定回退模型，以便在 Anthropic 長語境請求被拒絕時繼續執行。

相關：

- [/providers/anthropic](/en/providers/anthropic)
- [/reference/token-use](/en/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/en/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 無回應

如果通道已啟動但沒有任何回應，請在重新連線任何項目之前檢查路由和政策。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

檢查：

- DM 發送者的配對待處理中。
- 群組提及閘道 (`requireMention`, `mentionPatterns`)。
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息在收到提及前被忽略。
- `pairing request` → 發送者需要核准。
- `blocked` / `allowlist` → 發送者/通道已被政策過濾。

相關：

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/pairing](/en/channels/pairing)
- [/channels/groups](/en/channels/groups)

## 儀表板控制 UI 連線

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式和安全環境假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查項目：

- 正確的探測 URL 和儀表板 URL。
- 用戶端與閘道之間的驗證模式/Token 不符。
- 需要裝置身分識別卻使用 HTTP。

常見特徵：

- `device identity required` → 非安全環境或缺少裝置驗證。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  基於挑戰的裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 用戶端為目前的握手簽署了錯誤的
  載荷 (或時間戳記過期)。
- `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置 Token 進行一次受信任的重試。
- 該次重試後持續出現 `unauthorized` → 共用 Token/裝置 Token 偏移；如需要，請重新整理 Token 設定並重新核准/輪替裝置 Token。
- `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

### 驗證詳細代碼快速對應

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步動作：

| 詳細代碼                     | 含義                                     | 建議動作                                                                                                                                                 |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未傳送所需的共用 Token。           | 在用戶端中貼上/設定 Token 並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到控制 UI 設定中。                                    |
| `AUTH_TOKEN_MISMATCH`        | 共用 Token 與閘道驗證 Token 不符。       | 如果是 `canRetryWithDeviceToken=true`，允許一次受信重試。如果仍然失敗，請執行 [token 漂移恢復檢查清單](/en/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 快取的每裝置 Token 已過期或已撤銷。      | 使用 [devices CLI](/en/cli/devices) 輪換/重新核准裝置 token，然後重新連線。                                                                              |
| `PAIRING_REQUIRED`           | 裝置身分識別已知，但未獲核准擔任此角色。 | 核准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                    |

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的客戶端並驗證：

1. 等待 `connect.challenge`
2. 對挑戰綁定的載荷進行簽署
3. 使用相同的挑戰 nonce 發送 `connect.params.device.nonce`

相關：

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) (gateway auth modes)
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Gateway service not running

當服務已安裝但程序無法保持運行時使用此項。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

查找：

- `Runtime: stopped` 附帶退出提示。
- 服務配置不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` → 本機 gateway 模式未啟用。修正方法：在配置中設定 `gateway.mode="local"` (或執行 `openclaw configure`)。如果您透過 Podman 執行 OpenClaw，預設配置路徑為 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 非迴路綁定且沒有 token/密碼。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。

相關：

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## Channel connected messages not flowing

如果通道狀態為已連接但訊息流已中斷，請專注於政策、權限和通道特定的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

尋找：

- DM 政策 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組允許清單和提及要求。
- 缺少頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息被群組提及政策忽略。
- `pairing` / pending approval traces → 發送者未獲批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關：

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Cron 與心跳傳遞

如果 cron 或心跳未執行或未傳遞，請先驗證排程器狀態，然後驗證傳遞目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

尋找：

- Cron 已啟用且存在下次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器 tick 失敗；檢查檔案/日誌/執行時錯誤。
- `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出活動時間視窗。
- `heartbeat: unknown accountId` → 心跳傳遞目標的帳戶 ID 無效。
- `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，同時 `agents.defaults.heartbeat.directPolicy` (或每個代理程式的覆寫) 設定為 `block`。

相關：

- [/automation/troubleshooting](/en/automation/troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## 節點配對工具失敗

如果節點已配對但工具失敗，請隔離前景、權限和批准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

尋找：

- 節點已上線並具備預期功能。
- 作業系統對相機/麥克風/位置/螢幕的權限授予。
- 執行核准和允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核准待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [/nodes/troubleshooting](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## 瀏覽器工具失敗

當瀏覽器工具動作失敗，但閘道本身運作正常時，請使用此項。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查：

- `plugins.allow` 是否已設定且包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

常見特徵：

- `unknown command "browser"` 或 `unknown command 'browser'` → 內建的瀏覽器外掛已被 `plugins.allow` 排除。
- 在 `browser.enabled=true` 時瀏覽器工具遺失 / 無法使用 → `plugins.allow` 排除了 `browser`，因此外掛從未載入。
- `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
- `browser.executablePath not found` → 設定的路徑無效。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
- `Browser attachOnly is enabled ... not reachable` → 僅附加設定檔沒有可連線的目標。

相關：

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## 如果您升級後突然發生問題

大多數升級後的問題是由於設定偏移或現在執行了更嚴格的預設值。

### 1) 驗證與 URL 覆寫行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查事項：

- 如果設定 `gateway.mode=remote`，CLI 呼叫可能會以遠端為目標，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的憑證。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可達但認證錯誤。

### 2) 綁定和認證防護機制更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查事項：

- 非回環綁定（`lan`、`tailnet`、`custom`）需要配置認證。
- 舊金鑰（如 `gateway.token`）不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → 綁定+認證不匹配。
- 運行時運行時出現 `RPC probe: failed` → 閘道運作中但無法透過目前的認證/URL 存取。

### 3) 配對和裝置身分狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 待處理的儀表板/節點裝置核准。
- 政策或身分變更後待處理的 DM 配對核准。

常見特徵：

- `device identity required` → 未滿足裝置認證。
- `pairing required` → 必須核准傳送端/裝置。

如果在檢查後服務組態和運行時仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
