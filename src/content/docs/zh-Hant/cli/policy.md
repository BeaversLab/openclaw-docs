---
summary: "用於 `openclaw policy` 合規性檢查的 CLI 參考"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "原則"
---

# `openclaw policy`

`openclaw policy` 由內建的 Policy 外掛程式提供。Policy 是現有 OpenClaw 設定之上的企業合規層。它不會新增
第二個設定系統。`policy.jsonc` 定義了編寫的需求，
OpenClaw 將現有工作區作為證據進行觀察，而原則健康檢查
則透過 `doctor --lint` 回報差異。最終的合規訊號是乾淨的
`doctor --lint` 執行結果；原則會將發現結果貢獻至該共享的 lint 表面，
而不是建立單獨的健康閘道。

Policy 目前管理已設定的頻道、MCP 伺服器、模型供應商、
網路 SSRF 姿態、Gateway 暴露姿態、代理程式工作區姿態、
OpenClaw 設定金鑰提供者/驗證設定檔姿態，以及受控工具的
宣告。例如，IT 或工作區操作員可以記錄 Telegram
不是核准的頻道供應商，將 MCP 伺服器和模型參照限制為
已核准的項目，要求私有網路擷取/瀏覽器存取保持停用，
要求 Gateway 繫結/驗證/HTTP 暴露保持在已審查的
範圍內，要求代理程式工作區存取和工具拒絕保持在已審查的
姿態，要求 OpenClaw 設定 SecretRefs 使用受控提供者，
要求設定驗證設定檔包含提供者/模式元資料，要求受控工具
包含風險和敏感性元資料，然後使用 `doctor --lint` 作為共享
合規閘道。

當工作區需要持續性聲明（例如「不得啟用這些頻道」
或「受控工具必須宣告核准元資料」）以及可重複的方式
來證明 OpenClaw 仍符合該聲明時，請使用原則。如果您僅需要
本機行為，且不需要原則發現結果或證明輸出，請單獨使用
一般設定和工作區文件。

## 快速入門

在首次使用前啟用內建的 Policy 外掛程式：

```bash
openclaw plugins enable policy
```

當啟用策略時，doctor 可以載入策略健康檢查而不啟用任意外掛程式。如果缺少 `policy.jsonc`，該外掛程式會保持啟用狀態，以便 doctor 回報缺少的成品。

策略是編寫的，不是從使用者目前的設定產生的。針對頻道、MCP 伺服器、模型提供者、網路狀態、Gateway 曝露、代理工作區狀態、OpenClaw 設定祕密提供者/驗證設定檔狀態以及工具中繼資料的最低限度策略如下所示：

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram is not approved for this workspace.",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
    },
  },
  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },
  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

規則是權威依據。類別區塊只是一個命名空間；檢查會在存在具體規則時執行。OpenClaw 讀取目前的 `channels.*` 設定`mcp.servers.*`、`models.providers.*`、選定的代理程式模型參照、網路 SSRF 設定、Gateway 繫結/驗證/Control UI/Tailscale/remote/HTTP 姿態、OpenClaw 設定代理程式沙箱工作區存取和工具拒絕姿態、設定秘密提供者和 SecretRef 來源、設定驗證設定檔中繼資料、設定的全域/每代理程式工具姿態，以及 `TOOLS.md` 宣告作為證據，然後回報不符合的觀察狀態。如果原則拒絕非回傳 Gateway 繫結，請僅在您願意檢視執行階段預設值時省略 `gateway.bind`；請設定 `gateway.bind=loopback` 以實施嚴格的設定一致性。若要設定唯讀代理程式姿態，請在適用的預設值或代理程式上設定沙箱模式，並將 `workspaceAccess` 設定為 `none` 或 `ro`；省略或 `off` 沙箱模式無法滿足唯讀/無寫入原則。`agents.workspace.denyTools` 支援 `exec`、`process`、`write`、`edit` 和 `apply_patch`；OpenClaw 設定 `group:fs` 涵蓋檔案變異工具，而 `group:runtime` 涵蓋 shell/處理程序工具。工具姿態原則會觀察 `tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、`tools.exec.host`、`tools.elevated.enabled`，以及相同的每代理程式 `agents.list[].tools.*` 覆寫。它不會讀取執行階段/操作員核准狀態（例如 exec-approvals.），也不會在執行階段強制執行工具呼叫。秘密證據會記錄提供者/來源姿態和 SecretRef 中繼資料，絕不記錄原始秘密值。原則不會讀取或證實每代理程式憑證存放區（例如 `auth-profiles.json`）；這些存放區仍由現有的驗證和憑證流程所擁有。

### Policy 規則參考

下列每個 policy 欄位都是選用的。只有在 `policy.jsonc` 中出現相符的規則時，才會執行檢查。觀察到的狀態是現有的 OpenClaw 設定或工作區中繼資料；policy 會報告偏移，但不會重寫執行階段行為，除非有明確提供並啟用修復路徑。

#### 頻道

| Policy 欄位                          | 觀察到的狀態                    | 使用時機                                            |
| ------------------------------------ | ------------------------------- | --------------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` 提供者及已啟用狀態 | 拒絕來自特定提供者（例如 `telegram`）的已設定頻道。 |
| `channels.denyRules[].reason`        | 發現訊息及修復提示內容          | 說明拒絕該提供者的原因。                            |

#### MCP 伺服器

| Policy 欄位         | 觀察到的狀態       | 使用時機                                          |
| ------------------- | ------------------ | ------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ID | 要求每個已設定的 MCP 伺服器都必須位於允許清單中。 |
| `mcp.servers.deny`  | `mcp.servers.*` ID | 拒絕特定的已設定 MCP 伺服器 ID。                  |

#### 模型提供者

| Policy 欄位              | 觀察到的狀態                             | 使用時機                                                   |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ID 及選取的模型參照 | 要求已設定的提供者及選取的模型參照必須使用經核准的提供者。 |
| `models.providers.deny`  | `models.providers.*` ID 及選取的模型參照 | 根據提供者 ID 拒絕已設定的提供者及選取的模型參照。         |

#### 網路

| Policy 欄位                    | 觀察到的狀態           | 使用時機                                        |
| ------------------------------ | ---------------------- | ----------------------------------------------- |
| `network.privateNetwork.allow` | 私人網路 SSRF 逃離通口 | 設定為 `false` 以要求私人網路存取保持停用狀態。 |

#### Gateway

| Policy 欄位                             | 觀察到的狀態                        | 使用時機                                             |
| --------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                      | 設定為 `false` 以要求 Gateway 繫位至回環位址。       |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway 姿態 | 設定為 `false` 以拒絕 Tailscale Funnel 暴露。        |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                 | 設定為 `true` 以拒絕已停用的 Gateway 驗證。          |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`            | 設定為 `true` 以要求明確的驗證速率限制設定。         |
| `gateway.controlUi.allowInsecure`       | 控制 UI 不安全的驗證/裝置/來源切換  | 設定為 `false` 以拒絕不安全的控制 UI 暴露切換。      |
| `gateway.remote.allow`                  | 遠端閘道模式/組態                   | 設定為 `false` 以拒絕遠端閘道模式。                  |
| `gateway.http.denyEndpoints`            | 閘道 HTTP API 端點                  | 拒絕端點 ID，例如 `chatCompletions` 或 `responses`。 |
| `gateway.http.requireUrlAllowlists`     | 閘道 HTTP URL 擷取輸入              | 設定為 `true` 以要求 URL 擷取輸入需有 URL 允許清單。 |

#### Agent 工作區

| Policy 欄位                      | 觀察狀態                                                                             | 使用時機                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.list[].sandbox.workspaceAccess` | 僅允許沙盒工作區存取值，例如 `none` 或 `ro`。                                                       |
| `agents.workspace.denyTools`     | 全域及每個 Agent 的工具拒絕組態                                                      | 要求工作區/執行時段變更工具（例如 `exec`、`process`、`write`、`edit` 或 `apply_patch`）必須被拒絕。 |

#### Secrets

| Policy 欄位                       | 觀察狀態                                     | 使用時機                                                |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `secrets.requireManagedProviders` | 組態 SecretRef 與 `secrets.providers.*` 宣告 | 設定為 `true` 以要求 SecretRef 必須指向已宣告的提供者。 |
| `secrets.denySources`             | Secret 提供者來源與 SecretRef 來源           | 拒絕來源，例如 `exec`、`file` 或其他已設定的來源名稱。  |
| `secrets.allowInsecureProviders`  | 不安全的 secret-provider 姿態旗標            | 設定為 `false` 以拒絕選擇採用不安全姿態的提供者。       |

#### 驗證設定檔

| Policy 欄位                     | 觀察狀態                             | 使用時機                                                                    |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | `auth.profiles.*` 提供者與模式元資料 | 要求組態驗證設定檔上需有元資料金鑰，例如 `provider` 和 `mode`。             |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`               | 僅允許支援的驗證設定檔模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。 |

#### 工具元數據

| 策略欄位                | 觀察狀態                 | 使用時機                                                                |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `tools.requireMetadata` | 受控管的 `TOOLS.md` 宣告 | 要求受控管的工具宣告元數據金鑰，例如 `risk`、`sensitivity` 或 `owner`。 |

#### 工具配置

| 策略欄位                        | 觀察狀態                                                 | 使用時機                                                                       |
| ------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.list[].tools.profile`         | 僅允許工具設定檔 ID，例如 `minimal`、`messaging` 或 `coding`。                 |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和個別 Agent 的 `tools.fs` 覆寫 | 設定為 `true` 以要求僅限工作區的檔案系統工具配置。                             |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和個別 Agent 的執行安全性          | 僅允許執行安全性模式，例如 `deny` 或 `allowlist`。                             |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和個別 Agent 的執行詢問模式             | 要求核准配置，例如 `always`。                                                  |
| `tools.exec.allowHosts`         | `tools.exec.host` 和個別 Agent 的執行主機路由            | 僅允許執行主機路由模式，例如 `sandbox`。                                       |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和個別 Agent 的提權配置         | 設定為 `false` 以要求提權工具模式保持停用。                                    |
| `tools.denyTools`               | `tools.deny` 和 `agents.list[].tools.deny`               | 要求設定的工具拒絕清單包含工具 ID 或群組，例如 `group:runtime` 和 `group:fs`。 |

在編寫期間僅執行策略檢查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 僅執行策略檢查集並輸出證據、發現和
證明雜湊。當啟用 Policy 外掛程式時，相同的發現也會顯示在 `openclaw doctor --lint` 中。

乾淨的 JSON 輸出示例包含穩定的雜湊值，操作員或監管者可以記錄這些值：

```json
{
  "ok": true,
  "attestation": {
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": []
}
```

## 設定策略

策略配置位於 `plugins.entries.policy.config` 之下。

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "enabled": true,
        "config": {
          "enabled": true,
          "path": "policy.jsonc",
          "workspaceRepairs": false,
          "expectedHash": "sha256:...",
          "expectedAttestationHash": "sha256:...",
        },
      },
    },
  },
}
```

| 設定                      | 用途                                             |
| ------------------------- | ------------------------------------------------ |
| `enabled`                 | 甚至在 `policy.jsonc` 存在之前就啟用策略檢查。   |
| `workspaceRepairs`        | 允許 `doctor --fix` 編輯由策略管理工作區的設定。 |
| `expectedHash`            | 已核准策略成品的選用雜湊鎖。                     |
| `expectedAttestationHash` | 上次接受的乾淨策略檢查之選用雜湊鎖。             |
| `path`                    | 策略成品相對於工作區的位置。                     |

將 `plugins.entries.policy.config.enabled` 設定為 `false` 以停用工作區的策略檢查，
同時保留外掛程式。

工具中繼資料需求是使用 `tools.requireMetadata` 在 `policy.jsonc` 中編寫的，
例如 `["risk", "sensitivity", "owner"]`。

## 接受策略狀態

JSON 輸出示例：

```json
{
  "ok": true,
  "attestation": {
    "checkedAt": "2026-05-10T20:00:00.000Z",
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "evidence": {
    "channels": [
      {
        "id": "telegram",
        "provider": "telegram",
        "source": "oc://openclaw.config/channels/telegram",
        "enabled": false
      }
    ],
    "mcpServers": [
      {
        "id": "docs",
        "transport": "stdio",
        "source": "oc://openclaw.config/mcp/servers/docs",
        "command": "npx"
      }
    ],
    "modelProviders": [
      {
        "id": "openai",
        "source": "oc://openclaw.config/models/providers/openai"
      }
    ],
    "modelRefs": [
      {
        "ref": "openai/gpt-5.5",
        "provider": "openai",
        "model": "gpt-5.5",
        "source": "oc://openclaw.config/agents/defaults/model"
      }
    ],
    "network": [
      {
        "id": "browser-private-network",
        "source": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
        "value": false
      }
    ],
    "gatewayExposure": [
      {
        "id": "gateway-bind",
        "kind": "bind",
        "source": "oc://openclaw.config/gateway/bind",
        "value": "loopback",
        "nonLoopback": false,
        "explicit": true
      }
    ],
    "agentWorkspace": [
      {
        "id": "agents-defaults-workspace-access",
        "kind": "workspaceAccess",
        "source": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
        "scope": "defaults",
        "value": "ro",
        "sandboxMode": "all",
        "sandboxModeSource": "oc://openclaw.config/agents/defaults/sandbox/mode",
        "sandboxEnabled": true,
        "explicit": true
      },
      {
        "id": "agents-defaults-tool-exec",
        "kind": "toolDeny",
        "source": "oc://openclaw.config/tools/deny",
        "scope": "defaults",
        "tool": "exec",
        "denied": true,
        "explicit": true
      }
    ],
    "secrets": [
      {
        "id": "vault",
        "kind": "provider",
        "source": "oc://openclaw.config/secrets/providers/vault",
        "providerSource": "env"
      },
      {
        "id": "oc://openclaw.config/models/providers/openai/apiKey",
        "kind": "input",
        "source": "oc://openclaw.config/models/providers/openai/apiKey",
        "provenance": "secretRef",
        "refSource": "env",
        "refProvider": "vault"
      }
    ],
    "authProfiles": [
      {
        "id": "github",
        "source": "oc://openclaw.config/auth/profiles/github",
        "validMetadata": true,
        "provider": "github",
        "mode": "token"
      }
    ],
    "tools": [
      {
        "id": "deploy",
        "source": "oc://TOOLS.md/tools/deploy",
        "line": 12,
        "risk": "critical",
        "sensitivity": "restricted",
        "capabilities": ["IRREVERSIBLE_EXTERNAL"]
      }
    ]
  },
  "checksRun": 30,
  "checksSkipped": 0,
  "findings": []
}
```

策略雜湊用於識別已編寫的規則成品。證據區塊記錄策略檢查所使用的觀察 OpenClaw 狀態。
`workspace.hash` 值用於識別受檢查範圍的該證據內容。
發現雜湊用於識別檢查返回的確切發現集。
`checkedAt` 記錄評估執行的時間。證明雜湊識別穩定的聲明：
策略雜湊、證據雜湊、發現雜湊，以及結果是否乾淨。
它刻意不包含 `checkedAt`，因此相同的策略狀態在重複檢查中會產生相同的證明。
這些共同組成了此策略檢查的稽核元組。

如果後續的閘道或監管者使用策略來封鎖、核准或註解執行時動作，
它應該記錄上次乾淨策略檢查的證明雜湊。
`checkedAt` 保留在 JSON 輸出中用於稽核日誌，但不屬於穩定證明雜湊的一部分。

接受 policy 狀態時，請使用此生命週期：

1. 撰寫或審閱 `policy.jsonc`。
2. 執行 `openclaw policy check --json`。
3. 如果結果乾淨，請將 `attestation.policy.hash` 記錄為 `expectedHash`。
4. 將 `attestation.attestationHash` 記錄為 `expectedAttestationHash`。
5. 在 CI 或發布閘道中重新執行 `openclaw doctor --lint`。

如果 policy 規則有意變更，請從乾淨的檢查中更新這兩個接受的雜湊值。如果工作區設定有意變更但 policy 維持不變，通常只有 `expectedAttestationHash` 會變更。

啟用或升級 `agents.workspace` 規則會將 `agentWorkspace` 證據新增到工作區雜湊和證明雜湊中。操作員應審閱新證據，並在啟用這些規則後重新整理接受的證明雜湊。啟用或升級工具姿勢規則也會以同樣方式新增 `toolPosture` 證據。

`openclaw policy watch` 會重複執行相同的檢查，並在當前證據不再符合 `expectedAttestationHash` 時回報：

```bash
openclaw policy watch --json
```

在只需要一次漂移評估的 CI 或指令碼中使用 `--once`。如果沒有 `--once`，該指令預設每兩秒輪詢一次；請使用 `--interval-ms` 來選擇不同的間隔。

## 發現結果

Policy 目前驗證：

| 檢查 ID                                      | 發現結果                                                       |
| -------------------------------------------- | -------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                | Policy 已啟用，但 `policy.jsonc` 缺失。                        |
| `policy/policy-jsonc-invalid`                | 無法解析 Policy 或其包含格式錯誤的規則項目。                   |
| `policy/policy-hash-mismatch`                | Policy 與設定的 `expectedHash` 不符。                          |
| `policy/attestation-hash-mismatch`           | 目前的 policy 證據不再符合接受的證明。                         |
| `policy/channels-denied-provider`            | 啟用的頻道符合頻道拒絕規則。                                   |
| `policy/mcp-denied-server`                   | 設定的 MCP 伺服器被 Policy 拒絕。                              |
| `policy/mcp-unapproved-server`               | 設定的 MCP 伺服器不在允許清單中。                              |
| `policy/models-denied-provider`              | 設定的模型提供者或模型參照使用了被拒絕的提供者。               |
| `policy/models-unapproved-provider`          | 已配置的模型提供者或模型參考位於允許清單之外。                 |
| `policy/network-private-access-enabled`      | 當原則拒絕時，啟用了私有網路 SSRF 逃生艙。                     |
| `policy/gateway-non-loopback-bind`           | 當原則拒絕時，閘道綁定姿態允許非回環暴露。                     |
| `policy/gateway-auth-disabled`               | 當原則要求身份驗證時，閘道身份驗證已停用。                     |
| `policy/gateway-rate-limit-missing`          | 當原則要求時，閘道身份驗證速率限制姿態不明確。                 |
| `policy/gateway-control-ui-insecure`         | 閘道控制 UI 不安全暴露切換已啟用。                             |
| `policy/gateway-tailscale-funnel`            | 當原則拒絕時，閘道 Tailscale Funnel 暴露已啟用。               |
| `policy/gateway-remote-enabled`              | 當原則拒絕時，閘道遠端模式處於活動狀態。                       |
| `policy/gateway-http-endpoint-enabled`       | 閘道 HTTP API 端點已啟用，但被原則拒絕。                       |
| `policy/gateway-http-url-fetch-unrestricted` | 閘道 HTTP URL 提取輸入缺乏所需的 URL 允許清單。                |
| `policy/agents-workspace-access-denied`      | Agent 沙箱模式或工作區存取位於原則允許清單之外。               |
| `policy/agents-tool-not-denied`              | Agent 或預設配置未拒絕原則所需的工具。                         |
| `policy/tools-profile-unapproved`            | 已配置的全域或每個 Agent 的工具設定檔位於允許清單之外。        |
| `policy/tools-fs-workspace-only-required`    | 檔案系統工具未設定為僅限工作區路徑姿態。                       |
| `policy/tools-exec-security-unapproved`      | Exec 安全模式位於原則允許清單之外。                            |
| `policy/tools-exec-ask-unapproved`           | Exec 詢問模式位於原則允許清單之外。                            |
| `policy/tools-exec-host-unapproved`          | Exec 主機路由位於原則允許清單之外。                            |
| `policy/tools-elevated-enabled`              | 當原則拒絕時，啟用了提升工具模式。                             |
| `policy/tools-required-deny-missing`         | 全域或每個 Agent 的工具拒絕清單未包含所需拒絕的工具。          |
| `policy/secrets-unmanaged-provider`          | 配置 SecretRef 參考了未在 `secrets.providers` 下宣告的提供者。 |
| `policy/secrets-denied-provider-source`      | 配置 secret 提供者或 SecretRef 使用了原則拒絕的來源。          |
| `policy/secrets-insecure-provider`           | 當原則拒絕時，secret 提供者選擇了不安全姿態。                  |
| `policy/auth-profile-invalid-metadata`       | 設定檔驗證設定檔缺少有效的提供者或模式中繼資料。               |
| `policy/auth-profile-unapproved-mode`        | 設定檔驗證設定檔模式不在策略允許清單中。                       |
| `policy/tools-missing-risk-level`            | 受管工具宣告缺少風險中繼資料。                                 |
| `policy/tools-unknown-risk-level`            | 受管工具宣告使用了未知的風險值。                               |
| `policy/tools-missing-sensitivity-token`     | 受管工具宣告缺少敏感度中繼資料。                               |
| `policy/tools-missing-owner`                 | 受管工具宣告缺少擁有者中繼資料。                               |
| `policy/tools-unknown-sensitivity-token`     | 受管工具宣告使用了未知的敏感度值。                             |

策略發現結果可以同時包含 `target` 和 `requirement`。`target` 是不符合規則的觀察工作區項目。`requirement` 是使其成為發現結果的已撰寫策略規則。這兩個值目前都是位址，通常是 `oc://` 路徑，但欄位名稱描述的是其策略角色，而非位址格式。

JSON 發現結果範例：

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "Channel 'telegram' uses denied provider 'telegram'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram is not approved for this workspace."
}
```

工具發現結果範例：

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

MCP 發現結果範例：

```json
{
  "checkId": "policy/mcp-unapproved-server",
  "severity": "error",
  "message": "MCP server 'remote' is not in the policy allowlist.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/mcp/servers/remote",
  "target": "oc://openclaw.config/mcp/servers/remote",
  "requirement": "oc://policy.jsonc/mcp/servers/allow"
}
```

模型提供者發現結果範例：

```json
{
  "checkId": "policy/models-unapproved-provider",
  "severity": "error",
  "message": "Model ref 'anthropic/claude-sonnet-4.7' uses unapproved provider 'anthropic'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "target": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "requirement": "oc://policy.jsonc/models/providers/allow"
}
```

網路發現結果範例：

```json
{
  "checkId": "policy/network-private-access-enabled",
  "severity": "error",
  "message": "Network setting 'browser-private-network' allows private-network access.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "target": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "requirement": "oc://policy.jsonc/network/privateNetwork/allow"
}
```

Gateway 暴露發現結果範例：

```json
{
  "checkId": "policy/gateway-non-loopback-bind",
  "severity": "error",
  "message": "Gateway bind setting 'gateway-bind' permits non-loopback exposure.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/bind",
  "target": "oc://openclaw.config/gateway/bind",
  "requirement": "oc://policy.jsonc/gateway/exposure/allowNonLoopbackBind"
}
```

Agent 工作區發現結果範例：

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults sandbox workspaceAccess 'rw' is not allowed by policy.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## 修復

`doctor --lint` 和 `policy check` 是唯讀的。

只有在明確啟用 `workspaceRepairs` 時，`doctor --fix` 才會編輯策略管理工作區設定。若未選擇加入，策略檢查會回報它們將修復的內容，並保持設定不變。

在此版本中，修復可以停用在 OpenClaw 設定中已啟用但被 `channels.denyRules` 拒絕的通道。請僅在審查策略檔案後啟用 `workspaceRepairs`，因為有效的拒絕規則可以關閉已設定的通道：

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "config": {
          "workspaceRepairs": true,
        },
      },
    },
  },
}
```

## 結束代碼

| 指令           | `0`                              | `1`                                | `2`                  |
| -------------- | -------------------------------- | ---------------------------------- | -------------------- |
| `policy check` | 在閾值處無發現結果。             | 一或多個發現結果達到閾值。         | 引數或執行時期失敗。 |
| `policy watch` | 無發現結果且接受的雜湊值為最新。 | 存在發現結果或已接受的認證已過期。 | 引數或執行時期失敗。 |

## 相關

- [Doctor lint 模式](/zh-Hant/cli/doctor#lint-mode)
- [Path CLI](/zh-Hant/cli/path)
