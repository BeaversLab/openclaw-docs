---
summary: "模型驗證：OAuth、API 金鑰、Claude CLI 重複使用及 Anthropic 設定權杖"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "驗證"
---

<Note>本頁是**模型供應商**驗證的參考資料（API 金鑰、OAuth、Claude CLI 重複使用及 Anthropic 設定權杖）。如需**閘道連線**驗證（權杖、密碼、trusted-proxy），請參閱[組態](/zh-Hant/gateway/configuration)和[受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支援模型供應商的 OAuth 和 API 金鑰。對於永久運作的閘道主機，API 金鑰通常是最可預期的選項。當訂閱/OAuth 流程符合您的供應商帳戶模型時，也一併支援。

請參閱 [/concepts/oauth](/zh-Hant/concepts/oauth) 以瞭解完整的 OAuth 流程和儲存配置。
若為 SecretRef 式驗證（`env`/`file`/`exec` 供應商），請參閱[機密管理](/zh-Hant/gateway/secrets)。
若為 `models status --probe` 所使用的憑證資格/原因代碼規則，請參閱[驗證憑證語意](/zh-Hant/auth-credential-semantics)。

## 推薦設定（API 金鑰，任何供應商）

如果您正在執行長期運作的閘道，請先為您選擇的供應商建立 API 金鑰。
特別針對 Anthropic，API 金鑰驗證仍是最可預期的伺服器設定，但 OpenClaw 也支援重複使用本機 Claude CLI 登入。

1. 在您的供應商主控台中建立 API 金鑰。
2. 將其放置在**閘道主機**（執行 `openclaw gateway` 的機器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果閘道在 systemd/launchd 下執行，請優先將金鑰放在
   `~/.openclaw/.env` 中，以便常駐程式讀取：

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

如果您不想自行管理環境變數，入門設定可以儲存
API 金鑰供常駐程式使用：`openclaw onboard`。

請參閱 [說明](/zh-Hant/help) 以瞭解環境變數繼承的詳細資訊（`env.shellEnv`,
`~/.openclaw/.env`、systemd/launchd）。

## Anthropic：Claude CLI 和權杖相容性

Anthropic 設定令牌驗證在 OpenClaw 中仍然作為支援的令牌路徑可用。Anthropic 人員隨後告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為此整合的許可方式。當主機上可用 Claude CLI 重複使用時，這現在是首選路徑。

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
2. 指示 OpenClaw 將 Anthropic 模型選擇切換到本機 `claude-cli`
   後端並儲存相符的 OpenClaw 驗證設定檔。

如果 `claude` 不在 `PATH` 上，請先安裝 Claude Code 或將
`agents.defaults.cliBackends.claude-cli.command` 設定為真實的二進位檔路徑。

手動輸入令牌（任何供應商；寫入 `auth-profiles.json` + 更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援驗證設定檔引用：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式設定檔不支援 SecretRef 憑證；如果 `auth.profiles.<id>.mode` 設定為 `"oauth"`，則該設定檔的 SecretRef 支援 `keyRef`/`tokenRef` 輸入將被拒絕。

自動化友善的檢查（過期/遺失時退出 `1`，即將過期時 `2`）：

```bash
openclaw models status --check
```

即時驗證探測：

```bash
openclaw models status --probe
```

備註：

- 探測列可以來自驗證設定檔、環境憑證或 `models.json`。
- 如果明確的 `auth.order.<provider>` 省略了儲存的設定檔，探測會針對該設定檔回報
  `excluded_by_auth_order` 而不是嘗試使用它。
- 如果驗證存在但 OpenClaw 無法解析該供應商的可探測模型候選，
  探測會回報 `status: no_model`。
- 速率限制冷卻時間可以針對特定模型。對於同一供應商上的姊妹模型，即使某個設定檔正在針對一個模型冷卻，仍然可以使用。

可選的運維腳本（systemd/Termux）在此處有記錄：
[Auth monitoring scripts](/zh-Hant/help/scripts#auth-monitoring-scripts)

## Anthropic 說明

再次支援 Anthropic `claude-cli` 後端。

- Anthropic 工作人員告訴我們，此 OpenClaw 整合路徑再次獲得允許。
- 因此，除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重用和 `claude -p` 使用視為對 Anthropic 支援的執行是經過授權的。
- 對於長期運行的 Gateway 主機和明確的伺服器端帳單控制，Anthropic API 金鑰仍然是最可預測的選擇。

## 檢查模型驗證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為（Gateway）

當 API 呼叫遇到供應商速率限制時，部分供應商支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單一覆寫）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 供應商還包含 `GOOGLE_API_KEY` 作為額外的後備方案。
- 相同的金鑰清單會在使用前進行重複資料刪除。
- OpenClaw 僅針對速率限制錯誤使用下一個金鑰重試（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`，或
  `workers_ai ... quota limit exceeded`）。
- 非速率限制錯誤不會使用替代金鑰重試。
- 如果所有金鑰都失敗，則會傳回最後一次嘗試的最終錯誤。

## 控制使用的憑證

### 每個工作階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 為目前的工作階段指定特定的供應商憑證（例如設定檔 id：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 取得精簡選擇器；使用 `/model status` 檢視完整資訊（候選者 + 下一個驗證設定檔，加上已設定的供應商端點詳細資料）。

### 每個代理程式（CLI 覆寫）

為代理（Agent）設定明確的認證設定檔順序覆寫（儲存在該代理的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 來指定特定的代理；省略該參數則使用設定的預設代理。
當您偵錯順序問題時，`openclaw models status --probe` 會將省略的
儲存設定檔顯示為 `excluded_by_auth_order`，而不是靜默地跳過它們。
當您偵錯冷卻（cooldown）問題時，請記住速率限制冷卻可能僅綁定到
一個模型 ID，而不是整個提供者設定檔。

## 疑難排解

### "找不到憑證"

如果缺少 Anthropic 設定檔，請在 **gateway host** 上設定 Anthropic API 金鑰
或設定 Anthropic setup-token 路徑，然後重新檢查：

```bash
openclaw models status
```

### Token 即將過期/已過期

執行 `openclaw models status` 以確認哪個設定檔即將過期。如果
Anthropic token 設定檔遺失或已過期，請透過 setup-token 重新整理該設定
或遷移至 Anthropic API 金鑰。

## 相關連結

- [機密管理](/zh-Hant/gateway/secrets)
- [遠端存取](/zh-Hant/gateway/remote)
- [認證儲存](/zh-Hant/concepts/oauth)
