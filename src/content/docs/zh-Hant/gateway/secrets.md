---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "機密管理"
sidebarTitle: "機密管理"
---

OpenClaw 支援額外的 SecretRefs，因此支援的憑證不需要以純文字形式儲存在設定中。

<Note>純文字仍然有效。SecretRefs 針對每個憑證為選用功能。</Note>

<Warning>如果純文字憑證儲存在 Agent 可以檢查的檔案中，則仍然可供 Agent 讀取，包括 `openclaw.json`、`auth-profiles.json`、`.env` 或產生的 `agents/*/agent/models.json` 檔案。只有在所有支援的憑證都已完成遷移，且 `openclaw secrets audit --check` 回報沒有純文字機密殘留後，SecretRefs 才會減少該本地的攻擊範圍。</Warning>

## 目標與執行時期模型

機密會被解析為記憶體內的執行時期快照。

- 解析在啟動期間是急切的，而不是在請求路徑上延遲進行。
- 當有效啟用的 SecretRef 無法解析時，啟動會快速失敗。
- 重新載入使用原子交換：完全成功，否則保留最後已知良好的快照。
- SecretRef 政策違規（例如將 OAuth 模式的驗證設定檔與 SecretRef 輸入結合）會在執行時期交換之前導致啟動失敗。
- 執行時期請求僅從作用中的記憶體內快照讀取。
- 在第一次成功啟用/載入設定後，執行時期程式碼路徑會持續讀取該作用中的記憶體內快照，直到成功的重新載入將其替換。
- 出站傳遞路徑也從該作用中快照讀取（例如 Discord 回覆/執行緒傳遞和 Telegram 動作傳送）；它們不會在每次傳送時重新解析 SecretRefs。

這使機密提供者的中斷不會影響熱請求路徑。

## Agent 存取邊界

SecretRefs 可保護憑證不被儲存在支援的設定和產生的模型表面中，但它們不是程序隔離邊界。如果磁碟上的某個路徑中仍有純文字憑證且 Agent 可讀取，則 Agent 可以使用檔案或 Shell 工具檢查該檔案，從而繞過 API 層級的編輯。

對於範圍包含 Agent 可存取檔案的生產環境部署，只有在滿足以下所有條件時，才將 SecretRef 遷移視為完成：

- 支援的憑證使用 SecretRefs 而非純文字值
- 舊版明文殘留已從 `openclaw.json`、
  `auth-profiles.json`、`.env` 和產生的 `models.json` 檔案中清除
- `openclaw secrets audit --check` 在遷移後是乾淨的
- 任何剩餘的不支援或輪換憑證都受到作業系統隔離、容器隔離或外部憑證代理的保護

這就是為什麼稽核/設定/套用工作流程是一個安全性遷移閘道，而不僅僅是一個便利的輔助工具。

<Warning>SecretRefs 並不會讓任意可讀檔案變得安全。備份、複製的設定、 舊的產生模型目錄和不支援的憑證類別必須被視為 生產環境機密，直到它們被刪除、移出代理程式信任 邊界，或受到單獨的隔離層保護。</Warning>

## Active-surface filtering

SecretRefs 僅在有效啟用的表面上進行驗證。

- 已啟用的表面：未解析的參照會阻擋啟動/重新載入。
- 未啟用的表面：未解析的參照不會阻擋啟動/重新載入。
- 未啟用的參照會發出代碼為 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命診斷訊息。

<AccordionGroup>
  <Accordion title="Examples of inactive surfaces">
    - 已停用的頻道/帳戶項目。
    - 沒有任何已啟用帳戶繼承的頂層頻道憑證。
    - 已停用的工具/功能介面。
    - 未被 `tools.web.search.provider` 選取的網頁搜尋供應商特定金鑰。在自動模式（供應商未設定）下，金鑰會依照優先順序供供應商自動偵測使用，直到解析出一個為止。選取後，未被選中的供應商金鑰會被視為非作用中，直到被選中為止。
    - 沙箱 SSH 認證材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，加上各個代理的覆寫設定）僅在預設代理或已啟用代理的有效沙箱後端為 `ssh` 時才作用。
    - 如果符合以下任一條件，`gateway.remote.token` / `gateway.remote.password` SecretRef 為作用中：
      - `gateway.mode=remote`
      - 已設定 `gateway.remote.url`
      - `gateway.tailscale.mode` 為 `serve` 或 `funnel`
      - 在沒有這些遠端介面的本機模式中：
        - 當權杖驗證可以生效且未設定 env/auth 權杖時，`gateway.remote.token` 為作用中。
        - 僅當密碼驗證可以生效且未設定 env/auth 密碼時，`gateway.remote.password` 為作用中。
    - 當設定 `OPENCLAW_GATEWAY_TOKEN` 時，`gateway.auth.token` SecretRef 在啟動驗證解析時為非作用中，因為在該執行階段中 env 權杖輸入優先。

  </Accordion>
</AccordionGroup>

## Gateway 驗證介面診斷

當在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上設定 SecretRef 時，gateway 啟動/重新載入日誌會明確記錄介面狀態：

- `active`：SecretRef 是有效驗證介面的一部分，且必須解析。
- `inactive`：由於另一個驗證介面優先，或是遠端驗證已停用/未啟用，SecretRef 在此執行階段中會被忽略。

這些條目會以 `SECRETS_GATEWAY_AUTH_SURFACE` 記錄，並包含活動介面原則所使用的原因，因此您可以查看憑證為何被視為活動或非活動。

## 入門參考預檢

當入門在互動模式下執行並且您選擇 SecretRef 儲存時，OpenClaw 會在儲存之前執行預檢驗證：

- Env refs：驗證環境變數名稱，並確認在設定期間可見非空值。
- Provider refs (`file` 或 `exec`)：驗證提供者選擇，解析 `id`，並檢查解析後的數值類型。
- Quickstart 重用路徑：當 `gateway.auth.token` 已經是 SecretRef 時，入站會在探測/儀表板啟動之前（針對 `env`、`file` 和 `exec` 參照）使用相同的快速失敗閘道來解析它。

如果驗證失敗，入站會顯示錯誤並讓您重試。

## SecretRef 契約

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
    - 片段中的 RFC6901 跳脫：`~` => `~0`，`/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    驗證：

    - `provider` 必須符合 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必須符合 `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (支援選擇器例如 `secret#json_key`)
    - `id` 不得包含 `.` 或 `..` 作為以斜線分隔的路徑區段 (例如 `a/../b` 會被拒絕)

  </Tab>
</Tabs>

## Provider 設定

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
      "team-secrets": {
        source: "exec",
        pluginIntegration: {
          pluginId: "acme-secrets",
          integrationId: "secret-store",
        },
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
    - 透過 `allowlist` 進行可選的允許清單設定。
    - 遺漏/空的環境變數值將導致解析失敗。

  </Accordion>
  <Accordion title="File provider">
    - 從 `path` 讀取本機檔案。
    - `mode: "json"` 預期 JSON 物件 payload 並將 `id` 解析為指標。
    - `mode: "singleValue"` 預期 ref id `"value"` 並傳回檔案內容。
    - 路徑必須通過所有權/權限檢查。
    - Windows 預設封鎖說明：如果路徑無法進行 ACL 驗證，解析將會失敗。僅針對信任的路徑，請在該提供者上設定 `allowInsecurePath: true` 以繞過路徑安全性檢查。

  </Accordion>
  <Accordion title="Exec provider">
    - 執行設定的絕對二進制路徑，不使用 shell。
    - 預設情況下，`command` 必須指向常規文件（而非符號連結）。
    - 設定 `allowSymlinkCommand: true` 以允許符號連結命令路徑（例如 Homebrew shims）。OpenClaw 會驗證解析後的目標路徑。
    - 為套件管理器路徑（例如 `["/opt/homebrew"]`）配對 `allowSymlinkCommand` 與 `trustedDirs`。
    - 支援逾時、無輸出逾時、輸出位元組限制、環境變數允許清單及受信任目錄。
    - Windows fail-closed 註記：如果命令路徑無法進行 ACL 驗證，解析將會失敗。僅對受信任路徑，請在該提供者上設定 `allowInsecurePath: true` 以略過路徑安全性檢查。
    - 外掛程式管理的 exec 提供者可以使用 `pluginIntegration`，而不使用
      複製的 `command`/`args`。OpenClaw 會在啟動/重新載入期間從已安裝的外掛程式清單中解析目前的命令詳情。如果外掛程式
      已停用、移除、不受信任，或不再宣告此整合，
      使用該提供者的使用中 SecretRef 將會 fail closed。

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

## 檔案支援的 API 金鑰

請勿將 `file:...` 字串放在設定 `env` 區塊中。`env` 區塊是
字面意義且不可覆寫的，因此 `file:...` 不會被解析。

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

對於 `mode: "singleValue"`，SecretRef `id` 是 `"value"`。對於
`mode: "json"`，請使用絕對 JSON 指標，例如
`"/providers/xai/apiKey"`。

請參閱 [SecretRef credential surface](/zh-Hant/reference/secretref-credential-surface) 以了解
接受 SecretRefs 的設定欄位。

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
  <Accordion title="Bitwarden Secrets Manager (`bws`)">
    當您希望 SecretRef id 對應到 Bitwarden Secrets Manager 項目金鑰時，請使用解析器包裝器。該儲存庫包含
    `scripts/secrets/openclaw-bws-resolver.mjs`；請將其安裝或複製到執行 Gateway 的主機上的絕對
    受信任路徑。

    需求：

    - 在 Gateway 主機上安裝的 Bitwarden Secrets Manager CLI (`bws`)。
    - `BWS_ACCESS_TOKEN` 可供 Gateway 服務使用。
    - 傳遞給解析器的 `PATH`，或設定為絕對 `bws`
      二進位路徑的 `BWS_BIN`。

    ```json5
    {
      secrets: {
        providers: {
          bws: {
            source: "exec",
            command: "/usr/local/bin/openclaw-bws-resolver.mjs",
            passEnv: ["BWS_ACCESS_TOKEN", "PATH", "BWS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "bws",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    解析器會將請求的 id 分批處理，執行 `bws secret list`，並返回
    匹配的秘密 `key` 欄位的值。請使用符合 exec
    SecretRef id 合約的金鑰，例如 `openclaw/providers/openai/apiKey`；帶有底線的
    環境變數風格金鑰會在解析器執行前被拒絕。如果多於一個可見的 Bitwarden 秘密具有相同的請求金鑰，
    解析器會將該 id 視為模稜兩可而失敗，而不是選擇其中一個。更新配置後，
    請驗證解析器路徑：

    ```bash
    openclaw secrets audit --allow-exec
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
  <Accordion title="password-store (`pass`)">
    當您希望 SecretRef id 直接對應到
    `pass` 條目時，請使用小型解析器包裝器。將其作為可執行檔案儲存在通過
    exec-provider 路徑檢查的絕對路徑中，例如
    `/usr/local/bin/openclaw-pass-resolver`。`#!/usr/bin/env node` shebang
    從解析器行程 `PATH` 解析 `node`，因此請將 `PATH` 包含在
    `passEnv` 中。如果 `pass` 不在該 `PATH` 上，請在父環境中設定 `PASS_BIN` 並將其包含在
    `passEnv` 中：

    ```js
    #!/usr/bin/env node
    const { spawnSync } = require("node:child_process");

    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      stdin += chunk;
    });
    process.stdin.on("error", (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    process.stdin.on("end", () => {
      let request;
      try {
        request = JSON.parse(stdin || "{}");
      } catch (err) {
        process.stderr.write(`Failed to parse request: ${err.message}\n`);
        process.exit(1);
      }

      const passBin = process.env.PASS_BIN || "pass";
      const values = {};
      const errors = {};

      for (const id of request.ids ?? []) {
        const result = spawnSync(passBin, ["show", id], { encoding: "utf8" });
        if (result.status === 0) {
          values[id] = result.stdout.split(/\r?\n/, 1)[0] ?? "";
        } else {
          errors[id] = { message: (result.stderr || `pass exited ${result.status}`).trim() };
        }
      }

      process.stdout.write(JSON.stringify({ protocolVersion: 1, values, errors }));
    });
    ```

    然後設定 exec 提供者並將 `apiKey` 指向 `pass` 條目路徑：

    ```json5
    {
      secrets: {
        providers: {
          pass_store: {
            source: "exec",
            command: "/usr/local/bin/openclaw-pass-resolver",
            passEnv: ["PATH", "HOME", "GNUPGHOME", "GPG_TTY", "PASSWORD_STORE_DIR", "PASS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "pass_store",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    將機密儲存在 `pass` 條目的第一行，或者如果您想要改為傳回完整的 `pass show` 輸出，請自訂包裝器。更新設定後，請驗證靜態稽核和 exec 解析器路徑：

    ```bash
    openclaw secrets audit --check
    openclaw secrets audit --allow-exec
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

透過 `plugins.entries.acpx.config.mcpServers` 設定的 MCP 伺服器環境變數支援 SecretInput。這可以避免 API 金鑰和令牌出現在明文設定中：

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

純文字字串值仍然有效。像 `${MCP_SERVER_API_KEY}` 這樣的 Env-template 引用和 SecretRef 物件會在產生 MCP 伺服器行程之前的啟用閘道期間解析。與其他 SecretRef 表面一樣，未解析的引用只有在 `acpx` 外掛程式實際上處於活動狀態時才會封鎖啟用。

## Sandbox SSH 認證材料

核心 `ssh` 沙盒後端也支援用於 SSH 認證資料的 SecretRefs：

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
- 解析出的值會被寫入具有嚴格權限的暫存檔案，並在產生的 SSH 配置中使用。
- 如果有效的沙盒後端不是 `ssh`，這些引用將保持非活動狀態，且不會封鎖啟動。

## 支援的憑證介面

標準的支援與不支援憑證列於：

- [SecretRef 憑證表面](/zh-Hant/reference/secretref-credential-surface)

<Note>執行時期產生或輪換的憑證以及 OAuth 更新材料，刻意不包含在唯讀 SecretRef 解析中。</Note>

## 必備行為與優先順序

- 不含參照的欄位：保持不變。
- 含參照的欄位：在啟用期間，若位於活動介面上則為必填。
- 如果同時存在純文字與參照，在支援的優先路徑上，參照優先。
- 編輯標記 `__OPENCLAW_REDACTED__` 是保留用於內部設定編輯/還原的，並且會作為字面提交的設定資料被拒絕。

警告與審計訊號：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (執行階段警告)
- `REF_SHADOWED` (稽核結果，當 `auth-profiles.json` 憑證優先於 `openclaw.json` refs 時)

Google Chat 相容性行為：

- `serviceAccountRef` 優先於純文字 `serviceAccount`。
- 當設定了同層級參照時，會忽略純文字值。

## 啟用觸發條件

Secret 啟用執行於：

- 啟動時 (預檢加上最終啟用)
- 配置重新載入熱套用路徑
- 配置重新載入重啟檢查路徑
- 透過 `secrets.reload` 手動重新載入
- Gateway config 寫入 RPC 預檢 (`config.set` / `config.apply` / `config.patch`)，用於在持續編輯之前解析已提交設定 payload 內的 active-surface SecretRef

啟用合約：

- 成功會以原子方式交換快照。
- 啟動失敗會中止 gateway 啟動。
- 執行時期重新載入失敗會保留最後已知有效的快照。
- Write-RPC 預檢失敗會拒絕提交的配置，並保持磁碟配置與執行時期快照均不變。
- 提供給輔助工具/工具呼叫的明確單次呼叫通道權杖不會觸發 SecretRef 啟動；啟動點仍維持為啟動、重新載入和明確的 `secrets.reload`。

## 降級與恢復訊號

當在健康狀態後重新載入時啟用失敗，OpenClaw 會進入機密降級狀態。

一次性系統事件與日誌代碼：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行為：

- 降級：執行時保留最後已知良好的快照。
- 恢復：在下次成功啟用後發出一次。
- 在已處於降級狀態時重複失敗會記錄警告，但不會大量發送事件。
- 啟動時快速失敗不會發出降級事件，因為執行時從未變為作用中。

## 指令路徑解析

指令路徑可以透過 gateway snapshot RPC 選擇加入支援的 SecretRef 解析。

有兩種廣泛的行為：

<Tabs>
  <Tab title="Strict command paths">
    例如 `openclaw memory` 遠端記憶體路徑，以及當它需要遠端共享秘密 ref 時的 `openclaw qr --remote`。它們會從目前快照讀取，並在所需的 SecretRef 無法使用時快速失敗。
  </Tab>
  <Tab title="Read-only command paths">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及唯讀的 doctor/config 修復流程。它們也偏好使用目前快照，但在該指令路徑中目標 SecretRef 無法使用時會降級執行，而不是中止。

    唯讀行為：

    - 當 gateway 正在執行時，這些指令會先從目前快照讀取。
    - 如果 gateway 解析不完整或 gateway 無法使用，它們會針對特定指令介面嘗試目標本機回退。
    - 如果目標 SecretRef 仍然無法使用，該指令會繼續執行並產生降級的唯讀輸出及明確的診斷資訊，例如「已設定但在此指令路徑中無法使用」。
    - 這種降級行為僅限於指令本機。它不會削弱執行階段啟動、重新載入，或 send/auth 路徑。

  </Tab>
</Tabs>

其他備註：

- 後端密鑰輪替後的快照重新整理由 `openclaw secrets reload` 處理。
- 這些指令路徑使用的 Gateway RPC 方法：`secrets.resolve`。

## 稽核與設定工作流程

預設操作員流程：

<Steps>
  <Step title="稽核目前狀態">```bash openclaw secrets audit --check ```</Step>
  <Step title="設定並套用 SecretRefs">```bash openclaw secrets configure --apply ```</Step>
  <Step title="重新稽核">```bash openclaw secrets audit --check ```</Step>
</Steps>

在重新稽核結果乾淨之前，請勿視為遷移完成。如果稽核仍然報告靜態明文值，即使執行階段 API 回傳編輯過的值，agent 存取風險仍然存在。

如果您在 `configure` 期間儲存計畫而不是直接套用，請在重新稽核之前使用 `openclaw secrets apply --from <plan-path>` 套用該儲存的計畫。

<AccordionGroup>
  <Accordion title="secrets audit">
    發現事項包括：

    - 靜態純文字值 (`openclaw.json`, `auth-profiles.json`, `.env`，以及產生的 `agents/*/agent/models.json`)
    - 產生的 `models.json` 項目中的純文字敏感提供者標頭殘留
    - 未解析的參照
    - 優先順序遮蔽 (`auth-profiles.json` 優先於 `openclaw.json` 參照)
    - 舊版殘留 (`auth.json`, OAuth 提醒)

    Exec 備註：

    - 預設情況下，稽核會跳過 exec SecretRef 解析性檢查，以避免指令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在稽核期間執行 exec 提供者。

    標頭殘留備註：

    - 敏感提供者標頭偵測是基於名稱啟發式 (常見的驗證/憑證標頭名稱和片段，例如 `authorization`, `x-api-key`, `token`, `secret`, `password`, 和 `credential`)。

  </Accordion>
  <Accordion title="secrets configure">
    互動式輔助工具，功能如下：

    - 首先設定 `secrets.providers` (`env`/`file`/`exec`，新增/編輯/移除)
    - 讓您針對單一 Agent 範圍，在 `openclaw.json` 中選取支援的秘密欄位以及 `auth-profiles.json`
    - 可直接在目標選擇器中建立新的 `auth-profiles.json` 對應
    - 擷取 SecretRef 詳細資料 (`source`、`provider`、`id`)
    - 執行 preflight 解析
    - 可立即套用

    Exec 註記：

    - 除非設定了 `--allow-exec`，否則 Preflight 會跳過 exec SecretRef 檢查。
    - 如果您直接從 `configure --apply` 套用，且計畫包含 exec refs/providers，請在套用步驟中保持設定 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 套用預設值：

    - 從 `auth-profiles.json` 中清除目標供應商的相符靜態憑證
    - 從 `auth.json` 中清除舊版的靜態 `api_key` 項目
    - 從 `<config-dir>/.env` 中清除相符的已知秘密行

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

    - 除非設定了 `--allow-exec`，否則 dry-run 會跳過 exec 檢查。
    - 除非設定了 `--allow-exec`，否則寫入模式會拒絕包含 exec SecretRefs/providers 的計畫。

    如需嚴格的目標/路徑合約詳細資料和確切的拒絕規則，請參閱 [Secrets Apply Plan Contract](/zh-Hant/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 單向安全原則

<Warning>OpenClaw 故意不會寫入包含歷史純文字秘密值的回滾備份。</Warning>

安全模型：

- preflight 必須在寫入模式之前成功
- 執行時啟動在提交前會經過驗證
- apply 會使用原子檔案替換更新檔案，並在失敗時盡力還原

## 舊版驗證相容性說明

對於靜態憑證，執行時期不再依賴純文字的舊版驗證儲存。

- 執行時期憑證來源是已解析的記憶體內快照。
- 當發現舊版靜態 `api_key` 項目時會將其清除。
- OAuth 相關的相容性行為保持分開。

## Web UI 說明

某些 SecretInput 聯集在原始編輯器模式下比在表單模式下更容易設定。

## 相關

- [驗證](/zh-Hant/gateway/authentication) — 驗證設定
- [CLI: secrets](/zh-Hant/cli/secrets) — CLI 指令
- [環境變數](/zh-Hant/help/environment) — 環境優先順序
- [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface) — 憑證介面
- [Secrets 套用計畫合約](/zh-Hant/gateway/secrets-plan-contract) — 計畫合約細節
- [安全性](/zh-Hant/gateway/security) — 安全性狀態
