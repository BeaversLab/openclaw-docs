---
summary: "模型驗證：OAuth、API 金鑰和舊版 Anthropic setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "驗證"
---

# 驗證（模型供應商）

<Note>本頁涵蓋 **模型提供者** 驗證（API 金鑰、OAuth 和舊版 Anthropic setup-token）。關於 **閘道連線** 驗證（token、密碼、trusted-proxy），請參閱 [Configuration](/en/gateway/configuration) 和 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支援模型供應商的 OAuth 和 API 金鑰。對於始終運行的閘道
主機，API 金鑰通常是最可預測的選項。當訂閱/OAuth
流程符合您的供應商帳戶模型時，也支援這些流程。

關於完整的 OAuth 流程和儲存佈局，請參閱 [/concepts/oauth](/en/concepts/oauth)。
關於基於 SecretRef 的驗證（`env`/`file`/`exec` 提供者），請參閱 [Secrets Management](/en/gateway/secrets)。
關於 `models status --probe` 使用的憑證資格/原因代碼規則，請參閱
[Auth Credential Semantics](/en/auth-credential-semantics)。

## 建議設置（API 金鑰，任何供應商）

如果您正在執行長期運作的閘道，請先為您選擇的提供者使用 API 金鑰。
特別是對於 Anthropic，API 金鑰驗證是較安全的途徑。OpenClaw 內部的 Anthropic 訂閱式驗證屬於舊版 setup-token 途徑，應視為 **額外使用量** 途徑，而非方案限制途徑。

1. 在您的供應商主控台建立 API 金鑰。
2. 將其放在 **閘道主機**（執行 `openclaw gateway` 的機器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下運行，建議將金鑰放在
   `~/.openclaw/.env` 中，以便守護程式讀取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然後重新啟動守護行程（或重新啟動您的 Gateway 處理程序）並重新檢查：

```bash
openclaw models status
openclaw doctor
```

如果您不希望自己管理環境變數，入門程序可以儲存
API 金鑰供守護程式使用：`openclaw onboard`。

關於環境變數繼承（`env.shellEnv`、
`~/.openclaw/.env`、systemd/launchd）的詳細資訊，請參閱 [Help](/en/help)。

## Anthropic：舊版 token 相容性

Anthropic setup-token 驗證在 OpenClaw 中仍可作為舊版/手動途徑使用。Anthropic 的公開 Claude Code 文件仍然涵蓋在 Claude 方案下的直接 Claude Code 終端機使用，但 Anthropic 另行告知 OpenClaw 用戶，**OpenClaw** Claude 登入途徑算作第三方套件使用，並需要與訂閱分開計費的 **額外使用量**。

為了最清晰的設置路徑，請使用 Anthropic API 金鑰。如果您必須在 OpenClaw 中保留訂閱式的 Anthropic 路徑，請使用舊版 setup-token 路徑，並預期 Anthropic 會將其視為 **額外使用量**。

手動輸入令牌（任何提供商；寫入 `auth-profiles.json` 並更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援 Auth profile 參考：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式的設定檔不支援 SecretRef 憑證；如果 `auth.profiles.<id>.mode` 設置為 `"oauth"`，則該設定檔的 SecretRef 支援的 `keyRef`/`tokenRef` 輸入將被拒絕。

自動化友好的檢查（當過期/遺失時退出 `1`，當將過期時退出 `2`）：

```bash
openclaw models status --check
```

即時認證探測：

```bash
openclaw models status --probe
```

備註：

- 探測行可以來自 auth profiles、env 憑證或 `models.json`。
- 如果明確的 `auth.order.<provider>` 省略了儲存的設定檔，探測會針對該設定檔回報
  `excluded_by_auth_order`，而不是嘗試它。
- 如果認證存在但 OpenClaw 無法解析該提供商的可探測模型候選者，
  探測會回報 `status: no_model`。
- 速率限制冷卻時間可以是模型範圍的。一個針對某個模型冷卻中的設定檔，對於同一提供商上的兄弟模型仍然可用。

可選的運維腳本在此處有記錄：
[Auth monitoring scripts](/en/help/scripts#auth-monitoring-scripts)

## Anthropic 說明

Anthropic `claude-cli` 後端已被移除。

- 在 OpenClaw 中對 Anthropic 流量使用 Anthropic API 金鑰。
- Anthropic setup-token 仍是舊版/手動路徑，應配合 Anthropic 告知 OpenClaw 使用者的額外使用量計費預期來使用。
- `openclaw doctor` 現在會偵測過時且已移除的 Anthropic Claude CLI 狀態。如果儲存的憑證位元組仍然存在，doctor 會將其轉換回 Anthropic token/OAuth 設定檔。如果不存在，doctor 會移除過時的 Claude CLI 配置並指引您進行 API 金鑰或 setup-token 恢復。

## 檢查模型認證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為

當 API 呼叫遇到供應商速率限制時，部分供應商支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一覆寫)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 供應商也包括 `GOOGLE_API_KEY` 作為額外的後備。
- 相同的金鑰清單在使用前會進行重複資料刪除。
- OpenClaw 僅對速率限制錯誤使用下一個金鑰進行重試（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`, `ThrottlingException`, `concurrency limit reached`，或
  `workers_ai ... quota limit exceeded`）。
- 非速率限制錯誤不會使用替代金鑰重試。
- 如果所有金鑰都失敗，將會傳回最後一次嘗試的最終錯誤。

## 控制使用哪個憑證

### 每個工作階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 為當前工作階段鎖定特定的供應商憑證（範例設定檔 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 來使用精簡選取器；使用 `/model status` 來查看完整視圖（候選者 + 下一次授權設定檔，加上設定時的供應商端點詳細資訊）。

### 每個代理程式（CLI 覆寫）

為代理程式設定明確的授權設定檔順序覆寫（儲存在該代理程式的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 來指定特定的代理程式；省略它以使用設定的預設代理程式。
當您偵錯順序問題時，`openclaw models status --probe` 會將省略的
儲存設定檔顯示為 `excluded_by_auth_order`，而不是默默跳過它們。
當您偵錯冷卻問題時，請記住速率限制冷卻時間可能綁定到
某個模型 ID，而不是整個供應商設定檔。

## 疑難排解

### 「找不到憑證」

如果缺少 Anthropic 設定檔，請在 **gateway host** 上設定 Anthropic API 金鑰
或設定舊版 Anthropic setup-token 路徑，然後重新檢查：

```bash
openclaw models status
```

### 權杖到期/已過期

執行 `openclaw models status` 以確認哪個設定檔即將過期。如果舊版
Anthropic 權杖設定檔遺失或已過期，請透過
設定權杖重新整理該設定，或遷移至 Anthropic API 金鑰。

如果機器仍有來自舊版本
的過時已移除 Anthropic Claude CLI 狀態，請執行：

```bash
openclaw doctor --yes
```

當儲存的認證位元組仍存在時，Doctor 會將 `anthropic:claude-cli` 轉換回 Anthropic 權杖/OAuth。否則它會移除過時的 Claude CLI
設定檔/設定/model 參考，並留下後續步驟的指引。
