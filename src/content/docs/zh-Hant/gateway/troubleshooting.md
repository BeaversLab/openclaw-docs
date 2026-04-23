---
summary: "Deep troubleshooting runbook for gateway, channels, automation, nodes, and browser"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# 閘道疑難排解

本頁面是詳細的故障排除手冊。
如果您想先進行快速的分診流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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

- `openclaw gateway status` 顯示 `Runtime: running`、`Connectivity probe: ok` 和一條 `Capability: ...` 行。
- `openclaw doctor` 報告沒有阻塞性的配置/服務問題。
- `openclaw channels status --probe` 顯示每個帳戶的即時傳輸狀態，並且（如果支援）顯示探測/稽核結果，例如 `works` 或 `audit ok`。

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

1. 停用該模型的 `context1m` 以回退到正常的上下文視窗。
2. 使用符合長內容請求資格的 Anthropic 憑證，或切換至 Anthropic API 金鑰。
3. 設定回退模型，以便在 Anthropic 長語境請求被拒絕時繼續執行。

相關：

- [/providers/anthropic](/zh-Hant/providers/anthropic)
- [/reference/token-use](/zh-Hant/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh-Hant/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本機相容 OpenAI 的後端通過直接探測，但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 運作正常
- 微小的直接 `/v1/chat/completions` 呼叫運作正常
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
- 後端關於 `messages[].content` 期望為字串的錯誤
- 後端當機僅發生在較大的提示 token 數量或完整的代理執行時提示

常見特徵：

- `messages[...].content: invalid type: sequence, expected a string` → 後端
  拒絕結構化 Chat Completions 內容部分。修正方法：設定
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 直接的微小請求成功，但 OpenClaw 代理程式執行失敗並伴隨後端/模型
  崩潰（例如某些 `inferrs` 建置版本上的 Gemma）→ OpenClaw 傳輸
  可能已經正確；後端無法處理較大的代理程式執行階段
  提示形狀。
- 停用工具後失敗減少但未消失 → 工具架構造成了部分壓力，但剩餘問題仍是上游模型/伺服器容量或後端錯誤。

修復選項：

1. 為僅支援字串的 Chat Completions 後端設定 `compat.requiresStringContent: true`。
2. 為無法可靠處理
   OpenClaw 工具架構表面的模型/後端設定 `compat.supportsTools: false`。
3. 盡可能降低提示詞壓力：較小的工作區啟動、較短的交談紀錄、較輕量的本機模型，或是具備更強長上下文支援的後端。
4. 如果微小的直接請求持續成功，但 OpenClaw 代理轉換仍在後端內部崩潰，請將其視為上游伺服器/模型限制，並使用可接受的 Payload 形狀在那裡提交可重現的問題。

相關：

- [/gateway/local-models](/zh-Hant/gateway/local-models)
- [/gateway/configuration](/zh-Hant/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)

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
- 群組提及閘控 (`requireMention`, `mentionPatterns`)。
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 在被提及前忽略群組訊息。
- `pairing request` → 寄件者需要批准。
- `blocked` / `allowlist` → 寄件者/頻道已被策略過濾。

相關：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/pairing](/zh-Hant/channels/pairing)
- [/channels/groups](/zh-Hant/channels/groups)

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
- `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中
  （或者您來自非回環瀏覽器來源進行連線，且沒有明確的
  允許清單）。
- `device nonce required` / `device nonce mismatch` → 用戶端未完成
  基於挑戰的裝置驗證流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 用戶端為當前交握簽署了錯誤的
  載荷（或過期的時間戳）。
- `AUTH_TOKEN_MISMATCH` 伴隨 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
- 該快取權杖重試會重複使用與配對裝置權杖一起儲存的快取作用域集合。明確的 `deviceToken` / 明確的 `scopes` 呼叫者則會保留其
  請求的作用域集合。
- 在該重試路徑之外，連線驗證優先順序為：首先是明確的共用
  權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，
  最後是啟動權杖。
- 在非同步 Tailscale Serve 控制 UI 路徑上，針對同一個
  `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前進行序列化。因此，來自同一用戶端的兩次不良並發重試可能會在第二次嘗試時顯示 `retry later`
  而不是兩次單純的不匹配。
- `too many failed authentication attempts (retry later)` 來自瀏覽器來源
  回送用戶端 → 來自同一標準化 `Origin` 的重複失敗
  會被暫時鎖定；另一個 localhost 來源使用獨立的 bucket。
- 重試後再次出現重複的 `unauthorized` → 共用令牌/裝置令牌偏移；重新整理令牌配置並視需要重新核准/輪替裝置令牌。
- `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

### 驗證詳情代碼快速對應

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步操作：

| 詳情代碼                     | 含義                                                                                                                                                                         | 建議動作                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未發送所需的共用權杖。                                                                                                                                                 | 在用戶端中貼上/設定令牌並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上至控制 UI 設定中。                                                                                                                                         |
| `AUTH_TOKEN_MISMATCH`        | 共享的權杖與閘道驗證權杖不符。                                                                                                                                               | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取令牌重試會重複使用已儲存的核准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行 [令牌偏移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取權杖已過期或已撤銷。                                                                                                                                           | 使用 [devices CLI](/zh-Hant/cli/devices) 輪替/重新核准裝置令牌，然後重新連線。                                                                                                                                                                                  |
| `PAIRING_REQUIRED`           | 裝置身分需要核准。檢查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在出現時使用 `requestId` / `remediationHint`。 | 核准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您檢視請求的存取權後使用相同的流程。                                                                                                                   |

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/signature 錯誤，請更新連線的客戶端並進行驗證：

1. 等待 `connect.challenge`
2. 簽署與挑戰綁定的承載
3. 發送帶有相同挑戰 nonce 的 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 被意外拒絕：

- 配對裝置令牌工作階段只能管理**其自己的**裝置，除非
  呼叫者還擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求
  呼叫者工作階段已持有的操作員範圍

相關：

- [/web/control-ui](/zh-Hant/web/control-ui)
- [/gateway/configuration](/zh-Hant/gateway/configuration) (gateway auth modes)
- [/gateway/trusted-proxy-auth](/zh-Hant/gateway/trusted-proxy-auth)
- [/gateway/remote](/zh-Hant/gateway/remote)
- [/cli/devices](/zh-Hant/cli/devices)

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

- `Runtime: stopped` 附帶退出提示。
- 服務設定不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 使用 `--deep` 時出現額外的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

常見特徵：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或設定檔被覆蓋並遺失了 `gateway.mode`。修正方法：在您的設定中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新套用預期的本機模式設定。如果您是透過 Podman 執行 OpenClaw，預設設定路徑為 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在沒有有效閘道認證路徑（token/密碼，或設定的受信任代理）的情況下進行非迴路綁定。
- `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
- `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應該每台機器保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。

相關連結：

- [/gateway/background-process](/zh-Hant/gateway/background-process)
- [/gateway/configuration](/zh-Hant/gateway/configuration)
- [/gateway/doctor](/zh-Hant/gateway/doctor)

## Gateway restored last-known-good config

當 Gateway 啟動但日誌顯示它還原了 `openclaw.json` 時，請使用此方法。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

尋找：

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- 現用設定旁邊的帶有時間戳記的 `openclaw.json.clobbered.*` 檔案
- 以 `Config recovery warning` 開頭的主要代理程式系統事件

發生了什麼事：

- 被拒絕的配置在啟動或熱重載期間未通過驗證。
- OpenClaw 已將被拒絕的負載保留為 `.clobbered.*`。
- 有效配置是從上次驗證過的已知良好副本還原的。
- 下一個主要代理週期會收到警告，不要盲目重寫被拒絕的配置。

檢查與修復：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
openclaw config validate
openclaw doctor
```

常見特徵：

- `.clobbered.*` 存在 → 還原了外部直接編輯或啟動讀取。
- `.rejected.*` 存在 → OpenClaw 擁有的配置寫入在提交前未通過架構或覆蓋檢查。
- `Config write rejected:` → 寫入嘗試丟棄必要的形狀、大幅縮減檔案或持久化無效配置。
- `Config last-known-good promotion skipped` → 候選配置包含已編輯的機密佔位符，例如 `***`。

修復選項：

1. 如果還原的有效配置是正確的，請保留它。
2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製所需的鍵，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
3. 重新啟動前執行 `openclaw config validate`。
4. 如果您手動編輯，請保留完整的 JSON5 配置，而不僅僅是您想要更改的部分物件。

相關連結：

- [/gateway/configuration#strict-validation](/zh-Hant/gateway/configuration#strict-validation)
- [/gateway/configuration#config-hot-reload](/zh-Hant/gateway/configuration#config-hot-reload)
- [/cli/config](/zh-Hant/cli/config)
- [/gateway/doctor](/zh-Hant/gateway/doctor)

## 閘道探測警告

當 `openclaw gateway probe` 能夠連接到目標，但仍印出警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

檢查以下項目：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 無論警告是關於 SSH 備援、多個閘道、缺少範圍還是未解析的驗證引用。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接配置/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。通常這意味著有意設定多重閘道或存在過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受範圍限制；請配對裝置身分或使用具有 `operator.read` 的憑證。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 閘道已回應，但此用戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中，失敗目標的驗證資料無法使用。

相關：

- [/cli/gateway](/zh-Hant/cli/gateway)
- [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)
- [/gateway/remote](/zh-Hant/gateway/remote)

## 頻道已連線但訊息未流動

如果頻道狀態為已連線但訊息流動已中止，請著重於策略、權限和頻道特定的傳送規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查：

- DM 策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組允許清單及提及要求。
- 遺失頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息被群組提及策略忽略。
- `pairing` / 待核准追蹤 → 傳送者未被核准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關：

- [/channels/troubleshooting](/zh-Hant/channels/troubleshooting)
- [/channels/whatsapp](/zh-Hant/channels/whatsapp)
- [/channels/telegram](/zh-Hant/channels/telegram)
- [/channels/discord](/zh-Hant/channels/discord)

## Cron 與心跳傳送

如果 cron 或心跳未執行或未傳送，請先驗證排程器狀態，然後是傳送目標。

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
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

常見特徵：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
- `cron: timer tick failed` → 排程器刻度失敗；請檢查檔案/日誌/執行時錯誤。
- `heartbeat skipped` 且 `reason=quiet-hours` → 超出啟用時段視窗。
- `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空白行 / markdown 標頭，因此 OpenClaw 略過模型呼叫。
- `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 區塊，但此刻度無任何任務到期。
- `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
- `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，而 `agents.defaults.heartbeat.directPolicy` (或個別代理覆寫) 設定為 `block`。

相關：

- [/automation/cron-jobs#troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting)
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

- 節點上線且具備預期功能。
- 相機/麥克風/位置/螢幕的 OS 權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須在前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少 OS 權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核准待決。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [/nodes/troubleshooting](/zh-Hant/nodes/troubleshooting)
- [/nodes/index](/zh-Hant/nodes/index)
- [/tools/exec-approvals](/zh-Hant/tools/exec-approvals)

## 瀏覽器工具失敗

當瀏覽器工具動作失敗，但閘道本身健康時使用此項。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查：

- 是否已設定 `plugins.allow` 且包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

常見特徵：

- `unknown command "browser"` 或 `unknown command 'browser'` → 內建的瀏覽器外掛程式被 `plugins.allow` 排除。
- 當 `browser.enabled=true` 時瀏覽器工具遺失 / 無法使用 → `plugins.allow` 排除了 `browser`，因此外掛程式從未載入。
- `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
- `browser.executablePath not found` → 設定的路徑無效。
- `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的通訊協定，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
- `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法連結至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，批准第一次的連結提示，然後重試。如果不需要登入狀態，建議使用受管理的 `openclaw` 設定檔。
- `No Chrome tabs found for profile="user"` → Chrome MCP 連結設定檔沒有開啟的本機 Chrome 分頁。
- `Remote CDP for profile "<name>" is not reachable` → 閘道主機無法連線至設定的遠端 CDP 端點。
- `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅連結設定檔沒有可連線的目標，或 HTTP 端點已回應但 CDP WebSocket 仍無法開啟。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的閘道安裝缺少完整的 Playwright 套件；ARIA 快照和基本頁面螢幕截圖仍可運作，但瀏覽、AI 快照、CSS 選擇器元素螢幕截圖和 PDF 匯出將無法使用。
- `fullPage is not supported for element screenshots` → 螢幕截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 螢幕截圖呼叫必須使用頁面擷取或快照 `--ref`，而非 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳掛鉤需要快照參考，而不是 CSS 選擇器。
- `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上每次呼叫發送一次上傳。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話框掛鉤不支援逾時覆蓋。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理的瀏覽器或原始 CDP 設定檔。
- 僅附加或遠端 CDP 設定檔上的過時視口 / 深色模式 / 地區設定 / 離線覆蓋 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉作用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，而無需重新啟動整個閘道。

相關：

- [/tools/browser-linux-troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh-Hant/tools/browser)

## 如果您升級後突然出現問題

大多數升級後的問題是由於設定漂移或現在執行了更嚴格的預設值。

### 1) 驗證和 URL 覆蓋行為已變更

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

檢查項目：

- 如果 `gateway.mode=remote`，CLI 呼叫可能以遠端為目標，而您的本機服務正常。
- 明確的 `--url` 呼叫不會回退到儲存的認證資訊。

常見特徵：

- `gateway connect failed:` → 錯誤的 URL 目標。
- `unauthorized` → 端點可連線但驗證錯誤。

### 2) 繫結和驗證防護更嚴格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

檢查項目：

- 非回送繫結 (`lan`、`tailnet`、`custom`) 需要有效的閘道路徑：共用權杖/密碼驗證，或正確設定的非回送 `trusted-proxy` 部署。
- 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

常見特徵：

- `refusing to bind gateway ... without auth` → 沒有有效閘道路徑的非回送繫結。
- `Connectivity probe: failed` 而執行時正在執行 → 閘道正常但無法使用目前的驗證/url 存取。

### 3) 配對和裝置身分狀態已變更

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

檢查項目：

- 待處理的儀表板/節點裝置核准。
- 原則或身分變更後待處理的 DM 配對核准。

常見特徵：

- `device identity required` → 未滿足裝置驗證。
- `pairing required` → 發送者/裝置必須已核准。

如果在檢查後服務設定與執行時期仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [/gateway/pairing](/zh-Hant/gateway/pairing)
- [/gateway/authentication](/zh-Hant/gateway/authentication)
- [/gateway/background-process](/zh-Hant/gateway/background-process)
