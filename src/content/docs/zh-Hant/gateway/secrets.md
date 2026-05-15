---
summary: "機密管理：SecretRef 合約、執行時期快照行為，以及安全的單向清理"
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
  <Accordion title="非活動介面範例">
    - 已停用的頻道/帳戶項目。
    - 沒有已啟用帳戶繼承的頂層頻道憑證。
    - 已停用的工具/功能介面。
    - 未被 `tools.web.search.provider` 選取的網頁搜尋供應商特定金鑰。在自動模式（未設定供應商）中，會根據優先順序查詢金鑰以進行供應商自動偵測，直到其中一個解析為止。選取後，未選取的供應商金鑰將被視為非活動，直到被選取為止。
    - Sandbox SSH 認證資料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，加上每個代理程式的覆寫值）只有在預設代理程式或已啟用代理程式的有效沙箱後端為 `ssh` 時才會啟用。
    - 如果符合以下任一條件，`gateway.remote.token` / `gateway.remote.password` SecretRef 為啟用狀態：
      - `gateway.mode=remote`
      - 已設定 `gateway.remote.url`
      - `gateway.tailscale.mode` 為 `serve` 或 `funnel`
      - 在沒有這些遠端介面的本機模式中：
        - 當 token 認證可以獲勝且未設定 env/auth token 時，`gateway.remote.token` 為啟用狀態。
        - 只有在密碼認證可以獲勝且未設定 env/auth 密碼時，`gateway.remote.password` 才為啟用狀態。
    - 當設定 `OPENCLAW_GATEWAY_TOKEN` 時，`gateway.auth.token` SecretRef 在啟動認證解析中為非活動狀態，因為 env token 輸入在該執行時間中獲勝。

  </Accordion>
</AccordionGroup>

## 閘道驗證表面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 時，閘道啟動/重新載入會明確記錄介面狀態：

- `active`：SecretRef 是有效驗證介面的一部分，必須被解析。
- `inactive`：由於另一個驗證介面優先，或是因為遠端驗證被停用/未啟用，SecretRef 在此執行階段中會被忽略。

這些條目會以 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含作用中介面策略所使用的理由，因此您可以查看憑證被視為作用中或非作用中的原因。

## 入站參考預檢

當入站在互動模式下執行，且您選擇 SecretRef 儲存時，OpenClaw 會在儲存前執行預檢驗證：

- Env refs：驗證環境變數名稱，並確認在設定期間可見到非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析後的數值類型。
- Quickstart 重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，入站會在探測/儀表板啟動之前（針對 `env`、`file` 和 `exec` 參考）使用相同的快速失敗閘道來解析它。

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
    - 區段中的 RFC6901 跳脫：`~` => `~0`，`/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    驗證：

    - `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` 不得包含 `.` 或 `..` 作為以斜線分隔的路徑區段 (例如 `a/../b` 會被拒絕)

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
  <Accordion title="Env 供應商">
    - 透過 `allowlist` 的選用允許清單。
    - 遺漏/空的環境變數值將導致解析失敗。

  </Accordion>
  <Accordion title="File provider">
    - 從 `path` 讀取本地檔案。
    - `mode: "json"` 期望 JSON 物件 payload，並將 `id` 解析為指標。
    - `mode: "singleValue"` 期望 ref id `"value"` 並傳回檔案內容。
    - 路徑必須通過擁有權/權限檢查。
    - Windows 失敗關閉說明：如果路徑無法進行 ACL 驗證，解析將會失敗。僅對於受信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全檢查。

  </Accordion>
  <Accordion title="Exec 提供者">
    - 執行設定的絕對二進位路徑，不透過 shell。
    - 預設情況下，`command` 必須指向一個常規檔案（而非符號連結）。
    - 設定 `allowSymlinkCommand: true` 以允許符號連結命令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
    - 將 `allowSymlinkCommand` 與 `trustedDirs` 搭配使用，以適用於套件管理器路徑（例如 `["/opt/homebrew"]`）。
    - 支援逾時、無輸出逾時、輸出位元組限制、環境變數白名單，以及受信任目錄。
    - Windows 失敗封閉 說明：如果命令路徑無法使用 ACL 驗證，解析將會失敗。僅針對受信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。

    Request payload (stdin):

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    Response payload (stdout):

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    Optional per-id errors:

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

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

透過 `plugins.entries.acpx.config.mcpServers` 設定的 MCP 伺服器環境變數支援 SecretInput。這可以確保 API 金鑰和權杖不會以明文形式儲存在設定中：

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

明文字串值仍然有效。類似 `${MCP_SERVER_API_KEY}` 的環境範本參考和 SecretRef 物件會在產生 MCP 伺服器程序之前的閘道啟動期間進行解析。與其他 SecretRef 介面一樣，只有當 `acpx` 外掛程式實際上處於啟用狀態時，未解析的參考才會阻擋啟動。

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

執行時期行為：

- OpenClaw 會在 sandbox 啟動期間解析這些參考，而不是在每次 SSH 呼叫時延遲解析。
- 解析後的值會以嚴格的權限寫入暫存檔，並在產生的 SSH 設定中使用。
- 如果實際的沙箱後端不是 `ssh`，這些參照將保持非作用中狀態，不會阻礙啟動。

## 支援的憑證介面

標準的支援與不支援憑證列於：

- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)

<Note>執行時期產生或輪換的憑證以及 OAuth 更新材料，被刻意排除在唯讀 SecretRef 解析之外。</Note>

## 必要行為與優先順序

- 沒有參照的欄位：保持不變。
- 有參照的欄位：在啟用期間於作用中表面上為必要項目。
- 如果同時存在純文字與參照，在支援的優先路徑上參照優先。
- 編輯哨兵 `__OPENCLAW_REDACTED__` 是保留給內部設定編輯/還原使用的，並會作為字面提交設定資料被拒絕。

警告與審計訊號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行時期警告)
- `REF_SHADOWED` (當 `auth-profiles.json` 憑證優先於 `openclaw.json` 參照時的審計發現)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定同層參照時，會忽略純文字值。

## 啟用觸發條件

Secret 啟用執行於：

- 啟動時 (預檢加上最終啟用)
- 設定重新載入熱套用路徑
- 設定重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入
- Gateway 寫入 RPC 預檢 (`config.set` / `config.apply` / `config.patch`)，用於在持久化編輯之前檢查提交設定載荷中的作用中表面 SecretRef 可解析性

啟用合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 Gateway 啟動。
- 執行時期重新載入失敗會保留最後已知良好的快照。
- 寫入 RPC 預檢失敗會拒絕提交的設定，並保持磁碟設定與作用中執行時期快照不變。
- 為對外輔助程式/工具呼叫提供明確的單次呼叫通道權杖並不會觸發 SecretRef 啟用；啟用點仍維持在啟動、重新載入以及明確的 `secrets.reload`。

## 降級與恢復信號

當在健康狀態後重新載入時啟用失敗，OpenClaw 會進入降級秘密狀態。

一次性系統事件和日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行時保留最後已知良好快照。
- 恢復：在下一次成功啟用後發出一次。
- 當已處於降級狀態時，重複的失敗會記錄警告，但不會濫發事件。
- 啟動快速失敗不會發出降級事件，因為執行時從未啟用。

## 指令路徑解析

指令路徑可透過閘道快照 RPC 選擇支援的 SecretRef 解析。

主要有兩種廣泛的行為：

<Tabs>
  <Tab title="嚴格指令路徑">
    例如 `openclaw memory` 遠端記憶體路徑和 `openclaw qr --remote` 當其需要遠端共用秘密參照時。它們從作用中快照讀取，並在所需的 SecretRef 無法使用時快速失敗。
  </Tab>
  <Tab title="唯讀指令路徑">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和唯讀 doctor/config 修復流程。它們也偏好作用中快照，但在該指令路徑中目標 SecretRef 無法使用時會降級而不是中止。

    唯讀行為：

    - 當閘道正在執行時，這些指令首先從作用中快照讀取。
    - 如果閘道解析未完成或閘道無法使用，它們會嘗試針對特定指令介面的目標本機回退。
    - 如果目標 SecretRef 仍然無法使用，該指令會繼續執行並產生降級的唯讀輸出和明確的診斷資訊，例如「已設定但在此指令路徑中無法使用」。
    - 這種降級行為僅限於指令本身。它不會削弱執行時啟動、重新載入或傳送/驗證路徑。

  </Tab>
</Tabs>

其他註記：

- 後端秘密輪換後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與配置工作流程

預設操作員流程：

<Steps>
  <Step title="稽核目前狀態">```bash openclaw secrets audit --check ```</Step>
  <Step title="設定 SecretRefs">```bash openclaw secrets configure ```</Step>
  <Step title="重新稽核">```bash openclaw secrets audit --check ```</Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    調查結果包括：

    - 靜態明文值 (`openclaw.json`、`auth-profiles.json`、`.env` 和產生的 `agents/*/agent/models.json`)
    - 產生的 `models.json` 項目中的明文敏感提供者標頭殘留
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
    - 讓您在 `openclaw.json` 中針對單一代理程式範圍選取支援的秘密承載欄位，外加 `auth-profiles.json`
    - 可以直接在目標挑選器中建立新的 `auth-profiles.json` 對應
    - 擷取 SecretRef 詳細資料（`source`、`provider`、`id`）
    - 執行前置檢查解析
    - 可立即套用

    Exec 註記：

    - 除非設定了 `--allow-exec`，否則前置檢查會略過 exec SecretRef 檢查。
    - 如果您直接從 `configure --apply` 套用，且計畫包含 exec refs/providers，請在套用步驟中也保持 `--allow-exec` 的設定。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 套用預設值：

    - 針對目標供應商，從 `auth-profiles.json` 中清除相符的靜態認證
    - 從 `auth.json` 中清除舊版靜態 `api_key` 項目
    - 從 `<config-dir>/.env` 中清除相符的已知機密行

  </Accordion>
  <Accordion title="secrets apply">
    套用已儲存的計畫：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Exec 註記：

    - dry-run 會略過 exec 檢查，除非設定了 `--allow-exec`。
    - 寫入模式會拒絕包含 exec SecretRefs/providers 的計畫，除非設定了 `--allow-exec`。

    如需嚴格的目標/路徑合約詳細資訊和確切的拒絕規則，請參閱 [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 單向安全原則

<Warning>OpenClaw 刻意不寫入包含歷史明文秘密值的回滾備份。</Warning>

安全模型：

- 寫入模式前必須先成功完成前置檢查
- 執行階段啟用會在提交前進行驗證
- apply updates files using atomic file replacement and best-effort restore on failure

## Legacy auth compatibility notes

For static credentials, runtime no longer depends on plaintext legacy auth storage.

- Runtime credential source is the resolved in-memory snapshot.
- Legacy static `api_key` entries are scrubbed when discovered.
- OAuth-related compatibility behavior remains separate.

## Web UI note

Some SecretInput unions are easier to configure in raw editor mode than in form mode.

## Related

- [Authentication](/zh-Hant/gateway/authentication) — auth setup
- [CLI: secrets](/zh-Hant/cli/secrets) — CLI commands
- [Environment Variables](/zh-Hant/help/environment) — environment precedence
- [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface) — credential surface
- [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract) — plan contract details
- [Security](/zh-Hant/gateway/security) — security posture
