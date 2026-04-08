---
summary: "針對 gateway、通道、自動化、節點和瀏覽器的深度故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# 閘道疑難排解

本頁面是深度手冊。
如果您想先進行快速分診流程，請從 [/help/troubleshooting](/en/help/troubleshooting) 開始。

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
- `openclaw doctor` 回報無阻礙性的設定/服務問題。
- `openclaw channels status --probe` 顯示各帳號的即時傳輸狀態，以及
  （若支援）探測/稽核結果，例如 `works` 或 `audit ok`。

## Anthropic 429 長語境需要額外使用量

當日誌/錯誤包含以下內容時使用此方法：
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

1. 停用該模型的 `context1m` 以還原為正常的內容視窗。
2. 使用具有計費功能的 Anthropic API 金鑰，或在 Anthropic OAuth/訂閱帳戶上啟用 Anthropic 額外用量。
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

- `drop guild message (mention required` → 群組訊息將被忽略，直到被提及。
- `pairing request` → 發送者需要批准。
- `blocked` / `allowlist` → 發送者/通道已被策略過濾。

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

- `device identity required` → 非安全上下文或缺少裝置驗證。
- `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中
  （或者您是來自非回環瀏覽器來源的連線，且沒有明確的
  允許清單）。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  挑戰式裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 用戶端為當前
  握手簽署了錯誤的承載（或時間戳記過期）。
- 帶有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
- 該快取權杖重試會重複使用與配對裝置權杖一起儲存的快取範圍集。明確的 `deviceToken` / 明確的 `scopes` 呼叫者則會保留其請求的範圍集。
- 在該重試路徑之外，連線驗證優先順序為：首先是明確的共用權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，
  最後是啟動權杖。
- 在非同步 Tailscale Serve Control UI 路徑上，針對相同 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前進行序列化。因此，來自同一用戶端的兩次不良並發重試可能在第二次嘗試時顯示 `retry later`，
  而非兩次單純的不相符。
- 來自瀏覽器來源
  回送用戶端的 `too many failed authentication attempts (retry later)` → 來自同一標準化 `Origin` 的重複失敗會
  被暫時鎖定；另一個 localhost 來源則使用獨立的區塊。
- 在該重試後重複出現 `unauthorized` → 共用權杖/裝置權杖漂移；更新權杖設定並在需要時重新核准/輪替裝置權杖。
- `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

### Auth detail codes quick map

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步操作：

| Detail code                  | Meaning                                        | Recommended action                                                                                                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_TOKEN_MISSING`         | Client did not send a required shared token.   | Paste/set token in the client and retry. For dashboard paths: `openclaw config get gateway.auth.token` then paste into Control UI settings.                                                                                                                        |
| `AUTH_TOKEN_MISMATCH`        | Shared token did not match gateway auth token. | 如果 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取權杖重試會重複使用已儲存的核准範圍；明確的 `deviceToken` / `scopes` 呼叫端會保留請求的範圍。如果仍然失敗，請執行 [token drift recovery checklist](/en/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取權杖已過期或已被撤銷。           | 使用 [devices CLI](/en/cli/devices) 輪替/重新核准裝置權杖，然後重新連線。                                                                                                                                                                                          |
| `PAIRING_REQUIRED`           | 裝置身分識別已知，但未獲准此角色。             | 核准待決請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                                                                                                                                |

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的用戶端並進行驗證：

1. 等待 `connect.challenge`
2. 簽署綁定挑戰的負載
3. 使用相同的挑戰 nonce 傳送 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置權杖工作階段只能管理**其自己的**裝置，除非
  呼叫端也擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求
  呼叫端工作階段已擁有的操作員範圍

相關：

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) (gateway auth modes)
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Gateway service not running

當服務已安裝但程序無法保持執行時使用此項。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查找：

- `Runtime: stopped` 附帶退出提示。
- 服務設定不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 使用 `--deep` 時有多餘的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或組態檔被覆寫並遺失了 `gateway.mode`。解決方法：在您的組態中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新標記預期的本機模式組態。如果您是透過 Podman 執行 OpenClaw，預設組態路徑為 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑（token/密碼，或設定的 trusted-proxy）的情況下進行非 loopback 繫結。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
- `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設置應在每台機器上保留一個閘道；如果您確實需要多個，請隔離連接埠 + 組態/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)。

相關：

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## 閘道探測警告

當 `openclaw gateway probe` 連接到某些東西，但仍列印警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否關於 SSH 備援、多個閘道、遺漏範圍，或未解析的驗證參照。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接設定的/loopback 目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常表示有意設定的多閘道環境或過時/重複的監聽器。
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受到範圍限制；請配對裝置身分或使用具有 `operator.read` 的憑證。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中無法用於失敗目標的驗證資料。

相關：

- [/cli/gateway](/en/cli/gateway)
- [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)
- [/gateway/remote](/en/gateway/remote)

## 頻道已連接但訊息未流動

如果頻道狀態為已連接但訊息流已中斷，請檢查政策、權限以及頻道特定的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查：

- DM 政策 (`pairing`、 `allowlist`、 `open`、 `disabled`)。
- 群組允許清單和提及要求。
- 缺少頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息被群組提及政策忽略。
- `pairing` / 待審批追蹤 → 發送者未獲批准。
- `missing_scope`、 `not_in_channel`、 `Forbidden`、 `401/403` → 頻道驗證/權限問題。

相關：

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Cron 和心跳傳遞

如果 cron 或心跳未執行或未傳遞，請先驗證排程器狀態，然後檢查傳遞目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查：

- 已啟用 Cron 且存在下一次喚醒時間。
- 工作執行歷史狀態 (`ok`、 `skipped`、 `error`)。
- 心跳跳過原因 (`quiet-hours`、 `requests-in-flight`、 `alerts-disabled`、 `empty-heartbeat-file`、 `no-tasks-due`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器滴答失敗；請檢查檔案/日誌/執行時錯誤。
- `heartbeat skipped` 搭配 `reason=quiet-hours` → 在有效時間視窗之外。
- `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空白行 / markdown 標題，因此 OpenClaw 跳過模型呼叫。
- `heartbeat skipped` with `reason=no-tasks-due` → `HEARTBEAT.md` 包含一個 `tasks:` 區塊，但在此週期中沒有任何任務到期。
- `heartbeat: unknown accountId` → 心跳傳遞目標的帳戶 ID 無效。
- `heartbeat skipped` with `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，但 `agents.defaults.heartbeat.directPolicy` （或每個代理的覆寫設定）設為 `block`。

相關：

- [/automation/cron-jobs#troubleshooting](/en/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## 節點配對工具失敗

如果節點已配對但工具失敗，請隔離前景、權限與核准狀態進行檢查。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查項目：

- 節點已上線並具備預期功能。
- 作業系統針對相機/麥克風/位置/螢幕的權限授予。
- 執行核准與允許清單狀態。

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

當瀏覽器工具操作失敗，但閘道本身正常時使用。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查項目：

- `plugins.allow` 是否已設定且包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

常見特徵：

- `unknown command "browser"` 或 `unknown command 'browser'` → 隨附的瀏覽器外掛已被 `plugins.allow` 排除。
- 當 `browser.enabled=true` 時瀏覽器工具遺失/無法使用 → `plugins.allow` 排除了 `browser`，因此外掛從未載入。
- `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
- `browser.executablePath not found` → 設定的路徑無效。
- `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的配置，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
- `Remote CDP for profile "<name>" is not reachable` → 閘道主機無法連線到設定的遠端 CDP 端點。
- `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可連線的目標，或者 HTTP 端點已回應但仍無法開啟 CDP WebSocket。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的閘道安裝缺少完整的 Playwright 套件；ARIA 快照和基本頁面截圖仍然可以運作，但導覽、AI 快照、CSS 選擇器元素截圖和 PDF 匯出將無法使用。
- `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取或快照 `--ref`，而非 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳掛鉤需要快照參照，而非 CSS 選擇器。
- `existing-session file uploads currently support one file at a time.` → 請在 Chrome MCP 設定檔上每次呼叫僅發送一個上傳。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話方塊掛鉤不支援覆寫逾時。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理的瀏覽器或原始 CDP 設定檔。
- 僅附加或遠端 CDP 設定檔上的過時視口 / 深色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉現用的控制工作階段並釋放 Playwright/CDP 模擬狀態，而無需重新啟動整個閘道。

相關：

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## 如果您升級後突然出現問題

大多數升級後的損壞是由於配置偏移或現在執行了更嚴格的預設值。

### 1) 驗證和 URL 覆蓋行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查事項：

- 如果是 `gateway.mode=remote`，CLI 呼叫可能以遠端為目標，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到已儲存的認證。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可連線但認證錯誤。

### 2) 繫結和驗證防護措施更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查事項：

- 非回送繫結 (`lan`, `tailnet`, `custom`) 需要有效的閘道驗證路徑：共用 token/密碼驗證，或正確設定的非回送 `trusted-proxy` 部署。
- 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → 非回送繫結沒有有效的閘道驗證路徑。
- 執行階段運作時出現 `RPC probe: failed` → 閘道運作中但無法以目前的驗證/URL 存取。

### 3) 配對和裝置身分識別狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 儀表板/節點的待處理裝置核准。
- 原則或身分識別變更後的待處理 DM 配對核准。

常見特徵：

- `device identity required` → 裝置驗證未滿足。
- `pairing required` → 必須核准傳送者/裝置。

如果檢查後服務設定和執行階段仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
