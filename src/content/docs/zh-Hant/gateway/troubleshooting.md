---
summary: "針對閘道、通道、自動化、節點和瀏覽器的深度疑難排解手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "疑難排解"
sidebarTitle: "疑難排解"
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
- [Token 使用量與成本](/zh-Hant/reference/token-use)
- [為什麼我會從 Anthropic 收到 HTTP 429？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

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
    - `model_not_found` 伴隨本地 MLX/vLLM 風格的伺服器 → 驗證 `baseUrl` 包含 `/v1`，對於 `/v1/chat/completions` 後端 `api` 為 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是裸提供者本地 id。請使用提供者前綴選擇一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；將目錄條目保持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化的聊天完成內容部分。修正方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成聊天完成請求，但該轉次未返回使用者可見的助理文字。OpenClaw 會重試一次可重播的空白 OpenAI 相容轉次；持續失敗通常意味著後端正在發出空白/非文字內容或抑制最終答案文字。
    - 直接微小的請求成功，但 OpenClaw 代理執行因後端/模型當機而失敗（例如某些 `inferrs` 版本上的 Gemma）→ OpenClaw 傳輸可能已經正確；後端無法處理較大的代理執行時期提示詞形狀。
    - 停用工具後失敗減少但未消失 → 工具結構描述是壓力的一部分，但剩餘問題仍是上游模型/伺服器容量或後端錯誤。

  </Accordion>
  <Accordion title="修復選項">
    1. 為僅字串的 Chat Completions 後端設定 `compat.requiresStringContent: true`。
    2. 為無法可靠處理 OpenClaw 工具 schema 表面的模型/後端設定 `compat.supportsTools: false`。
    3. 盡可能降低提示詞壓力：較小的工作區引導、較短的會話歷史、較輕量的本機模型，或具有更強長上下文支援的後端。
    4. 如果微小的直接請求持續通過，但 OpenClaw 代理回合仍在後端內崩潰，請將其視為上游伺服器/模型的限制，並在那裡使用可接受的 payload 形狀提交可重現的問題。
  </Accordion>
</AccordionGroup>

相關：

- [設定](/zh-Hant/gateway/configuration)
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

- `drop guild message (mention required` → 群組訊息在收到提及前被忽略。
- `pairing request` → 發送者需要審核。
- `blocked` / `allowlist` → 發送者/通道已被策略過濾。

相關：

- [通道疑難排解](/zh-Hant/channels/troubleshooting)
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
  <Accordion title="Connect / auth signatures">
    - `device identity required` → 非安全上下文或缺少設備驗證。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您正在從非回送瀏覽器來源連接，且沒有明確的允許列表）。
    - `device nonce required` / `device nonce mismatch` → 客戶端未完成基於挑戰的設備驗證流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客戶端為當前握手簽署了錯誤的負載（或時間戳過舊）。
    - `AUTH_TOKEN_MISMATCH` 伴隨 `canRetryWithDeviceToken=true` → 客戶端可以使用緩存的設備令牌進行一次受信任的重試。
    - 該緩存令牌重試會重用與配對設備令牌一起存儲的緩存範圍集。顯式 `deviceToken` / 顯式 `scopes` 調用者則會保留其請求的範圍集。
    - 在該重試路徑之外，連接驗證的優先順序依次為：顯式共享令牌/密碼，然後是顯式 `deviceToken`，接著是存儲的設備令牌，最後是引導令牌。
    - 在異步 Tailscale Serve 控制 UI 路徑上，同一 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前進行序列化。因此，來自同一客戶端的兩次並發錯誤重試可能在第二次嘗試時顯示 `retry later`，而不是兩次普通的錯誤匹配。
    - 來自瀏覽器來源回送客戶端的 `too many failed authentication attempts (retry later)` → 來自同一規範化 `Origin` 的重複失敗將被暫時鎖定；另一個 localhost 來源則使用單獨的存儲桶。
    - 在該次重試後重複出現 `unauthorized` → 共享令牌/設備令牌漂移；如有需要，請刷新令牌配置並重新批准/輪換設備令牌。
    - `gateway connect failed:` → 錯誤的主機/埠/URL 目標。

  </Accordion>
</AccordionGroup>

### 驗證詳細代碼快速映射

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步操作：

| 詳細代碼                     | 含義                                                                                                                                                                         | 建議操作                                                                                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送必要的共享令牌。                                                                                                                                                 | 在客戶端中貼上/設定令牌並重試。針對儀表板路徑：`openclaw config get gateway.auth.token`，然後貼上至控制 UI 設定中。                                                                                                                                       |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與閘道驗證令牌不符。                                                                                                                                                 | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取令牌重試會重複使用已儲存的核准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行[令牌漂移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每個裝置的快取令牌已過期或已撤銷。                                                                                                                                           | 使用 [devices CLI](/zh-Hant/cli/devices) 輪替/重新核准裝置令牌，然後重新連線。                                                                                                                                                                                 |
| `PAIRING_REQUIRED`           | 裝置身分需要核准。檢查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在出現時使用 `requestId` / `remediationHint`。 | 核准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您檢視請求的存取權限後，會使用相同的流程。                                                                                                            |

<Note>使用共享閘道令牌/密碼進行驗證的直接迴圈後端 RPC 不應依賴 CLI 的配對裝置範圍基準。如果子代理程式或其他內部呼叫仍因 `scope-upgrade` 而失敗，請驗證呼叫者正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，並未強制使用明確的 `deviceIdentity` 或裝置令牌。</Note>

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的客戶端並進行驗證：

<Steps>
  <Step title="Wait for connect.challenge">客戶端等待閘道發出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">客戶端對綁定挑戰的載荷進行簽章。</Step>
  <Step title="傳送裝置 nonce">用戶端使用相同的挑戰 nonce 傳送 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置權杖工作階段只能管理**它們自己的**裝置，除非呼叫者也擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫工作階段已經擁有的操作員範圍 (operator scopes)

相關：

- [組態](/zh-Hant/gateway/configuration) (gateway auth modes)
- [控制 UI](/zh-Hant/web/control-ui)
- [裝置](/zh-Hant/cli/devices)
- [遠端存取](/zh-Hant/gateway/remote)
- [信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth)

## Gateway 服務未執行

當服務已安裝但程序無法保持執行時使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

檢查：

- `Runtime: stopped` 並查看退出提示 (exit hints)。
- 服務組態不符 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 當使用 `--deep` 時，有多餘的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或設定檔被覆寫並遺失了 `gateway.mode`。解決方法：在您的設定中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新套用預期的本機模式設定。如果您透過 Podman 執行 OpenClaw，預設設定路徑為 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑（權杖/密碼，或設定的受信任代理）的情況下進行非回傳位址綁定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
    - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應在每台機器上保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
    - 來自 doctor 的 `System-level OpenClaw gateway service detected` → 存在 systemd 系統單元，但缺少使用者層級服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項；或者如果系統單元是預期的監督程式，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安裝的監督程式仍然綁定舊的 `--port`。請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動閘道服務。

  </Accordion>
</AccordionGroup>

相關：

- [背景執行和程序工具](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [診斷工具](/zh-Hant/gateway/doctor)

## 閘道拒絕了無效的設定

當閘道啟動失敗並顯示 `Invalid config`，或熱重新載入日誌顯示它跳過了無效的編輯時，請使用此步驟。

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
- 在作用中設定旁邊的帶時間戳記的 `openclaw.json.rejected.*` 檔案
- 如果 `doctor --fix` 修復了損壞的直接編輯，則會有帶時間戳記的 `openclaw.json.clobbered.*` 檔案

<AccordionGroup>
  <Accordion title="發生什麼事">
    - 配置在啟動、熱重載或 OpenClaw 擁有的寫入期間未通過驗證。
    - Gateway 啟動失敗並關閉，而不是重寫 `openclaw.json`。
    - 熱重載會跳過無效的外部編輯並保持當前的運行時配置處於活動狀態。
    - OpenClaw 擁有的寫入會在提交前拒絕無效/破壞性的有效載荷，並保存 `.rejected.*`。
    - `openclaw doctor --fix` 負責修復。它可以移除非 JSON 前綴或恢復最後已知正確的副本，同時將被拒絕的有效載荷保留為 `.clobbered.*`。

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
    - `.clobbered.*` 存在 → doctor 在修復活動配置時保留了損壞的外部編輯。
    - `.rejected.*` 存在 → OpenClaw 擁有的配置寫入在提交前未通過架構或覆蓋檢查。
    - `Config write rejected:` → 寫入嘗試丟棄必要形狀、大幅縮減文件大小或持久化無效配置。
    - `config reload skipped (invalid config):` → 直接編輯未通過驗證並被運行中的 Gateway 忽略。
    - `Invalid config at ...` → 啟動在 Gateway 服務啟動前失敗。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 擁有的寫入被拒絕，因為與最後已知正確的備份相比，它丟失了欄位或大小。
    - `Config last-known-good promotion skipped` → 候選配置包含編輯過的機密佔位符，例如 `***`。

  </Accordion>
  <Accordion title="修復選項">
    1. 執行 `openclaw doctor --fix` 讓 doctor 修復前綴/損壞的設定或恢復上次已知的良好狀態。
    2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製預期的金鑰，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 設定，而不僅僅是您想要變更的部分物件。
  </Accordion>
</AccordionGroup>

相關：

- [設定](/zh-Hant/cli/config)
- [設定：熱重載](/zh-Hant/gateway/configuration#config-hot-reload)
- [設定：嚴格驗證](/zh-Hant/gateway/configuration#strict-validation)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 探查警告

當 `openclaw gateway probe` 連線到某個目標，但仍印出警告區塊時使用此方法。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 判斷警告是關於 SSH 備援、多個 gateway、缺少範圍，還是未解析的 auth refs。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接連線至已設定/回環目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常表示刻意設定的多 gateway 環境，或過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受範圍限制；請配對裝置身分識別或使用具有 `operator.read` 的認證資訊。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 連線成功，但完整的診斷 RPC 集合逾時或失敗。將此視為具備降級診斷功能的可連線 Gateway；請比較 `--json` 輸出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → gateway 已回應，但此客戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中，失敗目標無法使用認證資料。

相關：

- [Gateway](/zh-Hant/cli/gateway)
- [Multiple gateways on the same host](/zh-Hant/gateway#multiple-gateways-same-host)
- [Remote access](/zh-Hant/gateway/remote)

## Channel connected, messages not flowing

If channel state is connected but message flow is dead, focus on policy, permissions, and channel specific delivery rules.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Look for:

- DM policy (`pairing`, `allowlist`, `open`, `disabled`).
- Group allowlist and mention requirements.
- Missing channel API permissions/scopes.

Common signatures:

- `mention required` → message ignored by group mention policy.
- `pairing` / pending approval traces → sender is not approved.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → channel auth/permissions issue.

相關連結：

- [Channel troubleshooting](/zh-Hant/channels/troubleshooting)
- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)
- [WhatsApp](/zh-Hant/channels/whatsapp)

## Cron and heartbeat delivery

If cron or heartbeat did not run or did not deliver, verify scheduler state first, then delivery target.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

檢查以下項目：

- Cron enabled and next wake present.
- Job run history status (`ok`, `skipped`, `error`).
- Heartbeat skip reasons (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `cron: timer tick failed` → 排程器刻度失敗；請檢查檔案/日誌/執行時錯誤。
    - `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出啟用時段視窗。
    - `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空白行 / markdown 標題，因此 OpenClaw 會跳過模型呼叫。
    - `heartbeat skipped` 搭配 `reason=no-tasks-due` → `HEARTBEAT.md` 包含一個 `tasks:` 區塊，但此刻沒有任何任務到期。
    - `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
    - `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，但 `agents.defaults.heartbeat.directPolicy` （或個別代理程式覆寫）設定為 `block`。

  </Accordion>
</AccordionGroup>

相關：

- [心跳](/zh-Hant/gateway/heartbeat)
- [排程任務](/zh-Hant/automation/cron-jobs)
- [排程任務：疑難排解](/zh-Hant/automation/cron-jobs#troubleshooting)

## 節點已配對，工具失敗

如果節點已配對但工具失敗，請區分前景、權限和核准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

尋找：

- 節點上線並具備預期的功能。
- 相機/麥克風/位置/螢幕的 OS 權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少 OS 權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核准待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [執行核准](/zh-Hant/tools/exec-approvals)
- [節點疑難排解](/zh-Hant/nodes/troubleshooting)
- [節點](/zh-Hant/nodes/index)

## 瀏覽器工具失敗

當瀏覽器工具動作失敗，但閘道本身運作正常時使用此項。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

尋找：

- 是否已設定 `plugins.allow` 並包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

<AccordionGroup>
  <Accordion title="外掛程式 / 可執行檔簽章">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 隨附的瀏覽器外掛程式被 `plugins.allow` 排除。
    - 當 `browser.enabled=true` 時瀏覽器工具遺失 / 無法使用 → `plugins.allow` 排除了 `browser`，因此外掛程式從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的配置，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 的連接埠錯誤或超出範圍。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少核心瀏覽器執行階段相依性；請重新安裝或更新 OpenClaw，然後重新啟動 gateway。ARIA 快照和基本頁面螢幕截圖仍然可以運作，但瀏覽、AI 快照、CSS 選擇器元素螢幕截圖和 PDF 匯出將無法使用。

  </Accordion>
  <Accordion title="Chrome MCP / 現有工作階段簽章">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法附加至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，批准第一次附加提示，然後重試。如果不需要登入狀態，建議使用受管理的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 設定的遠端 CDP 端點無法從 gateway 主機連線。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可連線的目標，或者 HTTP 端點有回應但 CDP WebSocket 仍然無法開啟。

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳 hook 需要快照參照，而不是 CSS 選擇器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上，每次呼叫僅發送一個上傳。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話框 hook 不支援覆寫逾時。
    - `existing-session type does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:type`，請省略 `timeoutMs`；或者在需要自訂逾時時，使用受控/CDP 瀏覽器設定檔。
    - `existing-session evaluate does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:evaluate`，請省略 `timeoutMs`；或者在需要自訂逾時時，使用受控/CDP 瀏覽器設定檔。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受控瀏覽器或原始 CDP 設定檔。
    - 僅附加或遠端 CDP 設定檔上的過時 viewport / 深色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉使用中的控制會話並釋放 Playwright/CDP 模擬狀態，而不需重新啟動整個閘道。

  </Accordion>
</AccordionGroup>

相關：

- [瀏覽器 (OpenClaw-managed)](/zh-Hant/tools/browser)
- [瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)

## 如果您升級後突然發生故障

大多數升級後的損壞是由於設定漂移，或者是現在開始強制執行更嚴格的預設值。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    What to check:

    - If `gateway.mode=remote`, CLI calls may be targeting remote while your local service is fine.
    - Explicit `--url` calls do not fall back to stored credentials.

    Common signatures:

    - `gateway connect failed:` → wrong URL target.
    - `unauthorized` → endpoint reachable but wrong auth.

  </Accordion>
  <Accordion title="2. Bind and auth guardrails are stricter">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    What to check:

    - Non-loopback binds (`lan`, `tailnet`, `custom`) need a valid gateway auth path: shared token/password auth, or a correctly configured non-loopback `trusted-proxy` deployment.
    - Old keys like `gateway.token` do not replace `gateway.auth.token`.

    Common signatures:

    - `refusing to bind gateway ... without auth` → non-loopback bind without a valid gateway auth path.
    - `Connectivity probe: failed` while runtime is running → gateway alive but inaccessible with current auth/url.

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    What to check:

    - Pending device approvals for dashboard/nodes.
    - Pending DM pairing approvals after policy or identity changes.

    Common signatures:

    - `device identity required` → device auth not satisfied.
    - `pairing required` → sender/device must be approved.

  </Accordion>
</AccordionGroup>

如果在檢查後服務設定和執行時仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務元資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [驗證](/zh-Hant/gateway/authentication)
- [背景執行和程序工具](/zh-Hant/gateway/background-process)
- [Gateway 擁有的配對](/zh-Hant/gateway/pairing)

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [FAQ](/zh-Hant/help/faq)
- [Gateway 手冊](/zh-Hant/gateway)
