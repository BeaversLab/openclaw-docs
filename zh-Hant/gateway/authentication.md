---
summary: "模型驗證：OAuth、API 金鑰與 setup-token"
read_when:
  - 正在除錯模型驗證或 OAuth 到期
  - 正在記錄驗證或憑證儲存
title: "驗證"
---

# 驗證

OpenClaw 支援模型供應商的 OAuth 和 API 金鑰。對於持續運作的閘道主機，API 金鑰通常是最可預測的選項。當訂閱/OAuth 流程符合您的供應商帳戶模型時，也予以支援。

參閱 [/concepts/oauth](/zh-Hant/concepts/oauth) 以了解完整的 OAuth 流程與儲存結構。
對於基於 SecretRef 的驗證 (`env`/`file`/`exec` 供應商)，請參閱 [機密管理](/zh-Hant/gateway/secrets)。
對於 `models status --probe` 所使用的憑證資格/原因代碼規則，請參閱
[驗證憑證語意](/zh-Hant/auth-credential-semantics)。

## 推薦設定 (API 金鑰，適用於任何供應商)

如果您正在執行長期執行的閘道，請先為您選擇的供應商建立 API 金鑰。
對於 Anthropic，API 金鑰驗證是安全的途徑，並建議優先採用而非訂閱 setup-token 驗證。

1. 在您的供應商主控台中建立 API 金鑰。
2. 將其放置於 **閘道主機** (執行 `openclaw gateway` 的機器) 上。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果閘道在 systemd/launchd 下執行，建議將金鑰放入
   `~/.openclaw/.env`，以便服務能讀取它：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然後重新啟動服務 (或重新啟動您的閘道程序) 並再次檢查：

```bash
openclaw models status
openclaw doctor
```

如果您不想自行管理環境變數，入門流程可以儲存
API 金鑰供服務使用：`openclaw onboard`。

參閱 [說明](/zh-Hant/help) 以了解環境繼承的詳細資訊 (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd)。

## Anthropic: setup-token (訂閱驗證)

如果您使用的是 Claude 訂閱，則支援 setup-token 流程。請在 **閘道主機** 上執行：

```bash
claude setup-token
```

然後將其貼上至 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

如果權杖是在另一部機器上建立的，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到類似以下的 Anthropic 錯誤：

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

…請改用 Anthropic API 金鑰。

<Warning>
  Anthropic setup-token 支援僅為技術相容性。Anthropic 過去曾阻擋 Claude Code
  以外部分訂閱用途的使用。僅在您決定 政策風險可接受時使用，並請自行確認 Anthropic 的目前條款。
</Warning>

手動輸入 token（任何供應商；寫入 `auth-profiles.json` 並更新配置）：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

靜態憑證也支援認證設定檔參照：

- `api_key` 憑證可以使用 `keyRef: { source, provider, id }`
- `token` 憑證可以使用 `tokenRef: { source, provider, id }`

適用自動化的檢查（過期/遺失時離開 `1`，將到期時離開 `2`）：

```bash
openclaw models status --check
```

選用的維運腳本（systemd/Termux）文件位於此處：
[/automation/auth-monitoring](/zh-Hant/automation/auth-monitoring)

> `claude setup-token` 需要互動式 TTY。

## 檢查模型認證狀態

```bash
openclaw models status
openclaw doctor
```

## API 金鑰輪替行為（閘道）

當 API 呼叫遭遇供應商速率限制時，部分供應商支援使用替代金鑰重試請求。

- 優先順序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（單一覆寫）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 供應商也包含 `GOOGLE_API_KEY` 作為額外的後備。
- 相同的金鑰清單在使用前會進行去重。
- OpenClaw 僅在速率限制錯誤時使用下一個金鑰重試（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`）。
- 非速率限制錯誤不會使用替代金鑰重試。
- 如果所有金鑰都失敗，將會傳回最後一次嘗試的最終錯誤。

## 控制使用的憑證

### 各階段（聊天指令）

使用 `/model <alias-or-id>@<profileId>` 來釘選目前階段特定的供應商憑證（範例設定檔 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`） 以使用精簡選擇器；使用 `/model status` 檢視完整資訊（候選項 + 下一個認證設定檔，加上配置時的供應商端點詳情）。

### 各代理程式（CLI 覆寫）

為代理設定明確的驗證設定檔順序覆寫（儲存在該代理的 `auth-profiles.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 來指定特定的代理；省略它則使用設定的預設代理。

## 疑難排解

### "未找到憑證"

如果缺少 Anthropic 權杖設定檔，請在 **gateway host** 上執行 `claude setup-token`，然後重新檢查：

```bash
openclaw models status
```

### 權杖即將過期/已過期

執行 `openclaw models status` 以確認哪個設定檔即將過期。如果缺少該設定檔，請重新執行 `claude setup-token` 並再次貼上權杖。

## 需求

- Anthropic 訂閱帳戶（用於 `claude setup-token`）
- 已安裝 Claude Code CLI（`claude` 指令可用）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
