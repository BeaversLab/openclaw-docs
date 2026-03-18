---
summary: "針對閘道、通道、自動化、節點和瀏覽器的深度疑難排解手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "疑難排解"
---

# 閘道疑難排解

本頁面是深度手冊。
如果您想要先進行快速分類流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

## 指令階梯

請先按此順序執行這些指令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

預期的正常訊號：

- `openclaw gateway status` 顯示 `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` 回報沒有阻擋性的設定/服務問題。
- `openclaw channels status --probe` 顯示已連線/就緒的通道。

## Anthropic 429 長語境所需的額外使用量

當日誌/錯誤包含以下內容時使用：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 選取的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合長內容使用的資格。
- 僅在需要 1M beta 路徑的長時間工作階段/模型執行中，請求會失敗。

修復選項：

1. 停用該模型的 `context1m` 以回退至一般內容視窗。
2. 使用具有計費功能的 Anthropic API 金鑰，或在訂閱帳戶上啟用 Anthropic 額外使用量。
3. 設定回退模型，以便當 Anthropic 長內容請求被拒絕時，執行能夠繼續。

相關：

- [/providers/anthropic](/zh-Hant/providers/anthropic)
- [/reference/token-use](/zh-Hant/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh-Hant/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 無回應

如果通道已啟動但沒有任何回應，請在重新連接任何項目之前檢查路由和原則。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

尋找：

- 正在等待 DM 發送者的配對。
- 群組提及閘控 (`requireMention`, `mentionPatterns`)。
- 頻道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息在提及前被忽略。
- `pairing request` → 發送者需要核准。
- `blocked` / `allowlist` → 發送者/頻道已被原則過濾。

相關連結：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/pairing](/zh-Hant/channels/pairing)
- [/channels/groups](/zh-Hant/channels/groups)

## 儀表板控制 UI 連線能力

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式及安全情境假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查重點：

- 正確的探測 URL 與儀表板 URL。
- 用戶端與閘道之間的驗證模式/權杖不匹配。
- 需要裝置身分的 HTTP 使用情況。

常見特徵：

- `device identity required` → 非安全語境或缺少裝置驗證。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  基於挑戰的裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 用戶端為當前握手簽署了錯誤的
  載荷（或過期的時間戳記）。
- 帶有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 用戶端可以使用快取的裝置 Token 進行一次受信任的重試。
- 在該次重試後重複出現 `unauthorized` → 共用 Token/裝置 Token 偏離；重新整理 Token 設定並在需要時重新核准/輪替裝置 Token。
- `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

### 驗證詳細代碼快速對應表

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一個操作：

| 詳細代碼                     | 含義                               | 建議操作                                                                                                                                                              |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未發送所需的共享令牌。       | 在用戶端中貼上/設置令牌並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到 Control UI 設置中。                                                |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與網關身份驗證令牌不匹配。 | 如果是 `canRetryWithDeviceToken=true`，允許一次受信重試。如果仍然失敗，請執行 [token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 快取的每設備令牌已過期或已被撤銷。 | 使用 [devices CLI](/zh-Hant/cli/devices) 輪換/重新批准設備令牌，然後重新連接。                                                                                        |
| `PAIRING_REQUIRED`           | 設備身分已知但未獲批准用於此角色。 | 批准待處理的請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                               |

裝置認證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽名錯誤，請更新連線的客戶端並進行驗證：

1. 等待 `connect.challenge`
2. 簽署綁定挑戰的 payload
3. 發送 `connect.params.device.nonce` 並附上相同的挑戰 nonce

相關連結：

- [/web/control-ui](/zh-Hant/web/control-ui)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/remote](/zh-Hant/gateway/remote)
- [/cli/devices](/zh-Hant/cli/devices)

## Gateway 服務未運作

當服務已安裝但程序無法保持運行時使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

尋找：

- `Runtime: stopped` 附帶退出提示。
- 服務配置不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` → 未啟用本機 Gateway 模式。解決方法：在設定中設定 `gateway.mode="local"`（或執行 `openclaw configure`）。如果您是使用專用的 `openclaw` 使用者透過 Podman 執行 OpenClaw，設定檔位於 `~openclaw/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有 token/密碼的情況下進行非回送綁定。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。

相關：

- [/gateway/background-process](/zh-Hant/gateway/background-process)
- [/gateway/configuration](/zh-Hant/gateway/configuration)
- [/gateway/doctor](/zh-Hant/gateway/doctor)

## 通道已連線但訊息無流動

如果通道狀態為已連線但訊息流停止，請專注於策略、權限以及通道特定的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查：

- DM 政策 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組允許清單及提及要求。
- 缺少頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息因群組提及政策而被忽略。
- `pairing` / 待審批追蹤 → 發送者未獲批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/whatsapp](/zh-Hant/channels/whatsapp)
- [/channels/telegram](/zh-Hant/channels/telegram)
- [/channels/discord](/zh-Hant/channels/discord)

## Cron 與心跳傳遞

如果 cron 或心跳未執行或未傳遞，請先驗證排程器狀態，然後檢查傳遞目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查：

- Cron 已啟用且存在下次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器刻度失敗；檢查檔案/日誌/執行時錯誤。
- `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出活動時間視窗。
- `heartbeat: unknown accountId` → 心跳傳遞目標的帳戶 ID 無效。
- `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，但 `agents.defaults.heartbeat.directPolicy` (或個別代理覆寫) 被設定為 `block`。

相關：

- [/automation/troubleshooting](/zh-Hant/automation/troubleshooting)
- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)

## 節點配對工具失敗

如果節點已配對但工具失敗，請隔離前景、權限和核准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查：

- 節點已上線並具備預期功能。
- 作業系統對相機/麥克風/位置/螢幕的權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核准待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)
- [/nodes/index](/zh-Hant/nodes/index)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)

## 瀏覽器工具失敗

當網關本身正常但瀏覽器工具動作失敗時使用此解決方案。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 有效的瀏覽器執行檔路徑。
- CDP 設定檔的連線能力。
- 本機 Chrome 的可用性，用於 `existing-session` / `user` 設定檔。

常見徵兆：

- `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
- `browser.executablePath not found` → 設定的路徑無效。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
- `Browser attachOnly is enabled ... not reachable` → 僅附加設定檔沒有可到達的目標。

相關連結：

- [/tools/browser-linux-troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh-Hant/tools/browser)

## 如果您升級後突然發生故障

大多數升級後的故障是由於設定偏移或是現在強制執行了更嚴格的預設值。

### 1) Auth 和 URL 覆蓋行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查事項：

- 如果 `gateway.mode=remote`，CLI 呼叫可能指向遠端，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的憑證。

常見徵兆：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可到達但 auth 錯誤。

### 2) 綁定和 auth 防護措施更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查事項：

- 非回送綁定 (`lan`, `tailnet`, `custom`) 需要設定 auth。
- 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

常見徵兆：

- `refusing to bind gateway ... without auth` → 綁定+auth 不符。
- `RPC probe: failed` 而 runtime 正在執行 → 網關存活但無法使用目前的 auth/url 存取。

### 3) 配對和裝置識別狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 待處理的儀表板/節點裝置核准。
- 原則或識別變更後待處理的 DM 配對核准。

常見徵兆：

- `device identity required` → 裝置 auth 未滿足。
- `pairing required` → 發送者/裝置必須已獲核准。

如果在檢查後服務設定與執行時期仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關連結：

- [/gateway/pairing](/zh-Hant/gateway/pairing)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/background-process](/zh-Hant/gateway/background-process)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
