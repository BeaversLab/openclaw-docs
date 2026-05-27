---
summary: "針對 gateway、通道、自動化、節點和瀏覽器的深層疑難排解手冊"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "疑難排解"
sidebarTitle: "疑難排解"
---

本頁是深層操作手冊。如果您想先進行快速分診流程，請從 [/help/troubleshooting](/zh-Hant/help/troubleshooting) 開始。

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
- `openclaw doctor` 回報無阻斷性的設定/服務問題。
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

- `Update restart` 於 `openclaw status` / `openclaw status --all` 中。待處理或
  失敗的交接包含要執行的下一個指令。
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  於 Channels 下。這表示通道設定仍然存在，但外掛程式
  註冊失敗，導致通道無法載入。
- 重新驗證後出現 provider 401。`openclaw doctor --fix` 會檢查過時的
  每個代理程式 OAuth 授權副本並移除舊副本，以便所有代理程式解析
  目前的共用設定檔。

## 分裂式安裝與較新的設定保護

當 gateway 服務在更新後意外停止，或日誌顯示其中一個 `openclaw` 二進位檔比最後寫入 `openclaw.json` 的版本還舊時，請使用此方法。

OpenClaw 會在設定寫入時加上 `meta.lastTouchedVersion` 標記。唯讀指令仍然可以檢查由較新 OpenClaw 寫入的設定，但程序和服務變更將拒絕從較舊的二進位檔繼續。被阻斷的動作包括 gateway 服務啟動、停止、重新啟動、解除安裝、強制服務重新安裝、服務模式 gateway 啟動，以及 `gateway --force` 連接埠清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修正 PATH">
    修正 `PATH` 使 `openclaw` 解析至較新的安裝版本，然後重新執行該動作。
  </Step>
  <Step title="重新安裝 Gateway 服務">
    從較新的安裝版本重新安裝您預期的 Gateway 服務：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除過時的包裝程式">
    移除仍然指向舊 `openclaw` 二進位檔案的過時系統套件或舊包裝程式項目。
  </Step>
</Steps>

<Warning>僅用於刻意降級或緊急恢復，請為單個指令設定 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作下請保持未設定狀態。</Warning>

## 回滾後的通訊協定不匹配

當您降級或回滾 OpenClaw 後，如果日誌持續印出 `protocol mismatch`，請使用此方法。這表示較舊的 Gateway 正在運行，但較新的本地客戶端程序仍嘗試使用較舊的 Gateway 無法支援的通訊協定範圍進行重新連線。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

尋找：

- Gateway 日誌中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:` 或 `openclaw doctor --deep` 中的 `Gateway clients`。這會列出連線到 Gateway 埠的活躍 TCP 用戶端，並在作業系統允許時顯示 PID 和指令列。
- 其指令列指向您已回滾之較新 OpenClaw 安裝或包裝程式的客戶端程序。

修復方法：

1. 停止或重新啟動 `gateway status --deep` 所顯示的過時 OpenClaw 客戶端程序。
2. 重新啟動嵌入 OpenClaw 的應用程式或包裝程式，例如本地儀表板、編輯器、應用程式伺服器輔助程式，或是長時間執行的 `openclaw logs --follow` shell。
3. 重新執行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，並確認過時的客戶端 PID 已消失。

請勿讓較舊的 Gateway 接受較新且不相容的通訊協定。通訊協定升級可保護線上合約；回滾復原屬於程序/版本清理問題。

## 因路徑逸出而略過 Skill 符號連結

當日誌包含以下內容時使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 將每個技能根目錄視為一個隔離邊界。當 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符號連結其真實目標解析至該根目錄之外時，除非該目標已明確信任，否則會被跳過。

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
請將 `allowSymlinkTargets` 的範圍限制在包含受信任 `SKILL.md` 目錄的真實技能根目錄。

相關：

- [Skills 設定](/zh-Hant/tools/skills-config#symlinked-sibling-repos)
- [設定範例](/zh-Hant/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 長情境需要額外使用額度

當日誌/錯誤包含以下內容時使用：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

尋找：

- 選取的 Anthropic 模型是具備 GA 能力的 1M Claude 4.x 模型，或者該模型具有舊版 `params.context1m: true`。
- 目前的 Anthropic 憑證不符合使用長情境的資格。
- 請求僅在需要 1M 上下文路徑的長時間會話/模型運行中失敗。

修復選項：

<Steps>
  <Step title="使用標準上下文視窗">切換到標準視窗模型，或者從較舊的模型配置中移除不具備 1M 上下文 GA 能力的舊版 `context1m`。</Step>
  <Step title="使用符合資格的憑證">使用符合長上下文請求資格的 Anthropic 憑證，或切換到 Anthropic API 金鑰。</Step>
  <Step title="設定備用模型">設定備用模型，以便在 Anthropic 長上下文請求被拒絕時繼續運行。</Step>
</Steps>

相關：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [為什麼我會看到來自 Anthropic 的 HTTP 429？](/zh-Hant/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 上游 403 封鎖回應

當上游 LLM 提供商返回通用的 `403`（例如
`Your request was blocked`）時使用此方法。

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
- 微小的直接 `curl` 探測成功，而正常的 SDK 形狀請求失敗

當證據指向 WAF/CDN 封鎖時，請先修正提供商端的過濾。優先為 OpenClaw 使用的 API 路徑設定範圍狹小的允許或跳過規則，並避免停用整個網站的保護。

<Warning>成功的最小 `curl` 並不保證真實的 SDK 樣式請求將通過相同的上游安全層。</Warning>

相關：

- [OpenAI 相容端點](/zh-Hant/gateway/configuration-reference#openai-compatible-endpoints)
- [供應商配置](/zh-Hant/providers)
- [日誌](/zh-Hant/logging)

## 本地 OpenAI 相容後端通過直接探測但代理執行失敗

在以下情況使用：

- `curl ... /v1/models` 運作正常
- 微小的直接 `/v1/chat/completions` 呼叫運作正常
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
- `model_not_found` 或 404 錯誤，即使直接 `/v1/chat/completions`
  與相同的裸模型 ID 運作正常
- 後端錯誤指出 `messages[].content` 預期為字串
- 使用 OpenAI 相容本地後端時出現間歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 後端當機僅出現在較大的提示 token 數量或完整代理執行階段提示時

<AccordionGroup>
  <Accordion title="常見特徵">
    - `model_not_found` 搭配本地 MLX/vLLM 風格伺服器 → 請驗證 `baseUrl` 包含 `/v1`，對於 `/v1/chat/completions` 後端 `api` 為 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是純供應商本機 ID。請使用供應商前綴選取一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；並將目錄條目維持為 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 後端拒絕結構化 Chat Completions 內容部分。解決方法：設定 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允許的訊息金鑰如 `["role","content"]` → 後端拒絕 Chat Completions 訊息上的 OpenAI 風格重播中繼資料。解決方法：設定 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 後端已完成 Chat Completions 請求，但該輪次未傳回使用者可見的助理文字。OpenClaw 會重試一次重播安全的空 OpenAI 相容輪次；持續失敗通常表示後端正在發出空/非文字內容或抑制最終答案文字。
    - 直接的微小請求成功，但 OpenClaw 代理執行因後端/模型當機而失敗（例如某些 `inferrs` 建置版本上的 Gemma）→ OpenClaw 傳輸可能已正確；問題出在後端無法處理較大的代理執行階段提示形狀。
    - 停用工具後失敗減少但未消失 → 工具結構描述是造成壓力的部分原因，但剩餘問題仍是上游模型/伺服器容量或後端錯誤。

  </Accordion>
  <Accordion title="修復選項">
    1. 為僅字串類型的 Chat Completions 後端設定 `compat.requiresStringContent: true`。
    2. 為嚴格的 Chat Completions 後端設定 `compat.strictMessageKeys: true`，這類後端僅接受每則訊息中的 `role` 和 `content`。
    3. 為無法可靠處理 OpenClaw 工具架構表面的模型/後端設定 `compat.supportsTools: false`。
    4. 盡可能降低提示詞壓力：更小的工作區引導、更短的交談紀錄、更輕量的本機模型，或使用長上下文支援更強勁的後端。
    5. 如果微小的直接請求持續通過，但 OpenClaw 代理回合仍在後端內部崩潰，請將其視為上游伺服器/模型的限制，並使用可接受的 payload 形狀在該處提交可重現的問題報告。
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

- `drop guild message (mention required` → 群組訊息被忽略，直到被提及。
- `pairing request` → 傳送者需要核准。
- `blocked` / `allowlist` → 傳送者/通道已被原則過濾。

相關：

- [通道疑難排解](/zh-Hant/channels/troubleshooting)
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

如果在更新後本機瀏覽器無法連線到 `127.0.0.1:18789`，請先
恢復本機 Gateway 服務並確認其正在提供儀表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl` 返回 OpenClaw HTML，表示 Gateway 正在運作，剩餘的問題
可能是瀏覽器快取、舊的深層連結，或過時的分頁狀態。請直接開啟
`http://127.0.0.1:18789` 並從儀表板導航。如果重啟後服務未持續運行，請執行 `openclaw gateway start` 並重新檢查
`openclaw gateway status`。

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → 非安全上下文或缺少設備驗證。
    - `origin not allowed` → 瀏覽器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您在沒有明確白名單的情況下從非回送瀏覽器來源進行連接）。
    - `device nonce required` / `device nonce mismatch` → 客戶端未完成基於挑戰的設備驗證流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客戶端為當前握手簽署了錯誤的負載（或時間戳過期）。
    - `AUTH_TOKEN_MISMATCH` 且帶有 `canRetryWithDeviceToken=true` → 客戶端可以使用快取的設備令牌進行一次受信任的重試。
    - 該快取令牌重試會重用與配對設備令牌一起存儲的快取範圍集。明確的 `deviceToken` / 明確的 `scopes` 調用者則會保留其請求的範圍集。
    - `AUTH_SCOPE_MISMATCH` → 設備令牌已被識別，但其批准的範圍未涵蓋此連接請求；請重新配對或批准請求的範圍合約，而不是輪換共享的網關令牌。
    - 在該重試路徑之外，連接驗證優先順序為：首先是明確的共享令牌/密碼，然後是明確的 `deviceToken`，接著是存儲的設備令牌，最後是引導令牌。
    - 在異步 Tailscale Serve Control UI 路徑上，對同一 `{scope, ip}` 的失敗嘗試會在限制器記錄失敗之前進行序列化。因此，來自同一客戶端的兩個併發錯誤重試可能會在第二次嘗試時顯示 `retry later`，而不是兩次普通的失配。
    - 來自瀏覽器來源回送客戶端的 `too many failed authentication attempts (retry later)` → 來自同一標準化 `Origin` 的重複失敗將被暫時鎖定；另一個 localhost 來源使用單獨的存儲桶。
    - 該重試後的重複 `unauthorized` → 共享令牌/設備令牌漂移；如有需要，請刷新令牌配置並重新批准/輪換設備令牌。
    - `gateway connect failed:` → 錯誤的主機/端口/url 目標。

  </Accordion>
</AccordionGroup>

### 驗證詳細代碼快速對照

使用失敗的 `connect` 回應中的 `error.details.code` 來選擇下一步動作：

| 詳細代碼                     | 含義                                                                                                                                                                         | 建議操作                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_TOKEN_MISSING`         | 客戶端未發送必需的共享令牌。                                                                                                                                                 | 在客戶端中貼上/設定令牌並重試。對於儀表板路徑：`openclaw config get gateway.auth.token` 然後貼上至控制 UI 設定中。                                                                                                                                     |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌與網關驗證令牌不符。                                                                                                                                                 | 如果 `canRetryWithDeviceToken=true`，允許一次受信任的重試。快取令牌重試會重用已儲存的已批准範圍；明確的 `deviceToken` / `scopes` 呼叫者會保留請求的範圍。如果仍然失敗，請執行 [令牌漂移恢復檢查清單](/zh-Hant/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每台裝置的快取令牌已過期或已撤銷。                                                                                                                                           | 使用 [裝置 CLI](/zh-Hant/cli/devices) 輪替/重新批准裝置令牌，然後重新連線。                                                                                                                                                                                 |
| `AUTH_SCOPE_MISMATCH`        | 裝置令牌有效，但其批准的角色/範圍未涵蓋此連線請求。                                                                                                                          | 重新配對裝置或批准請求的範圍合約；不要將此視為共享令牌漂移。                                                                                                                                                                                           |
| `PAIRING_REQUIRED`           | 裝置身分需要批准。檢查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，並在存在時使用 `requestId` / `remediationHint`。 | 批准待處理請求：`openclaw devices list` 然後 `openclaw devices approve <requestId>`。範圍/角色升級在您檢視請求的存取權限後使用相同的流程。                                                                                                             |

<Note>使用共享網關令牌/密碼進行驗證的直接回環後端 RPC 不應依賴 CLI 的配對裝置範圍基準。如果子代理程式或其他內部呼叫仍因 `scope-upgrade` 而失敗，請驗證呼叫者正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，並且未強制使用明確的 `deviceIdentity` 或裝置令牌。</Note>

裝置驗證 v2 遷移檢查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日誌顯示 nonce/簽名錯誤，請更新連線的客戶端並驗證它：

<Steps>
  <Step title="Wait for connect.challenge">客戶端等待網關發出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">客戶端簽署與挑戰綁定的載荷。</Step>
  <Step title="Send the device nonce">客戶端發送帶有相同挑戰 nonce 的 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 被意外拒絕：

- 配對裝置 token 工作階段只能管理**它們自己的**裝置，除非呼叫者也擁有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能請求呼叫端工作階段已經擁有的操作員範圍

相關：

- [組態](/zh-Hant/gateway/configuration) (網關認證模式)
- [控制 UI](/zh-Hant/web/control-ui)
- [裝置](/zh-Hant/cli/devices)
- [遠端存取](/zh-Hant/gateway/remote)
- [受信任的代理認證](/zh-Hant/gateway/trusted-proxy-auth)

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

- `Runtime: stopped` 並附帶退出提示。
- 服務組態不匹配 (`Config (cli)` vs `Config (service)`)。
- 連接埠/監聽器衝突。
- 當使用 `--deep` 時，有多餘的 launchd/systemd/schtasks 安裝。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未啟用本機閘道模式，或設定檔被覆寫並遺失了 `gateway.mode`。解決方法：在設定中設定 `gateway.mode="local"`，或重新執行 `openclaw onboard --mode local` / `openclaw setup` 以重新標記預期的本機模式設定。如果您是透過 Podman 執行 OpenClaw，預設設定路徑為 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在沒有有效閘道驗證路徑（權杖/密碼，或設定的受信任代理）的情況下進行非迴路綁定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 連接埠衝突。
    - `Other gateway-like services detected (best effort)` → 存在過時或並行的 launchd/systemd/schtasks 單元。大多數設定應該每台機器保留一個閘道；如果您確實需要多個，請隔離連接埠 + 設定/狀態/工作區。請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
    - `System-level OpenClaw gateway service detected` 來自 doctor → 存在 systemd 系統單元，但缺少使用者層級的服務。在允許 doctor 安裝使用者服務之前，請移除或停用重複項；如果系統單元是指定的監督器，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安裝的監督器仍然固定使用舊的 `--port`。執行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然後重新啟動閘道服務。

  </Accordion>
</AccordionGroup>

相關連結：

- [背景執行與行程工具](/zh-Hant/gateway/background-process)
- [組態設定](/zh-Hant/gateway/configuration)
- [診斷工具 Doctor](/zh-Hant/gateway/doctor)

## Gateway 在高記憶體使用量期間退出

當 Gateway 在負載下消失、監督器回報 OOM 樣式的重新啟動，或日誌中提到 `critical memory pressure bundle written` 時，請使用此方法。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

尋找：

- 最新穩定性套件中的 `Reason: diagnostic.memory.pressure.critical`。
- 帶有 `critical/rss_threshold`、`critical/heap_threshold` 或 `critical/rss_growth` 的 `Memory pressure:`。
- 接近堆積限制的 `V8 heap:` 值。
- `Largest session files:` 條目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 當 Gateway 在容器或受限記憶體服務中執行時的 Linux cgroup 記憶體計數器。

常見特徵：

- `critical memory pressure bundle written` 出現在重啟前不久 → OpenClaw 已捕獲 OOM 前的穩定性套件。請使用 `openclaw gateway stability --bundle latest` 檢查它。
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` 出現在 Gateway 日誌中 → OpenClaw 偵測到嚴重的記憶體壓力，但 OOM 前的穩定性快照已關閉。
- `Largest session files:` 指向一個非常大的編修過的逐字稿路徑 → 減少保留的會話歷史、檢查會話增長，或在重啟前將舊的逐字稿移出活動儲存區。
- `V8 heap:` 已使用位元組接近堆積限制 → 降低提示/會話壓力、減少並行工作，或僅在確認工作負載符合預期後才提高 Node 堆積限制。
- `Memory pressure: critical/rss_growth` → 記憶體在一個採樣視窗內快速增長。檢查最新日誌中是否有大型匯入、失控的工具輸出、重複重試，或一批排隊的代理工作。
- 日誌中出現嚴重記憶體壓力但無套件存在 → 這是預設行為。設定 `diagnostics.memoryPressureSnapshot: true` 以在未來的嚴重記憶體壓力事件中捕獲 OOM 前的穩定性套件。

穩定性套件不包含負載內容。它包括作業記憶體證據和編修過的相對檔案路徑，不包含訊息文字、Webhook 內文、憑證、權杖、Cookies 或原始會話 ID。請將診斷匯出附加至錯誤報告，而不是複製原始日誌。

相關：

- [Gateway 健康狀態](/zh-Hant/gateway/health)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [會話](/zh-Hant/cli/sessions)

## Gateway 拒絕無效設定

當 Gateway 啟動失敗並顯示 `Invalid config`，或熱重載日誌顯示它跳過了無效編輯時使用。

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
- 活動設定旁的一個帶有時間戳記的 `openclaw.json.rejected.*` 檔案
- 如果 `doctor --fix` 修復了損壞的直接編輯，則會有一個帶有時間戳記的 `openclaw.json.clobbered.*` 檔案
- OpenClaw 會為每個配置路徑保留最新的 32 個 `.clobbered.*` 檔案，並輪替較舊的檔案

<AccordionGroup>
  <Accordion title="發生什麼事">
    - 配置在啟動、熱重載或 OpenClaw 擁有的寫入期間未通過驗證。
    - Gateway 啟動失敗並關閉，而不是重寫 `openclaw.json`。
    - 熱重載會跳過無效的外部編輯，並保持目前的運行時配置處於作用中狀態。
    - OpenClaw 擁有的寫入會在提交前拒絕無效/破壞性的有效負載，並儲存 `.rejected.*`。
    - `openclaw doctor --fix` 負責修復。它可以移除非 JSON 前綴或還原最後已知良好的副本，同時將被拒絕的有效負載保留為 `.clobbered.*`。
    - 當對一個配置路徑進行多次修復時，OpenClaw 會輪替較舊的 `.clobbered.*` 檔案，以便最新的修復後有效負載仍然可用。

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
    - 存在 `.clobbered.*` → doctor 在修復作用中配置時保留了損壞的外部編輯。
    - 存在 `.rejected.*` → OpenClaw 擁有的配置寫入在提交前未通過架構或覆蓋檢查。
    - `Config write rejected:` → 寫入嘗試捨棄必要的形狀、大幅縮減檔案大小或持久化無效的配置。
    - `config reload skipped (invalid config):` → 直接編輯未通過驗證，並被運行中的 Gateway 忽略。
    - `Invalid config at ...` → 啟動在 Gateway 服務啟動前失敗。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 擁有的寫入被拒絕，因為與最後已知良好的備份相比，它遺失了欄位或大小。
    - `Config last-known-good promotion skipped` → 候選內容包含已編輯的秘密佔位符，例如 `***`。

  </Accordion>
  <Accordion title="修復選項">
    1. 執行 `openclaw doctor --fix` 讓 doctor 修復前綴/覆蓋的配置或恢復上次正常的配置。
    2. 從 `.clobbered.*` 或 `.rejected.*` 僅複製您想要的鍵，然後使用 `openclaw config set` 或 `config.patch` 套用它們。
    3. 在重新啟動前執行 `openclaw config validate`。
    4. 如果您手動編輯，請保留完整的 JSON5 配置，而不僅僅是您想要變更的部分物件。
  </Accordion>
</AccordionGroup>

相關連結：

- [配置](/zh-Hant/cli/config)
- [Configuration: hot reload](/zh-Hant/gateway/configuration#config-hot-reload)
- [Configuration: strict validation](/zh-Hant/gateway/configuration#strict-validation)
- [Doctor](/zh-Hant/gateway/doctor)

## Gateway 探測警告

當 `openclaw gateway probe` 成功連線到目標但仍顯示警告區塊時使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

尋找：

- JSON 輸出中的 `warnings[].code` 和 `primaryTargetId`。
- 無論警告是關於 SSH 退回、多個 Gateway、缺少範圍，還是未解析的 auth refs。

常見特徵：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 設定失敗，但指令仍嘗試直接已配置/回送目標。
- `multiple reachable gateways detected` → 超過一個目標回應。這通常意味著刻意設定的多 Gateway 環境或過時/重複的監聽器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 連線成功，但詳細 RPC 受到範圍限制；請配對裝置身份或使用具有 `operator.read` 的憑證。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 連線成功，但完整的診斷 RPC 集合逾時或失敗。將此視為可連線但診斷功能降級的 Gateway；比較 `connect.ok` 和 `connect.rpcOk` 在 `--json` 輸出中的結果。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 已回應，但此用戶端在正常操作員存取前仍需配對/核准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文字 → 在此指令路徑中，失敗目標的認證資料無法使用。

相關連結：

- [閘道](/zh-Hant/cli/gateway)
- [同一主機上的多個閘道](/zh-Hant/gateway#multiple-gateways-same-host)
- [遠端存取](/zh-Hant/gateway/remote)

## 頻道已連線，訊息未流動

如果頻道狀態為已連線但訊息流已停止，請專注於原則、權限和頻道特定的傳送規則。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

檢查：

- DM 原則 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群組允許清單和提及要求。
- 缺少頻道 API 權限/範圍。

常見特徵：

- `mention required` → 訊息因群組提及原則而被忽略。
- `pairing` / 待審核追蹤 → 發送者未獲批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 頻道驗證/權限問題。

相關：

- [頻道疑難排解](/zh-Hant/channels/troubleshooting)
- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)
- [WhatsApp](/zh-Hant/channels/whatsapp)

## Cron 和心跳傳送

如果 cron 或心跳未執行或未傳送，請先驗證排程器狀態，然後驗證傳送目標。

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
- 心跳跳過原因 (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常見特徵">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已停用。
    - `cron: timer tick failed` → 排程器 tick 失敗；請檢查檔案/日誌/執行時錯誤。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 超出活動時間視窗。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但僅包含空白行 / markdown 標題，因此 OpenClaw 會略過模型呼叫。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 區塊，但此 tick 中沒有任務到期。
    - `heartbeat: unknown accountId` → 心跳傳送目標的帳戶 ID 無效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目標解析為 DM 風格的目的地，但 `agents.defaults.heartbeat.directPolicy`（或個別代理程式覆寫）設定為 `block`。

  </Accordion>
</AccordionGroup>

相關：

- [心跳](/zh-Hant/gateway/heartbeat)
- [排程任務](/zh-Hant/automation/cron-jobs)
- [排程任務：疑難排解](/zh-Hant/automation/cron-jobs#troubleshooting)

## 節點已配對，工具失敗

如果節點已配對但工具失敗，請隔離前景、權限和批准狀態。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

檢查事項：

- 節點線上且具備預期的功能。
- 作業系統針對相機/麥克風/位置/螢幕的權限授與。
- 執行核許與允許清單狀態。

常見特徵：

- `NODE_BACKGROUND_UNAVAILABLE` → 節點應用程式必須位於前景。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少作業系統權限。
- `SYSTEM_RUN_DENIED: approval required` → 執行核許待處理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 指令被允許清單封鎖。

相關：

- [執行核許](/zh-Hant/tools/exec-approvals)
- [節點疑難排解](/zh-Hant/nodes/troubleshooting)
- [節點](/zh-Hant/nodes/index)

## 瀏覽器工具失敗

當瀏覽器工具動作失敗，但閘道本身健康時使用此節。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

檢查事項：

- 是否已設定 `plugins.allow` 且包含 `browser`。
- 有效的瀏覽器可執行檔路徑。
- CDP 設定檔的連線能力。
- `existing-session` / `user` 設定檔的本機 Chrome 可用性。

<AccordionGroup>
  <Accordion title="外掛程式 / 可執行檔簽章">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 隨附的瀏覽器外掛程式被 `plugins.allow` 排除。
    - 當 `browser.enabled=true` 時，瀏覽器工具遺失 / 無法使用 → `plugins.allow` 排除了 `browser`，因此外掛程式從未載入。
    - `Failed to start Chrome CDP on port` → 瀏覽器程序啟動失敗。
    - `browser.executablePath not found` → 設定的路徑無效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 設定的 CDP URL 使用了不支援的配置，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 設定的 CDP URL 具有錯誤或超出範圍的連接埠。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 目前的 gateway 安裝缺少核心瀏覽器執行階段相依性；請重新安裝或更新 OpenClaw，然後重新啟動 gateway。ARIA 快照和基本頁面螢幕擷圖仍然可以運作，但導航、AI 快照、CSS 選取器元素螢幕擷圖和 PDF 匯出將持續無法使用。

  </Accordion>
  <Accordion title="Chrome MCP / 現有工作階段簽章">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 現有工作階段尚無法附加至選定的瀏覽器資料目錄。請開啟瀏覽器檢查頁面，啟用遠端偵錯，保持瀏覽器開啟，核准第一次附加提示，然後重試。如果不需要登入狀態，建議優先使用受管理的 `openclaw` 設定檔。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加設定檔沒有開啟的本機 Chrome 分頁。
    - `Remote CDP for profile "<name>" is not reachable` → 設定的遠端 CDP 端點無法從 gateway 主機連線。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 僅附加設定檔沒有可連線的目標，或者 HTTP 端點有回應但 CDP WebSocket 仍無法開啟。

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

## 如果您升級後某些功能突然失效

大多數升級後的問題是由於配置漂移，或是現在開始強制執行更嚴格的預設值。

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

If the service config and runtime still disagree after checks, reinstall service metadata from the same profile/state directory:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Related:

- [Authentication](/zh-Hant/gateway/authentication)
- [Background exec and process tool](/zh-Hant/gateway/background-process)
- [Gateway-owned pairing](/zh-Hant/gateway/pairing)

## Related

- [Doctor](/zh-Hant/gateway/doctor)
- [FAQ](/zh-Hant/help/faq)
- [Gateway runbook](/zh-Hant/gateway)
