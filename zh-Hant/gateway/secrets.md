---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# Secrets management

OpenClaw supports additive SecretRefs so supported credentials do not need to be stored as plaintext in configuration.

Plaintext still works. SecretRefs are opt-in per credential.

## Goals and runtime model

Secrets are resolved into an in-memory runtime snapshot.

- Resolution is eager during activation, not lazy on request paths.
- Startup fails fast when an effectively active SecretRef cannot be resolved.
- Reload uses atomic swap: full success, or keep the last-known-good snapshot.
- Runtime requests read from the active in-memory snapshot only.
- Outbound delivery paths also read from that active snapshot (for example Discord reply/thread delivery and Telegram action sends); they do not re-resolve SecretRefs on each send.

This keeps secret-provider outages off hot request paths.

## Active-surface filtering

SecretRefs are validated only on effectively active surfaces.

- Enabled surfaces: unresolved refs block startup/reload.
- Inactive surfaces: unresolved refs do not block startup/reload.
- Inactive refs emit non-fatal diagnostics with code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

Examples of inactive surfaces:

- Disabled channel/account entries.
- Top-level channel credentials that no enabled account inherits.
- Disabled tool/feature surfaces.
- Web search provider-specific keys that are not selected by `tools.web.search.provider`.
  In auto mode (provider unset), keys are consulted by precedence for provider auto-detection until one resolves.
  After selection, non-selected provider keys are treated as inactive until selected.
- Sandbox SSH auth material (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus per-agent overrides) is active only
  when the effective sandbox backend is `ssh` for the default agent or an enabled agent.
- 如果符合以下任一條件，則 `gateway.remote.token` / `gateway.remote.password` SecretRefs 處於啟用狀態：
  - `gateway.mode=remote`
  - 已設定 `gateway.remote.url`
  - `gateway.tailscale.mode` 為 `serve` 或 `funnel`
  - 在沒有那些遠端表面的本機模式下：
    - 當 token 驗證可以生效且未設定 env/auth token 時，`gateway.remote.token` 處於啟用狀態。
    - 僅當 password 驗證可以生效且未設定 env/auth password 時，`gateway.remote.password` 處於啟用狀態。
- 當設定 `OPENCLAW_GATEWAY_TOKEN` (或 `CLAWDBOT_GATEWAY_TOKEN`) 時，`gateway.auth.token` SecretRef 對於啟動驗證解析處於非啟用狀態，因為 env token 輸入在該執行時期中優先。

## Gateway 驗證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，gateway 啟動/重新載入會明確記錄
表面狀態：

- `active`：SecretRef 是有效驗證表面的一部分，且必須解析。
- `inactive`：SecretRef 在此執行時期中被忽略，因為另一個驗證表面優先，
  或因為遠端驗證已停用/未啟用。

這些條目會以 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含有效表面策略使用的原因，
因此您可以看到憑證為何被視為啟用或非啟用。

## 上架參照預檢

當上架以互動模式執行且您選擇 SecretRef 儲存時，OpenClaw 會在儲存前執行預檢驗證：

- Env refs：驗證 env var 名稱並確認在設定期間可看到非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析的值類型。
- 快速入門重複使用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，上架會在探針/儀表板啟動之前解析它 (針對 `env`、`file` 和 `exec` refs)，並使用相同的快速失敗閘道。

如果驗證失敗，onboarding 會顯示錯誤並讓您重試。

## SecretRef 契約

在所有地方使用同一個物件形狀：

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
- `id` 不得包含 `.` 或 `..` 作為以斜線分隔的路徑區段 (例如 `a/../b` 會被拒絕)

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

- 透過 `allowlist` 選擇性提供允許清單。
- 遺失/空的環境變數值會導致解析失敗。

### 檔案提供者

- 從 `path` 讀取本機檔案。
- `mode: "json"` 預期 JSON 物件 payload 並將 `id` 解析為指標。
- `mode: "singleValue"` 預期 ref id `"value"` 並傳回檔案內容。
- 路徑必須通過擁有權/權限檢查。
- Windows fail-closed 說明：如果路徑無法使用 ACL 驗證，解析將會失敗。僅針對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全檢查。

### Exec 提供者

- 執行設定的絕對二進位檔案路徑，不使用 shell。
- 根據預設，`command` 必須指向一般檔案 (不是符號連結)。
- 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑 (例如 Homebrew shims)。OpenClaw 會驗證解析後的目標路徑。
- 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用以取得套件管理器路徑（例如 `["/opt/homebrew"]`）。
- 支援逾時、無輸出逾時、輸出位元組限制、環境變數白名單及信任目錄。
- Windows 失敗封閉備註：如果無法針對指令路徑進行 ACL 驗證，解析將會失敗。僅針對信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全檢查。

要求承載 (stdin)：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

回應承載 (stdout)：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

選用性個別 ID 錯誤：

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

## 沙箱 SSH 驗證資料

核心 `ssh` 沙箱後端也支援 SSH 驗證資料的 SecretRefs：

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

- OpenClaw 會在沙箱啟動期間解析這些參照，而不是在每次 SSH 呼叫時延遲解析。
- 解析出的值會以嚴格權限寫入暫存檔，並用於產生的 SSH 設定中。
- 若有效的沙箱後端不是 `ssh`，這些參照會保持非作用中狀態，且不會阻擋啟動。

## 支援的憑證介面

正式的支援與不支援憑證列於：

- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)

執行時期產生或輪換的憑證，以及 OAuth 更新資料，故意排除在唯讀 SecretRef 解析之外。

## 必要行為與優先順序

- 無參照的欄位：保持不變。
- 有參照的欄位：在啟動期間於作用中介面上為必填。
- 如果同時存在純文字和參照，參照在支援的優先路徑上具有優先權。

警告與稽核訊號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時期警告)
- `REF_SHADOWED` (當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的稽核發現)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定同層級參照時，會忽略純文字值。

## 啟動觸發程序

Secret 啟動執行於：

- 啟動 (預檢加上最終啟動)
- 設定重新載入熱套用路徑
- 設定重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入

啟用合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止閘道啟動。
- 執行時期重新載入失敗會保留最後已知正確的快照。
- 為輔助程式/工具的輸出呼叫提供明確的每次呼叫通道 token，不會觸發 SecretRef 啟用；啟用點仍維持在啟動、重新載入，以及明確的 `secrets.reload`。

## 降級與恢復信號

當處於健康狀態後，在重新載入時啟用失敗，OpenClaw 會進入秘密降級狀態。

一次性系統事件和日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行時期保留最後已知正確的快照。
- 恢復：在下一次成功啟用後發出一次。
- 處於降級狀態時重複失敗會記錄警告，但不會大量發送事件。
- 啟動快速失敗不會發出降級事件，因為執行時期從未變為啟用狀態。

## 指令路徑解析

指令路徑可以透過閘道快照 RPC 選擇支援的 SecretRef 解析。

主要有兩種行為：

- 嚴格指令路徑（例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote`）會從啟用快照讀取，並在所需的 SecretRef 無法取得時快速失敗。
- 唯讀指令路徑（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及唯讀 doctor/config 修復流程）也偏好啟用快照，但在該指令路徑中無法取得目標 SecretRef 時會降級，而不是中止。

唯讀行為：

- 當閘道正在執行時，這些指令會優先從啟用快照讀取。
- 如果閘道解析不完整或閘道無法取得，它們會嘗試針對特定指令介面進行目標本地回退。
- 如果目標 SecretRef 仍然無法取得，該指令會繼續執行並產生降級的唯讀輸出以及明確的診斷訊息（例如「已設定但在該指令路徑中無法取得」）。
- 此降級行為僅限於指令本身。它不會削弱執行時期啟動、重新載入或 send/auth 路徑。

其他註記：

- 後端密鑰輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

發現結果包括：

- 靜態明文值 (`openclaw.json`、`auth-profiles.json`、`.env`，以及產生的 `agents/*/agent/models.json`)
- 產生的 `models.json` 項目中的明文敏感提供者標頭殘留
- 未解析的參照
- 優先順序遮蔽 (`auth-profiles.json` 優先於 `openclaw.json` 參照)
- 舊版殘留 (`auth.json`、OAuth 提醒)

Exec 說明：

- 預設情況下，稽核會跳過 exec SecretRef 可解析性檢查，以避免指令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec 提供者。

標頭殘留說明：

- 敏感提供者標頭偵測基於名稱啟發式 (常見的認證/憑證標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`)。

### `secrets configure`

互動式輔助程式，能夠：

- 先設定 `secrets.providers` (`env`/`file`/`exec`，新增/編輯/移除)
- 讓您針對單一代理程式範圍，選取 `openclaw.json` 中支援的承載密鑰欄位，以及 `auth-profiles.json`
- 可以直接在目標選擇器中建立新的 `auth-profiles.json` 對應
- 擷取 SecretRef 詳細資料 (`source`、`provider`、`id`)
- 執行飛前解析
- 可立即套用

Exec 說明：

- 除非設定了 `--allow-exec`，否則飛前檢查會跳過 exec SecretRef 檢查。
- 如果您直接從 `configure --apply` 套用，且計畫包含 exec 參照/提供者，請在套用步驟中也保持 `--allow-exec` 為已設定狀態。

實用的模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 套用預設值：

- 從指定提供者的 `auth-profiles.json` 中清除符合的靜態憑證
- 從 `auth.json` 中清除舊版的靜態 `api_key` 項目
- 從 `<config-dir>/.env` 中清除符合的已知 Secret 行

### `secrets apply`

套用儲存的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Exec 備註：

- 除非設定了 `--allow-exec`，否則 dry-run 會跳過 exec 檢查。
- 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/提供者的計畫。

如需嚴格的 target/path 合約詳細資訊和確切的拒絕規則，請參閱：

- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)

## 單向安全原則

OpenClaw 刻意不寫入包含歷史純文字 Secret 值的回溯備份。

安全模型：

- 寫入模式前必須先通過 preflight
- 在提交前會驗證執行階段啟用
- apply 會使用原子檔案取代來更新檔案，並在失敗時盡力還原

## 舊版驗證相容性說明

對於靜態憑證，執行階段不再依賴純文字的舊版驗證儲存。

- 執行階段憑證來源是已解析的記憶體內部快照。
- 舊版的靜態 `api_key` 項目在被發現時會被清除。
- OAuth 相關的相容性行為保持獨立。

## Web UI 備註

有些 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易設定。

## 相關文件

- CLI 指令：[secrets](/zh-Hant/cli/secrets)
- 計畫合約詳細資訊：[Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)
- 憑證範圍：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- 驗證設定：[Authentication](/zh-Hant/gateway/authentication)
- 安全狀態：[Security](/zh-Hant/gateway/security)
- 環境優先順序：[Environment Variables](/zh-Hant/help/environment)

import en from "/components/footer/en.mdx";

<en />
