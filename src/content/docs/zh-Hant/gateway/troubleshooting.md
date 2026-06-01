---
summary: "針對 gateway、channels、automation、nodes 和 browser 的深度故障排除手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
sidebarTitle: "故障排除"
---

本頁是深度操作手冊。如果您想先進行快速分流流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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

- `openclaw gateway status` 顯示 `Runtime: running`、`Connectivity probe: ok` 以及一條 `Capability: ...` 行。
- `openclaw doctor` 回報沒有阻斷性的配置或服務問題。
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

- `Update restart` 在 `openclaw status` / `openclaw status --all` 中。待處理或
  失敗的移交包含下一步要執行的命令。
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  在 Channels 下方。這表示通道配置仍然存在，但外掛程式
  註冊在通道載入前失敗。
- 重新驗證後出現 provider 401s。`openclaw doctor --fix` 會檢查過時的
  per-agent OAuth auth shadow 並移除舊副本，讓所有代理程式都解析
  到當前的共享設定檔。

## 分裂式安裝與較新的設定保護

當 gateway 服務在更新後意外停止，或日誌顯示某個 `openclaw` 二進位檔比最後寫入 `openclaw.json` 的版本還舊時，請使用此方法。

OpenClaw 會以 `meta.lastTouchedVersion` 標記配置寫入。唯讀命令仍可檢查由較新 OpenClaw 寫入的配置，但程序和服務的變更會拒絕從較舊的二進位檔繼續執行。被阻斷的操作包括 gateway 服務的啟動、停止、重新啟動、解除安裝、強制重新安裝服務、服務模式 gateway 啟動，以及 `gateway --force` 連接埠清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修正 PATH">
    修正 `PATH` 使 `openclaw` 解析到較新的安裝，然後重新執行該操作。
  </Step>
  <Step title="重新安裝 Gateway 服務">
    從較新的安裝中重新安裝預期的 Gateway 服務：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除過時的包裝器">
    移除仍然指向舊 `openclaw` 二進位檔案的過時系統套件或舊包裝器項目。
  </Step>
</Steps>

<Warning>僅針對刻意降級或緊急復原，為單一指令設定 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作時請勿設定。</Warning>

## 回滾後的通訊協定不匹配

當您降級或還原 OpenClaw 後，日誌持續印出 `protocol mismatch` 時，請使用此方法。這表示正在執行較舊版本的 Gateway，但較新的本機用戶端程序仍嘗試使用較舊 Gateway 不支援的通訊協定範圍重新連線。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

尋找：

- Gateway 日誌中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:` 或 `openclaw doctor --deep` 中的 `Gateway clients`。這會列出連接到 Gateway 連接埠的作用中 TCP 用戶端，包括作業系統允許時的 PID 和指令行。
- 其指令列指向您已回滾之較新 OpenClaw 安裝或包裝程式的客戶端程序。

修復方法：

1. 停止或重新啟動 `gateway status --deep` 顯示的過時 OpenClaw 用戶端程序。
2. 重新啟動內嵌 OpenClaw 的應用程式或包裝器，例如本機儀表板、編輯器、應用程式伺服器輔助程式，或是長時間執行的 `openclaw logs --follow` shell。
3. 重新執行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，並確認過時的用戶端 PID 已消失。

請勿讓較舊的 Gateway 接受較新且不相容的通訊協定。通訊協定升級可保護線上合約；回滾復原屬於程序/版本清理問題。

## 因路徑逸出而略過 Skill 符號連結

當日誌包含以下內容時使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 將每個技能根目錄視為一個邊界。當 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符號連結其實際目標解析至該根目錄之外時，除非該目標已明確受信任，否則會被跳過。

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

請勿使用 `~`、`/` 或整個同步的專案資料夾等廣泛目標。
請將 `allowSymlinkTargets` 限制在包含受信任 `SKILL.md` 目錄的實際技能根目錄中。

相關：

- [技能設定](/zh-Hant/tools/skills-config#symlinked-sibling-repos)
- [設定範例](/zh-Hant/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 長情境需要額外使用額度

當日誌/錯誤包含 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 時使用此步驟。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 選取的 Anthropic 模型是支援 1M 上下文的 GA 版 Claude 4.x 模型，或是該模型具有舊版 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合使用長情境的資格。
- 請求僅在需要 1M 上下文路徑的長時間會話/模型運行中失敗。

修復選項：

<Steps>
  <Step title="使用標準上下文視窗">切換到標準視窗模型，或是從不支援 1M 上下文 GA 的舊模型設定中移除舊版 `context1m`。</Step>
  <Step title="使用合適的憑證">使用符合長上下文請求資格的 Anthropic 憑證，或是切換到 Anthropic API 金鑰。</Step>
  <Step title="設定備用模型">設定備用模型，以便當 Anthropic 長上下文請求被拒絕時執行能夠繼續。</Step>
</Steps>

相關：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [為什麼我會收到來自 Anthropic 的 HTTP 429？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 上游 403 封鎖回應

當上游 LLM 提供商傳回通用的 `403`（例如
`Your request was blocked`）時使用此步驟。

不要假設這總是 OpenClaw 配置問題。該回應可能來自上游安全層，例如位於 OpenAI 相容端點前的 CDN、WAF、機器人管理規則或反向代理。

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

尋找：

- 同一個提供商下的多個模型以相同方式失敗
- HTML 或通用安全文字，而不是正常的提供商 API 錯誤
- 同一請求時間的提供商端安全事件
- 一個微小的直接 `curl` 探測成功，但正常的 SDK 形式請求卻失敗

當證據指向 WAF/CDN 封鎖時，請先修正提供商端的過濾。優先為 OpenClaw 使用的 API 路徑設定範圍狹小的允許或跳過規則，並避免停用整個網站的保護。

<Warning>成功執行最小 `curl` 並不保證真實的 SDK 風格請求將能通過相同的安全性層級。</Warning>

相關：

- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)
- [提供商設定](/zh-Hant/providers)
- [日誌](/zh-Hant/logging)

## 本地 OpenAI 相容後端通過直接探測但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 運作正常
- 微小的直接 `/v1/chat/completions` 呼叫正常運作
- OpenClaw 模型執行僅在正常代理輪次失敗

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

檢查事項：

- 直接微小的呼叫成功，但 OpenClaw 執行僅在較大的提示下失敗
- 即使直接 `/v1/chat/completions` 使用相同的基礎模型 ID 能正常運作，卻出現 `model_not_found` 或 404 錯誤
- 後端關於 `messages[].content` 期望字串的錯誤
- 使用 OpenAI 相容的本機後端時出現間歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 後端當機僅出現在較大的提示 token 數量或完整代理執行階段提示時

<AccordionGroup>
  <Accordion title="Common signatures">
    - `model_not_found` 搭配本地 MLX/vLLM 樣式的伺服器 → 請驗證 `baseUrl` 包含 `/v1`，`api` 在 `/v1/chat/completions` 後端上為 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是裸露的提供者本機 ID。請使用提供者前綴選取一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；並將目錄條目保持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化的 Chat Completions 內容部分。修正方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允許的訊息金鑰（如 `["role","content"]`） → 後端拒絕 Chat Completions 訊息上的 OpenAI 樣式重播中繼資料。修正方法：設定 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成 Chat Completions 請求，但針對該輪次未傳回使用者可見的助理文字。OpenClaw 會重試一次符合重播安全的空白 OpenAI 相容輪次；持續的失敗通常表示後端正在輸出空白/非文字內容，或正在抑制最終答案的文字。
    - 直接的微小請求成功，但 OpenClaw Agent 執行因後端/模型當機而失敗（例如某些 `inferrs` 版本上的 Gemma） → OpenClaw 傳輸可能已經正確；後端是在更大的 Agent 執行階段提示形狀上失敗。
    - 停用工具後失敗減少但未消失 → 工具架構是壓力的一部分，但剩餘的問題仍是上游模型/伺服器容量或後端錯誤。

  </Accordion>
  <Accordion title="修復選項">
    1. 針對僅接受字串的 Chat Completions 後端，請設定 `compat.requiresStringContent: true`。
    2. 針對僅接受每則訊息中包含 `role` 和 `content` 的嚴格 Chat Completions 後端，請設定 `compat.strictMessageKeys: true`。
    3. 針對無法可靠處理 OpenClaw 工具架構表面的模型/後端，請設定 `compat.supportsTools: false`。
    4. 盡可能降低提示壓力：較小的工作區啟動規模、較短的對話記錄、更輕量的本機模型，或具備更強長上下文支援能力的後端。
    5. 如果微小的直接請求持續成功，但 OpenClaw 代理回合仍於後端內部崩潰，請將其視為上游伺服器/模型的限制，並使用可接受的 payload 形狀回報問題。
  </Accordion>
</AccordionGroup>

相關：

- [組態](/zh-Hant/gateway/configuration)
- [本機模型](/zh-Hant/gateway/local-models)
- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)

## 無回應

如果通道已啟動但沒有任何回應，請在重新連接任何項目之前檢查路由和原則。

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
- 通道/群組允許清單不匹配。

常見特徵：

- `drop guild message (mention required` → 群組訊息將被忽略，直到被提及。
- `pairing request` → 發送者需要核准。
- `blocked` / `allowlist` → 發送者/頻道已被原則過濾。

相關：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [群組](/zh-Hant/channels/groups)
- [配對](/zh-Hant/channels/pairing)

## 儀表板控制 UI 連線能力

當儀表板/控制 UI 無法連線時，請驗證 URL、驗證模式和安全語境假設。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

檢查項目：

- 正確的探測 URL 和儀表板 URL。
- 用戶端與閘道之間的驗證模式/權杖不匹配。
- 在需要裝置識別的情況下使用 HTTP。

如果更新後本機瀏覽器無法連線至 `127.0.0.1:18789`，請先
復原本機 Gateway 服務並確認其正在提供儀表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl` 傳回 OpenClaw HTML，表示 Gateway 正常運作，其餘問題
很可能是瀏覽器快取、舊的深層連結或過時的分頁狀態。請直接
開啟 `http://127.0.0.1:18789` 並從儀表板導航。如果重新啟動
後服務仍未持續運作，請執行 `openclaw gateway start` 並重新檢查
`openclaw gateway status`。

<AccordionGroup>
  <Accordion title="連線 / 認證簽章">
    - `device identity required` → 非安全內容或缺少裝置認證。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您是從非回環瀏覽器來源連線，且沒有明確的允許清單）。
    - `device nonce required` / `device nonce mismatch` → 用戶端未完成基於挑戰的裝置認證流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 用戶端為當前交握簽署了錯誤的載荷（或時間戳記已過期）。
    - `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 用戶端可以使用快取的裝置權杖進行一次受信任的重試。
    - 該快取權杖重試會重複使用與配對裝置權杖一起儲存的快取範圍集。明確 `deviceToken` / 明確 `scopes` 呼叫者則會保留其要求的範圍集。
    - `AUTH_SCOPE_MISMATCH` → 裝置權杖已被識別，但其核准的範圍未涵蓋此連線請求；請重新配對或核准要求的範圍合約，而不是輪換共享的閘道權杖。
    - 在該重試路徑之外，連線認證的優先順序依序為明確的共享權杖/密碼、明確的 `deviceToken`、儲存的裝置權杖，然後是啟動權杖。
    - 在非同步 Tailscale Serve 控制 UI 路徑上，相同 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗前進行序列化。因此，來自同一個用戶端的兩次併發錯誤重試可能在第二次嘗試時顯示 `retry later`，而不是兩次單純的不符。
    - 來自瀏覽器來源回環用戶端的 `too many failed authentication attempts (retry later)` → 來自同一個正規化 `Origin` 的重複失敗會被暫時鎖定；另一個 localhost 來源則使用不同的儲存區。
    - 在該重試後重複出現 `unauthorized` → 共享權杖/裝置權杖漂移；如有需要，請重新整理權杖設定並重新核准/輪換裝置權杖。
    - `gateway connect failed:` → 錯誤的主機/連接埠/URL 目標。

  </Accordion>
</AccordionGroup>

### 驗證詳細代碼快速對照

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步操作：

| 詳細代碼                     | 含義                                                                                                                                                                             | 建議操作                                                                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送必需的共享令牌。                                                                                                                                                     | 在客戶端中貼上/設定 Token 並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上到控制 UI 設定中。                                                                                                                                             |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與網關驗證令牌不符。                                                                                                                                                     | 如果是 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取 Token 重試會重複使用已儲存的已核准範圍；明確的 `deviceToken` / `scopes` 呼叫端會保留請求的範圍。如果仍然失敗，請執行 [token 漂移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每台裝置的快取令牌已過期或已撤銷。                                                                                                                                               | 使用 [devices CLI](/zh-Hant/cli/devices) 輪換/重新核准裝置 Token，然後重新連線。                                                                                                                                                                                       |
| `AUTH_SCOPE_MISMATCH`        | 裝置令牌有效，但其批准的角色/範圍未涵蓋此連線請求。                                                                                                                              | 重新配對裝置或批准請求的範圍合約；不要將此視為共享令牌漂移。                                                                                                                                                                                                      |
| `PAIRING_REQUIRED`           | 裝置身分識別需要核准。檢查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在出現時使用 `requestId` / `remediationHint`。 | 核准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您檢視請求的存取權後使用相同的流程。                                                                                                                          |

<Note>使用共用閘道 Token/密碼進行驗證的直接回送後端 RPC 不應依賴 CLI 的配對裝置範圍基準。如果子代理程式或其他內部呼叫仍然因 `scope-upgrade` 而失敗，請驗證呼叫端正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，並且未強制執行明確的 `deviceIdentity` 或裝置 Token。</Note>

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽名錯誤，請更新連線的客戶端並驗證它：

<Steps>
  <Step title="等待 connect.challenge">客戶端等待閘道發出的 `connect.challenge`。</Step>
  <Step title="簽署 Payload">客戶端簽署綁定挑戰的 Payload。</Step>
  <Step title="Send the device nonce">Client sends `connect.params.device.nonce` with the same challenge nonce.</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒絕：

- 配對裝置 token 工作階段只能管理**它們自己的**裝置，除非呼叫者也擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫者工作階段已經持有的 operator 範圍

相關：

- [Configuration](/zh-Hant/gateway/configuration) (gateway auth modes)
- [Control UI](/zh-Hant/web/control-ui)
- [Devices](/zh-Hant/cli/devices)
- [Remote access](/zh-Hant/gateway/remote)
- [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)

## 網關服務未執行

當服務已安裝但程序無法保持執行時使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

檢查：

- `Runtime: stopped` with exit hints.
- Service config mismatch (`Config (cli)` vs `Config (service)`).
- 連接埠/監聽器衝突。
- 當使用 `--deep` 時，額外的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` cleanup hints.

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本機 gateway 模式未啟用，或是組態檔被覆寫並遺失了 `gateway.mode`。解決方法：在您的組態中設定 `gateway.mode="local"`，或是重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新套入預期的本機模式組態。如果您是透過 Podman 執行 OpenClaw，預設組態路徑為 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在沒有有效的 gateway 驗證路徑（token/密碼，或已設定的 trusted-proxy）的情況下進行非 loopback 的綁定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
    - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應在每台機器上保持一個 gateway；如果您確實需要多個，請隔離連接埠 + 組態/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
    - `System-level OpenClaw gateway service detected` 來自 doctor → 存在 systemd 系統單元，但缺少使用者層級的服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項目；如果該系統單元是預期的監督器，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安裝的監督器仍然指向舊的 `--port`。請執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動 gateway 服務。

  </Accordion>
</AccordionGroup>

相關連結：

- [背景執行與程序工具](/zh-Hant/gateway/background-process)
- [組態](/zh-Hant/gateway/configuration)
- [Doctor](/zh-Hant/gateway/doctor)

## macOS gateway 靜默停止回應，然後在您接觸儀表板時恢復

當 macOS 主機上的頻道（Telegram、WhatsApp 等）安靜數分鐘到數小時，且在您開啟控制 UI、SSH 登入或以其他方式與主機互動的瞬間 gateway 似乎恢復時，請使用此方法。在 `openclaw status` 中通常沒有明顯的症狀，因為當您查看時 gateway 已經再次活躍了。

```bash
ls ~/.openclaw/logs/stability/ | tail -5
openclaw gateway stability --bundle latest
pmset -g log | grep -iE "sleep|wake|maintenance" | tail -50
launchctl print gui/$UID/ai.openclaw.gateway | grep -E "state|last exit|runs"
```

尋找：

- 在 `~/.openclaw/logs/stability/` 中有一或多個 `*-uncaught_exception.json` 套件，其 `error.code` 被設為暫時性的網路代碼，例如 `ENETDOWN`、`ENETUNREACH`、`EHOSTUNREACH` 或 `ECONNREFUSED`。
- 與當機時間戳記對應的 `pmset -g log` 行，例如 `Entering Sleep state due to 'Maintenance Sleep'` 或 `en0 driver is slow (msg: WillChangeState to 0)`。Power Nap / Maintenance Sleep 會將 Wi-Fi 驅動程式短暫置於狀態 0；落在該時間範圍內的任何傳出 `connect()` 即使在主機具有完整網路連線的情況下，也可能會以 `ENETDOWN` 失敗。
- `launchctl print` 輸出顯示 `state = not running` 具有多個最近的 `runs` 和一個退出代碼，特別是當當機與下次啟動之間的間隔是以小時而非秒為數量級時。macOS launchd 在當機激增後會套用一個未記載的重新生成防護閘門，可能會停止遵守 `KeepAlive=true`，直到由外部觸發（例如互動式登入、儀表板連線或 `launchctl kickstart`）將其重新啟用。

常見特徵：

- 穩定性套件的 `error.code` 為 `ENETDOWN` 或同屬代碼，且呼叫堆疊指向 Node `net` `lookupAndConnect` / `Socket.connect`。OpenClaw `2026.5.26` 及更新版本將這些分類為良性暫時性網路錯誤，因此它們不再傳播到頂層未捕獲的處理程式；如果您使用的是較舊的版本，請先升級。
- 長時間的靜止期會在您連線至控制 UI 或 SSH 進入主機時立即結束：用戶可見的活動是重新啟用 launchd 重新生成閘門的原因，而不是儀表板對閘道所做的任何事情。
- `runs` 計數在整天內增加，但在 `~/Library/Logs/openclaw/gateway.log` 中沒有對應的 `received SIG*; shutting down` 行：乾淨的關閉會記錄信號；暫時性當機則不會。

處理方式：

1. 如果您正在執行 `2026.5.26` 之前的版本，請**升級 gateway**。升級後，未來的 `ENETDOWN` 錯誤將記錄為警告，而不會終止程序。
2. 在旨在作為始終運行伺服器的 Mac mini / 桌面主機上**減少維護休眠活動**：

   ```bash
   sudo pmset -a sleep 0 disksleep 0 standby 0 powernap 0
   ```

   這顯著減少了，但不能完全消除底層驅動程序的不穩定。無論這些標誌如何設置，系統仍可能會為 TCP keepalive 和 mDNS 維護執行某些維護休眠。

3. **新增存活監控** 以便在被 launchd 掛起的未來崩潰激增情況能被快速捕獲：

   ```bash
   # Example launchd-aware liveness check, suitable for a 5-minute cron or LaunchAgent
   state=$(launchctl print gui/$UID/ai.openclaw.gateway 2>/dev/null | awk -F'= ' '/state =/ {print $2; exit}')
   if [ "$state" != "running" ]; then
     launchctl kickstart -k gui/$UID/ai.openclaw.gateway
   fi
   ```

   目的是從外部重新啟動重生門；在 macOS 上發生崩潰激增後，僅靠 `KeepAlive=true` 是不夠的。

相關：

- [macOS 平台說明](/zh-Hant/platforms/macos)
- [記錄](/zh-Hant/logging)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 在高記憶體使用期間退出

當 Gateway 在負載下消失、監督器報告 OOM 樣式的重新啟動，或日誌中提到 `critical memory pressure bundle written` 時，請使用此方法。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

尋找：

- 在最新的穩定性套件中 `Reason: diagnostic.memory.pressure.critical`。
- 使用 `critical/rss_threshold`、`critical/heap_threshold` 或 `critical/rss_growth` 來 `Memory pressure:`。
- 接近堆積限制的 `V8 heap:` 值。
- `Largest session files:` 條目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 當 gateway 在容器或受記憶體限制的服務內運行時，檢查 Linux cgroup 記憶體計數器。

常見特徵：

- `critical memory pressure bundle written` 在重新啟動前不久出現 → OpenClaw 捕獲了 OOM 前的穩定性套件。使用 `openclaw gateway stability --bundle latest` 檢查它。
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` 出現在 gateway 日誌中 → OpenClaw 檢測到關鍵記憶體壓力，但 OOM 前的穩定性快照已關閉。
- `Largest session files:` 指向一個非常大的編輯過的文字記錄路徑 → 減少保留的會話歷史記錄，檢查會話增長情況，或在重新啟動前將舊的文字記錄移出活動存儲。
- `V8 heap:` 已使用位元組接近堆積限制 → 降低提示/會話壓力、減少並發工作，或僅在確認負載符合預期後提高 Node 堆積限制。
- `Memory pressure: critical/rss_growth` → 記憶體在單一採樣視窗內快速增長。檢查最新日誌中是否有大型匯入、失控的工具輸出、重複重試或一批佇列中的代理程式工作。
- 日誌顯示關鍵記憶體壓力但不存在套件 → 這是預設值。設定 `diagnostics.memoryPressureSnapshot: true` 以在未來發生關鍵記憶體壓力事件時擷取 OOM 前的穩定性套件。

穩定性套件不包含承載。它包含運作記憶體證據和經編輯的相對檔案路徑，不包含訊息文字、Webhook 主體、憑證、權杖、Cookie 或原始會話 ID。請將診斷匯出附加至錯誤報告，而不是複製原始日誌。

相關：

- [Gateway 健康狀況](/zh-Hant/gateway/health)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [會話](/zh-Hant/cli/sessions)

## Gateway 拒絕無效設定

當 Gateway 啟動失敗並出現 `Invalid config` 或熱重新載入日誌指出
它跳過了無效編輯時，請使用此方法。

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
- 作用中設定旁邊的帶時間戳記 `openclaw.json.rejected.*` 檔案
- 如果 `doctor --fix` 修復了損壞的直接編輯，則會有帶時間戳記的 `openclaw.json.clobbered.*` 檔案
- OpenClaw 會為每個設定路徑保留最新的 32 個 `.clobbered.*` 檔案，並輪替較舊的檔案

<AccordionGroup>
  <Accordion title="發生什麼事">
    - 設定在啟動、熱重載或 OpenClaw 擁有的寫入期間未通過驗證。
    - Gateway 啟動失敗並關閉，而不是覆寫 `openclaw.json`。
    - 熱重載會跳過無效的外部編輯，並保持目前的執行時期設定處於啟用狀態。
    - OpenClaw 擁有的寫入會在提交前拒絕無效/破壞性的 payload，並儲存 `.rejected.*`。
    - `openclaw doctor --fix` 負責修復。它可以移除非 JSON 前綴，或還原最後已知的好副本，同時將被拒絕的 payload 保留為 `.clobbered.*`。
    - 當對一個設定路徑進行多次修復時，OpenClaw 會輪替較舊的 `.clobbered.*` 檔案，以便最新的修復 payload 仍然可用。

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
    - 存在 `.clobbered.*` → doctor 在修復啟用設定時保留了損壞的外部編輯。
    - 存在 `.rejected.*` → OpenClaw 擁有的設定寫入在提交前未通過 schema 或覆寫檢查。
    - `Config write rejected:` → 寫入嘗試捨棄必要的形狀、大幅縮減檔案大小，或保存無效設定。
    - `config reload skipped (invalid config):` → 直接編輯未通過驗證，並被執行中的 Gateway 忽略。
    - `Invalid config at ...` → 啟動在 Gateway 服務啟動前失敗。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 擁有的寫入因為與最後已知的好備份相比遺失了欄位或大小而被拒絕。
    - `Config last-known-good promotion skipped` → 候選項目包含編輯過的秘密佔位符，例如 `***`。

  </Accordion>
  <Accordion title="修復選項">
    1. 執行 `openclaw doctor --fix` 以讓 doctor 修復帶前綴/被覆寫的設定，或還原上次已知的良好設定。
    2. 僅從 `.clobbered.*` 或 `.rejected.*` 複製您想要的金鑰，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 在重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 設定，而不僅僅是您想要更改的部分物件。
  </Accordion>
</AccordionGroup>

相關：

- [設定](/zh-Hant/cli/config)
- [設定：熱重載](/zh-Hant/gateway/configuration#config-hot-reload)
- [設定：嚴格驗證](/zh-Hant/gateway/configuration#strict-validation)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 探測警告

當 `openclaw gateway probe` 能連線到目標，但仍印出警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是關於 SSH 退回 (fallback)、多重 Gateway、缺少範圍 (scopes)，還是未解析的 auth 參考。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接設定/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常表示故意設定的多 Gateway 環境，或過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細資訊 RPC 受限於範圍；請配對裝置身分或使用具備 `operator.read` 的憑證。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 連線成功，但完整的診斷 RPC 集合逾時或失敗。將此視為可連線但診斷功能受限的 Gateway；請比較 `--json` 輸出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 已回應，但此用戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在失敗目標的此指令路徑中，無法取得認證資料。

相關：

- [閘道](/zh-Hant/cli/gateway)
- [同一主機上的多個閘道](/zh-Hant/gateway#multiple-gateways-same-host)
- [遠端存取](/zh-Hant/gateway/remote)

## 頻道已連接，訊息未流動

如果頻道狀態為已連接但訊息流動已停止，請重點檢查政策、權限以及頻道特定的傳遞規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查：

- DM 政策 (`pairing`、`allowlist`、`open`、`disabled`)。
- 群組允許清單和提及要求。
- 缺少頻道 API 權限/範圍 (scopes)。

常見特徵：

- `mention required` → 訊息因群組提及政策而被忽略。
- `pairing` / 待審核追蹤 → 發送者未獲核准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 頻道認證/權限問題。

相關：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)
- [WhatsApp](/zh-Hant/channels/whatsapp)

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
- 工作執行歷史狀態 (`ok`、`skipped`、`error`)。
- 心跳跳過原因 (`quiet-hours`、`requests-in-flight`、`cron-in-progress`、`lanes-busy`、`alerts-disabled`、`empty-heartbeat-file`、`no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `cron: timer tick failed` → 排程器刻度失敗；請檢查檔案/日誌/執行時錯誤。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 超出活動小時視窗。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但僅包含空白行 / markdown 標題，因此 OpenClaw 會略過模型呼叫。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含一個 `tasks:` 區塊，但此刻度沒有任何任務到期。
    - `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，而 `agents.defaults.heartbeat.directPolicy` (或個別代理的覆寫) 設定為 `block`。

  </Accordion>
</AccordionGroup>

相關：

- [心跳](/zh-Hant/gateway/heartbeat)
- [排程任務](/zh-Hant/automation/cron-jobs)
- [排程任務：疑難排解](/zh-Hant/automation/cron-jobs#troubleshooting)

## 節點已配對，工具失敗

如果節點已配對但工具失敗，請隔離前景、權限和核准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查：

- 節點已上線且具備預期的功能。
- 相機/麥克風/位置/螢幕的作業系統權限授予。
- 執行核准與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 等待執行核准。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [執行核准](/zh-Hant/tools/exec-approvals)
- [節點疑難排解](/zh-Hant/nodes/troubleshooting)
- [節點](/zh-Hant/nodes/index)

## 瀏覽器工具失敗

當瀏覽器工具動作失敗，但閘道本身狀況良好時使用。

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
- 本機 Chrome 對 `existing-session` / `user` 設定檔的可用性。

<AccordionGroup>
  <Accordion title="Plugin / executable signatures">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 隨附的瀏覽器外掛程式已被 `plugins.allow` 排除。
    - 當 `browser.enabled=true` 時瀏覽器工具遺失 / 無法使用 → `plugins.allow` 排除了 `browser`，因此外掛程式從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的配置，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少核心瀏覽器執行階段相依性；請重新安裝或更新 OpenClaw，然後重新啟動 gateway。ARIA 快照和基本頁面螢幕擷取畫仍然可以運作，但導覽、AI 快照、CSS 選擇器元素螢幕擷取畫和 PDF 匯出將保持無法使用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-session signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 尚無法附加至選定的瀏覽器資料目錄。開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，批准第一次附加提示，然後重試。如果不需要登入狀態，建議優先使用受控的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 設定的遠端 CDP 端點無法從 gateway 主機連線。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可連線的目標，或者 HTTP 端點有回應但 CDP WebSocket 仍然無法開啟。

  </Accordion>
  <Accordion title="元素 / 截圖 / 上傳簽名">
    - `fullPage is not supported for element screenshots` → 截圖請求混合了 `--full-page` 與 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截圖呼叫必須使用頁面擷取或快照 `--ref`，而非 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上傳 hook 需要快照 refs，而非 CSS 選擇器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 設定檔上，每次呼叫僅發送一次上傳。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 設定檔上的對話框 hook 不支援逾時覆寫。
    - `existing-session type does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:type`，請省略 `timeoutMs`，或者在需要自訂逾時時使用受管理/CDP 瀏覽器設定檔。
    - `existing-session evaluate does not support timeoutMs overrides.` → 對於 `profile="user"` / Chrome MCP 現有會話設定檔上的 `act:evaluate`，請省略 `timeoutMs`，或者在需要自訂逾時時使用受管理/CDP 瀏覽器設定檔。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理瀏覽器或原始 CDP 設定檔。
    - 僅連接或遠端 CDP 設定檔上過時的視口 / 深色模式 / 地區設定 / 離線覆寫 → 執行 `openclaw browser stop --browser-profile <name>` 以關閉作用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，而不需重新啟動整個閘道。

  </Accordion>
</AccordionGroup>

相關連結：

- [瀏覽器 (OpenClaw-managed)](/zh-Hant/tools/browser)
- [瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)

## 如果您升級後突然出現問題

大多數升級後的問題是由於設定檔偏移，或是現在開始強制執行更嚴格的預設值。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    檢查事項：

    - 如果是 `gateway.mode=remote`，CLI 呼叫可能正在針對遠端，而您的本地服務正常。
    - 明確的 `--url` 呼叫不會回退到已儲存的憑證。

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

    檢查事項：

    - 非迴路綁定 (`lan`、`tailnet`、`custom`) 需要有效的 gateway auth 路徑：共享 token/密碼認證，或正確配置的非迴路 `trusted-proxy` 部署。
    - 舊的金鑰如 `gateway.token` 不會取代 `gateway.auth.token`。

    常見特徵：

    - `refusing to bind gateway ... without auth` → 沒有有效 gateway auth 路徑的非迴路綁定。
    - Runtime 運行時 `Connectivity probe: failed` → gateway 運作正常但無法以目前的 auth/url 存取。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
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

    - `device identity required` → 未滿足裝置認證。
    - `pairing required` → 必須核准傳送者/裝置。

  </Accordion>
</AccordionGroup>

如果在檢查後服務配置和 runtime 仍然不一致，請從相同的設定檔/狀態目錄重新安裝服務中繼資料：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相關：

- [認證](/zh-Hant/gateway/authentication)
- [背景執行和程序工具](/zh-Hant/gateway/background-process)
- [Gateway 擁有的配對](/zh-Hant/gateway/pairing)

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [常見問題](/zh-Hant/help/faq)
- [Gateway runbook](/zh-Hant/gateway)
