---
summary: "模型驗證：OAuth、API 金鑰、Claude CLI 重複使用，以及 Anthropic 設定權杖"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "驗證"
---

<Note>此頁面是 **模型提供者** 驗證參考手冊（API 金鑰、OAuth、Claude CLI 重複使用，以及 Anthropic 設定權杖）。關於 **閘道連線** 驗證（token、密碼、trusted-proxy），請參閱 [Configuration](/zh-Hant/gateway/configuration) 和 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支援模型供應商的 OAuth 和 API 金鑰。對於永久運作的閘道主機，API 金鑰通常是最可預期的選項。當訂閱/OAuth 流程符合您的供應商帳戶模型時，也一併支援。

請參閱 [/concepts/oauth](/zh-Hant/concepts/oauth) 以了解完整的 OAuth 流程與儲存配置。
關於基於 SecretRef 的驗證（`env`/`file`/`exec` 提供者），請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。
關於 `models status --probe` 所使用的憑證資格/原因代碼規則，請參閱
[Auth Credential Semantics](/zh-Hant/auth-credential-semantics)。

## 推薦設定（API 金鑰，任何供應商）

如果您正在運行長期閘道，請從您選擇的提供者的 API 金鑰開始。
特別是對於 Anthropic，API 金鑰驗證仍然是最可預測的伺服器設定，但 OpenClaw 也支援重複使用本機 Claude CLI 登入。

1. 在您的供應商主控台中建立 API 金鑰。
2. 將其放置在 **閘道主機** 上（即執行 `openclaw gateway` 的機器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下執行，建議將金鑰放在
   `~/.openclaw/.env` 中，以便背景程式讀取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然後重新啟動常駐程式（或重新啟動您的閘道程序）並重新檢查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自行管理環境變數，onboarding 可以儲存
API 金鑰供背景程式使用：`openclaw onboard`。

關於環境變數繼承的詳細資訊（`env.shellEnv`、
`~/.openclaw/.env`、systemd/launchd），請參閱 [Help](/zh-Hant/help)。

## Anthropic：Claude CLI 和權杖相容性

Anthropic 設定權杖驗證在 OpenClaw 中仍作為支援的權杖路徑提供。Anthropic 人員隨後告知我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為此整合的核准方式。當主機上有 Claude CLI 重複使用可用時，這現在是首選路徑。

對於長期運行的閘道主機，Anthropic API 金鑰仍然是最可預測的設定。如果您想在同一台主機上重複使用現有的 Claude 登入，請在 onboarding/configure 中使用 Anthropic Claude CLI 路徑。

針對 Claude CLI 重複使用的建議主機設定：

```bash
# Run on the gateway host
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

這是一個兩步驟的設定：

1. 在閘道主機上將 Claude Code 本身登入 Anthropic。
2. 告知 OpenClaw 將 Anthropic 模型選擇切換至本機 `claude-cli`
   後端，並儲存對應的 OpenClaw 驗證設定檔。

如果 `claude` 不在 `PATH` 上，請先安裝 Claude Code 或將
`agents.defaults.cliBackends.claude-cli.command` 設定為實際的二進位檔路徑。

手動輸入權杖（任何供應商；寫入 `auth-profiles.json` 並更新設定）：

```bash
openclaw models auth paste-token --provider openrouter
```

`auth-profiles.json` 僅儲存憑證。標準格式為：

```json
{
  "version": 1,
  "profiles": {
    "openrouter:default": {
      "type": "api_key",
      "provider": "openrouter",
      "key": "OPENROUTER_API_KEY"
    }
  }
}
```

OpenClaw 在執行時預期標準的 `version` + `profiles` 格式。如果較舊的安裝仍有諸如 `{ "openrouter": { "apiKey": "..." } }` 的扁平檔案，請執行 `openclaw doctor --fix` 將其重寫為 `openrouter:default` API 金鑰設定檔；doctor 會在原始檔案旁保留 `.legacy-flat.*.bak` 副本。端點詳細資訊（如 `baseUrl`、`api`、模型 ID、標頭和逾時）應屬於 `openclaw.json` 或 `models.json` 中的 `models.providers.<id>` 之下，而非 `auth-profiles.json`。

諸如 Bedrock `auth: "aws-sdk"` 等外部驗證路由也不是憑證。如果您想要一個具名的 Bedrock 路由，請將 `auth.profiles.<id>.mode: "aws-sdk"` 放入 `openclaw.json` 中；不要將 `type: "aws-sdk"` 寫入 `auth-profiles.json`。`openclaw doctor --fix` 會將舊版 AWS SDK 標記從憑證儲存區移至設定中繼資料。

靜態認證也支援認證設定檔參照：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式設定檔不支援 SecretRef 憑證；如果 `auth.profiles.<id>.mode` 設為 `"oauth"`，則該設定檔的 SecretRef 支援 `keyRef`/`tokenRef` 輸入將會被拒絕。

自動化友善檢查（過期/遺失時退出 `1`，將過期時退出 `2`）：

```bash
openclaw models status --check
```

即時認證探測：

```bash
openclaw models status --probe
```

注意：

- 探測列可以來自驗證設定檔、環境變數憑證，或 `models.json`。
- 如果明確的 `auth.order.<provider>` 省略了已儲存的設定檔，探測會針對該設定檔回報
  `excluded_by_auth_order` 而非嘗試連線。
- 如果驗證存在，但 OpenClaw 無法為該供應商解析可探測的模型候選，
  探測會回報 `status: no_model`。
- 速率限制冷卻時間可以範圍限定於模型。針對某個模型正在冷卻的設定檔，對於同一提供者上的兄弟模型仍然可用。

此處記錄了選用的操作腳本（systemd/Termux）：
[Auth monitoring scripts](/zh-Hant/help/scripts#auth-monitoring-scripts)

## Anthropic 說明

Anthropic `claude-cli` 後端再次受到支援。

- Anthropic 人員告訴我們，此 OpenClaw 整合路徑再次被允許。
- 因此，除非 Anthropic 發布新政策，OpenClaw 將視重複使用 Claude CLI 與 `claude -p` 為
  Anthropic 支援執行的許可行為。
- 對於長期運行的閘道主機和明確的伺服器端計費控制，Anthropic API 金鑰仍然是最可預測的選擇。

## 檢查模型認證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為 (閘道)

當 API 呼叫遇到提供者速率限制時，部分提供者支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單次覆寫）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供者也包含 `GOOGLE_API_KEY` 作為額外的後備方案。
- 相同的金鑰清單在使用前會進行去重。
- OpenClow 僅在速率限制錯誤（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached` 或
  `workers_ai ... quota limit exceeded`）時才使用下一個金鑰重試。
- 非速率限制錯誤不會使用替代金鑰重試。
- 如果所有金鑰都失敗，將傳回最後一次嘗試的最終錯誤。

## 在閘道執行時移除提供者驗證

當透過 Gateway 控制平面移除提供者驗證時，OpenClaw 會刪除該提供者的已儲存驗證設定檔，並中止
所選模型提供者符合已移除提供者的作用中聊天或 Agent 執行。被中止的執行會發出一般的聊天取消和生命週期事件，並附帶
`stopReason: "auth-revoked"`，因此連線的客戶端可以顯示該執行因憑證被移除而停止。

移除已儲存的驗證並不會在提供者端撤銷金鑰。當您需要在提供者端使其失效時，請在提供者儀表板中輪替或撤銷金鑰。

## 控制使用哪個憑證

### 登入期間 (CLI)

對於在登入期間支援命名驗證設定檔的提供者，請使用 `openclaw models auth login --provider <id> --profile-id <profileId>`。

```bash
openclaw models auth login --provider openai --profile-id openai:ritsuko
openclaw models auth login --provider openai --profile-id openai:lain
```

這是在同一個 Agent 中區分同一提供者的多個 OAuth 登入的最簡單方法。

當已儲存的提供者設定檔卡住、過期或綁定至錯誤的帳戶，且一般登入指令持續重複使用該設定檔時，請使用 `--force`。
`--force` 會刪除所選 Agent 目錄中該提供者的已儲存驗證設定檔，然後再次執行相同的提供者驗證流程。
它不會在提供者端撤銷憑證；當您需要提供者端的失效時，請在提供者儀表板中輪換或撤銷憑證。

```bash
openclaw models auth login --provider anthropic --force
```

### 每個工作階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 為目前的工作階段鎖定特定的提供者憑證（範例設定檔 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model` (或 `/model list`) 取得精簡選擇器；使用 `/model status` 檢視完整內容 (候選項 + 下個設定檔，加上設定時的供應商端點詳細資訊)。

### 個別代理 (CLI 覆寫)

為代理設定明確的設定檔順序覆寫 (儲存在該代理的 `auth-state.json` 中)：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定特定代理；省略則使用設定的預設代理。
當您除錯順序問題時，`openclaw models status --probe` 會將省略的
儲存設定檔顯示為 `excluded_by_auth_order`，而不是無聲跳過它們。
當您除錯冷卻問題時，請記得速率限制冷卻可能綁定到
一個模型 ID，而非整個供應商設定檔。

如果您變更了正在執行聊天的設定順序或設定檔釘選，
請在該聊天中傳送 `/new` 或 `/reset` 以開啟新的工作階段。現有
工作階段會保留目前的模型/設定檔選擇直到重設。

## 疑難排解

### 「找不到憑證」

如果缺少 Anthropic 設定檔，請在 **gateway host** 上設定 Anthropic API 金鑰
或設置 Anthropic setup-token 路徑，然後重新檢查：

```bash
openclaw models status
```

### 權杖即將過期/已過期

執行 `openclaw models status` 以確認哪個設定檔即將過期。如果
Anthropic 權杖設定檔遺失或已過期，請透過 setup-token 重新整理該設定
或遷移至 Anthropic API 金鑰。

## 相關資訊

- [機密管理](/zh-Hant/gateway/secrets)
- [遠端存取](/zh-Hant/gateway/remote)
- [認證儲存](/zh-Hant/concepts/oauth)
