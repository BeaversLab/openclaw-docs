---
summary: "機密管理：SecretRef 合約、執行時期快照行為，以及安全的單向清除"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "機密管理"
sidebarTitle: "機密管理"
---

OpenClaw 支援額外的 SecretRefs，因此支援的憑證不需要以純文字形式儲存在設定中。

<Note>純文字仍然有效。SecretRefs 針對每個憑證為選用功能。</Note>

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
- 非使用中的參照會發出代碼為 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命診斷訊息。

<AccordionGroup>
  <Accordion title="非作用中層面範例">
    - 已停用的頻道/帳戶項目。
    - 沒有任何已啟用帳戶繼承的頂層頻道憑證。
    - 已停用的工具/功能層面。
    - 未被 `tools.web.search.provider` 選取的網路搜尋提供者特定金鑰。在自動模式（未設定提供者）下，金鑰會依照優先順序被查詢以進行提供者自動偵測，直到其中一個解析成功為止。選取後，未被選取的提供者金鑰將被視為非作用中，直到被選中為止。
    - Sandbox SSH 驗證資料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，加上各個代理程式的覆寫）僅在預設代理程式或已啟用代理程式的有效 Sandbox 後端為 `ssh` 時才會啟用。
    - 如果符合以下任一條件，`gateway.remote.token` / `gateway.remote.password` SecretRefs 為啟用狀態：
      - `gateway.mode=remote`
      - 已設定 `gateway.remote.url`
      - `gateway.tailscale.mode` 為 `serve` 或 `funnel`
      - 在沒有這些遠端層面的本機模式中：
        - 當 Token 驗證可以優先使用且未設定環境變數/驗證 Token 時，`gateway.remote.token` 為啟用狀態。
        - 僅當密碼驗證可以優先使用且未設定環境變數/驗證密碼時，`gateway.remote.password` 為啟用狀態。
    - 當設定 `OPENCLAW_GATEWAY_TOKEN` 時，`gateway.auth.token` SecretRef 在啟動驗證解析時處於非啟用狀態，因為環境變數 Token 輸入在該執行時期中優先使用。

  </Accordion>
</AccordionGroup>

## 閘道驗證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，Gateway 啟動/重新載入會明確記錄層面狀態：

- `active`：SecretRef 是有效認證表面的一部分，必須被解析。
- `inactive`：SecretRef 在此執行時期被忽略，因為另一個認證表面優先，或者是因為遠端認證已停用/未啟用。

這些條目會以 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含使用中表面策略所使用的原因，因此您可以查看憑證被視為使用中或非使用中的原因。

## 入站參考預檢

當入站在互動模式下執行，且您選擇 SecretRef 儲存時，OpenClaw 會在儲存前執行預檢驗證：

- Env refs：驗證環境變數名稱，並確認在設定期間可見到非空值。
- 提供者參照 (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析後的數值類型。
- Quickstart 重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，onboarding 會在 probe/dashboard bootstrap 之前（針對 `env`、`file` 和 `exec` 參照）使用相同的 fail-fast 閘道來解析它。

如果驗證失敗，入站會顯示錯誤並讓您重試。

## SecretRef 合約

到處使用同一種物件形狀：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    支援的 SecretInput 欄位也接受精確的字串簡寫：

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
    ```

    驗證：

    - `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必須符合 `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    驗證：

    - `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必須是絕對 JSON 指標 (`/...`)
    - 區段中的 RFC6901 跳脫：`~` => `~0`, `/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    驗證：

    - `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` 不得包含 `.` 或 `..` 作為斜線分隔的路徑區段（例如 `a/../b` 會被拒絕）

  </Tab>
</Tabs>

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

<AccordionGroup>
  <Accordion title="Env provider">
    - 透過 `allowlist` 提供選用性允許清單。
    - 遺漏/空的環境變數值會導致解析失敗。

  </Accordion>
  <Accordion title="File provider">
    - 從 `path` 讀取本機檔案。
    - `mode: "json"` 預期 JSON 物件 payload 並將 `id` 解析為指標。
    - `mode: "singleValue"` 預期參照 ID `"value"` 並傳回檔案內容。
    - 路徑必須通過擁有權/權限檢查。
    - Windows 失敗關閉說明：如果路徑無法進行 ACL 驗證，解析將會失敗。僅針對受信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

  </Accordion>
  <Accordion title="Exec 提供者">
    - 執行設定的絕對二進制路徑，不使用 shell。
    - 根據預設，`command` 必須指向一般檔案（而非符號連結）。
    - 設定 `allowSymlinkCommand: true` 以允許符號連結指令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
    - 為套件管理器路徑將 `allowSymlinkCommand` 與 `trustedDirs` 配對（例如 `["/opt/homebrew"]`）。
    - 支援逾時、無輸出逾時、輸出位元組限制、環境變數白名單和信任目錄。
    - Windows 失敗關閉說明：如果指令路徑無法進行 ACL 驗證，解析將會失敗。僅針對信任的路徑，在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

    要求 payload (stdin)：

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    回應 payload (stdout)：

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    可選的各 ID 錯誤：

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

## 檔案支援的 API 金鑰

請勿在設定 `env` 區塊中放入 `file:...` 字串。`env` 區塊是
字面且無法覆寫的，因此 `file:...` 不會被解析。

請改用支援的憑證欄位上的檔案 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

對於 `mode: "singleValue"`，SecretRef `id` 為 `"value"`。對於
`mode: "json"`，請使用絕對 JSON 指標，例如
`"/providers/xai/apiKey"`。

請參閱 [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface) 以了解
接受 SecretRef 的設定欄位。

## Exec 整合範例

<AccordionGroup>
  <Accordion title="1Password CLI">
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
  </Accordion>
  <Accordion title="HashiCorp Vault CLI">
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
  </Accordion>
  <Accordion title="sops">
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
  </Accordion>
</AccordionGroup>

## MCP 伺服器環境變數

透過 `plugins.entries.acpx.config.mcpServers` 設定的 MCP 伺服器環境變數支援 SecretInput。這可確保 API 金鑰和令牌不會以明文形式儲存在設定中：

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

純文字字串值仍然有效。像 `${MCP_SERVER_API_KEY}` 這樣的環境範本參照和 SecretRef 物件會在 MCP 伺服器程序生成之前的閘道啟用期間解析。與其他 SecretRef 介面一樣，未解析的參照只會在 `acpx` 外掛程式實際處於啟用狀態時才會阻擋啟用。

## Sandbox SSH 認證資料

核心 `ssh` sandbox 後端也支援針對 SSH 認證資料的 SecretRefs：

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

- OpenClaw 會在 sandbox 啟用期間解析這些參照，而不是在每次 SSH 呼叫時延遲解析。
- 解析出的值會被寫入具有嚴格權限的暫存檔案中，並用於生成的 SSH 設定。
- 如果實際使用的 sandbox 後端不是 `ssh`，這些參照將保持非啟用狀態，且不會阻擋啟動。

## 支援的憑證介面

標準的支援與不支援憑證列於：

- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)

<Note>執行時期產生或輪替的憑證以及 OAuth 重新整理資料被刻意排除在唯讀 SecretRef 解析之外。</Note>

## 必要行為與優先順序

- 不含參照的欄位：保持不變。
- 含有參照的欄位：在啟用期間對於啟用中的介面為必填項目。
- 如果同時存在明文和參照，參照在支援的優先路徑中優先。
- 修訂標記 `__OPENCLAW_REDACTED__` 是保留給內部設定修訂/還原使用的，作為字面提交的設定資料時將被拒絕。

警告與稽核信號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時警告)
- `REF_SHADOWED` (當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的稽核發現)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於明文 `serviceAccount`。
- 當設定了同層級參照時，明文值將被忽略。

## 啟用觸發條件

Secret 啟用執行於：

- 啟動 (預檢加上最終啟用)
- 設定重新載入熱套用路徑
- 設定重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入
- Gateway 設定寫入 RPC 預檢 (`config.set` / `config.apply` / `config.patch`)，用於在持久化編輯之前解析提交的設定負載中的作用中 SecretRef

啟用合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 Gateway 啟動。
- 執行時重新載入失敗會保留最後已知良好的快照。
- Write-RPC 預檢失敗會拒絕提交的設定，並保持磁碟設定和作用中執行時快照不變。
- 為輔助工具/工具的出站呼叫提供明確的單次呼叫通道權杖並不會觸發 SecretRef 啟用；啟用點仍為啟動、重新載入和明確的 `secrets.reload`。

## 降級與恢復信號

當在健康狀態後重新載入時啟用失敗，OpenClaw 會進入降級 secrets 狀態。

一次性系統事件和日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行時保留最後已知良好的快照。
- 已恢復：在下一次成功啟用後發出一次。
- 已處於降級狀態時重複失敗會記錄警告，但不會濫發事件。
- 啟動快速失敗不會發出降級事件，因為執行時從未變為作用中。

## 命令路徑解析

命令路徑可以透過 Gateway 快照 RPC 選擇支援的 SecretRef 解析。

有兩種廣泛的行為：

<Tabs>
  <Tab title="Strict command paths">
    例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote` 當它需要遠端共享秘密參照時。它們從作用中快照讀取，並在所需的 SecretRef 不可用時快速失敗。
  </Tab>
  <Tab title="唯讀指令路徑">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 以及唯讀的診斷/設定修復流程。它們也優先使用作用中快照，但在該指令路徑中無法取得目標 SecretRef 時會降級而不是中止。

    唯讀行為：

    - 當閘道正在執行時，這些指令會優先從作用中快照讀取。
    - 如果閘道解析未完成或閘道無法使用，它們會嘗試針對特定指令介面進行目標本機降級。
    - 如果目標 SecretRef 仍然無法取得，指令會繼續執行並輸出降級的唯讀結果與明確的診斷訊息，例如「已設定但在此指令路徑中無法使用」。
    - 這種降级行為僅限於指令本身。它不會削弱執行時期啟動、重新載入或傳送/驗證路徑。

  </Tab>
</Tabs>

其他說明：

- 後端 Secret 輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

<Steps>
  <Step title="稽核目前狀態">```bash openclaw secrets audit --check ```</Step>
  <Step title="設定 SecretRefs">```bash openclaw secrets configure ```</Step>
  <Step title="重新稽核">```bash openclaw secrets audit --check ```</Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    發現的結果包括：

    - 靜態純文字值 (`openclaw.json`、`auth-profiles.json`、`.env` 和產生的 `agents/*/agent/models.json`)
    - 產生的 `models.json` 項目中的純文字敏感提供者標頭殘留
    - 未解析的參照
    - 優先順序遮蔽 (`auth-profiles.json` 優先於 `openclaw.json` 參照)
    - 舊版殘留 (`auth.json`、OAuth 提醒)

    Exec 說明：

    - 預設情況下，稽核會跳過 exec SecretRef 可解析性檢查，以避免指令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec 提供者。

    標頭殘留說明：

    - 敏感提供者標頭偵測是基於名稱啟發式 (常見的 auth/credential 標頭名稱和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`)。

  </Accordion>
  <Accordion title="secrets configure">
    互動式輔助工具：

    - 首先設定 `secrets.providers`（`env`/`file`/`exec`，新增/編輯/移除）
    - 讓您在 `openclaw.json` 中選擇支援的秘密攜帶欄位，並針對單一 Agent 範圍選擇 `auth-profiles.json`
    - 可以直接在目標選擇器中建立新的 `auth-profiles.json` 映射
    - 擷取 SecretRef 詳細資訊（`source`、`provider`、`id`）
    - 執行預檢解析
    - 可以立即套用

    Exec 備註：

    - 除非設定了 `--allow-exec`，否則預檢會跳過 exec SecretRef 檢查。
    - 如果您直接從 `configure --apply` 套用，且計畫包含 exec 參照/提供者，請在套用步驟中也保持 `--allow-exec` 的設定。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 套用預設值：

    - 從目標提供者的 `auth-profiles.json` 中清除匹配的靜態憑證
    - 從 `auth.json` 中清除舊版靜態 `api_key` 項目
    - 從 `<config-dir>/.env` 中清除匹配的已知秘密行

  </Accordion>
  <Accordion title="secrets apply">
    套用已儲存的計畫：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Exec 備註：

    - 除非設定了 `--allow-exec`，否則 dry-run 會跳過 exec 檢查。
    - 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/提供者的計畫。

    如需嚴格的目標/路徑合約詳細資訊和確切的拒絕規則，請參閱 [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 單向安全原則

<Warning>OpenClaw 故意不會寫入包含歷史純文字秘密值的回滾備份。</Warning>

安全模型：

- 寫入模式前必須先成功完成預檢
- 執行時期啟動會在提交前經過驗證
- apply 更新檔案時使用原子檔案替換，並在失敗時盡力還原

## 舊版驗證相容性注意事項

對於靜態憑證，執行時不再依賴純文字的舊版驗證儲存。

- 執行時憑證來源是已解析的記憶體內部快照。
- 舊版靜態 `api_key` 項目在被發現時會被清除。
- 與 OAuth 相關的相容性行為保持分開。

## Web UI 注意事項

某些 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易設定。

## 相關

- [驗證](/zh-Hant/gateway/authentication) — 驗證設定
- [CLI: secrets](/zh-Hant/cli/secrets) — CLI 指令
- [環境變數](/zh-Hant/help/environment) — 環境優先順序
- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface) — 憑證介面
- [Secrets Apply 套用計畫契約](/zh-Hant/gateway/secrets-plan-contract) — 計畫契約詳情
- [安全性](/zh-Hant/gateway/security) — 安全性姿態
