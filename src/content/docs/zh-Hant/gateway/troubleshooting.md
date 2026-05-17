---
summary: "針對閘道、通道、自動化、節點和瀏覽器的深度疑難排解手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "疑難排解"
sidebarTitle: "疑難排解"
---

此頁面是詳細的操作手冊。如果您想先進行快速分診流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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

- `openclaw gateway status` 顯示 `Runtime: running`、`Connectivity probe: ok` 以及一個 `Capability: ...` 行。
- `openclaw doctor` 回報沒有阻斷性的配置或服務問題。
- `openclaw channels status --probe` 顯示每個帳戶的即時傳輸狀態，並在支援的情況下顯示探測/稽核結果，例如 `works` 或 `audit ok`。

## Split brain 安裝與較新的設定防護

當閘道服務在更新後意外停止，或日誌顯示其中一個 `openclaw` 二進位檔案比最後寫入 `openclaw.json` 的版本舊時，請使用此方法。

OpenClaw 會在寫入配置時加上 `meta.lastTouchedVersion` 標記。唯讀指令仍可檢查由較新 OpenClaw 寫入的配置，但程序和服務的變更操作會拒絕從較舊的二進位檔案繼續執行。被阻斷的操作包括閘道服務的啟動、停止、重新啟動、解除安裝、強制服務重新安裝、服務模式閘道啟動，以及 `gateway --force` 連接埠清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修正 PATH">
    修正 `PATH`，讓 `openclaw` 解析到較新的安裝版本，然後重新執行該操作。
  </Step>
  <Step title="重新安裝閘道服務">
    從較新的安裝版本重新安裝預期的閘道服務：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除陳舊的包裝程式">
    移除仍指向舊 `openclaw` 二進位檔案的陳舊系統套件或舊包裝程式項目。
  </Step>
</Steps>

<Warning>僅針對刻意降級或緊急復原，請針對單一指令設定 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作時請保持未設定。</Warning>

## 由於路徑逸出而跳過技能符號連結

當日誌包含以下內容時使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 將每個技能根目錄視為隔離邊界。當 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符號連結的實際目標解析到該根目錄之外時，除非該目標已明確信任，否則將跳過該符號連結。

檢查連結：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果該目標是有意的，請同時配置直接的技能根目錄和允許的符號連結目標：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

然後啟動一個新會話或等待技能監視器重新整理。如果運行中的程序早於配置變更，請重新啟動閘道。

請勿使用廣泛的目標，例如 `~`、`/` 或整個同步的專案資料夾。
請將 `allowSymlinkTargets` 限定在包含受信任 `SKILL.md` 目錄的實際技能根目錄。

相關：

- [Skills 配置](/zh-Hant/tools/skills-config#symlinked-sibling-repos)
- [配置範例](/zh-Hant/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 長語境需要額外使用量

當日誌/錯誤包含以下內容時使用：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 選取的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合長語境使用資格。
- 請求僅在需要 1M beta 路徑的長會話/模型執行時失敗。

修復選項：

<Steps>
  <Step title="停用 context1m">停用該模型的 `context1m` 以回退到正常的語境視窗。</Step>
  <Step title="使用符合資格的憑證">使用符合長語境請求資格的 Anthropic 憑證，或切換到 Anthropic API 金鑰。</Step>
  <Step title="設定備用模型">設定備用模型，以便當 Anthropic 長語境請求被拒絕時，執行仍能繼續。</Step>
</Steps>

相關連結：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用量和費用](/zh-Hant/reference/token-use)
- [為什麼我看到來自 Anthropic 的 HTTP 429 錯誤？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本機相容 OpenAI 的後端通過直接探測，但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 運作正常
- 微小的直接 `/v1/chat/completions` 呼叫正常運作
- OpenClaw 模型執行僅在一般代理轉次時失敗

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

尋找：

- 直接微小的呼叫成功，但 OpenClaw 僅在較大的提示詞時執行失敗
- `model_not_found` 或 404 錯誤，即使直接 `/v1/chat/completions`
  使用相同的裸模型 id 也能運作
- 後端關於 `messages[].content` 期望字串的錯誤
- 使用 OpenAI 相容本地後端時出現間歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 後端當機僅在較大的提示詞 token 數量或完整代理執行時期提示詞出現

<AccordionGroup>
  <Accordion title="常見特徵">
    - 搭配本地 MLX/vLLM 樣式伺服器使用 `model_not_found` → 請驗證 `baseUrl` 是否包含 `/v1`，`api` 對於 `/v1/chat/completions` 後端是否為 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是原始的供應商本地 ID。請使用供應商前綴選擇一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；並將目錄條目保持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化的 Chat Completions 內容部分。解決方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允許的訊息金鑰（如 `["role","content"]`） → 後端拒絕 Chat Completions 訊息上的 OpenAI 樣式重播中繼資料。解決方法：設定 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成 Chat Completions 請求，但該輪次未返回使用者可見的助理文字。OpenClaw 會重試一次可安全重播的空白 OpenAI 相容輪次；持續失敗通常意味著後端正在發出空白/非文字內容，或是抑制了最終答案文字。
    - 直接的微小請求成功，但 OpenClaw Agent 執行因後端/模型崩潰而失敗（例如某些 `inferrs` 版本上的 Gemma） → OpenClaw 傳輸可能已經正確；問題在於後端無法處理較大的 Agent 執行期提示形狀。
    - 停用工具後失敗減少但未消失 → 工具架構是壓力的一部分，但剩餘問題仍然是上游模型/伺服器容量或後端錯誤。

  </Accordion>
  <Accordion title="修復選項">
    1. 針對僅接受字串的 Chat Completions 後端，設定 `compat.requiresStringContent: true`。
    2. 針對僅接受 `role` 和 `content` 的嚴格 Chat Completions 後端，設定 `compat.strictMessageKeys: true`。
    3. 針對無法可靠處理 OpenClaw 工具架構的模型/後端，設定 `compat.supportsTools: false`。
    4. 盡可能降低提示壓力：縮小工作區引導、縮短工作階段歷史、使用較輕量的本機模型，或使用具有更強長內容支援能力的後端。
    5. 如果微小的直接請求持續通過，但 OpenClaw 代理程式輪次仍在後端內部當機，請將其視為上游伺服器/模型的限制，並使用可接受的承載形狀 (payload shape) 提出可重現的問題報告。
  </Accordion>
</AccordionGroup>

相關：

- [組態](/zh-Hant/gateway/configuration)
- [本機模型](/zh-Hant/gateway/local-models)
- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)

## 無回覆

如果通道已啟動但沒有任何回應，請在重新連接任何內容之前檢查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

檢查：

- DM 發送者的配對待定。
- 群組提及閘道 (`requireMention`, `mentionPatterns`)。
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息會被忽略，直到被提及。
- `pairing request` → 發送者需要審核。
- `blocked` / `allowlist` → 發送者/頻道已被原則過濾。

相關：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [群組](/zh-Hant/channels/groups)
- [配對](/zh-Hant/channels/pairing)

## 儀表板控制 UI 連線性

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式和安全內容假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查：

- 正確的探測 URL 和儀表板 URL。
- 用戶端和閘道之間的驗證模式/權杖不匹配。
- 需要裝置身分識別時使用了 HTTP。

<AccordionGroup>
  <Accordion title="連線 / 授權簽章">
    - `device identity required` → 非安全上下文或缺少裝置授權。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或您來自非 loopback 瀏覽器來源連線，且未設定明確允許清單）。
    - `device nonce required` / `device nonce mismatch` → 用戶端未完成挑戰式裝置授權流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 用戶端為目前交握簽署了錯誤的 payload（或時間戳記過期）。
    - `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
    - 該快取權杖重試會重複使用與配對裝置權杖一起儲存的快取範圍集合。明確的 `deviceToken` / 明確的 `scopes` 呼叫方則會保留其要求的範圍集合。
    - `AUTH_SCOPE_MISMATCH` → 裝置權杖已被識別，但其核准的範圍未涵蓋此連線請求；請重新配對或核准要求的範圍合約，而非輪換共用的閘道權杖。
    - 在該重試路徑之外，連線授權優先順序為：先是明確的共用權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前序列化。因此，來自同一個用戶端的兩次不良並發重試，可能會在第二次嘗試時顯示 `retry later`，而非兩次單純的不匹配。
    - 來自瀏覽器來源 loopback 用戶端的 `too many failed authentication attempts (retry later)` → 來自同一個正規化 `Origin` 的重複失敗會被暫時鎖定；另一個 localhost 來源則使用不同的區塊。
    - 該重試後重複的 `unauthorized` → 共用權杖/裝置權杖偏移；如有需要，請重新整理權杖設定並重新核准/輪換裝置權杖。
    - `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

  </Accordion>
</AccordionGroup>

### 驗證詳細代碼快速映射

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一個動作：

| 詳細代碼                     | 含義                                                                                                                                                                             | 建議操作                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送必要的共享令牌。                                                                                                                                                     | 在用戶端中貼上/設定 Token 並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到控制 UI 設定中。                                                                                                                                           |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與閘道驗證令牌不符。                                                                                                                                                     | 如果 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取 Token 的重試會重複使用儲存的已批准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行 [Token 漂移復原檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取令牌已過期或已撤銷。                                                                                                                                               | 使用 [devices CLI](/zh-Hant/cli/devices) 輪換/重新批准裝置 Token，然後重新連線。                                                                                                                                                                                     |
| `AUTH_SCOPE_MISMATCH`        | 裝置 Token 有效，但其已批准的角色/範圍未涵蓋此連線請求。                                                                                                                         | 重新配對裝置或批准請求的範圍合約；不要將此視為共用 Token 漂移。                                                                                                                                                                                                 |
| `PAIRING_REQUIRED`           | 裝置身分識別需要批准。檢查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在出現時使用 `requestId` / `remediationHint`。 | 批准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您審查請求的存取權後使用相同的流程。                                                                                                                        |

<Note>使用共用 Gateway Token/密碼進行驗證的直接回送後端 RPC 不應依賴 CLI 的已配對裝置範圍基線。如果子代理程式或其他內部呼叫仍因 `scope-upgrade` 而失敗，請驗證呼叫者正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"` 並且未強制使用明確的 `deviceIdentity` 或裝置 Token。</Note>

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線用戶端並驗證它：

<Steps>
  <Step title="等待 connect.challenge">用戶端等待 Gateway 發出的 `connect.challenge`。</Step>
  <Step title="簽署負載">用戶端簽署綁定挑戰的負載。</Step>
  <Step title="傳送裝置 nonce">用戶端傳送 `connect.params.device.nonce` 並附帶相同的挑戰 nonce。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置 token 工作階段只能管理**它們自己的**裝置，除非呼叫者同時也擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫端工作階段已經擁有的操作員範圍

相關連結：

- [設定](/zh-Hant/gateway/configuration) (gateway 驗證模式)
- [控制 UI](/zh-Hant/web/control-ui)
- [裝置](/zh-Hant/cli/devices)
- [遠端存取](/zh-Hant/gateway/remote)
- [信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)

## Gateway 服務未執行

當服務已安裝但程序無法持續執行時使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

尋找：

- `Runtime: stopped` 並附帶退出提示。
- 服務設定不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 使用 `--deep` 時出現多餘的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或是設定檔被覆寫並遺失了 `gateway.mode`。解決方法：在設定中設定 `gateway.mode="local"`，或是重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新標記預期的本機模式設定。如果您是透過 Podman 執行 OpenClaw，預設設定路徑為 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑的情況下進行非回環位址綁定（token/密碼，或已設定信任的 proxy）。
    - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
    - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應在每台機器上保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
    - 來自 doctor 的 `System-level OpenClaw gateway service detected` → 存在 systemd 系統單元但缺少使用者層級的服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項；如果系統單元是預期的監督器，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 安裝的監督器仍然釘選舊的 `--port`。請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動閘道服務。

  </Accordion>
</AccordionGroup>

相關：

- [背景執行與行程工具](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [Doctor](/zh-Hant/gateway/doctor)

## 閘道拒絕了無效設定

當閘道啟動失敗並顯示 `Invalid config`，或熱重載日誌顯示
它略過了無效編輯時使用。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

尋找：

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- 作用中設定旁邊的時間戳記 `openclaw.json.rejected.*` 檔案
- 如果 `doctor --fix` 修復了損壞的直接編輯，則會有時間戳記 `openclaw.json.clobbered.*` 檔案

<AccordionGroup>
  <Accordion title="發生了什麼事">
    - 組態在啟動、熱重載或 OpenClaw 擁有的寫入期間未通過驗證。
    - Gateway 啟動失敗並關閉，而不是重寫 `openclaw.json`。
    - 熱重載會跳過無效的外部編輯，並保持當前運行時組態處於啟用狀態。
    - OpenClaw 擁有的寫入會在提交前拒絕無效/破壞性的負載，並儲存 `.rejected.*`。
    - `openclaw doctor --fix` 擁有修復權限。它可以移除非 JSON 前綴或還原最後已知的良好副本，同時將被拒絕的負載保留為 `.clobbered.*`。

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
    - `.clobbered.*` 存在 → doctor 在修復作用中組態時保留了一個損壞的外部編輯。
    - `.rejected.*` 存在 → OpenClaw 擁有的組態寫入在提交前未通過架構或覆蓋檢查。
    - `Config write rejected:` → 寫入嘗試捨棄必要形狀、大幅縮小檔案大小，或儲存無效組態。
    - `config reload skipped (invalid config):` → 直接編輯未通過驗證，並被執行中的 Gateway 忽略。
    - `Invalid config at ...` → 在 Gateway 服務啟動前啟動失敗。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 擁有的寫入被拒絕，因為與最後已知的良好備份相比，它遺失了欄位或大小縮小。
    - `Config last-known-good promotion skipped` → 候選項目包含已編輯的機密佔位符，例如 `***`。

  </Accordion>
  <Accordion title="修復選項">
    1. 執行 `openclaw doctor --fix` 以讓 doctor 修復帶前綴/被覆蓋的配置或還原上次已知良好的配置。
    2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製所需的金鑰，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 配置，而不只是您想要變更的部分物件。
  </Accordion>
</AccordionGroup>

相關：

- [配置](/zh-Hant/cli/config)
- [配置：熱重新載入](/zh-Hant/gateway/configuration#config-hot-reload)
- [配置：嚴格驗證](/zh-Hant/gateway/configuration#strict-validation)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 探測警告

當 `openclaw gateway probe` 成功連線到目標，但仍列印警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 確認警告是否關於 SSH 回退、多個 Gateway、缺少範圍，或未解析的 auth refs。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接連線至已設定/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常表示刻意設定的多 Gateway 環境，或是過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受範圍限制；請配對裝置身分識別或使用具有 `operator.read` 的憑證。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 連線成功，但完整的診斷 RPC 集合逾時或失敗。請將此視為可連線但診斷功能降級的 Gateway；比較 `--json` 輸出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 已回應，但此用戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在失敗目標的此指令路徑中無法使用驗證資料。

相關連結：

- [閘道](/zh-Hant/cli/gateway)
- [同一主機上的多個閘道](/zh-Hant/gateway#multiple-gateways-same-host)
- [遠端存取](/zh-Hant/gateway/remote)

## 頻道已連線，但訊息無法流動

如果頻道狀態為已連線但訊息流動已停止，請專注於政策、權限和頻道特定的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查事項：

- DM 政策 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組允許清單和提及要求。
- 遺漏頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息被群組提及政策忽略。
- `pairing` / 待審批追蹤 → 發送者未獲批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關連結：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)
- [WhatsApp](/zh-Hant/channels/whatsapp)

## Cron 和心跳傳遞

如果 cron 或心跳未執行或未傳遞，請先驗證排程器狀態，然後再驗證傳遞目標。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查事項：

- Cron 已啟用且存在下次喚醒時間。
- 工作執行歷史狀態 (`ok`, `skipped`, `error`)。
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行時錯誤。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 在活動時段視窗外。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空行 / markdown 標題，因此 OpenClaw 略過模型呼叫。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 區塊，但此 tick 中沒有任務到期。
    - `heartbeat: unknown accountId` → 心跳傳遞目標的帳戶 ID 無效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，同時 `agents.defaults.heartbeat.directPolicy` （或個別代理覆寫）被設為 `block`。

  </Accordion>
</AccordionGroup>

相關：

- [Heartbeat](/zh-Hant/gateway/heartbeat)
- [Scheduled tasks](/zh-Hant/automation/cron-jobs)
- [Scheduled tasks: troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting)

## Node 已配對，工具失敗

如果 Node 已配對但工具失敗，請分離前景、權限與審核狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查以下項目：

- Node 已上線並具備預期功能。
- 作業系統對相機/麥克風/位置/螢幕的權限授予。
- 執行審核與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → Node 應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行審核待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [Exec approvals](/zh-Hant/tools/exec-approvals)
- [Node troubleshooting](/zh-Hant/nodes/troubleshooting)
- [Nodes](/zh-Hant/nodes/index)

## 瀏覽器工具失敗

當瀏覽器工具操作失敗，但 Gateway 本身健康時使用此步驟。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查：

- `plugins.allow` 是否已設定並包含 `browser`。
- 有效的瀏覽器執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

<AccordionGroup>
  <Accordion title="Plugin / executable signatures">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆綁的瀏覽器外掛被 `plugins.allow` 排除。
    - 瀏覽器工具遺失 / 無法使用，同時 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此外掛從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的協定，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 的連接埠錯誤或超出範圍。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少核心瀏覽器執行環境相依性；請重新安裝或更新 OpenClaw，然後重新啟動 gateway。ARIA 快照和基本頁面截圖仍可運作，但導航、AI 快照、CSS 選擇器元素截圖和 PDF 匯出將無法使用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-session signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法附加至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，批准首次附加提示，然後重試。如果不需要登入狀態，建議使用受管理的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 設定的遠端 CDP 端點無法從 gateway 主機連線。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可連線的目標，或者 HTTP 端點有回應但 CDP WebSocket 仍無法開啟。

  </Accordion>
  <Accordion title="元素 / 截圖 / 上傳簽名">
    - `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取或快照 `--ref`，而非 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳掛鉤需要快照引用，而非 CSS 選擇器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上，每次呼叫發送一次上傳。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話框掛鉤不支援逾時覆寫。
    - `existing-session type does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有工作階段設定檔上的 `act:type`，請省略 `timeoutMs`；若需要自訂逾時，請使用受管理/CDP 瀏覽器設定檔。
    - `existing-session evaluate does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有工作階段設定檔上的 `act:evaluate`，請省略 `timeoutMs`；若需要自訂逾時，請使用受管理/CDP 瀏覽器設定檔。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍需要受管理瀏覽器或原始 CDP 設定檔。
    - 僅附加或遠端 CDP 設定檔上的過時檢視區 / 暗色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉使用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，無需重新啟動整個閘道。

  </Accordion>
</AccordionGroup>

相關：

- [瀏覽器 (OpenClaw 受控)](/zh-Hant/tools/browser)
- [瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)

## 如果您升級後突然發生問題

大多數升級後的問題是因為設定檔偏離或現在執行了更嚴格的預設值。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    檢查項目：

    - 如果是 `gateway.mode=remote`，CLI 呼叫可能以遠端為目標，而您的本機服務正常。
    - 明確的 `--url` 呼叫不會回退到已儲存的認證資訊。

    常見特徵：

    - `gateway connect failed:` → 錯誤的 URL 目標。
    - `unauthorized` → 端點可連線但認證錯誤。

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

    - 非回環綁定 (`lan`、`tailnet`、`custom`) 需要有效的 gateway auth 路徑：共享 token/密碼認證，或正確設定的非回環 `trusted-proxy` 部署。
    - 舊的 key 如 `gateway.token` 不會取代 `gateway.auth.token`。

    常見特徵：

    - `refusing to bind gateway ... without auth` → 非回環綁定且缺少有效的 gateway auth 路徑。
    - 當 runtime 執行時出現 `Connectivity probe: failed` → gateway 正常運作但目前的認證/url 無法存取。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    檢查項目：

    - Dashboard/Nodes 的待處理裝置核准。
    - 政策或身分變更後的待處理 DM 配對核准。

    常見特徵：

    - `device identity required` → 未滿足裝置認證。
    - `pairing required` → 傳送者/裝置必須被核准。

  </Accordion>
</AccordionGroup>

如果在檢查後服務設定與 runtime 仍不一致，請從相同的 profile/state 目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [Authentication](/zh-Hant/gateway/authentication)
- [Background exec and process tool](/zh-Hant/gateway/background-process)
- [Gateway-owned pairing](/zh-Hant/gateway/pairing)

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [FAQ](/zh-Hant/help/faq)
- [Gateway runbook](/zh-Hant/gateway)
