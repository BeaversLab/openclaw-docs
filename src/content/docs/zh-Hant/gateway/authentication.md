---
summary: "模型驗證：OAuth、API 金鑰與 setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "驗證"
---

# 驗證（模型供應商）

<Note>本頁面涵蓋 **模型供應商** 的驗證（API 金鑰、OAuth、設置權杖）。關於 **閘道連線** 的驗證（權杖、密碼、trusted-proxy），請參閱 [Configuration](/en/gateway/configuration) 和 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)。</Note>

OpenClaw 支援模型供應商的 OAuth 和 API 金鑰。對於始終運行的閘道
主機，API 金鑰通常是最可預測的選項。當訂閱/OAuth
流程符合您的供應商帳戶模型時，也支援這些流程。

參閱 [/concepts/oauth](/en/concepts/oauth) 以了解完整的 OAuth 流程和儲存
配置。
關於基於 SecretRef 的驗證（`env`/`file`/`exec` 供應商），請參閱 [Secrets Management](/en/gateway/secrets)。
關於 `models status --probe` 使用的憑證資格/原因代碼規則，請參閱
[Auth Credential Semantics](/en/auth-credential-semantics)。

## 建議設置（API 金鑰，任何供應商）

如果您正在執行一個長期運行的閘道，請從您選擇的
供應商的 API 金鑰開始。
對於 Anthropic，特別是 API 金鑰驗證是安全路徑，建議優於
訂閱設置權杖驗證。

1. 在您的供應商主控台建立 API 金鑰。
2. 將其放在 **閘道主機** 上（執行 `openclaw gateway` 的機器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下執行，建議將金鑰放入
   `~/.openclaw/.env` 以便守護行程可以讀取它：

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

如果您不想自己管理環境變數，onboarding 可以儲存
API 金鑰供守護行程使用：`openclaw onboard`。

關於環境變數繼承（`env.shellEnv`，
`~/.openclaw/.env`，systemd/launchd）的詳細資訊，請參閱 [Help](/en/help)。

## Anthropic：setup-token（訂閱驗證）

如果您使用的是 Claude 訂閱，則支援 setup-token 流程。請在
**閘道主機** 上執行它：

```bash
claude setup-token
```

然後將其貼上到 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

如果權杖是在另一台機器上建立的，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到類似的 Anthropic 錯誤：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…請改用 Anthropic API 金鑰。

<Warning>Anthropic setup-token 支援僅為技術相容性。Anthropic 過去曾封鎖部分在 Claude Code 之外使用的訂閱權限。僅在您決定政策風險可接受時使用，並請自行確認 Anthropic 的當前條款。</Warning>

手動輸入權杖（任何供應商；寫入 `auth-profiles.json` 並更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援 Auth profile refs：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式的設定檔不支援 SecretRef 憑證；如果 `auth.profiles.<id>.mode` 設為 `"oauth"`，則該設定檔的 SecretRef 支援的 `keyRef`/`tokenRef` 輸入將被拒絕。

自動化友好的檢查（過期/遺失時退出 `1`，即將過期時退出 `2`）：

```bash
openclaw models status --check
```

選用的運維腳本 (systemd/Termux) 記載於此：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` 需要互動式 TTY。

## Anthropic：Claude CLI 遷移

如果 Claude CLI 已安裝並在 gateway 主機上登入，您可以將現有的 Anthropic 設定切換至 CLI 後端，而不需貼上 setup-token：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

這會保留您現有的 Anthropic auth profiles 以便還原，但會將預設模型選擇變更為 `claude-cli/...`，並在 `agents.defaults.models` 下新增相符的 Claude CLI allowlist 項目。

入門捷徑：

```bash
openclaw onboard --auth-choice anthropic-cli
```

## 檢查模型驗證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為 (gateway)

當 API 呼叫遇到供應商速率限制時，部分供應商支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一覆寫)
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 供應商還包含 `GOOGLE_API_KEY` 作為額外的後備選項。
- 相同的金鑰清單在使用前會進行去重。
- OpenClaw 只會針對速率限制錯誤（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）使用下一個金鑰重試。
- 非速率限制錯誤不會使用備用金鑰重試。
- 如果所有金鑰都失敗，將會傳回最後一次嘗試的最終錯誤。

## 控制使用的憑證

### 各階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 釘選目前階段的特定提供者憑證（範例設定檔 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）進行精簡挑選；使用 `/model status` 檢視完整內容（候選項目 + 下一个憑證設定檔，以及設定時的提供者端點詳細資訊）。

### 各代理程式（CLI 覆寫）

為代理程式設定明確的憑證設定檔順序覆寫（儲存在該代理程式的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定特定的代理程式；省略它以使用設定的預設代理程式。

## 疑難排解

### "找不到憑證"

如果缺少 Anthropic token 設定檔，請在 **gateway host** 上執行 `claude setup-token`，然後重新檢查：

```bash
openclaw models status
```

### Token 即將到期/已到期

執行 `openclaw models status` 以確認哪個設定檔即將到期。如果缺少該設定檔，請重新執行 `claude setup-token` 並再次貼上 token。

## 需求

- Anthropic 訂閱帳戶（用於 `claude setup-token`）
- 已安裝 Claude Code CLI（可使用 `claude` 指令）
