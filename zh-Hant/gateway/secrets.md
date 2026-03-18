---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# 機密管理

OpenClaw 支援加法式 SecretRefs，因此不需要將支援的憑證以純文字形式儲存在設定中。

純文字仍然有效。SecretRefs 針對每個憑證為選用加入。

## 目標與執行時模型

機密會被解析為記憶體中的執行時快照。

- 解析在啟動期間為急切式，而非在請求路徑上為延遲式。
- 當有效的啟用中 SecretRef 無法解析時，啟動會快速失敗。
- 重新載入使用原子交換：完全成功，或保留最後已知的良好快照。
- 執行時請求僅從啟用中的記憶體快照讀取。
- 輸出傳遞路徑也從該啟用中的快照讀取（例如 Discord 回覆/串珠傳遞和 Telegram 動作發送）；它們不會在每次發送時重新解析 SecretRefs。

這讓機密供應商的中斷不會影響熱請求路徑。

## 啟用中過濾

SecretRef 僅在有效的啟用中介面上進行驗證。

- 已啟用的介面：未解析的參照會阻擋啟動/重新載入。
- 未啟用的介面：未解析的參照不會阻擋啟動/重新載入。
- 未啟用的參照會發出代碼為 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非嚴重診斷。

未啟用介面的範例：

- 已停用的頻道/帳戶項目。
- 沒有任何已啟用帳戶繼承的頂層頻道憑證。
- 已停用的工具/功能介面。
- 未被 `tools.web.search.provider` 選取的網路搜尋供應商特定金鑰。
  在自動模式（未設定供應商）中，金鑰會依照優先順序被查詢以供供應商自動偵測，直到其中一個解析成功為止。
  選取後，未被選取的供應商金鑰會被視為未啟用，直到被選取為止。
- Sandbox SSH 驗證資料（`agents.defaults.sandbox.ssh.identityData`、
  `certificateData`、`knownHostsData`，加上各代理的覆寫）僅在預設代理或已啟用代理的有效沙盒後端是 `ssh` 時啟用。
- `gateway.remote.token` / `gateway.remote.password` SecretRef 在以下任一情況為真時啟用：
  - `gateway.mode=remote`
  - `gateway.remote.url` 已設定
  - `gateway.tailscale.mode` 是 `serve` 或 `funnel`
  - 在沒有那些遠端表面的本機模式下：
    - 當 token 驗證可以優先且未設定 env/auth token 時，`gateway.remote.token` 處於啟用狀態。
    - 僅當密碼驗證可以優先且未設定 env/auth 密碼時，`gateway.remote.password` 處於啟用狀態。
- 當設定 `OPENCLAW_GATEWAY_TOKEN`（或 `CLAWDBOT_GATEWAY_TOKEN`）時，`gateway.auth.token` SecretRef 對於啟動驗證解析處於非啟用狀態，因為 env token 輸入在該執行時期中優先。

## Gateway 驗證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，gateway 啟動/重新載入會明確記錄
表面狀態：

- `active`：SecretRef 是有效驗證表面的一部分，且必須解析。
- `inactive`：由於另一個驗證表面優先，或
  由於遠端驗證已停用/未啟用，SecretRef 在此執行時期中會被忽略。

這些條目會以 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含啟用表面策略所使用的
原因，因此您可以查看憑證被視為啟用或非啟用的原因。

## Onboarding 參考前置檢查

當 onboarding 以互動模式執行並且您選擇 SecretRef 儲存時，OpenClaw 會在儲存前執行前置檢查驗證：

- Env 參照：驗證環境變數名稱，並確認在設定期間可見非空值。
- Provider 參照（`file` 或 `exec`）：驗證 provider 選擇，解析 `id`，並檢查解析值的類型。
- Quickstart 重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，onboarding 會在 probe/dashboard 引導程序之前解析它（針對 `env`、`file` 和 `exec` 參照），並使用相同的快速失敗閘道。

如果驗證失敗，onboarding 會顯示錯誤並讓您重試。

## SecretRef 契約

到處使用相同的物件形狀：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須符合 `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須是絕對 JSON 指標 (`/...`)
- 片段中的 RFC6901 跳脫字元：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作為斜線分隔的路徑片段（例如 `a/../b` 會被拒絕）

## 提供者配置

在 `secrets.providers` 下定義提供者：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### Env 提供者

- 透過 `allowlist` 選擇性啟用允許清單。
- 遺漏/空白的環境變數值將導致解析失敗。

### 檔案提供者

- 從 `path` 讀取本機檔案。
- `mode: "json"` 期望 JSON 物件 payload，並將 `id` 解析為指標。
- `mode: "singleValue"` 期望參照 ID `"value"` 並傳回檔案內容。
- 路徑必須通過擁有權/權限檢查。
- Windows 失敗關閉 (fail-closed) 說明：如果路徑無法進行 ACL 驗證，解析將會失敗。僅針對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

### Exec 提供者

- 執行設定的絕對二進位路徑，不使用 shell。
- 根據預設，`command` 必須指向一般檔案（而非符號連結）。
- 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
- 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用以適用於套件管理員路徑（例如 `["/opt/homebrew"]`）。
- 支援逾時、無輸出逾時、輸出位元組限制、環境變數允許清單，以及信任目錄。
- Windows 失敗關閉（fail-closed）注意事項：如果無法針對指令路徑進行 ACL 驗證，解析將會失敗。僅對於信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

請求承載（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

回應承載（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

選用性的每個 ID 錯誤：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Exec 整合範例

### 1Password CLI

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### HashiCorp Vault CLI

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## Sandbox SSH 驗證資料

核心 `ssh` 沙盒後端也支援用於 SSH 驗證資料的 SecretRefs：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

執行時期行為：

- OpenClaw 會在沙盒啟動期間解析這些參照，而不是在每次 SSH 呼叫期間延遲解析。
- 解析的值會以嚴格的權限寫入暫存檔案，並用於產生的 SSH 設定中。
- 如果有效的沙盒後端不是 `ssh`，這些參照將保持非作用中狀態，並不會阻擋啟動。

## 支援的憑證範圍

標準的支援與不支援憑證列於：

- [SecretRef 憑證範圍](/zh-Hant/reference/secretref-credential-surface)

執行時期產生或輪換的憑證以及 OAuth 重新整理資料，被有意地排除在唯讀 SecretRef 解析之外。

## 必要的行為與優先順序

- 沒有參照的欄位：保持不變。
- 具有參照的欄位：在啟動期間對於作用中的介面為必要。
- 如果同時存在純文字和參照，參照在支援的優先順序路徑中優先。

警告與稽核信號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時期警告)
- `REF_SHADOWED` (當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的稽核發現)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定同層參照時，純文字值會被忽略。

## 啟動觸發條件

Secret 啟動執行於：

- 啟動（預檢加上最終啟動）
- 設定重新載入熱套用路徑
- 設定重新載入重新檢查路徑
- 透過 `secrets.reload` 手動重新載入

啟動合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 Gateway 啟動程序。
- 運行時重新載入失敗會保留最後已知的良好快照。
- 為輔出輔助工具/工具呼叫提供明確的單次呼叫通道 token 不會觸發 SecretRef 啟用；啟用點仍維持為啟動、重新載入和明確的 `secrets.reload`。

## 降級與恢復訊號

當在健康狀態後重新載入時啟用失敗，OpenClaw 會進入降級金鑰狀態。

單次系統事件與日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：運行時保留最後已知的良好快照。
- 恢復：在下一次成功啟用後發出一次。
- 已處於降級狀態時的重複失敗會記錄警告，但不會濫發事件。
- 啟動時快速失敗不會發出降級事件，因為運行時從未啟用。

## 指令路徑解析

指令路徑可以透過 gateway 快照 RPC 選擇支援的 SecretRef 解析。

主要有兩種行為：

- 嚴格指令路徑（例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote`）從啟用快照讀取，並在所需的 SecretRef 無法使用時快速失敗。
- 唯讀指令路徑（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及唯讀 doctor/config 修復流程）也偏好使用啟用快照，但在該指令路徑中目標 SecretRef 無法使用時會降級，而不是中止。

唯讀行為：

- 當 gateway 正在執行時，這些指令會先從啟用快照讀取。
- 如果 gateway 解析不完整或 gateway 無法使用，它們會嘗試針對特定指令介面進行目標本機後備。
- 如果目標 SecretRef 仍然無法使用，該指令會繼續執行並輸出降級的唯讀結果，以及明確的診斷訊息，例如「已配置但在本指令路徑中無法使用」。
- 這種降級行為僅限於指令本身。它不會削弱運行時啟動、重新載入，或 send/auth 路徑。

其他註記：

- 後端金鑰輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

發現事項包括：

- 靜態明文值（`openclaw.json`、`auth-profiles.json`、`.env` 以及產生的 `agents/*/agent/models.json`）
- 產生的 `models.json` 項目中殘留的提供者敏感性標頭明文
- 未解析的參照
- 優先順序遮蔽（`auth-profiles.json` 參照優先於 `openclaw.json` 參照）
- 舊版殘留（`auth.json`、OAuth 提醒）

標頭殘留說明：

- 敏感性提供者標頭偵測是基於名稱啟發式（常見的 auth/credential 標頭名稱與片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

互動式輔助工具：

- 先設定 `secrets.providers`（`env`/`file`/`exec`，新增/編輯/移除）
- 讓您針對單一 Agent 範圍，選取 `openclaw.json` 以及 `auth-profiles.json` 中支援的秘密承載欄位
- 可直接在目標選擇器中建立新的 `auth-profiles.json` 對應
- 擷取 SecretRef 詳細資訊（`source`、`provider`、`id`）
- 執行飛前解析
- 可立即套用

實用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 套用預設值：

- 從目標提供者的 `auth-profiles.json` 中清除相符的靜態憑證
- 從 `auth.json` 中清除舊版靜態 `api_key` 項目
- 從 `<config-dir>/.env` 中清除相符的已知秘密行

### `secrets apply`

套用已儲存的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
```

若要了解嚴格的目標/路徑合約詳細資訊與確切的拒絕規則，請參閱：

- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)

## 單向安全策略

OpenClaw 故意不寫入包含歷史明文金鑰值的回滾備份。

安全模型：

- 寫入模式前必須成功通過預檢
- 在提交之前會驗證執行時期啟用
- apply 使用原子檔案替換更新檔案，並在失敗時盡力還原

## 舊版驗證相容性說明

對於靜態憑證，執行時期不再依賴明文舊版驗證儲存。

- 執行時期憑證來源是已解析的記憶體內快照。
- 舊版靜態 `api_key` 項目在發現時會被清除。
- OAuth 相關的相容性行為保持分開。

## Web UI 說明

某些 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易設定。

## 相關文件

- CLI 指令：[secrets](/zh-Hant/cli/secrets)
- 計畫合約詳細資訊：[Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)
- 憑證介面：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- 驗證設定：[Authentication](/zh-Hant/gateway/authentication)
- 安全狀態：[Security](/zh-Hant/gateway/security)
- 環境優先順序：[Environment Variables](/zh-Hant/help/environment)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
