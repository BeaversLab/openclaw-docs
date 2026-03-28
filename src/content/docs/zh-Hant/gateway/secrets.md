---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# 機密管理

OpenClaw 支援新增 SecretRef，因此支援的憑證不需要以純文字形式儲存在設定中。

純文字仍然有效。SecretRef 針對每個憑證為選用加入。

## 目標與執行時期模型

機密會解析成記憶體內的執行時期快照。

- 解析是在啟用期間急切執行，而非在請求路徑上延遲執行。
- 當實際有效的 SecretRef 無法解析時，啟動會快速失敗。
- 重新載入使用原子交換：完全成功，或保留最後已知良好的快照。
- 執行時期請求僅從現有的記憶體內快照讀取。
- 傳遞路徑也從該現有快照讀取（例如 Discord 回覆/串列傳遞和 Telegram 動作傳送）；它們不會在每次傳送時重新解析 SecretRef。

這能讓機密提供者中斷不影響熱請求路徑。

## 有效介面過濾

SecretRef 僅在實際有效的介面上進行驗證。

- 已啟用的介面：未解析的參照會阻擋啟動/重新載入。
- 未啟用的介面：未解析的參照不會阻擋啟動/重新載入。
- 非有效參照會發出程式碼 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命性診斷。

非有效介面範例：

- 已停用的頻道/帳戶項目。
- 沒有已啟用帳戶繼承的頂層頻道憑證。
- 已停用的工具/功能介面。
- 未被 `tools.web.search.provider` 選取的網路搜尋提供者專屬金鑰。
  在自動模式（未設定提供者）中，會依照優先順序查詢金鑰以進行提供者自動偵測，直到解析出一個為止。
  選取後，未選取的提供者金鑰會被視為非有效，直到被選取為止。
- Sandbox SSH 驗證資料（`agents.defaults.sandbox.ssh.identityData`、
  `certificateData`、`knownHostsData`，加上各代理程式的覆寫）僅在預設代理程式或已啟用代理程式的有效沙箱後端為 `ssh` 時才有效。
- `gateway.remote.token` / `gateway.remote.password` SecretRef 若符合以下任一條件則為有效：
  - `gateway.mode=remote`
  - `gateway.remote.url` 已配置
  - `gateway.tailscale.mode` 是 `serve` 或 `funnel`
  - 在沒有這些遠端表面的本機模式下：
    - 當 Token 認證可以生效且未配置環境/認證 Token 時，`gateway.remote.token` 為啟用狀態。
    - 僅當密碼認證可以生效且未配置環境/認證密碼時，`gateway.remote.password` 才為啟用狀態。
- 當設定 `OPENCLAW_GATEWAY_TOKEN`（或 `CLAWDBOT_GATEWAY_TOKEN`）時，`gateway.auth.token` SecretRef 對於啟動認證解析處於非啟用狀態，因為環境變數 Token 輸入在該執行時中優先。

## 閘道認證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 時，閘道啟動/重新載入日誌會
明確記錄表面狀態：

- `active`：SecretRef 是有效認證表面的一部分，必須解析。
- `inactive`：由於另一個認證表面獲勝，或者因為遠端認證已停用/未啟用，SecretRef 在此執行階段中被忽略。

這些條目會使用 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含有效表面策略使用的原因，因此您可以查看憑證被視為有效或無效的原因。

## 載入參考預檢

當載入程式以互動模式執行並且您選擇 SecretRef 儲存時，OpenClaw 會在儲存之前執行預檢驗證：

- Env refs：驗證環境變數名稱，並確認在設定期間可以看到非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析後的數值類型。
- 快速入門重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，上線會在探針/儀表板啟動之前（針對 `env`、`file` 和 `exec` 參考）使用相同的快速失敗閘道來解析它。

如果驗證失敗，上線會顯示錯誤並讓您重試。

## SecretRef 契約

在任何地方使用同一種物件形狀：

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
- `id` 必須是絕對 JSON 指標（`/...`）
- 片段中的 RFC6901 轉義：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

驗證：

- `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作為以斜線分隔的路徑片段（例如 `a/../b` 會被拒絕）

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

- 透過 `allowlist` 的選用性允許清單。
- 遺失/空白的環境變數值會導致解析失敗。

### 檔案提供者

- 從 `path` 讀取本機檔案。
- `mode: "json"` 預期 JSON 物件承載，並將 `id` 解析為指標。
- `mode: "singleValue"` 預期參照 ID `"value"` 並傳回檔案內容。
- 路徑必須通過擁有權/權限檢查。
- Windows 失敗關閉註記：如果路徑無法進行 ACL 驗證，解析將會失敗。僅針對信任的路徑，在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

### Exec 提供者

- 執行設定的絕對二進位路徑，不使用 shell。
- 根據預設，`command` 必須指向一般檔案（而非符號連結）。
- 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
- 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用，用於套件管理程式路徑（例如 `["/opt/homebrew"]`）。
- 支援逾時、無輸出逾時、輸出位元組限制、環境變數允許清單以及受信任目錄。
- Windows 失敗關閉注意事項：如果指令路徑無法使用 ACL 驗證，解析將會失敗。僅針對受信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

要求載荷 (stdin)：

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

## Sandbox SSH 驗證素材

核心 `ssh` sandbox 後端也支援 SSH 驗證素材的 SecretRefs：

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

執行時間行為：

- OpenClaw 會在 sandbox 啟動期間解析這些參照，而不是在每次 SSH 呼叫期間延遲解析。
- 解析出的值會被寫入具有嚴格權限的暫存檔案中，並在產生的 SSH 設定中使用。
- 如果有效的 sandbox 後端不是 `ssh`，這些引用將保持非活動狀態，且不會阻礙啟動。

## 支援的憑證介面

標準的支援與不支援憑證列表於：

- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)

執行時產生或輪換的憑證以及 OAuth 更新材料被有意排除在唯讀 SecretRef 解析之外。

## 必要行為與優先順序

- 沒有引用的欄位：保持不變。
- 有引用的欄位：在啟動期間，於活動介面上為必填。
- 如果同時存在明文和引用，則引用在支援的優先順序路徑中優先。

警告與審計信號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時警告)
- `REF_SHADOWED` （當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的稽核發現）

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定了同層級參照時，將忽略純文字值。

## 啟動觸發條件

Secret 啟動執行於：

- 啟動（預檢加上最終啟動）
- 組態重新載入熱套用路徑
- 組態重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入

啟動合約：

- 成功時會以原子方式交換快照。
- 啟動失敗會中止 Gateway 啟動。
- 執行階段重新載入失敗會保留最後已知良好的快照。
- 向輔助程式/工具呼叫提供明確的單次呼叫通道 token 不會觸發 SecretRef 啟用；啟用點仍保持為啟動、重新載入及明確的 `secrets.reload`。

## 降級與恢復訊號

當在健康狀態後重新載入時啟用失敗，OpenClaw 會進入降級 secrets 狀態。

一次性系統事件與日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行階段保留最後已知良好的快照。
- 恢復：在下次成功啟用後發出一次。
- 處於降級狀態時的重複失敗會記錄警告，但不會濫發事件。
- 啟動時快速失敗不會發出降級事件，因為執行階段從未進入啟用狀態。

## 指令路徑解析

指令路徑可以選擇透過 gateway snapshot RPC 進行支援的 SecretRef 解析。

有兩種主要行為：

- 嚴格的指令路徑（例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote`）會從活動快照讀取，並在所需的 SecretRef 無法取得時快速失敗。
- 唯讀指令路徑（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和唯讀 doctor/config 修復流程）也偏好活動快照，但在該指令路徑中目標 SecretRef 無法取得時會降級執行而非中止。

唯讀行為：

- 當閘道正在執行時，這些指令會先從活動快照讀取。
- 如果閘道解析不完整或閘道無法取得，它們會嘗試針對特定指令介面進行目標本機回退。
- 如果目標 SecretRef 仍然不可用，指令將繼續執行，但會輸出降級的唯讀內容，並提供明確的診斷資訊（例如「已設定但在該指令路徑中不可用」）。
- 這種降級行為僅限於該指令。它不會削弱執行階段啟動、重新載入，或發送/驗證路徑。

其他注意事項：

- 後端秘密輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

```exec
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

檢查結果包括：

- 靜態的純文字值（`openclaw.json`、`auth-profiles.json`、`.env` 以及產生的 `agents/*/agent/models.json`）
- 產生的 `models.json` 項目中殘留的純文字敏感提供者標頭
- 未解析的參照
- 優先順序遮蔽（`auth-profiles.json` 優先於 `openclaw.json` refs）
- 舊版殘留（`auth.json`、OAuth 提醒）

執行備註：

- 預設情況下，稽核會跳過 exec SecretRef 可解析性檢查，以避免指令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec 提供者。

標頭殘留備註：

- 敏感提供者標頭偵測是基於名稱啟發式的（常見的 auth/credential 標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

互動式輔助工具：

- 先設定 `secrets.providers` (`env`/`file`/`exec`，新增/編輯/移除)
- 讓您能針對單一 agent 範圍，在 `openclaw.json` 加上 `auth-profiles.json` 來選擇支援的 secret 欄位
- 可以直接在目標選取器中建立新的 `auth-profiles.json` 對應
- 擷取 SecretRef 詳細資料 (`source`、`provider`、`id`)
- 執行預檢解析
- 可以立即套用

執行備註：

- 除非設定了 `--allow-exec`，否則預檢會略過 exec SecretRef 檢查。
- 如果您直接從 `configure --apply` 套用，且計畫包含 exec refs/providers，請在套用步驟中也保持設定 `--allow-exec`。

實用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 套用預設值：

- 從目標供應商的 `auth-profiles.json` 中清除匹配的靜態憑證
- 從 `auth.json` 中清除舊版的靜態 `api_key` 項目
- 從 `<config-dir>/.env` 中清除匹配的已知密碼行

### `secrets apply`

套用已儲存的計畫：

```exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

執行備註：

- 除非設定了 `--allow-exec`，否則 dry-run 會跳過執行檢查。
- 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/供應商的計畫。

如需嚴格的目標/路徑合約詳細資訊和確切的拒絕規則，請參閱：

- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)

## 單向安全政策

OpenClaw 故意不寫入包含歷史純文字金鑰值的還原備份。

安全模型：

- 預檢必須在寫入模式之前成功
- 執行時啟動在提交前會經過驗證
- 應用更新檔案時使用原子檔案替換，並在失敗時盡力還原

## 舊版認證相容性注意事項

對於靜態憑證，執行時環境不再依賴純文字的舊版認證儲存。

- 執行時憑證來源是已解析的記憶體內部快照。
- 舊版靜態 `api_key` 項目在發現時會被清除。
- OAuth 相關的相容性行為保持分開。

## Web UI 註記

某些 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易配置。

## 相關文件

- CLI 指令：[secrets](/zh-Hant/cli/secrets)
- 計畫合約細節：[Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)
- 憑證介面：[SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)
- 驗證設定：[驗證](/zh-Hant/gateway/authentication)
- 安全狀態：[安全性](/zh-Hant/gateway/security)
- 環境優先順序：[環境變數](/zh-Hant/help/environment)
