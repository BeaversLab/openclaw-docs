---
summary: "針對閘道、管道、自動化、節點和瀏覽器的深度故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
sidebarTitle: "故障排除"
---

此頁面是深度手冊。如果您想先進行快速分流流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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

- `openclaw gateway status` 顯示 `Runtime: running`、`Connectivity probe: ok` 和一行 `Capability: ...`。
- `openclaw doctor` 回報無阻斷性設定/服務問題。
- `openclaw channels status --probe` 顯示各帳號的即時傳輸狀態，並在支援的情況下顯示探測/稽核結果，例如 `works` 或 `audit ok`。

## 更新後

當更新完成但閘道已停機、管道為空，或模型呼叫開始因 401 錯誤而失敗時使用此方法。

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

檢查：

- `openclaw status` / `openclaw status --all` 中的 `Update restart`。待處理或失敗的移轉包含下一個要執行的指令。
- Channels 下的 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`。
  這意味著管道設定仍然存在，但外掛程式註冊在管道載入之前失敗了。
- 重新驗證後提供者回傳 401。`openclaw doctor --fix` 會檢查過時的各 Agent OAuth 授權陰影，並移除舊的複本，以便所有 Agent 都能解析目前的共用設定檔。

## 分裂式安裝與較新的設定保護

當閘道服務在更新後意外停止，或日誌顯示其中一個 `openclaw` 二進位檔案比上次寫入 `openclaw.json` 的版本還舊時使用此方法。

OpenClaw 會在寫入設定時加上 `meta.lastTouchedVersion` 標記。唯讀指令仍然可以檢查由較新 OpenClaw 寫入的設定，但程序和服務的變更動作會拒絕從較舊的二進位檔案繼續執行。受阻的動作包括啟動、停止、重新啟動、解除安裝、強制重新安裝閘道服務、以服務模式啟動閘道，以及 `gateway --force` 連接埠清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修復 PATH">
    修復 `PATH` 以便 `openclaw` 解析至較新的安裝，然後重新執行該動作。
  </Step>
  <Step title="重新安裝 gateway service">
    從較新的安裝中重新安裝指定的 gateway service：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除過時的包裝程式">
    移除仍指向舊 `openclaw` 二進位檔案的過時系統套件或舊包裝程式項目。
  </Step>
</Steps>

<Warning>僅針對刻意降級或緊急復原，為單一指令設定 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作時請保持未設定。</Warning>

## 回滾後的通訊協定不匹配

當您降級或回滾 OpenClaw 後，日誌持續顯示 `protocol mismatch` 時，請使用此解決方案。這表示正在執行較舊的 Gateway，但較新的本機客戶端程序仍嘗試使用較舊 Gateway 無法支援的通訊協定範圍重新連線。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

尋找：

- Gateway 日誌中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:` 或 `openclaw doctor --deep` 中的 `Gateway clients`。這會列出連線至 Gateway 連接埠的活跃 TCP 客戶端，包括作業系統允許時的 PID 與指令列。
- 其指令列指向您已回滾之較新 OpenClaw 安裝或包裝程式的客戶端程序。

修復方法：

1. 停止或重新啟動 `gateway status --deep` 所顯示的過時 OpenClaw 客戶端程序。
2. 重新啟動內嵌 OpenClaw 的應用程式或包裝程式，例如本機儀表板、編輯器、app-server 協助程式，或是長時間執行的 `openclaw logs --follow` shell。
3. 重新執行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，並確認過時的客戶端 PID 已消失。

請勿讓較舊的 Gateway 接受較新且不相容的通訊協定。通訊協定升級可保護線上合約；回滾復原屬於程序/版本清理問題。

## 因路徑逸出而略過 Skill 符號連結

當日誌包含以下內容時使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 將每個技能根目錄視為隔離邊界。當 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符號連結的實際目標解析到該根目錄之外時，該連結將被跳過，除非該目標被明確信任。

檢查連結：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果該目標是有意為之，請同時設定直接的技能根目錄和允許的符號連結目標：

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

不要使用廣泛的目標，例如 `~`、`/` 或整個同步的專案資料夾。請將 `allowSymlinkTargets` 限制在包含受信任 `SKILL.md` 目錄的實際技能根目錄。

相關：

- [技能配置](/zh-Hant/tools/skills-config#symlinked-sibling-repos)
- [配置範例](/zh-Hant/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 長情境需要額外使用額度

當日誌/錯誤包含以下內容時使用此解決方案：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 選取的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合使用長情境的資格。
- 請求僅在需要 1M Beta 路徑的長會話/模型運行時失敗。

修復選項：

<Steps>
  <Step title="停用 context1m">針對該模型停用 `context1m` 以回退至正常的情境視窗。</Step>
  <Step title="使用符合資格的憑證">使用符合長情境請求資格的 Anthropic 憑證，或切換至 Anthropic API 金鑰。</Step>
  <Step title="設定回退模型">設定回退模型，以便當 Anthropic 長情境請求被拒絕時運行能繼續進行。</Step>
</Steps>

相關：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [為什麼我會看到來自 Anthropic 的 HTTP 429？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 相容後端通過直接探測但代理運行失敗

在以下情況使用：

- `curl ... /v1/models` 運作正常
- 微小的直接 `/v1/chat/completions` 呼叫可以正常運作
- OpenClaw 模型執行僅在正常的代理回合中失敗

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

尋找：

- 直接的微小呼叫成功，但 OpenClaw 執行僅在較大的提示詞時失敗
- `model_not_found` 或 404 錯誤，即使直接 `/v1/chat/completions`
  使用相同的基礎模型 ID 可以正常運作
- 後端關於 `messages[].content` 期望為字串的錯誤
- 使用 OpenAI 相容的本地後端時出現間歇性的 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 後端崩潰僅在較大的提示詞 token 數量或完整的代理運行時提示詞時出現

<AccordionGroup>
  <Accordion title="常見特徵">
    - `model_not_found` 搭配本地 MLX/vLLM 風格伺服器 → 請驗證 `baseUrl` 包含 `/v1`，`api` 對於 `/v1/chat/completions` 後端為 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是純供應商本機 ID。請使用供應商前綴選取它一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；並將目錄條目保持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化的 Chat Completions 內容部分。解決方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允許的訊息金鑰例如 `["role","content"]` → 後端拒絕 Chat Completions 訊息上的 OpenAI 風格重播中繼資料。解決方法：設定 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成 Chat Completions 請求，但未在該輪次傳回使用者可見的助手文字。OpenClaw 會重試一次具重播安全性的空白 OpenAI 相容輪次；持續的失敗通常表示後端正在發出空白/非文字內容或正在隱藏最終答案文字。
    - 直接的小型請求成功，但 OpenClaw 代理執行因後端/模型當機而失敗（例如某些 `inferrs` 建置上的 Gemma）→ OpenClaw 傳輸可能已經正確；後端是在更大的代理執行時期提示形状上失敗。
    - 停用工具後失敗減少但未消失 → 工具結構描述是造成壓力的部分，但剩餘的問題仍是上游模型/伺服器容量或後端錯誤。

  </Accordion>
  <Accordion title="修復選項">
    1. 針對僅支援字串的 Chat Completions 後端，設定 `compat.requiresStringContent: true`。
    2. 針對嚴格的 Chat Completions 後端（且在每個訊息中僅接受 `role` 和 `content`），設定 `compat.strictMessageKeys: true`。
    3. 針對無法可靠處理 OpenClaw 工具架構介面的模型/後端，設定 `compat.supportsTools: false`。
    4. 盡可能降低提示詞壓力：較小的工作區引導、較短的會話歷史、較輕量的本機模型，或支援更強長上下文能力的後端。
    5. 如果微小的直接請求持續成功，但 OpenClaw agent 輪次仍在後端內部崩潰，請將其視為上游伺服器/模型的限制，並在該處針對接受的承載形狀提交可重現的問題。
  </Accordion>
</AccordionGroup>

相關：

- [設定](/zh-Hant/gateway/configuration)
- [本機模型](/zh-Hant/gateway/local-models)
- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)

## 無回應

如果頻道已啟動但無任何回應，請在重新連線任何項目之前檢查路由與原則。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

檢查事項：

- DM 傳送者的配對待處理。
- 群組提及閘道 (`requireMention`, `mentionPatterns`)。
- 頻道/群組允許清單不符。

常見徵兆：

- `drop guild message (mention required` → 群組訊息被忽略，直至被提及。
- `pairing request` → 傳送者需要核准。
- `blocked` / `allowlist` → 傳送者/頻道已被原則過濾。

相關：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [群組](/zh-Hant/channels/groups)
- [配對](/zh-Hant/channels/pairing)

## 儀表板控制 UI 連線能力

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式及安全上下文假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查事項：

- 正確的探測 URL 與儀表板 URL。
- 用戶端與閘道之間的驗證模式/Token 不符。
- 需要裝置身分識別時使用了 HTTP。

<AccordionGroup>
  <Accordion title="連線 / 身份驗證簽章">
    - `device identity required` → 非安全內容或缺少裝置身分驗證。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您是從非回傳瀏覽器來源連線，且沒有明確的允許清單）。
    - `device nonce required` / `device nonce mismatch` → 用戶端未完成基於挑戰的裝置身分驗證流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 用戶端為目前的交握簽署了錯誤的承載（或過期的時間戳記）。
    - `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
    - 該快取權杖重試會重用與配對裝置權杖一起儲存的快取範圍集合。明確的 `deviceToken` / 明確的 `scopes` 呼叫者則會保留其要求的範圍集合。
    - `AUTH_SCOPE_MISMATCH` → 裝置權杖已被識別，但其核准的範圍未涵蓋此連線要求；請重新配對或核准要求的範圍合約，而不是輪替共享的閘道權杖。
    - 在該重試路徑之外，連線身分驗證的優先順序為：先是明確的共享權杖/密碼，接著是明確的 `deviceToken`，然後是儲存的裝置權杖，最後是啟動權杖。
    - 在非同步 Tailscale Serve 控制 UI 路徑上，來自相同 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前序列化。因此，來自同一用戶端的兩次並發錯誤重試，可能在第二次嘗試時顯示 `retry later`，而不是兩次單純的不相符。
    - 來自瀏覽器來源回傳用戶端的 `too many failed authentication attempts (retry later)` → 來自相同正規化 `Origin` 的重複失敗會暫時被鎖定；另一個 localhost 來源則使用個別的區塊。
    - 在該重試後重複 `unauthorized` → 共享權杖/裝置權杖偏離；重新整理權杖設定，並在需要時重新核准/輪替裝置權杖。
    - `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

  </Accordion>
</AccordionGroup>

### Auth detail codes quick map

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一個動作：

| Detail code                  | Meaning                                                                                                                                                                      | Recommended action                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 用戶端未傳送必要的共享令牌。                                                                                                                                                 | 在用戶端中貼上/設定令牌並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到 Control UI 設定中。                                                                                                                                           |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與閘道認證令牌不符。                                                                                                                                                 | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取令牌重試會重用儲存的已批准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行 [token drift recovery checklist](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 快取的每個裝置令牌已過期或被撤銷。                                                                                                                                           | 使用 [devices CLI](/zh-Hant/cli/devices) 輪替/重新批准裝置令牌，然後重新連線。                                                                                                                                                                                        |
| `AUTH_SCOPE_MISMATCH`        | 裝置令牌有效，但其已批准的角色/範圍未涵蓋此連線請求。                                                                                                                        | 重新配對裝置或批准請求的範圍合約；不要將此視為共享令牌漂移。                                                                                                                                                                                                     |
| `PAIRING_REQUIRED`           | 裝置身分識別需要批准。檢查 `error.details.reason` 中的 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在存在時使用 `requestId` / `remediationHint`。 | 批准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您審查請求的存取權後使用相同的流程。                                                                                                                         |

<Note>使用共享閘道令牌/密碼進行認證的直接回送後端 RPC 不應依賴 CLI 的配對裝置範圍基準。如果子代理或其他內部呼叫仍因 `scope-upgrade` 而失敗，請驗證呼叫者正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，並且未強制使用明確的 `deviceIdentity` 或裝置令牌。</Note>

Device auth v2 migration check:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽章錯誤，請更新連線的用戶端並進行驗證：

<Steps>
  <Step title="Wait for connect.challenge">用戶端等待閘道發出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">用戶端對綁定挑戰的 payload 進行簽署。</Step>
  <Step title="Send the device nonce">用戶端發送 `connect.params.device.nonce`，其中包含相同的挑戰 nonce。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置權杖工作階段只能管理「其自身」的裝置，除非呼叫者同時擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫者工作階段已持有的操作員範圍

相關連結：

- [組態](/zh-Hant/gateway/configuration)（閘道驗證模式）
- [控制 UI](/zh-Hant/web/control-ui)
- [裝置](/zh-Hant/cli/devices)
- [遠端存取](/zh-Hant/gateway/remote)
- [受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)

## 閘道服務未執行

當服務已安裝但程序無法保持執行時使用此步驟。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

尋找：

- `Runtime: stopped` 搭配退出提示。
- 服務組態不符（`Config (cli)` vs `Config (service)`）。
- 連接埠/監聽器衝突。
- 當使用 `--deep` 時，出現額外的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本機閘道模式未啟用，或是設定檔被覆寫並遺失了 `gateway.mode`。解決方法：在您的設定中設定 `gateway.mode="local"`，或是重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新標記預期的本機模式設定。如果您是透過 Podman 執行 OpenClaw，預設設定路徑是 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑（權杖/密碼，或設定的 trusted-proxy）的情況下進行非回環綁定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
    - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應該每台機器保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
    - 來自 doctor 的 `System-level OpenClaw gateway service detected` → 存在 systemd 系統單元，但缺少使用者層級服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項目；如果系統單元是預期的監督器，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 安裝的監督器仍然固定使用舊的 `--port`。請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動閘道服務。

  </Accordion>
</AccordionGroup>

相關：

- [背景執行與程序工具](/zh-Hant/gateway/background-process)
- [設定](/zh-Hant/gateway/configuration)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 在高記憶體使用量期間退出

當 Gateway 在負載下消失、監督器回報 OOM 樣式的重新啟動，或日誌提到 `critical memory pressure bundle written` 時使用此選項。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

尋找：

- 在最新的穩定性套件中 `Reason: diagnostic.memory.pressure.critical`。
- `Memory pressure:``critical/rss_threshold` 搭配 %%PH:INLINE_CODE:235:501e52f%%、`critical/heap_threshold` 或 `critical/rss_growth`。
- 在堆積限制附近的 `V8 heap:` 值。
- `Largest session files:` 條目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 當 Gateway 在容器或受限記憶體服務中運行時的 Linux cgroup 記憶體計數器。

常見特徵：

- `critical memory pressure bundle written` 在重啟前不久出現 → OpenClaw 擷取了 OOM 前的穩定性套件。使用 `openclaw gateway stability --bundle latest` 檢查它。
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` 出現在 Gateway 日誌中 → OpenClaw 偵測到嚴重記憶體壓力，但 OOM 前的穩定性快照已關閉。
- `Largest session files:` 指向一個非常大的編輯過的逐字稿路徑 → 減少保留的工作階段歷史，檢查工作階段增長，或在重新啟動前將舊的逐字稿移出活動存放區。
- `V8 heap:` 使用位元組接近堆積限制 → 降低提示/工作階段壓力，減少並行工作，或僅在確認工作負載符合預期後才提高 Node 堆積限制。
- `Memory pressure: critical/rss_growth` → 記憶體在一個採樣視窗內快速增長。檢查最新日誌中是否有大型匯入、失控的工具輸出、重試重複，或一批佇列中的代理工作。
- 日誌中出現嚴重記憶體壓力但沒有套件存在 → 這是預設值。設定 `diagnostics.memoryPressureSnapshot: true` 以在未來的嚴重記憶體壓力事件中擷取 OOM 前的穩定性套件。

穩定性套件不包含負載。它包括運作記憶體證據和編輯過的相對檔案路徑，不包括訊息文字、Webhook 主體、憑證、權杖、Cookie 或原始工作階段 ID。將診斷匯出附加至錯誤報告，而不是複製原始日誌。

相關：

- [Gateway 健康狀況](/zh-Hant/gateway/health)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [工作階段](/zh-Hant/cli/sessions)

## Gateway 拒絕了無效設定

當 Gateway 啟動失敗並顯示 `Invalid config` 或熱重新載入日誌指出它跳過了無效編輯時，請使用此方法。

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
- 活動設定旁邊的帶有時間戳記的 `openclaw.json.rejected.*` 檔案
- 如果 `doctor --fix` 修復了損壞的直接編輯，則會出現帶有時間戳記的 `openclaw.json.clobbered.*` 檔案
- OpenClaw 會為每個配置路徑保留最新的 32 個 `.clobbered.*` 檔案，並輪換較舊的檔案

<AccordionGroup>
  <Accordion title="發生了什麼">
    - 配置在啟動、熱重新載入或 OpenClaw 擁有的寫入期間未通過驗證。
    - Gateway 啟動失敗並關閉，而不是重寫 `openclaw.json`。
    - 熱重新載入會跳過無效的外部編輯，並保持目前的運行時配置處於啟用狀態。
    - OpenClaw 擁有的寫入會在提交前拒絕無效/破壞性的負載，並儲存 `.rejected.*`。
    - `openclaw doctor --fix` 負責修復。它可以移除非 JSON 前綴，或在保留被拒絕的負載作為 `.clobbered.*` 的同時，還原最後已知良好的副本。
    - 當對一個配置路徑進行多次修復時，OpenClaw 會輪換較舊的 `.clobbered.*` 檔案，以便最新的修復後負載仍然可用。

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
    - 存在 `.clobbered.*` → doctor 在修復啟用配置時保留了損壞的外部編輯。
    - 存在 `.rejected.*` → OpenClaw 擁有的配置寫入在提交前未能通過架構或覆蓋檢查。
    - `Config write rejected:` → 寫入嘗試捨棄必要的形狀、大幅縮減檔案大小，或持續無效的配置。
    - `config reload skipped (invalid config):` → 直接編輯未能通過驗證，並被運行中的 Gateway 忽略。
    - `Invalid config at ...` → 在 Gateway 服務啟動之前啟動失敗。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 擁有的寫入被拒絕，因為與最後已知良好的備份相比，它遺失了欄位或大小。
    - `Config last-known-good promotion skipped` → 候選項包含編輯過的秘密佔位符，例如 `***`。

  </Accordion>
  <Accordion title="修復選項">
    1. 執行 `openclaw doctor --fix` 讓 doctor 修復前綴/被覆寫的配置或恢復最後已知正確的配置。
    2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製預定的金鑰，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 配置，而不僅僅是您想要變更的部分物件。
  </Accordion>
</AccordionGroup>

相關連結：

- [配置](/zh-Hant/cli/config)
- [配置：熱重載](/zh-Hant/gateway/configuration#config-hot-reload)
- [配置：嚴格驗證](/zh-Hant/gateway/configuration#strict-validation)
- [醫生工具](/zh-Hant/gateway/doctor)

## Gateway 探測警告

當 `openclaw gateway probe` 能夠連線到某處，但仍列印警告區塊時使用此方法。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否關於 SSH 後備、多個 Gateway、缺少範圍或未解析的 auth refs。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接連線到已配置/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常表示故意設定的多 Gateway 環境或過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受範圍限制；請配對裝置身分識別或使用具有 `operator.read` 的憑證。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 連線成功，但完整的診斷 RPC 集合逾時或失敗。將此視為可連線但診斷功能受限的 Gateway；請比較 `--json` 輸出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 有回應，但此客戶端在進行一般操作員存取前仍需要配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中，失敗目標的驗證資料無法使用。

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

尋找：

- DM policy (`pairing`, `allowlist`, `open`, `disabled`).
- Group allowlist and mention requirements.
- Missing channel API permissions/scopes.

Common signatures:

- `mention required` → message ignored by group mention policy.
- `pairing` / pending approval traces → sender is not approved.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → channel auth/permissions issue.

相關：

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

Look for:

- Cron enabled and next wake present.
- Job run history status (`ok`, `skipped`, `error`).
- Heartbeat skip reasons (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行時錯誤。
    - `heartbeat skipped` 搭配 `reason=quiet-hours` → 在活動時間視窗之外。
    - `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但僅包含空行 / markdown 標題，因此 OpenClaw 跳過模型呼叫。
    - `heartbeat skipped` 搭配 `reason=no-tasks-due` → `HEARTBEAT.md` 包含一個 `tasks:` 區塊，但此 tick 沒有任何任務到期。
    - `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
    - `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，同時 `agents.defaults.heartbeat.directPolicy` (或 per-agent 覆寫) 設為 `block`。

  </Accordion>
</AccordionGroup>

相關：

- [Heartbeat](/zh-Hant/gateway/heartbeat)
- [Scheduled tasks](/zh-Hant/automation/cron-jobs)
- [Scheduled tasks: troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting)

## Node paired, tool fails

如果節點已配對但工具失敗，請區分前景、權限和批准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查：

- Node online with expected capabilities.
- OS permission grants for camera/mic/location/screen.
- Exec approvals and allowlist state.

Common signatures:

- `NODE_BACKGROUND_UNAVAILABLE` → node app must be in foreground.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → missing OS permission.
- `SYSTEM_RUN_DENIED: approval required` → exec approval pending.
- `SYSTEM_RUN_DENIED: allowlist miss` → command blocked by allowlist.

Related:

- [Exec approvals](/zh-Hant/tools/exec-approvals)
- [Node troubleshooting](/zh-Hant/nodes/troubleshooting)
- [Nodes](/zh-Hant/nodes/index)

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
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

<AccordionGroup>
  <Accordion title="外掛程式 / 可執行檔簽章">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 隨附的瀏覽器外掛程式被 `plugins.allow` 排除。
    - 瀏覽器工具遺失 / 無法使用，同時發生 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此外掛程式從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的配置，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 的連接埠錯誤或超出範圍。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少核心瀏覽器執行階段相依性；請重新安裝或更新 OpenClaw，然後重新啟動 gateway。ARIA 快照和基本頁面截圖仍然可以運作，但瀏覽、AI 快照、CSS 選擇器元素截圖和 PDF 匯出將無法使用。

  </Accordion>
  <Accordion title="Chrome MCP / 現有工作階段簽章">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法附加至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，批准第一次附加提示，然後重試。如果不需要登入狀態，建議使用受管理的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 設定的遠端 CDP 端點無法從 gateway 主機連線。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可到達的目標，或是 HTTP 端點有回應但 CDP WebSocket 仍無法開啟。

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取或快照 `--ref`，而非 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳掛勾需要快照參照，而非 CSS 選擇器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上，每次呼叫發送一個上傳。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話方塊掛勾不支援逾時覆寫。
    - `existing-session type does not support timeoutMs overrides.` → 針對 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:type`，請省略 `timeoutMs`；或者當需要自訂逾時時，使用受管理/CDP 瀏覽器設定檔。
    - `existing-session evaluate does not support timeoutMs overrides.` → 針對 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:evaluate`，請省略 `timeoutMs`；或者當需要自訂逾時時，使用受管理/CDP 瀏覽器設定檔。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理的瀏覽器或原始 CDP 設定檔。
    - 僅附加或遠端 CDP 設定檔上的過時檢視區 / 暗色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉作用中的控制會話並釋放 Playwright/CDP 模擬狀態，而不需重新啟動整個閘道。

  </Accordion>
</AccordionGroup>

相關連結：

- [瀏覽器 (OpenClaw 管理式)](/zh-Hant/tools/browser)
- [瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)

## 如果您升級後發生突然中斷

大多數升級後的中斷是因為設定漂移，或是現在開始執行更嚴格的預設值。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    檢查事項：

    - 如果是 `gateway.mode=remote`，CLI 呼叫可能以遠端為目標，而您的本機服務是正常的。
    - 明確的 `--url` 呼叫不會退回到儲存的憑證。

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

    檢查事項：

    - 非迴路綁定 (`lan`, `tailnet`, `custom`) 需要有效的閘道認證路徑：共用 token/密碼認證，或是正確設定的非迴路 `trusted-proxy` 部署。
    - 舊金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

    常見特徵：

    - `refusing to bind gateway ... without auth` → 非迴路綁定且缺少有效的閘道認證路徑。
    - 執行時正在執行時發生 `Connectivity probe: failed` → 閘道正常但使用目前的認證/URL 無法存取。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    檢查事項：

    - 待處理的儀表板/節點裝置核准。
    - 政策或身分識別變更後，待處理的 DM 配對核准。

    常見特徵：

    - `device identity required` → 裝置認證未滿足。
    - `pairing required` → 必須核准傳送端/裝置。

  </Accordion>
</AccordionGroup>

如果檢查後服務設定與執行時仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關連結：

- [認證](/zh-Hant/gateway/authentication)
- [背景執行與程式工具](/zh-Hant/gateway/background-process)
- [閘道擁有的配對](/zh-Hant/gateway/pairing)

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [常見問題](/zh-Hant/help/faq)
- [閘道手冊](/zh-Hant/gateway)
