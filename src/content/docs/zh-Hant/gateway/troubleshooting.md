---
summary: "針對 Gateway、通道、自動化、節點與瀏覽器的深度故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
sidebarTitle: "故障排除"
---

本頁面是深度操作手冊。如果您想先進行快速分診流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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

- `openclaw gateway status` 顯示 `Runtime: running`、`Connectivity probe: ok` 以及一行 `Capability: ...`。
- `openclaw doctor` 回報沒有阻礙性的設定/服務問題。
- `openclaw channels status --probe` 顯示即時的個別帳號傳輸狀態，且在支援的情況下，會顯示探查/稽核結果，例如 `works` 或 `audit ok`。

## Split brain 安裝與較新的設定防護

當 Gateway 服務在更新後意外停止，或日誌顯示其中一個 `openclaw` 二進位檔案比上次寫入 `openclaw.json` 的版本還舊時，請使用此方法。

OpenClaw 會在設定寫入時標記 `meta.lastTouchedVersion`。唯讀指令仍可檢查由較新 OpenClaw 寫入的設定，但程序與服務的變更將拒絕繼續由較舊的二進位檔案執行。被阻擋的動作包括 Gateway 服務啟動、停止、重新啟動、解除安裝、強制重新安裝服務、服務模式 Gateway 啟動，以及 `gateway --force` 連接埠清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修復 PATH">
    修復 `PATH` 使 `openclaw` 解析至較新的安裝位置，然後重新執行該動作。
  </Step>
  <Step title="重新安裝 Gateway 服務">
    從較新的安裝位置重新安裝預期的 Gateway 服務：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除過時的包裝器">
    移除仍指向舊 `openclaw` 二進位檔案的過時系統套件或舊包裝器項目。
  </Step>
</Steps>

<Warning>僅用於有意降級或緊急恢復，請為單個指令設定 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作時請勿設定。</Warning>

## Anthropic 429 長上下文需要額外使用量

當日誌/錯誤包含以下內容時使用：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找以下跡象：

- 選取的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合使用長上下文的資格。
- 請求僅在需要 1M beta 路徑的長時間工作階段/模型執行時失敗。

修復選項：

<Steps>
  <Step title="Disable context1m">針對該模型停用 `context1m` 以回退至一般內容視窗。</Step>
  <Step title="Use an eligible credential">使用符合長上下文請求資格的 Anthropic 憑證，或切換至 Anthropic API 金鑰。</Step>
  <Step title="Configure fallback models">設定後備模型，以便在 Anthropic 長上下文請求被拒絕時繼續執行。</Step>
</Steps>

相關連結：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用量和成本](/zh-Hant/reference/token-use)
- [為什麼我會看到來自 Anthropic 的 HTTP 429？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 相容後端通過直接探測，但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 可運作
- 微小的直接 `/v1/chat/completions` 呼叫可運作
- OpenClaw 模型執行僅在一般代理輪次時失敗

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

尋找以下跡象：

- 微小的直接呼叫成功，但 OpenClaw 執行僅在較大的提示時失敗
- `model_not_found` 或 404 錯誤，儘管直接 `/v1/chat/completions`
  使用相同的基本模型 ID 可運作
- 後端關於 `messages[].content` 預期為字串的錯誤
- 使用 OpenAI 相容本地後端時出現間歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 後端當機，且僅在較大的提示 token 數量或完整的代理執行時提示下出現

<AccordionGroup>
  <Accordion title="常見特徵">
    - `model_not_found` 搭配本地 MLX/vLLM 風格伺服器 → 請驗證 `baseUrl` 包含 `/v1`，`api` 對於 `/v1/chat/completions` 後端是 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是純供應商本地的 ID。請使用供應商前綴選取一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；並將目錄條目保持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化的 Chat Completions 內容部分。修正方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成 Chat Completions 請求，但針對該輪次未傳回使用者可見的助理文字。OpenClaw 會重試一次可安全重播的空白 OpenAI 相容輪次；持續的失敗通常表示後端正在發出空白/非文字內容，或是抑制了最終答案的文字。
    - 直接的微小請求成功，但 OpenClaw 代理執行因後端/模型當機而失敗（例如在某些 `inferrs` 版本上的 Gemma）→ OpenClaw 傳輸可能已正確；問題出在後端無法處理較大的代理執行階段提示格式。
    - 停用工具後失敗情況減少但未消失 → 工具架構是壓力來源之一，但剩餘問題仍是上游模型/伺服器容量或後端錯誤。
  </Accordion>
  <Accordion title="修正選項">
    1. 針對僅支援字串的 Chat Completions 後端，請設定 `compat.requiresStringContent: true`。
    2. 針對無法可靠處理 OpenClaw 工具架構介面的模型/後端，請設定 `compat.supportsTools: false`。
    3. 盡可能降低提示壓力：較小的工作區引導、較短的交談紀錄、較輕量的本地模型，或具備更強長文字內容支援的後端。
    4. 如果微小的直接請求持續通過，但 OpenClaw 代理輪次仍在後端內部當機，請將其視為上游伺服器/模型限制，並使用可接受的載荷格式在該處提交可重現的問題。
  </Accordion>
</AccordionGroup>

相關連結：

- [組態設定](/zh-Hant/gateway/configuration)
- [本機模型](/zh-Hant/gateway/local-models)
- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)

## 無回應

如果通道已啟動但沒有回應，請在重新連接任何項目之前檢查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

檢查以下項目：

- DM 發送者的配對待處理。
- 群組提及限制 (`requireMention`, `mentionPatterns`)。
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息在收到提及前被忽略。
- `pairing request` → 發送者需要審核。
- `blocked` / `allowlist` → 發送者/通道已被策略過濾。

相關：

- [通道疑難排解](/zh-Hant/channels/troubleshooting)
- [群組](/zh-Hant/channels/groups)
- [配對](/zh-Hant/channels/pairing)

## 儀表板控制 UI 連線能力

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式和安全環境假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查以下項目：

- 正確的探測 URL 和儀表板 URL。
- 客戶端和閘道之間的驗證模式/權杖不匹配。
- 需要裝置身分識別時使用了 HTTP。

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → 非安全內容或缺少裝置驗證。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或您來自非回環瀏覽器來源連線，但沒有明確的允許清單）。
    - `device nonce required` / `device nonce mismatch` → 客戶端未完成基於挑戰的裝置驗證流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客戶端為當前握手簽署了錯誤的 payload（或時間戳已過期）。
    - `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 客戶端可以使用快取的裝置 token 進行一次受信任的重試。
    - 該快取 token 重試會重複使用與配對裝置 token 一起儲存的快取範圍集合。明確的 `deviceToken` / 明確的 `scopes` 呼叫者則會保留其請求的範圍集合。
    - 除了該重試路徑外，連線驗證優先順序為：首先是明確的共用 token/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置 token，最後是啟動 token。
    - 在非同步 Tailscale Serve 控制 UI 路徑上，限制器記錄失敗之前，會對同一個 `{scope, ip}` 的失敗嘗試進行序列化。因此，來自同一個客戶端的兩次並發錯誤重試可能在第二次嘗試時顯示 `retry later`，而不是兩次單純的不相符。
    - 來自瀏覽器來源回環客戶端的 `too many failed authentication attempts (retry later)` → 來自同一個正規化 `Origin` 的重複失敗會被暫時鎖定；另一個 localhost 來源則使用獨立的 bucket。
    - 該次重試後重複出現 `unauthorized` → 共用 token/裝置 token 偏差；如有需要，請更新 token 設定並重新核准/輪換裝置 token。
    - `gateway connect failed:` → 錯誤的主機/連接埠/url 目標。
  </Accordion>
</AccordionGroup>

### 驗證詳情代碼速查表

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一個動作：

| 詳情代碼                     | 含義                                                                                                                                                                           | 建議操作                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未傳送必要的共用權杖。                                                                                                                                                   | 在用戶端貼上/設定權杖並重試。對於儀表板路徑：`openclaw config get gateway.auth.token`，然後貼上到控制 UI 設定中。                                                                                                                                         |
| `AUTH_TOKEN_MISMATCH`        | 共用權杖與閘道驗證權杖不符。                                                                                                                                                   | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取權杖重試會重複使用已儲存的核准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行[權杖漂移復原檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取權杖已過期或已被撤銷。                                                                                                                                           | 使用 [devices CLI](/zh-Hant/cli/devices) 輪替/重新核准裝置權杖，然後重新連線。                                                                                                                                                                                 |
| `PAIRING_REQUIRED`           | 裝置身分識別需要核准。檢查 `error.details.reason` 是否為 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在出現時使用 `requestId` / `remediationHint`。 | 核准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您檢閱請求的存取權後會使用相同的流程。                                                                                                                |

<Note>使用共用閘道權杖/密碼進行驗證的直接回送後端 RPC 不應依賴 CLI 的配對裝置範圍基準。如果子代理程式或其他內部呼叫仍因 `scope-upgrade` 而失敗，請驗證呼叫者正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，並未強制使用明確的 `deviceIdentity` 或裝置權杖。</Note>

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的用戶端並加以驗證：

<Steps>
  <Step title="Wait for connect.challenge">用戶端等待閘道發出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">用戶端簽署與挑戰綁定的載荷。</Step>
  <Step title="發送裝置 nonce">用戶端發送帶有相同挑戰 nonce 的 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置 token 工作階段只能管理**它們自己的**裝置，除非呼叫者也具有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫者工作階段已經持有的操作員範圍

相關：

- [組態](/zh-Hant/gateway/configuration) (gateway auth modes)
- [控制 UI](/zh-Hant/web/control-ui)
- [裝置](/zh-Hant/cli/devices)
- [遠端存取](/zh-Hant/gateway/remote)
- [信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)

## 閘道服務未執行

當服務已安裝但程序無法持續運行時使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

尋找：

- 帶有退出提示的 `Runtime: stopped`。
- 服務組態不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 使用 `--deep` 時，出現額外的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或組態檔案已損壞並遺失 `gateway.mode`。解決方法：在您的組態中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新標記預期的本機模式組態。如果您是透過 Podman 執行 OpenClaw，預設組態路徑為 `~/.openclaw/openclaw.json`。 - `refusing to
    bind gateway ... without auth` → 在沒有有效閘道驗證路徑（token/密碼，或設定的 trusted-proxy）的情況下進行非回送繫結。 - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。 - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應在每台機器上保留一個閘道；如果您確實需要多個，請隔離連接埠 +
    組態/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。 - `System-level OpenClaw gateway service detected` from doctor → 存在 systemd 系統單元，但缺少使用者層級服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項目；或者如果系統單元是預期的監督器，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。 - `Gateway service port does not match
    current gateway config` → 已安裝的監督器仍然固定為舊的 `--port`。請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動閘道服務。
  </Accordion>
</AccordionGroup>

相關：

- [背景執行和程序工具](/zh-Hant/gateway/background-process)
- [組態](/zh-Hant/gateway/configuration)
- [Doctor](/zh-Hant/gateway/doctor)

## 閘道已還原最後已知良好的組態

當閘道啟動但日誌顯示它還原了 `openclaw.json` 時，請使用此方法。

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
- 有效組態旁邊帶有時間戳記的 `openclaw.json.clobbered.*` 檔案
- 以 `Config recovery warning` 開頭的主要代理程式系統事件

<AccordionGroup>
  <Accordion title="發生了什麼事">
    - 被拒絕的設定在啟動或熱重載期間未通過驗證。
    - OpenClaw 將被拒絕的 payload 保存為 `.clobbered.*`。
    - 使用中設定是從最後一次驗證過的最後已知良好副本還原的。
    - 系統會警告下一輪的主要代理不要盲目覆寫被拒絕的設定。
    - 如果所有驗證問題都發生在 `plugins.entries.<id>...` 下，OpenClaw 將不會還原整個檔案。外掛本地的失敗會持續顯示，而不相關的使用者設定則保留在使用中設定中。
  </Accordion>
  <Accordion title="檢查與修復">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="常見特徵">
    - `.clobbered.*` 存在 → 已還原外部直接編輯或啟動讀取。
    - `.rejected.*` 存在 → OpenClaw 擁有的設定寫入在提交前未通過架構或覆寫檢查。
    - `Config write rejected:` → 寫入嘗試刪除所需的形狀、大幅縮小檔案，或保存無效的設定。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → 啟動時將目前檔案視為已被覆寫，因為與最後已知良好備份相比，它失去了欄位或大小。
    - `Config last-known-good promotion skipped` → 候選項包含編輯過的機密預留位置，例如 `***`。
  </Accordion>
  <Accordion title="修復選項">
    1. 如果還原的使用中設定是正確的，請保留它。
    2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製預期的金鑰，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 設定，而不僅僅是您想要變更的部分物件。
  </Accordion>
</AccordionGroup>

相關連結：

- [設定](/zh-Hant/cli/config)
- [設定：熱重載](/zh-Hant/gateway/configuration#config-hot-reload)
- [設定：嚴格驗證](/zh-Hant/gateway/configuration#strict-validation)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 探測警告

當 `openclaw gateway probe` 成功連線但仍印出警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是關於 SSH 後備、多個 Gateway、缺少範圍，或是未解析的 auth refs。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接設定的/loopback 目標。
- `multiple reachable gateways detected` → 超過一個目標回應。通常這表示刻意設定的多 Gateway 環境或過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細資訊 RPC 受限於範圍；請配對裝置身分或使用具有 `operator.read` 的憑證。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 已回應，但此客戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中無法取得失敗目標的認證資料。

相關連結：

- [Gateway](/zh-Hant/cli/gateway)
- [同一主機上的多個 Gateway](/zh-Hant/gateway#multiple-gateways-same-host)
- [遠端存取](/zh-Hant/gateway/remote)

## 通道已連線，訊息無法流通

若通道狀態為已連線但訊息流通已中斷，請重點檢查政策、權限及通道特定的遞送規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

尋找：

- DM 政策 (`pairing`、`allowlist`、`open`、`disabled`)。
- 群組允許清單及提及要求。
- 缺少通道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息因群組提及政策而被忽略。
- `pairing` / 待核准追蹤 → 發送者未獲核准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 通道認證/權限問題。

相關連結：

- [通道疑難排解](/zh-Hant/channels/troubleshooting)
- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)
- [WhatsApp](/zh-Hant/channels/whatsapp)

## Cron 與心跳遞送

如果 cron 或心跳未執行或未遞送，請先驗證排程器狀態，然後檢查遞送目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查以下項目：

- Cron 已啟用且存在下次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。 - `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行時錯誤。 - `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出活動時段視窗。 - `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但僅包含空行 / markdown 標題，因此 OpenClaw 略過了模型呼叫。 - `heartbeat skipped` 搭配
    `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 區塊，但在此次 tick 中沒有任務到期。 - `heartbeat: unknown accountId` → 心跳遞送目標的帳戶 ID 無效。 - `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，而 `agents.defaults.heartbeat.directPolicy` (或每個代理的覆寫設定) 設定為 `block`。
  </Accordion>
</AccordionGroup>

相關連結：

- [Heartbeat](/zh-Hant/gateway/heartbeat)
- [Scheduled tasks](/zh-Hant/automation/cron-jobs)
- [Scheduled tasks: troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting)

## 節點已配對，工具失敗

如果節點已配對但工具失敗，請區分前景、權限與核准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查以下項目：

- 節點上線且具備預期的功能。
- 相機/麥克風/位置/螢幕的 OS 權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → node app 必須在前台運行。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少 OS 權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行審批待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單阻擋。

相關：

- [執行審批](/zh-Hant/tools/exec-approvals)
- [節點疑難排解](/zh-Hant/nodes/troubleshooting)
- [節點](/zh-Hant/nodes/index)

## 瀏覽器工具失敗

當瀏覽器工具操作失敗但本身閘道健康時使用此項。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查：

- `plugins.allow` 是否已設定並包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

<AccordionGroup>
  <Accordion title="Plugin / executable signatures">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 內建的瀏覽器外掛被 `plugins.allow` 排除。
    - 瀏覽器工具遺失 / 無法使用，同時 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，所以外掛從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的協定，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的閘道安裝缺少內建瀏覽器外掛的 `playwright-core` 執行時期相依性；請執行 `openclaw doctor --fix`，然後重新啟動閘道。ARIA 快照和基本頁面螢幕截圖仍可正常運作，但導航、AI 快照、CSS 選擇器元素螢幕截圖和 PDF 匯出將持續無法使用。
  </Accordion>
  <Accordion title="Chrome MCP / existing-session signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法連接至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，核准首次的連接提示，然後重試。如果不需要登入狀態，建議優先使用受控的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 連接設定檔沒有開啟的本地 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 無從閘道主機連線至已設定的遠端 CDP 端點。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅連接設定檔沒有可連線的目標，或是 HTTP 端點有回應但仍無法開啟 CDP WebSocket。
  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → screenshot request mixed `--full-page` with `--ref` or `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` screenshot calls must use page capture or a snapshot `--ref`, not CSS `--element`.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP upload hooks need snapshot refs, not CSS selectors.
    - `existing-session file uploads currently support one file at a time.` → send one upload per call on Chrome MCP profiles.
    - `existing-session dialog handling does not support timeoutMs.` → dialog hooks on Chrome MCP profiles do not support timeout overrides.
    - `existing-session type does not support timeoutMs overrides.` → omit `timeoutMs` for `act:type` on `profile="user"` / Chrome MCP existing-session profiles, or use a managed/CDP browser profile when a custom timeout is required.
    - `existing-session evaluate does not support timeoutMs overrides.` → omit `timeoutMs` for `act:evaluate` on `profile="user"` / Chrome MCP existing-session profiles, or use a managed/CDP browser profile when a custom timeout is required.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` still requires a managed browser or raw CDP profile.
    - stale viewport / dark-mode / locale / offline overrides on attach-only or remote CDP profiles → run `openclaw browser stop --browser-profile <name>` to close the active control session and release Playwright/CDP emulation state without restarting the whole gateway.
  </Accordion>
</AccordionGroup>

相關：

- [Browser (OpenClaw-managed)](/zh-Hant/tools/browser)
- [Browser troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)

## If you upgraded and something suddenly broke

Most post-upgrade breakage is config drift or stricter defaults now being enforced.

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    檢查項目：

    - 如果 `gateway.mode=remote`，CLI 呼叫可能指向遠端，而您的本地服務正常。
    - 明確的 `--url` 呼叫不會回退到儲存的認證資訊。

    常見特徵：

    - `gateway connect failed:` → 錯誤的 URL 目標。
    - `unauthorized` → 端點可達但認證錯誤。

  </Accordion>
  <Accordion title="2. Bind and auth guardrails are stricter">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    檢查項目：

    - 非回環綁定 (`lan`、`tailnet`、`custom`) 需要有效的 gateway auth 路徑：共用的 token/密碼認證，或是正確設定的非回環 `trusted-proxy` 部署。
    - 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

    常見特徵：

    - `refusing to bind gateway ... without auth` → 非回環綁定但缺乏有效的 gateway auth 路徑。
    - `Connectivity probe: failed` 而執行時期正在運行 → gateway 存活但無法以目前的 auth/url 存取。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    檢查項目：

    - Dashboard/nodes 的待處理裝置核准。
    - 原則或身分識別變更後的待處理 DM 配對核准。

    常見特徵：

    - `device identity required` → 未滿足裝置認證。
    - `pairing required` → 發送者/裝置必須被核准。

  </Accordion>
</AccordionGroup>

如果檢查後服務設定與執行時期仍然不一致，請從相同的 profile/state 目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [認證](/zh-Hant/gateway/authentication)
- [背景執行與處理程序工具](/zh-Hant/gateway/background-process)
- [Gateway 擁有的配對](/zh-Hant/gateway/pairing)

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [FAQ](/zh-Hant/help/faq)
- [Gateway runbook](/zh-Hant/gateway)
