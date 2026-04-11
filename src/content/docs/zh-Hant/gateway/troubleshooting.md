---
summary: "針對閘道、通道、自動化、節點和瀏覽器的深度故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# 閘道疑難排解

此頁面是深度手冊。
如果您想先進行快速分流流程，請從 [/help/troubleshooting](/en/help/troubleshooting) 開始。

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
- `openclaw doctor` 回報無阻斷性設定/服務問題。
- `openclaw channels status --probe` 顯示即時的帳號傳輸狀態，以及（如支援）探測/稽核結果，例如 `works` 或 `audit ok`。

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

1. 停用該模型的 `context1m` 以還原至正常的內容視窗。
2. 使用符合長內容請求資格的 Anthropic 憑證，或切換至 Anthropic API 金鑰。
3. 設定回退模型，以便在 Anthropic 長語境請求被拒絕時繼續執行。

相關：

- [/providers/anthropic](/en/providers/anthropic)
- [/reference/token-use](/en/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/en/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本機相容 OpenAI 的後端通過直接探測，但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 可用
- 小型直接 `/v1/chat/completions` 呼叫可用
- OpenClaw 模型執行僅在一般代理輪次時失敗

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

尋找：

- 直接小型呼叫成功，但 OpenClaw 執行僅在較大型提示時失敗
- 後端錯誤指出 `messages[].content` 預期為字串
- 後端當機僅發生在較大的提示 token 數量或完整的代理執行時提示

常見特徵：

- `messages[...].content: invalid type: sequence, expected a string` → 後端
  拒絕結構化的 Chat Completions 內容部分。解決方法：設定
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 直接小型請求成功，但 OpenClaw 代理執行因後端/模型
  當機而失敗（例如某些 `inferrs` 版本上的 Gemma）→ OpenClaw 傳輸
  可能已正確；後端是因較大的代理執行時
  提示結構而失敗。
- 停用工具後失敗減少但未消失 → 工具架構造成了部分壓力，但剩餘問題仍是上游模型/伺服器容量或後端錯誤。

修復選項：

1. 針對僅支援字串的 Chat Completions 後端，設定 `compat.requiresStringContent: true`。
2. 針對無法可靠處理 OpenClaw 工具架構介面的模型/後端，設定 `compat.supportsTools: false`。
3. 盡可能降低提示詞壓力：較小的工作區啟動、較短的交談紀錄、較輕量的本機模型，或是具備更強長上下文支援的後端。
4. 如果微小的直接請求持續成功，但 OpenClaw 代理轉換仍在後端內部崩潰，請將其視為上游伺服器/模型限制，並使用可接受的 Payload 形狀在那裡提交可重現的問題。

相關：

- [/gateway/local-models](/en/gateway/local-models)
- [/gateway/configuration#models](/en/gateway/configuration#models)
- [/gateway/configuration-reference#openai-compatible-endpoints](/en/gateway/configuration-reference#openai-compatible-endpoints)

## 無回覆

如果通道已啟動但無任何回應，請在重新連接任何項目之前檢查路由與策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

尋找：

- DM 發送者的配對待處理。
- 群組提及閘道 (`requireMention`, `mentionPatterns`)。
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息被忽略，直到被提及。
- `pairing request` → 發送者需要批准。
- `blocked` / `allowlist` → 發送者/通道已被策略過濾。

相關：

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/pairing](/en/channels/pairing)
- [/channels/groups](/en/channels/groups)

## 儀表板控制 UI 連線性

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式與安全內容假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

尋找：

- 正確的探測 URL 與儀表板 URL。
- 用戶端與閘道之間的驗證模式/權杖不匹配。
- 需要裝置身分時使用了 HTTP。

常見特徵：

- `device identity required` → 非安全內容或缺少裝置驗證。
- `origin not allowed` → browser `Origin` 不在 `gateway.controlUi.allowedOrigins` 中
  （或者您是來自非 loopback 瀏覽器來源的連線，且沒有明確的
  允許清單）。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  基於挑戰的裝置驗證流程（`connect.challenge` + `device.nonce`）。
- `device signature invalid` / `device signature expired` → 用戶端針對當前交握簽署了錯誤的
  payload（或過期的時間戳記）。
- `AUTH_TOKEN_MISMATCH` 伴隨 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
- 該快取權杖重試會重複使用與配對裝置權杖一起儲存的快取範圍集合。明確的 `deviceToken` / 明確的 `scopes` 呼叫者則會保留其請求的範圍集合。
- 在該重試路徑之外，連線驗證優先順序為：明確的共用
  權杖/密碼優先，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，
  最後是引導權杖。
- 在非同步 Tailscale Serve 控制 UI 路徑上，針對相同
  `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前進行序列化。因此，來自同一用戶端的兩次錯誤並發重試可能會在第二次嘗試時顯示 `retry later`
  而不是兩次單純的不匹配。
- 來自瀏覽器來源
  loopback 用戶端的 `too many failed authentication attempts (retry later)` → 來自同一標準化 `Origin` 的重複失敗
  會被暫時鎖定；另一個 localhost 來源則使用個別的 bucket。
- 該次重試後重複出現 `unauthorized` → 共用權杖/裝置權杖漂移；重新整理權杖設定並在需要時重新核准/輪替裝置權杖。
- `gateway connect failed:` → 錯誤的主機/連接埠/url 目標。

### 驗證詳情代碼快速對應

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步動作：

| 詳情代碼                     | 含義                                     | 建議動作                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未發送所需的共用權杖。             | 在客戶端中貼上/設定權杖並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到 Control UI 設定中。                                                                                                                                                     |
| `AUTH_TOKEN_MISMATCH`        | 共享的權杖與閘道驗證權杖不符。           | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。使用快取權杖的重試會重複使用已儲存的核准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行 [token drift recovery checklist](/en/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取權杖已過期或已撤銷。       | 使用 [devices CLI](/en/cli/devices) 旋轉/重新核准裝置權杖，然後重新連線。                                                                                                                                                                                                  |
| `PAIRING_REQUIRED`           | 裝置身分識別已知，但未獲得此角色的核准。 | 核准待處理的請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。                                                                                                                                                                                    |

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/signature 錯誤，請更新連線的客戶端並進行驗證：

1. 等待 `connect.challenge`
2. 簽署與挑戰綁定的承載
3. 使用相同的挑戰 nonce 發送 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置權杖工作階段只能管理**其自身的**裝置，除非呼叫者也具有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫者工作階段已持有的操作員範圍

相關：

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) (閘道驗證模式)
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## 閘道服務未執行

當服務已安裝但程序無法保持運行時使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

檢查：

- `Runtime: stopped` 並包含退出提示。
- 服務設定不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 當使用 `--deep` 時，有多餘的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或設定檔被覆蓋並遺失了 `gateway.mode`。解決方法：在設定中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新套用預期的本機模式設定。如果您透過 Podman 執行 OpenClaw，預設設定路徑為 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑（權杖/密碼，或設定的受信任代理）的情況下進行非回送綁定。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
- `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應該每台機器保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)。

相關連結：

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## 閘道探測警告

當 `openclaw gateway probe` 連接到某些東西，但仍印出警告區塊時使用此選項。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 無論警告是關於 SSH 備援、多個閘道、缺少範圍，還是未解析的驗證參照。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接設定/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常意味著有意進行多閘道設定，或存在過時/重複的監聽器。
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細資訊 RPC 受限於範圍；請配對裝置身分識別或使用具有 `operator.read` 的認證。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中，失敗目標的驗證資料無法使用。

相關連結：

- [/cli/gateway](/en/cli/gateway)
- [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)
- [/gateway/remote](/en/gateway/remote)

## 頻道已連線但訊息無法流動

如果頻道狀態顯示已連線，但訊息流動已停止，請專注於檢查策略、權限以及特定頻道的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查以下項目：

- DM 策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組白名單與提及要求。
- 遺失頻道 API 權限/範圍 (permissions/scopes)。

常見特徵：

- `mention required` → 訊息因群組提及策略而被忽略。
- `pairing` / 待審核追蹤 → 發送者尚未獲得核准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關連結：

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Cron 與心跳傳遞

如果 cron 或心跳未執行或未傳遞，請先驗證排程器狀態，然後檢查傳遞目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查以下項目：

- Cron 已啟用且存在下次喚醒時間。
- 工作執行歷史記錄狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行時期錯誤。
- `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出活動時段視窗。
- `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空白行 / markdown 標題，因此 OpenClaw 會跳過模型呼叫。
- `heartbeat skipped` with `reason=no-tasks-due` → `HEARTBEAT.md` contains a `tasks:` block, but none of the tasks are due on this tick.
- `heartbeat: unknown accountId` → invalid account id for heartbeat delivery target.
- `heartbeat skipped` with `reason=dm-blocked` → heartbeat target resolved to a DM-style destination while `agents.defaults.heartbeat.directPolicy` (or per-agent override) is set to `block`.

Related:

- [/automation/cron-jobs#troubleshooting](/en/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## Node paired tool fails

If a node is paired but tools fail, isolate foreground, permission, and approval state.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Look for:

- Node online with expected capabilities.
- OS permission grants for camera/mic/location/screen.
- Exec approvals and allowlist state.

Common signatures:

- `NODE_BACKGROUND_UNAVAILABLE` → node app must be in foreground.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → missing OS permission.
- `SYSTEM_RUN_DENIED: approval required` → exec approval pending.
- `SYSTEM_RUN_DENIED: allowlist miss` → command blocked by allowlist.

Related:

- [/nodes/troubleshooting](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## Browser tool fails

Use this when browser tool actions fail even though the gateway itself is healthy.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Look for:

- Whether `plugins.allow` is set and includes `browser`.
- Valid browser executable path.
- CDP profile reachability.
- Local Chrome availability for `existing-session` / `user` profiles.

Common signatures:

- `unknown command "browser"` or `unknown command 'browser'` → the bundled browser plugin is excluded by `plugins.allow`.
- browser tool missing / unavailable while `browser.enabled=true` → `plugins.allow` excludes `browser`, so the plugin never loaded.
- `Failed to start Chrome CDP on port` → 無法啟動瀏覽器程序。
- `browser.executablePath not found` → 設定的路徑無效。
- `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的 scheme，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
- `Remote CDP for profile "<name>" is not reachable` → 無法從 gateway 主機連線到設定的遠端 CDP 端點。
- `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加 設定檔沒有可連線的目標，或 HTTP 端點有回應但仍無法開啟 CDP WebSocket。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少完整的 Playwright 套件；ARIA 快照和基本頁面截圖仍然可以使用，但導覽、AI 快照、CSS 選擇器元素截圖和 PDF 匯出將無法使用。
- `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取 或快照 `--ref`，而不是 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳 hook 需要快照參照，而不是 CSS 選擇器。
- `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上，每次呼叫僅傳送一個上傳。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話方塊 hook 不支援逾時覆寫。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理的瀏覽器 或原始 CDP 設定檔。
- 僅附加 或遠端 CDP 設定檔上的過時檢視區 / 深色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉作用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，而無需重新啟動整個 gateway。

相關連結：

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## 如果您升級後突然出現問題

大多數升級後的問題是由於配置漂移或現在執行了更嚴格的預設值。

### 1) Auth 與 URL 覆蓋行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查項目：

- 如果是 `gateway.mode=remote`，CLI 呼叫可能鎖定遠端，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的認證資訊。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可連線但認證錯誤。

### 2) 綁定與認證防護更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查項目：

- 非回環綁定 (`lan`, `tailnet`, `custom`) 需要有效的 gateway auth 路徑：共用 token/密碼認證，或是正確設定的非回環 `trusted-proxy` 部署。
- 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → 非回環綁定缺少有效的 gateway auth 路徑。
- `RPC probe: failed` 但 runtime 正在執行 → gateway 運作中但無法以目前的 auth/url 連線。

### 3) 配對與裝置身分狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查項目：

- 待批准的儀表板/節點裝置。
- 在原則或身分變更後待批准的 DM 配對。

常見特徵：

- `device identity required` → 裝置認證未滿足。
- `pairing required` → 發送者/裝置必須被批准。

如果在檢查後服務設定與 runtime 仍不一致，請從相同的 profile/state 目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關連結：

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
