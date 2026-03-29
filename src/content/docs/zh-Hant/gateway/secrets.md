---
summary: "機密管理：SecretRef 合約、執行時快照行為及安全的單向清理"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "機密管理"
---

# 機密管理

OpenClaw 支援額外的 SecretRefs，因此支援的憑證不需要以純文字形式儲存在設定中。

純文字仍然有效。SecretRefs 對每個憑證都是選用的。

## 目標與執行時模型

機密會解析為記憶體內的執行時快照。

- 解析在啟用期間是急切的，而不是在請求路徑上延遲進行。
- 當有效的使用中 SecretRef 無法解析時，啟動會快速失敗。
- 重新載入使用原子交換：完全成功，或保留最後已知良好的快照。
- 執行時請求僅從使用中的記憶體內快照讀取。
- 向外傳遞路徑也從該使用中的快照讀取（例如 Discord 回覆/串訊息傳遞和 Telegram 動作傳送）；它們不會在每次傳送時重新解析 SecretRefs。

這可將機密提供者中斷排除在熱門請求路徑之外。

## 作用中表面過濾

SecretRef 僅在有效的作用中表面上進行驗證。

- 已啟用的表面：未解析的參照會阻擋啟動/重新載入。
- 未啟用的表面：未解析的參照不會阻擋啟動/重新載入。
- 非作用中參照會發出代碼為 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命診斷。

非作用中表面的範例：

- 已停用的頻道/帳戶項目。
- 沒有任何已啟用帳戶繼承的頂層頻道憑證。
- 已停用的工具/功能表面。
- 未被 `tools.web.search.provider` 選取的網路搜尋提供者特定金鑰。
  在自動模式（未設定提供者）中，金鑰會依優先順序被查詢以進行提供者自動偵測，直到其中一個解析為止。
  選取後，未選取的提供者金鑰會被視為非作用中，直到被選取為止。
- 沙盒 SSH 驗證資料（`agents.defaults.sandbox.ssh.identityData`、
  `certificateData`、`knownHostsData`，加上各代理程式的覆寫）僅在預設代理程式或已啟用代理程式的有效沙盒後端為 `ssh` 時才會作用。
- 如果符合以下任一條件，`gateway.remote.token` / `gateway.remote.password` SecretRef 即為作用中：
  - `gateway.mode=remote`
  - `gateway.remote.url` 已設定
  - `gateway.tailscale.mode` 是 `serve` 或 `funnel`
  - 在沒有那些遠端表面的本機模式下：
    - 當權杖驗證可以勝出且未設定 env/auth 權杖時，`gateway.remote.token` 為啟用狀態。
    - 僅當密碼驗證可以勝出且未設定 env/auth 密碼時，`gateway.remote.password` 為啟用狀態。
- 當設定 `OPENCLAW_GATEWAY_TOKEN` 時，`gateway.auth.token` SecretRef 對於啟動驗證解析為非啟用狀態，因為 env 權杖輸入在該執行時環境中優先。

## Gateway 驗證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，gateway 啟動/重新載入會明確記錄
表面狀態：

- `active`：SecretRef 是有效驗證表面的一部分，必須進行解析。
- `inactive`：在此執行時環境中會忽略 SecretRef，因為另一個驗證表面優先，
  或因為遠端驗證已停用/未啟用。

這些條目會使用 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含啟用表面策略使用的原因，因此您可以看到憑證為何被視為啟用或非啟用。

## 上線參考預檢

當上線程序以互動模式執行且您選擇 SecretRef 儲存時，OpenClaw 會在儲存前執行預檢驗證：

- Env refs：驗證環境變數名稱，並確認在設定期間可見到非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析出的值類型。
- Quickstart 重複使用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，上線程序會在 probe/dashboard 啟動程序之前（針對 `env`、`file` 和 `exec` refs）使用相同的快速失敗閘道對其進行解析。

如果驗證失敗，上線程序會顯示錯誤並讓您重試。

## SecretRef 合約

到處使用同一個物件形狀：

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
- 區段中的 RFC6901 跳脫：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作為斜線分隔的路徑區段 (例如 `a/../b` 會被拒絕)

## 提供者設定

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

- 透過 `allowlist` 選擇性加入允許清單。
- 遺失/空的環境變數值會導致解析失敗。

### 檔案提供者

- 從 `path` 讀取本機檔案。
- `mode: "json"` 預期 JSON 物件酬載並將 `id` 解析為指標。
- `mode: "singleValue"` 預期參照 ID `"value"` 並傳回檔案內容。
- 路徑必須通過擁有權/權限檢查。
- Windows 失敗關閉說明：如果路徑無法使用 ACL 驗證，解析將會失敗。僅針對受信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

### Exec 提供者

- 執行設定的絕對二進位路徑，不使用 shell。
- 依預設，`command` 必須指向常規檔案 (而非符號連結)。
- 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑 (例如 Homebrew shims)。OpenClaw 會驗證解析後的目標路徑。
- 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用，以支援套件管理員路徑 (例如 `["/opt/homebrew"]`)。
- 支援逾時、無輸出逾時、輸出位元組限制、環境變數允許清單，以及信任目錄。
- Windows 失敗關閉提示：如果指令路徑無法進行 ACL 驗證，解析將會失敗。僅對信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

請求載荷 (stdin)：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

回應載荷 (stdout)：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

選用的個別 ID 錯誤：

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

核心 `ssh` sandbox 後端也支援 SSH 驗證資料的 SecretRefs：

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

執行時行為：

- OpenClaw 會在 sandbox 啟動期間解析這些參照，而不是在每次 SSH 呼叫時延遲解析。
- 解析後的值會被寫入具有嚴格權限的暫存檔案中，並用於產生的 SSH 設定。
- 如果實際的 sandbox 後端不是 `ssh`，這些參照將保持非活動狀態，且不會阻擋啟動。

## 支援的憑證範圍

標準的支援與不支援憑證列於：

- [SecretRef Credential Surface](/en/reference/secretref-credential-surface)

執行時產生或輪替的憑證以及 OAuth 更新材料被刻意排除在唯讀 SecretRef 解析之外。

## 必要的行為與優先順序

- 沒有參照的欄位：保持不變。
- 有參照的欄位：在啟動期間對活動範圍為必要項目。
- 如果同時存在純文字和參照，參照在支援的優先順序路徑中優先。

警告與稽核訊號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時警告)
- `REF_SHADOWED` (當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的稽核發現)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定同層級參照時，純文字值將被忽略。

## 啟動觸發條件

Secret 啟動執行於：

- 啟動 (預檢加上最終啟動)
- 設定重新載入熱套用路徑
- 設定重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入

啟動合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 gateway 啟動。
- 運行時重新載入失敗會保留最後已知良好的快照。
- 為輔助程式/工具的出站呼叫提供明確的單次呼叫通道權杖不會觸發 SecretRef 啟用；啟用時機維持為啟動時、重新載入時以及明確的 `secrets.reload`。

## 降級與恢復訊號

當處於健康狀態後發生重新載入時啟用失敗，OpenClaw 會進入秘密降級狀態。

一次性系統事件與日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：運行時保留最後已知良好的快照。
- 恢復：在下次成功啟用後發送一次。
- 當已處於降級狀態時，重複的失敗會記錄警告，但不會大量發送事件。
- 啟動時快速失敗不會發送降級事件，因為運行時從未進入活躍狀態。

## 指令路徑解析

指令路徑可以選擇透過 gateway snapshot RPC 進行支援的 SecretRef 解析。

有兩種廣泛的行為：

- 嚴格指令路徑（例如 `openclaw memory` 遠端記憶體路徑與 `openclaw qr --remote`）會從活躍快照讀取，並在所需的 SecretRef 不可用時快速失敗。
- 唯讀指令路徑（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 與唯讀 doctor/config 修復流程）也優先使用活躍快照，但在該指令路徑中目標 SecretRef 不可用時會降級，而非中止。

唯讀行為：

- 當 gateway 正在執行時，這些指令會先從活躍快照讀取。
- 如果 gateway 解析不完整或 gateway 不可用，它們會針對特定指令介面嘗試目標的本機後援。
- 如果目標 SecretRef 仍然不可用，指令會以降級的唯讀輸出與明確的診斷資訊（例如「已配置但在該指令路徑中不可用」）繼續執行。
- 此降級行為僅限於指令本身。它不會削弱運行時啟動、重新載入或 send/auth 路徑。

其他說明：

- 後端秘密輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

檢查結果包括：

- 靜態的明文值 (`openclaw.json`、`auth-profiles.json`、`.env` 和產生的 `agents/*/agent/models.json`)
- 產生的 `models.json` 項目中的明文敏感提供者標頭殘留
- 未解析的參照
- 優先順序遮蔽 (`auth-profiles.json` 優先於 `openclaw.json` 參照)
- 舊版殘留 (`auth.json`、OAuth 提醒)

Exec 備註：

- 預設情況下，稽核會跳過 exec SecretRef 解析性檢查，以避免指令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec 提供者。

標頭殘留備註：

- 敏感提供者標頭偵測是基於名稱啟發式 (常見的 auth/credential 標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`)。

### `secrets configure`

互動式輔助工具，功能包括：

- 先設定 `secrets.providers` (`env`/`file`/`exec`，新增/編輯/移除)
- 讓您針對單一 Agent 範圍，在 `openclaw.json` 以及 `auth-profiles.json` 中選擇支援的秘密攜帶欄位
- 可直接在目標選擇器中建立新的 `auth-profiles.json` 對應
- 擷取 SecretRef 詳細資訊 (`source`、`provider`、`id`)
- 執行預檢解析
- 可立即套用

Exec 備註：

- 除非設定 `--allow-exec`，否則預檢會跳過 exec SecretRef 檢查。
- 如果您直接從 `configure --apply` 套用，且計畫包含 exec 參照/提供者，請在套用步驟中也保持設定 `--allow-exec`。

實用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 套用預設值：

- 從 `auth-profiles.json` 中清除目標供應商匹配的靜態憑證
- 從 `auth.json` 中清除舊版靜態 `api_key` 項目
- 從 `<config-dir>/.env` 中清除匹配的已知機密行

### `secrets apply`

套用已儲存的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

執行說明：

- 除非設定了 `--allow-exec`，否則 dry-run 會跳過執行檢查。
- 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/供應商的計畫。

關於嚴格的目標/路徑合約詳細資訊及確切的拒絕規則，請參閱：

- [Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)

## 單向安全性政策

OpenClaw 有意不寫入包含歷史純文字機密值的還原備份。

安全性模型：

- 寫入模式前 preflight 必須成功
- 認可前會驗證執行階段啟用
- 套用作業使用原子檔案替換來更新檔案，並在失敗時盡力還原

## 舊版驗證相容性說明

對於靜態憑證，執行階段不再依賴純文字舊版驗證儲存。

- 執行階段憑證來源是已解析的記憶體內部快照。
- 舊版靜態 `api_key` 項目在發現時會被清除。
- OAuth 相關的相容性行為保持分開。

## Web UI 說明

在原始編輯器模式下設定某些 SecretInput 聯集比在表單模式下更容易。

## 相關文件

- CLI 指令：[secrets](/en/cli/secrets)
- 計畫合約詳細資訊：[Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)
- 憑證範圍：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- 驗證設定：[Authentication](/en/gateway/authentication)
- 安全性狀態：[Security](/en/gateway/security)
- 環境優先順序：[Environment Variables](/en/help/environment)
