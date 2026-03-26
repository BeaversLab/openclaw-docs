---
summary: "模型認證：OAuth、API 金鑰和 setup-token"
read_when:
  - Debugging model auth or OAuth expiry
  - Documenting authentication or credential storage
title: "認證"
---

# 認證

OpenClaw 支援模型提供者的 OAuth 和 API 金鑰。對於常駐的閘道主機，API 金鑰通常是最可預測的選項。當其符合您的提供者帳戶模型時，也支援訂閱/OAuth 流程。

請參閱 [/concepts/oauth](/zh-Hant/concepts/oauth) 以了解完整的 OAuth 流程與儲存佈局。
若為 SecretRef 型式的驗證 (`env`/`file`/`exec` 提供者)，請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。
若要了解 `models status --probe` 所使用的憑證資格/原因代碼規則，請參閱
[Auth Credential Semantics](/zh-Hant/auth-credential-semantics)。

## 建議設定（API 金鑰，任何提供者）

如果您正在執行長期執行的閘道，請先為您選擇的提供者建立 API 金鑰。
特別是對於 Anthropic，API 金鑰驗證是安全的途徑，建議優於訂閱設定權杖驗證。

1. 在您的提供者主控台中建立 API 金鑰。
2. 將其放置在 **gateway host**（執行 `openclaw gateway` 的機器）上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下運行，建議將金鑰放在
   `~/.openclaw/.env` 中，以便守護程序讀取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然後重新啟動守護程序（或重新啟動您的 Gateway 進程）並再次檢查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理環境變數，入門流程可以儲存
API 金鑰供守護程序使用：`openclaw onboard`。

請參閱 [說明](/zh-Hant/help) 以了解環境變數繼承的詳細資訊 (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd)。

## Anthropic：setup-token (訂閱驗證)

如果您使用的是 Claude 訂閱，則支援 setup-token 流程。請在**閘道主機**上執行：

```bash
claude setup-token
```

然後將其貼上到 OpenClaw 中：

```bash
openclaw models auth setup-token --provider anthropic
```

如果權杖是在另一台機器上建立的，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到類似以下的 Anthropic 錯誤：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…改用 Anthropic API 金鑰。

<Warning>
  Anthropic setup-token 支援僅限技術相容性。Anthropic 過去曾封鎖部分在 Claude Code
  外部的訂閱使用行為。僅在您判定政策風險可接受時使用，並請自行確認 Anthropic 目前的條款。
</Warning>

手動輸入權杖（任何供應商；寫入 `auth-profiles.json` 並更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援 Auth profile 參照：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`

適合自動化的檢查（當過期或遺失時退出 `1`，即將過期時退出 `2`）：

```bash
openclaw models status --check
```

可選的運維腳本（systemd/Termux）記載於此：
[/automation/auth-monitoring](/zh-Hant/automation/auth-monitoring)

> `claude setup-token` 需要一個互動式 TTY。

## 檢查模型授權狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為（閘道）

當 API 呼叫觸及提供者速率限制時，部分提供者支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單次覆寫）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供者還包含 `GOOGLE_API_KEY` 作為額外的後備方案。
- 相同的金鑰列表會在使用前進行去重。
- OpenClaw 僅在速率限制錯誤（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`）時使用下一個金鑰重試。
- 非速率限制錯誤不會使用備用金鑰重試。
- 如果所有金鑰都失敗，則會傳回最後一次嘗試的最終錯誤。

## 控制使用的憑證

### 個別工作階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 為目前的工作階段指定特定的提供者憑證（例如設定檔 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 進行精簡選取；使用 `/model status` 檢視完整內容（候選項 + 下一个認證設定檔，若已設定則包含供應商端點詳細資訊）。

### Per-agent (CLI override)

為代理程式設定明確的認證設定檔順序覆寫（儲存在該代理程式的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 指定特定的代理；省略該參數則使用設定的預設代理。

## 疑難排解

### "找不到憑證"

如果缺少 Anthropic token 設定檔，請在 **gateway host** 上執行
`claude setup-token`，然後重新檢查：

```bash
openclaw models status
```

### Token 即將過期/已過期

執行 `openclaw models status` 以確認哪個設定檔即將過期。如果設定檔遺失，請重新執行 `claude setup-token` 並再次貼上權杖。

## 需求

- Anthropic 訂閱帳戶（用於 `claude setup-token`）
- 已安裝 Claude Code CLI（可使用 `claude` 指令）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
