---
summary: "Deep troubleshooting runbook for gateway, channels, automation, nodes, and browser"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Troubleshooting"
---

# Gateway troubleshooting

This page is the deep runbook.
Start at [/help/troubleshooting](/zh-Hant/help/troubleshooting) if you want the fast triage flow first.

## Command ladder

Run these first, in this order:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Expected healthy signals:

- `openclaw gateway status` shows `Runtime: running` and `RPC probe: ok`.
- `openclaw doctor` reports no blocking config/service issues.
- `openclaw channels status --probe` shows connected/ready channels.

## Anthropic 429 extra usage required for long context

Use this when logs/errors include:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Look for:

- Selected Anthropic Opus/Sonnet model has `params.context1m: true`.
- Current Anthropic credential is not eligible for long-context usage.
- Requests fail only on long sessions/model runs that need the 1M beta path.

Fix options:

1. Disable `context1m` for that model to fall back to the normal context window.
2. Use an Anthropic API key with billing, or enable Anthropic Extra Usage on the subscription account.
3. Configure fallback models so runs continue when Anthropic long-context requests are rejected.

Related:

- [/providers/anthropic](/zh-Hant/providers/anthropic)
- [/reference/token-use](/zh-Hant/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh-Hant/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## No replies

If channels are up but nothing answers, check routing and policy before reconnecting anything.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Look for:

- Pairing pending for DM senders.
- Group mention gating (`requireMention`, `mentionPatterns`).
- Channel/group allowlist mismatches.

Common signatures:

- `drop guild message (mention required` → group message ignored until mention.
- `pairing request` → sender needs approval.
- `blocked` / `allowlist` → sender/channel was filtered by policy.

Related:

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/pairing](/zh-Hant/channels/pairing)
- [/channels/groups](/zh-Hant/channels/groups)

## 儀表板控制 UI 連線能力

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式與安全內容假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查：

- 正確的探測 URL 與儀表板 URL。
- 客戶端與閘道之間的驗證模式/代碼不匹配。
- 在需要裝置身分時使用了 HTTP。

常見特徵：

- `device identity required` → 非安全內容或缺少裝置驗證。
- `device nonce required` / `device nonce mismatch` → 客戶端未完成
  基於挑戰的裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 客戶端對於當前握手簽署了錯誤的
  載荷（或時間戳記過期）。
- `AUTH_TOKEN_MISMATCH` 且帶有 `canRetryWithDeviceToken=true` → 客戶端可以使用快取的裝置代碼進行一次受信任的重試。
- 該次重試後重複出現 `unauthorized` → 共用代碼/裝置代碼偏移；如有需要，請重新整理代碼設定並重新核准/輪替裝置代碼。
- `gateway connect failed:` → 錯誤的主機/埠/url 目標。

### 驗證詳情代碼快速對照

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步操作：

| 詳情代碼                  | 含義                                                  | 建議操作                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送必需的共用代碼。             | 在客戶端中貼上/設定代碼並重試。針對儀表板路徑：`openclaw config get gateway.auth.token`，然後貼上至控制 UI 設定中。                          |
| `AUTH_TOKEN_MISMATCH`        | 共用代碼與閘道驗證代碼不符。           | 如果是 `canRetryWithDeviceToken=true`，允許進行一次受信任的重試。如果仍然失敗，請執行 [代碼偏移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 快取的個別裝置代碼已過期或已被撤銷。             | 使用 [devices CLI](/zh-Hant/cli/devices) 輪替/重新核准裝置代碼，然後重新連線。                                                                                    |
| `PAIRING_REQUIRED`           | 裝置身分已知，但未獲准此角色。 | 批准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                        |

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的客戶端並進行驗證：

1. 等待 `connect.challenge`
2. 簽署綁定挑戰的 payload
3. 發送 `connect.params.device.nonce` 並附上相同的挑戰 nonce

相關：

- [/web/control-ui](/zh-Hant/web/control-ui)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/remote](/zh-Hant/gateway/remote)
- [/cli/devices](/zh-Hant/cli/devices)

## Gateway 服務未執行

當服務已安裝但程序無法持續運行時使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

檢查：

- `Runtime: stopped` 附帶退出提示。
- 服務配置不符 (`Config (cli)` vs `Config (service)`)。
- Port/listener 衝突。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` → 未啟用本地 gateway 模式。修正方法：在設定中設定 `gateway.mode="local"` (或執行 `openclaw configure`)。如果您使用專用的 `openclaw` 使用者透過 Podman 執行 OpenClaw，設定位於 `~openclaw/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有 token/password 的情況下進行非 loopback 綁定。
- `another gateway instance is already listening` / `EADDRINUSE` → port 衝突。

相關：

- [/gateway/background-process](/zh-Hant/gateway/background-process)
- [/gateway/configuration](/zh-Hant/gateway/configuration)
- [/gateway/doctor](/zh-Hant/gateway/doctor)

## Channel 已連接但訊息未流動

如果 channel 狀態為已連接但訊息流動中斷，請專注於政策、權限以及 channel 特定的遞送規則。

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
- 缺少 channel API 權限/scope。

常見特徵：

- `mention required` → 訊息因群組提及政策而被忽略。
- `pairing` / 待處理批准追蹤 → 發送者未獲批准。
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

- Cron 已啟用且存在下一次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行階段錯誤。
- `heartbeat skipped` 且 `reason=quiet-hours` → 超出啟用時段視窗。
- `heartbeat: unknown accountId` → 心跳傳遞目標的帳戶 ID 無效。
- `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，而 `agents.defaults.heartbeat.directPolicy` (或個別代理覆寫) 設定為 `block`。

相關：

- [/automation/troubleshooting](/zh-Hant/automation/troubleshooting)
- [/automation/cron-jobs](/zh-Hant/automation/cron-jobs)
- [/gateway/heartbeat](/zh-Hant/gateway/heartbeat)

## Node 配對工具失敗

如果節點已配對但工具失敗，請區分前景、權限和核准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查：

- 節點上線且具備預期的功能。
- 作業系統針對相機/麥克風/位置/螢幕的權限授權。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須在前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核准待定。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)
- [/nodes/index](/zh-Hant/nodes/index)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)

## 瀏覽器工具失敗

當閘道本身健康無虞，但瀏覽器工具操作失敗時，請使用本節。

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
- 本機 Chrome 可用性，適用於 `existing-session` / `user` 設定檔。

常見特徵：

- `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
- `browser.executablePath not found` → 設定的路徑無效。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
- `Browser attachOnly is enabled ... not reachable` → 僅附加設定檔沒有可連線的目標。

相關連結：

- [/tools/browser-linux-troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh-Hant/tools/browser)

## 如果您升級後突然出現問題

大多數升級後的故障是由於設定漂移，或是現在執行了更嚴格的預設值。

### 1) Auth 和 URL 覆寫行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查事項：

- 如果 `gateway.mode=remote`，CLI 呼叫可能以遠端為目標，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的認證。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可連線但認證錯誤。

### 2) Bind 和 auth 防護措施更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查事項：

- 非回環 bind (`lan`, `tailnet`, `custom`) 需要設定認證。
- 舊的金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → bind+auth 不相符。
- `RPC probe: failed` 同時執行時間正在執行 → 閘道運作中，但使用目前的 auth/url 無法存取。

### 3) 配對和裝置身分狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 待處理的儀表板/節點裝置核准。
- 在原則或身分變更後，待處理的 DM 配對核准。

常見特徵：

- `device identity required` → 裝置認證未滿足。
- `pairing required` → 傳送者/裝置必須經過核准。

如果在檢查後服務設定與執行時期仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [/gateway/pairing](/zh-Hant/gateway/pairing)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/background-process](/zh-Hant/gateway/background-process)

import en from "/components/footer/en.mdx";

<en />
