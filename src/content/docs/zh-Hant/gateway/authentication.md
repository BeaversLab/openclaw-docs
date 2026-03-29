---
summary: "模型驗證：OAuth、API 金鑰和 setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "驗證"
---

# 驗證

OpenClaw 支援模型提供者的 OAuth 和 API 金鑰。對於持續運作的閘道主機，API 金鑰通常是最可預測的選擇。當其符合您的提供者帳戶模型時，也支援訂閱/OAuth 流程。

請參閱 [/concepts/oauth](/en/concepts/oauth) 以了解完整的 OAuth 流程和儲存佈局。
關於基於 SecretRef 的驗證 (`env`/`file`/`exec` 提供者)，請參閱[機密管理](/en/gateway/secrets)。
關於 `models status --probe` 使用的憑證資格/原因代碼規則，請參閱
[驗證憑證語意](/en/auth-credential-semantics)。

## 建議設定 (API 金鑰，任何提供者)

如果您正在運行長期存活的閘道，請先為您選擇的提供者建立 API 金鑰。
特別是對於 Anthropic，API 金鑰驗證是安全路徑，並且建議優先於訂閱 setup-token 驗證。

1. 在您的提供者主控台中建立 API 金鑰。
2. 將其放在 **閘道主機** (執行 `openclaw gateway` 的機器) 上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果閘道在 systemd/launchd 下運行，建議將金鑰放入
   `~/.openclaw/.env` 中，以便守護程式可以讀取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然後重新啟動守護程式 (或重新啟動您的閘道程序) 並重新檢查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理環境變數，onboarding 可以儲存
API 金鑰供守護程式使用：`openclaw onboard`。

有關環境變數繼承 (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd) 的詳細資訊，請參閱[說明](/en/help)。

## Anthropic：setup-token (訂閱驗證)

如果您使用 Claude 訂閱，則支援 setup-token 流程。請在
**閘道主機** 上執行它：

```bash
claude setup-token
```

然後將其貼上到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果 token 是在另一台機器上建立的，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到 Anthropic 錯誤，例如：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

...請改用 Anthropic API 金鑰。

<Warning>Anthropic setup-token 支援僅屬技術相容性。Anthropic 過去曾阻擋 Claude Code 之外的某些訂閱使用。僅在您決定政策風險可接受時使用，並請自行確認 Anthropic 目前的條款。</Warning>

手動輸入權杖（任何供應商；寫入 `auth-profiles.json` + 更新設定）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援 Auth profile 參考：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`

友善自動化的檢查（過期/缺失時退出 `1`，即將過期時退出 `2`）：

```bash
openclaw models status --check
```

可選的運維腳本（systemd/Termux）記錄於此：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

> `claude setup-token` 需要互動式 TTY。

## 檢查模型認證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為（閘道）

當 API 呼叫觸及供應商速率限制時，部分供應商支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單一覆寫）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 供應商也包括 `GOOGLE_API_KEY` 作為額外的後備選項。
- 相同的金鑰清單在使用前會進行去重。
- OpenClaw 僅針對速率限制錯誤（例如 `429`、`rate_limit`、`quota`、`resource exhausted`）使用下一個金鑰重試。
- 非速率限制錯誤不會使用替代金鑰重試。
- 如果所有金鑰都失敗，則會傳回最後一次嘗試的最終錯誤。

## 控制使用的憑證

### 每次會話（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 為當前會話指定特定的供應商憑證（範例 profile id：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）進行精簡選取；使用 `/model status` 檢視完整資訊（候選者 + 下個 auth profile，以及設定時的供應商端點詳細資訊）。

### 每個代理（CLI 覆寫）

為代理設定明確的驗證配置檔順序覆寫（儲存於該代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 來指定特定的代理；省略該參數則使用已設定的預設代理。

## 疑難排解

### "找不到憑證"

如果 Anthropic 權杖配置檔遺失，請在 **gateway host** 上執行 `claude setup-token`，然後重新檢查：

```bash
openclaw models status
```

### 權杖即將到期/已過期

執行 `openclaw models status` 以確認哪個配置檔即將到期。如果配置檔遺失，請重新執行 `claude setup-token` 並再次貼上權杖。

## 需求

- Anthropic 訂閱帳戶（用於 `claude setup-token`）
- 已安裝 Claude Code CLI（可使用 `claude` 指令）
