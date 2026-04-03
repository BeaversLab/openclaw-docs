---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# 機密管理

OpenClaw 支援額外的 SecretRefs，因此支援的憑證不需要以純文字形式儲存在設定中。

純文字仍然有效。SecretRefs 對每個憑證都是選用的。

## 目標與執行時模型

機密會解析為記憶體內的執行時快照。

- 解析在啟用期間是急切的，而不是在請求路徑上延遲進行。
- 當有效的使用中 SecretRef 無法解析時，啟動會快速失敗。
- 重新載入使用原子交換：完全成功，或保留最後已知良好的快照。
- SecretRef 政策違規（例如將 OAuth 模式驗證設定檔與 SecretRef 輸入結合）會在執行階段置換之前導致啟用失敗。
- 執行階段請求僅從現有的記憶體內部快照讀取。
- 在第一次成功啟用/載入設定後，執行階段程式碼路徑會持續讀取該現有的記憶體內部快照，直到成功的重新載入將其置換。
- 輸出傳遞路徑也會從該現有快照讀取（例如 Discord 回覆/執行緒傳遞和 Telegram 動作傳送）；它們不會在每次傳送時重新解析 SecretRefs。

這可確保 secret-provider 停機不會影響熱請求路徑。

## Active-surface filtering

SecretRefs 僅在實際有效的表面上進行驗證。

- 啟用的表面：未解析的參照會阻擋啟動/重新載入。
- 未啟用的表面：未解析的參照不會阻擋啟動/重新載入。
- 未啟用的參照會發出代碼 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命診斷訊息。

未啟用表面的範例：

- 已停用的頻道/帳戶項目。
- 沒有任何已啟用帳戶繼承的頂層頻道憑證。
- 已停用的工具/功能表面。
- 未被 `tools.web.search.provider` 選取的網路搜尋提供者特定金鑰。
  在自動模式（未設定提供者）下，會按優先順序查詢金鑰以進行提供者自動偵測，直到解析出其中一個為止。
  選取後，未被選取的提供者金鑰將被視為未啟用，直到被選取為止。
- Sandbox SSH 驗證資料（`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`，加上各個代理程式的覆寫設定）僅在預設代理程式或已啟用代理程式的有效沙箱後端為 `ssh` 時才會啟用。
- `gateway.remote.token` / `gateway.remote.password` SecretRefs 在以下任一情況為真時會啟用：
  - `gateway.mode=remote`
  - 已設定 `gateway.remote.url`
  - `gateway.tailscale.mode` 為 `serve` 或 `funnel`
  - 在沒有這些遠端表面的本機模式下：
    - 當 Token 認證可以勝出且未設定 env/auth token 時，`gateway.remote.token` 為啟用狀態。
    - 只有在密碼認證可以勝出且未設定 env/auth 密碼時，`gateway.remote.password` 才會啟用。
- 當設定 `OPENCLAW_GATEWAY_TOKEN` 時，`gateway.auth.token` SecretRef 對於啟動認證解析而言為非啟用狀態，因為在該執行階段中 env token 輸入會勝出。

## Gateway 認證介面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，Gateway 啟動/重新載入會明確記錄
介面狀態：

- `active`：SecretRef 是有效認證介面的一部分，且必須解析。
- `inactive`：SecretRef 在此執行階段中會被忽略，因為另一個認證介面勝出，或
  因為遠端認證已停用/未啟用。

這些項目會使用 `SECRETS_GATEWAY_AUTH_SURFACE` 進行記錄，並包含啟用介面策略使用的原因，因此您可以查看憑證被視為啟用或非啟用的原因。

## 上線參照預檢

當上線程序以互動模式執行且您選擇 SecretRef 儲存時，OpenClaw 會在儲存之前執行預檢驗證：

- Env refs：驗證 env var 名稱，並確認在設定期間可以看到非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析後的數值類型。
- 快速入門重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，上線程序會在 probe/dashboard bootstrap 之前（針對 `env`、`file` 和 `exec` 參照）使用相同的快速失敗閘道來解析它。

如果驗證失敗，上線程序會顯示錯誤並讓您重試。

## SecretRef 合約

到處使用同一種物件形狀：

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
- 區段中的 RFC6901 跳脫字元：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作為以斜線分隔的路徑區段（例如 `a/../b` 會被拒絕）

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

### 環境變數提供者

- 透過 `allowlist` 進行選用性允許列表。
- 遺失/空白的環境變數值將導致解析失敗。

### 檔案提供者

- 從 `path` 讀取本機檔案。
- `mode: "json"` 預期 JSON 物件 payload，並將 `id` 解析為指標。
- `mode: "singleValue"` 預期參照 ID `"value"` 並傳回檔案內容。
- 路徑必須通過擁有權/權限檢查。
- Windows 失敗關閉備註：如果路徑無法使用 ACL 驗證，解析將會失敗。僅針對受信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

### 執行提供者

- 執行設定的絕對二進位路徑，不使用 shell。
- 根據預設，`command` 必須指向一般檔案（而非符號連結）。
- 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
- 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用，以用於套件管理器路徑（例如 `["/opt/homebrew"]`）。
- 支援逾時、無輸出逾時、輸出位元組限制、環境變數允許列表，以及受信任目錄。
- Windows 失敗關閉注意事項：如果命令路徑的 ACL 驗證不可用，解析將會失敗。僅針對受信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

請求承載 (stdin)：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

回應承載 (stdout)：

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

## MCP 伺服器環境變數

透過 `plugins.entries.acpx.config.mcpServers` 設定的 MCP 伺服器環境變數支援 SecretInput。這可將 API 金鑰和權杖排除在純文字設定之外：

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

純文字字串值仍然有效。像 `${MCP_SERVER_API_KEY}` 這樣的環境範本參照以及 SecretRef 物件，會在產生 MCP 伺服器程序之前的閘道啟動期間解析。與其他 SecretRef 表面一樣，未解析的參照只有在 `acpx` 外掛程式實際啟用時才會阻擋啟動程序。

## Sandbox SSH 驗證資料

核心 `ssh` sandbox 後端也支援用於 SSH 驗證資料的 SecretRef：

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

- OpenClaw 會在 sandbox 啟動期間解析這些參照，而不是在每次 SSH 呼叫時延遲解析。
- 解析後的值會寫入具有限制權限的暫存檔案中，並用於產生的 SSH 設定。
- 如果實際的 sandbox 後端不是 `ssh`，這些參照將保持非作用中狀態，且不會阻擋啟動。

## 支援的憑證表面

標準的支援與不支援憑證列於：

- [SecretRef 憑證表面](/en/reference/secretref-credential-surface)

執行時期產生或輪換的憑證以及 OAuth 重新整理資料，被刻意排除在唯讀 SecretRef 解析之外。

## 必要的行為與優先順序

- 不含參照的欄位：保持不變。
- 含參照的欄位：在啟動期間於作用中表面上為必填項目。
- 如果同時存在純文字和參照，參照在支援的優先路徑上具有優先權。
- 編修標記 `__OPENCLAW_REDACTED__` 保留供內部設定編修/還原使用，並且會拒絕作為字面提交的設定資料。

警告和審計訊號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時期警告)
- `REF_SHADOWED` (審計發現當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參考時)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定了同層級參考時，會忽略純文字值。

## 啟動觸發器

Secret 啟動執行於：

- 啟動 (預檢加上最終啟動)
- 設定重新載入熱套用路徑
- 設定重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入
- Gateway 寫入 RPC 預檢 (`config.set` / `config.apply` / `config.patch`)，用於在持續變更之前檢查提交的設定內容中有效表面 SecretRef 的可解析性

啟動合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 gateway 啟動。
- 執行階段重新載入失敗會保留最後已知良好的快照。
- 寫入 RPC 預檢失敗會拒絕提交的設定，並保持磁碟設定和作用中執行階段快照不變。
- 為輔助程式/工具呼叫提供明確的單次呼叫通道 token 並不會觸發 SecretRef 啟動；啟動點維持為啟動、重新載入和明確的 `secrets.reload`。

## 降級與恢復信號

當在健康狀態後重新載入時啟動失敗，OpenClaw 會進入降級 secrets 狀態。

單次系統事件和日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行階段保留最後已知良好的快照。
- 恢復：在下次成功啟動後發出一次。
- 已處於降級狀態時的重複失敗會記錄警告，但不會濫發事件。
- 啟動快速失敗不會發出降級事件，因為執行階段從未啟動。

## 指令路徑解析

指令路徑可以選擇透過 gateway 快照 RPC 進行支援的 SecretRef 解析。

有兩種主要的行為：

- 嚴格指令路徑 (例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote`) 從作用中快照讀取，當所需的 SecretRef 不可用時會快速失敗。
- 唯讀指令路徑（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和唯讀 doctor/config repair 流程）也偏好使用主動快照，但在該指令路徑中目標 SecretRef 不可用時，會降級執行而不是中止。

唯讀行為：

- 當閘道正在執行時，這些指令會先從主動快照讀取。
- 如果閘道解析不完整或閘道不可用，它們會嘗試針對特定指令介面進行本機備援。
- 如果目標 SecretRef 仍然不可用，指令會繼續執行並輸出降級的唯讀結果，以及明確的診斷資訊，例如「已設定但在本指令路徑中不可用」。
- 這種降級行為僅限於指令本身。它不會削弱執行階段啟動、重新載入，或 send/auth 路徑。

其他註記：

- 後端 Secret 輪替後的快照重新整理由 `openclaw secrets reload` 處理。
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

- 靜態純文字值（`openclaw.json`、`auth-profiles.json`、`.env` 和產生的 `agents/*/agent/models.json`）
- 產生的 `models.json` 項目中的純文字敏感 Provider 標頭殘留
- 未解析的參考
- 優先順序遮蔽（`auth-profiles.json` 優先於 `openclaw.json` 參考）
- 舊版殘留（`auth.json`、OAuth 提醒）

執行註記：

- 預設情況下，稽核會跳過 exec SecretRef 解析檢查，以避免指令產生副作用。
- 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec providers。

標頭殘留註記：

- 敏感 Provider 標頭偵測是基於名稱啟發式（常見的 auth/credential 標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

互動式輔助程式功能如下：

- 首先設定 `secrets.providers`（`env`/`file`/`exec`，新增/編輯/移除）
- 讓您為單一 Agent 範圍在 `openclaw.json` 中選取支援的秘密欄位，加上 `auth-profiles.json`
- 可直接在目標選擇器中建立新的 `auth-profiles.json` 對應
- 擷取 SecretRef 詳細資料（`source`、`provider`、`id`）
- 執行 preflight 解析
- 可以立即套用

Exec 注意事項：

- 除非設定了 `--allow-exec`，否則 Preflight 會跳過 exec SecretRef 檢查。
- 如果您直接從 `configure --apply` 套用，且計畫包含 exec refs/providers，請在套用步驟中也保持 `--allow-exec` 為已設定狀態。

實用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 套用預設值：

- 從目標供應商的 `auth-profiles.json` 中清除相符的靜態憑證
- 從 `auth.json` 中清除舊版的靜態 `api_key` 項目
- 從 `<config-dir>/.env` 中清除相符的已知 secret 行

### `secrets apply`

套用已儲存的計畫：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Exec 注意事項：

- 除非設定了 `--allow-exec`，否則 dry-run 會跳過 exec 檢查。
- 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/providers 的計畫。

如需嚴格的目標/路徑合約詳細資訊和確切的拒絕規則，請參閱：

- [Secrets 套用計畫合約](/en/gateway/secrets-plan-contract)

## 單向安全原則

OpenClaw 故意不寫入包含歷史純文字 secret 值的回溯備份。

安全模型：

- preflight 必須在寫入模式之前成功
- 執行時啟用會在提交前進行驗證
- 套用作業使用原子檔案取代來更新檔案，並在失敗時盡力還原

## 舊版驗證相容性注意事項

對於靜態憑證，執行時不再依賴純文字的舊版驗證儲存。

- 執行時期憑證來源是已解析的記憶體即時快照。
- 偵測到舊版靜態 `api_key` 項目時會將其清除。
- OAuth 相關的相容性行為保持分離。

## Web UI 注意事項

部分 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易設定。

## 相關文件

- CLI 指令：[secrets](/en/cli/secrets)
- 計畫合約詳細資訊：[Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)
- 憑證介面：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- 驗證設定：[Authentication](/en/gateway/authentication)
- 安全狀態：[Security](/en/gateway/security)
- 環境優先順序：[Environment Variables](/en/help/environment)
