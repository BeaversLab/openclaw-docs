---
summary: "用於 `openclaw policy` 合規性檢查的 CLI 參考"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "原則"
---

# `openclaw policy`

`openclaw policy` 由內建的 Policy 外掛程式提供。Policy 是現有 OpenClaw 設定之上的企業合規層。它並未新增
第二個設定系統。`policy.jsonc` 定義了編寫的需求，
OpenClaw 將活動的工作區視為證據進行觀察，而原則健康檢查
則透過 `doctor --lint` 回報差異。最終的合規訊號是乾淨的
`doctor --lint` 執行；原則會將發現貢獻至該共用的 lint 表面，
而不是建立獨立的健康閘道。

Policy 目前管理已設定的通道、MCP 伺服器、模型提供者、
網路 SSRF 姿態、輸入/通道存取姿態、Gateway 暴露姿態、代理程式工作區姿態、
OpenClaw 設定秘密提供者/驗證設定檔姿態，以及受控工具
宣告。例如，IT 或工作區操作員可以記錄 Telegram
不是核准的通道提供者、將 MCP 伺服器和模型參考限制為
核准的項目、要求私有網路 fetch/browser 存取保持
停用、要求直接訊息工作階段隔離和通道輸入姿態
保持在審查範圍內、要求 Gateway 繫結/驗證/HTTP 暴露保持在審查
範圍內、要求代理程式工作區存取和工具拒絕保持在已審查的
姿態、要求 OpenClaw 設定 SecretRefs 使用受管理的提供者、要求
設定驗證設定檔攜帶提供者/模式中繼資料、要求受控工具攜帶
風險和敏感性中繼資料，然後使用 `doctor --lint` 作為共用
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

啟用原則時，doctor 可以載入原則健康檢查而无需啟用
任意外掛程式。如果缺少 `policy.jsonc`，該外掛程式會保持啟用狀態，以便
doctor 回報該遺失的構件。

Policy 是由作者撰寫的，而非根據使用者目前的設定產生。涵蓋通道、MCP 伺服器、模型提供者、網路狀態、入站/通道存取、Gateway 暴露、代理程式工作區狀態、已設定的沙箱執行時期狀態、OpenClaw 設定祕密提供者/驗證設定檔狀態以及工具中繼資料的最小原則如下所示：

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
  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
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

規則即權威。類別區塊僅作為命名空間；當存在具體規則時才會執行檢查。OpenClaw 讀取目前的 `channels.*` 設定
`mcp.servers.*`、`models.providers.*`、選取的代理程式模型參照、網路 SSRF
設定、直接訊息工作階段範圍、頻道 DM 原則、頻道群組原則、
頻道/群組提及閘道、Gateway 繫結/驗證/Control UI/Tailscale/遠端/HTTP
狀態、OpenClaw 設定代理程式沙箱工作區存取和工具拒絕狀態、設定密碼
提供者和 SecretRef 出處、設定驗證設定檔中繼資料、已設定
全域/每代理程式工具狀態，以及 `TOOLS.md` 宣告作為證據，然後
回報不符合的觀察狀態。如果原則拒絕非 loopback
Gateway 繫結，僅在您
願意檢閱執行時期預設值時省略 `gateway.bind`；請設定 `gateway.bind=loopback` 以達到
嚴格的設定一致性。對於唯讀代理程式狀態，請在適用的預設值或代理程式上設定沙箱模式
並將 `workspaceAccess` 設為 `none` 或
`ro`；省略或設定為 `off` 的沙箱模式無法滿足唯讀/禁止寫入
原則。`agents.workspace.denyTools` 支援 `exec`、`process`、`write`、
`edit` 和 `apply_patch`；OpenClaw 設定 `group:fs` 涵蓋檔案變異工具
而 `group:runtime` 涵蓋 shell/程序工具。工具狀態原則觀察
`tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、
`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、
`tools.exec.host`、`tools.elevated.enabled` 以及相同的每代理程式
`agents.list[].tools.*` 覆寫。它不會讀取執行時期/操作員批准
狀態（例如 exec-approvals.），也不會在執行時期強制執行工具呼叫。密碼證據記錄
提供者/來源狀態和 SecretRef 中繼資料，絕不包含原始密碼值。原則
不會讀取或證實每代理程式憑證存放區（例如 `auth-profiles.json`）；
這些存放區仍由現有的驗證和憑證流程擁有。

### Policy 規則參考

以下每個原則欄位都是可選的。僅當 `policy.jsonc` 中存在相符的規則時，才會執行檢查。觀察到的狀態是指既有的 OpenClaw 設定或工作區元資料；原則會報告差異，但除非有明確提供並啟用修復路徑，否則不會重寫執行時期的行為。

原則覆蓋層將廣泛的頂層規則保持為全域，然後允許具名範圍區塊為特定選擇器加入更嚴格的常規原則章節。範圍名稱只是一個描述性的分類；比對使用的是範圍內的選擇器值。覆蓋層是累加的：全域宣告仍會執行，而範圍宣告可以針對相同的觀察設定發出其自己的發現。

#### 範圍覆蓋層

當一組代理或通道需要比頂層基準更嚴格的原則時，請使用 `scopes.<scopeName>`。代理範圍章節使用 `agentIds`，它支援 `tools.*`、`agents.workspace.*` 和 `sandbox.*`。通道範圍入口使用 `channelIds`，它支援 `ingress.channels.*`。不支援的章節會被拒絕，而非被忽略。如果 `agents.list[]` 中不存在 `agentIds` 條目，OpenClaw 會針對該執行時期代理 ID 繼承的全域/預設姿態來評估範圍規則。

```jsonc
{
  "tools": {
    "exec": {
      "allowHosts": ["sandbox", "node"],
    },
  },
  "sandbox": {
    "requireMode": ["all", "non-main"],
  },
  "scopes": {
    "release-workspace": {
      "agentIds": ["release-agent", "review-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
    },
    "release-lockdown": {
      "agentIds": ["release-agent"],
      "tools": {
        "exec": {
          "allowHosts": ["sandbox"],
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
        },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
    },
    "shell-sandbox": {
      "agentIds": ["shell-agent"],
      "sandbox": {
        "allowBackends": ["openshell"],
        "containers": {
          "requireReadOnlyMounts": false,
        },
      },
    },
    "telegram-ingress": {
      "channelIds": ["telegram"],
      "ingress": {
        "channels": {
          "allowDmPolicies": ["pairing"],
          "denyOpenGroups": true,
          "requireMentionInGroups": true,
        },
      },
    },
  },
}
```

當每個範圍管轄不同的欄位時，如上圖所示，同一個代理可以出現在多個範圍中。根據原則元資料，同一個代理重複的範圍欄位必須具有相同或更嚴格的限制；較弱的重複宣告會被拒絕。嚴格性元資料將允許清單視為子集，拒絕清單視為超集，並將所需的布林值視為固定需求。

容器姿態原則僅根據 OpenClaw 對相符代理所能觀察到的證據進行評估。如果已啟用的 `sandbox.containers.*` 規則套用至其沙箱後端無法公開該欄位的代理，原則會回報 `policy/sandbox-container-posture-unobservable`，而非將該宣告視為通過。請針對使用不同沙箱後端的代理群組使用個別的 `agentIds` 範圍，並將不支援的容器規則保持未設定或設為 false，適用於那些無法觀察到這些欄位的群組。

頂層 `ingress.session.requireDmScope` 保持全域性，因為 `session.dmScope` 不是可歸因於通道的證據。

| 選擇器       | 支援的區段                               | 使用時機                             |
| ------------ | ---------------------------------------- | ------------------------------------ |
| `agentIds`   | `tools`、`agents.workspace` 和 `sandbox` | 一或多個執行時代理需要更嚴格的規則。 |
| `channelIds` | `ingress.channels`                       | 一或多個通道需要更嚴格的入口規則。   |

`policy.jsonc` 中呈現的每個範圍都必須有效且可執行。

#### 通道

| 原則欄位                             | 觀察狀態                        | 使用時機                                        |
| ------------------------------------ | ------------------------------- | ----------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` 提供者和已啟用狀態 | 拒絕來自提供者（例如 `telegram`）的已設定通道。 |
| `channels.denyRules[].reason`        | 發現訊息和修復提示內容          | 說明為何拒絕該提供者。                          |

#### MCP 伺服器

| 原則欄位            | 觀察狀態           | 使用時機                                          |
| ------------------- | ------------------ | ------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ID | 要求每個已設定的 MCP 伺服器都必須位於允許清單中。 |
| `mcp.servers.deny`  | `mcp.servers.*` ID | 拒絕特定的已設定 MCP 伺服器 ID。                  |

#### 模型提供者

| 原則欄位                 | 觀察狀態                                 | 使用時機                                                 |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ID 和選取的模型參照 | 要求設定的提供者和選取的模型參照必須使用已核准的提供者。 |
| `models.providers.deny`  | `models.providers.*` ID 和選取的模型參照 | 根據提供者 ID 拒絕設定的提供者和選取的模型參照。         |

#### 網路

| 原則欄位                       | 觀察狀態             | 使用時機                                  |
| ------------------------------ | -------------------- | ----------------------------------------- |
| `network.privateNetwork.allow` | 私人網路 SSRF 逃生艙 | 設為 `false` 以要求私人網路存取保持停用。 |

#### 入口和通道存取

| 原則欄位                                  | 觀察狀態                                     | 使用時機                                     |
| ----------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `ingress.session.requireDmScope`          | `session.dmScope`                            | 要求經過審查的直接訊息隔離範圍。             |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` 和舊版通道 DM 原則欄位 | 僅允許經過審查的直接訊息通道原則。           |
| `ingress.channels.denyOpenGroups`         | 頻道、帳戶和群組入口政策                     | 拒絕已設定頻道和帳戶的開放式群組入口。       |
| `ingress.channels.requireMentionInGroups` | 頻道、帳戶、群組、公會和巢狀提及閘道設定     | 當群組入口為開放或提及閘道時，要求提及閘道。 |

#### Gateway

| Policy 欄位                             | 觀察狀態                            | 使用時機                                             |
| --------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                      | 設定為 `false` 以要求回送 Gateway 繫結。             |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway 姿態 | 設定為 `false` 以拒絕 Tailscale Funnel 暴露。        |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                 | 設定為 `true` 以拒絕已停用的 Gateway 驗證。          |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`            | 設定為 `true` 以要求明確的驗證速率限制設定。         |
| `gateway.controlUi.allowInsecure`       | 控制 UI 不安全驗證/裝置/來源切換    | 設定為 `false` 以拒絕不安全的控制 UI 暴露切換。      |
| `gateway.remote.allow`                  | 遠端 Gateway 模式/設定              | 設定為 `false` 以拒絕遠端 Gateway 模式。             |
| `gateway.http.denyEndpoints`            | Gateway HTTP API 端點               | 拒絕端點 ID，例如 `chatCompletions` 或 `responses`。 |
| `gateway.http.requireUrlAllowlists`     | Gateway HTTP URL 擷取輸入           | 設定為 `true` 以要求 URL 擷取輸入上的 URL 允許清單。 |

#### Agent 工作區

| Policy 欄位                      | 觀察狀態                                                                             | 使用時機                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.list[].sandbox.workspaceAccess` | 僅允許沙箱工作區存取值，例如 `none` 或 `ro`。                                                       |
| `agents.workspace.denyTools`     | 全域和個別代理程式工具拒絕設定                                                       | 要求工作區/執行時期變異工具（例如 `exec`、`process`、`write`、`edit` 或 `apply_patch`）必須被拒絕。 |

#### 沙箱姿態

| Policy 欄位                                           | 觀察狀態                                       | 使用時機                                             |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` 和每代理模式    | 僅允許經過審查的沙盒模式，例如 `all` 或 `non-main`。 |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` 和每代理後端 | 僅允許經過審查的沙盒後端，例如 `docker`。            |
| `sandbox.containers.denyHostNetwork`                  | 容器支援的沙盒/瀏覽器網路模式                  | 拒絕主機網路模式。                                   |
| `sandbox.containers.denyContainerNamespaceJoin`       | 容器支援的沙盒/瀏覽器網路模式                  | 拒絕加入另一個容器的網路命名空間。                   |
| `sandbox.containers.requireReadOnlyMounts`            | 容器支援的沙盒/瀏覽器掛載模式                  | 要求掛載為唯讀。                                     |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | 容器支援的沙盒/瀏覽器掛載目標                  | 拒絕容器執行時期 socket 掛載。                       |
| `sandbox.containers.denyUnconfinedProfiles`           | 容器安全性配置檔態勢                           | 拒絕未受限的容器安全性配置檔。                       |
| `sandbox.browser.requireCdpSourceRange`               | 沙盒瀏覽器 CDP 來源範圍                        | 要求瀏覽器 CDP 暴露聲明來源範圍。                    |

Policy 將遺失的 `sandbox.mode` 視為隱含預設值 `off`，因此
`sandbox.requireMode` 會將新鮮或未設定的沙盒回報為超出允許清單（例如 `["all"]`）。

#### Secrets

| Policy 欄位                       | 觀察到的狀態                                  | 使用時機                                               |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `secrets.requireManagedProviders` | 設定 SecretRefs 和 `secrets.providers.*` 宣告 | 設為 `true` 以要求 SecretRefs 指向已宣告的提供者。     |
| `secrets.denySources`             | Secret 提供者來源和 SecretRef 來源            | 拒絕來源，例如 `exec`、`file` 或另一個設定的來源名稱。 |
| `secrets.allowInsecureProviders`  | 不安全的 secret-provider 態勢旗標             | 設為 `false` 以拒絕選擇不安全態勢的提供者。            |

#### Auth profiles

| Policy 欄位                     | 觀察到的狀態                         | 使用時機                                                                    |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | `auth.profiles.*` 提供者和模式元資料 | 要求在設定 auth profiles 上具備元資料金鑰，例如 `provider` 和 `mode`。      |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`               | 僅允許支援的驗證設定檔模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。 |

#### 工具元數據

| 策略欄位                | 觀察狀態                 | 使用時機                                                                |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `tools.requireMetadata` | 受管制的 `TOOLS.md` 宣告 | 要求受管制的工具宣告元數據金鑰，例如 `risk`、`sensitivity` 或 `owner`。 |

#### 工具姿態

| 策略欄位                        | 觀察狀態                                            | 使用時機                                                                       |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.list[].tools.profile`    | 僅允許工具設定檔 ID，例如 `minimal`、`messaging` 或 `coding`。                 |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和個別代理 `tools.fs` 覆寫 | 設定為 `true` 以要求僅限工作區的檔案系統工具姿態。                             |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和個別代理 exec 安全性        | 僅允許 exec 安全性模式，例如 `deny` 或 `allowlist`。                           |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和個別代理 exec 詢問模式           | 要求核准姿態，例如 `always`。                                                  |
| `tools.exec.allowHosts`         | `tools.exec.host` 和個別代理 exec 主機路由          | 僅允許 exec 主機路由模式，例如 `sandbox`。                                     |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和個別代理 提權姿態        | 設定為 `false` 以要求提權工具模式保持停用。                                    |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` 和個別代理 `tools.alsoAllow`      | 要求精確的 `alsoAllow` 項目，並回報遺漏或非預期的額外工具授權。                |
| `tools.denyTools`               | `tools.deny` 和 `agents.list[].tools.deny`          | 要求設定的工具拒絕清單包含工具 ID 或群組，例如 `group:runtime` 和 `group:fs`。 |

在編寫期間僅執行原則檢查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 僅執行原則檢查集並輸出證據、發現結果和認證雜湊。當啟用 Policy 插件時，相同的發現結果也會顯示在 `openclaw doctor --lint` 中。

將操作員原則檔案與已編寫的基準原則檔案進行比較：

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` 將原則檔案語法與原則檔案語法進行比較。它不會檢查 OpenClaw 執行時狀態、證據、憑證或機密。該指令使用與管控範圍層疊相同的原則規則中繼資料：允許清單必須保持相等或更窄，拒絕清單必須保持相等或更寬，所需的布林值必須保持其所需值，有序字串只能朝向設定順序的更嚴格端移動，而精確清單必須完全相符。

基準檔案可以是組織編寫的原則。受檢查的原則可以使用更嚴格的值或新增額外的原則規則。頂層受檢查的規則也可以滿足範圍基準規則，因為它具有同等或更嚴格的限制，且頂層原則適用範圍廣泛。範圍名稱不需要相符；範圍比較是以選擇器值（例如 `agentIds` 或 `channelIds`）以及受檢查的原則欄位為鍵值。

範例簡潔比較 JSON 輸出僅報告原則檔案的比較狀態：

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

範例簡潔 `policy check --json` 輸出包含穩定的雜湊值，可由操作員或監督人員記錄：

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

## 設定原則

原則設定位於 `plugins.entries.policy.config` 之下。

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
| `enabled`                 | 即使 `policy.jsonc` 尚未存在，也啟用原則檢查。   |
| `workspaceRepairs`        | 允許 `doctor --fix` 編輯由原則管理的工作區設定。 |
| `expectedHash`            | 已核准原則製件的選用雜湊鎖定。                   |
| `expectedAttestationHash` | 上次接受之乾淨原則檢查的選用雜湊鎖定。           |
| `path`                    | 原則製件的工作區相對位置。                       |

將 `plugins.entries.policy.config.enabled` 設為 `false` 以停用工作區的
策略檢查，同時保留外掛程式的安裝。

工具中繼資料需求是在 `policy.jsonc` 中使用 `tools.requireMetadata` 撰寫的，
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

策略雜湊用於識別已撰寫的規則成品。證據區塊會記錄策略檢查所使用的
觀察到的 OpenClaw 狀態。`workspace.hash` 值用於識別已檢查範圍的
該證據承載。發現雜湊用於識別檢查所返回的確切發現集合。
`checkedAt` 記錄評估執行的時間。證明雜湊識別穩定的
宣告：策略雜湊、證據雜湊、發現雜湊，以及結果是否乾淨。它刻意不包含
`checkedAt`，因此相同的策略狀態在重複檢查中會產生相同的
證明。這些共同組成了此策略檢查的稽核元組。

如果後續的閘道或監督器使用策略來封鎖、核准或註解執行時期動作，
它應該記錄上次乾淨策略檢查的證明雜湊。
`checkedAt` 會保留在 JSON 輸出中以便進行稽核日誌記錄，
但不是穩定證明雜湊的一部分。

接受策略狀態時，請使用此生命週期：

1. 撰寫或審閱 `policy.jsonc`。
2. 執行 `openclaw policy check --json`。
3. 如果結果是乾淨的，請將 `attestation.policy.hash` 記錄為 `expectedHash`。
4. 將 `attestation.attestationHash` 記錄為 `expectedAttestationHash`。
5. 在 CI 或發行閘道中重新執行 `openclaw doctor --lint`。

如果策略規則有意變更，請從乾淨的檢查中更新兩個已接受的雜湊。
如果工作區設定有意變更但策略保持不變，通常只有 `expectedAttestationHash`
會變更。

啟用或升級 `agents.workspace` 規則會將 `agentWorkspace` 證據新增到
工作區雜湊和證明雜湊中。操作人員應在啟用這些規則後檢視新
證據並重新整理已接受的證明雜湊。
啟用或升級工具姿態規則會以相同方式新增 `toolPosture` 證據。

`openclaw policy watch` 重複執行相同的檢查，並在當前
證據不再符合 `expectedAttestationHash` 時進行回報：

```bash
openclaw policy watch --json
```

在僅需一次差異評估的 CI 或腳本中使用 `--once`。如果沒有
`--once`，該指令預設每兩秒輪詢一次；請使用 `--interval-ms` 來
選擇不同的間隔。

## 檢查結果

Policy 目前會驗證：

| 檢查 ID                                           | 檢查結果                                                       |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                     | Policy 已啟用，但缺少 `policy.jsonc`。                         |
| `policy/policy-jsonc-invalid`                     | Policy 無法解析或包含格式錯誤的規則項目。                      |
| `policy/policy-hash-mismatch`                     | Policy 不符合設定的 `expectedHash`。                           |
| `policy/attestation-hash-mismatch`                | 目前的 Policy 證據不再符合已接受的證明。                       |
| `policy/policy-conformance-invalid`               | 基準或受檢查的 Policy 檔案具有無效的比較語法。                 |
| `policy/policy-conformance-missing`               | 受檢查的 Policy 檔案缺少基準 Policy 檔案所需的規則。           |
| `policy/policy-conformance-weaker`                | 受檢查的 Policy 檔案的值比基準 Policy 檔案更弱。               |
| `policy/channels-denied-provider`                 | 已啟用的頻道符合頻道拒絕規則。                                 |
| `policy/mcp-denied-server`                        | 設定的 MCP 伺服器被 Policy 拒絕。                              |
| `policy/mcp-unapproved-server`                    | 設定的 MCP 伺服器不在允許清單中。                              |
| `policy/models-denied-provider`                   | 設定的模型提供者或模型參考使用了被拒絕的提供者。               |
| `policy/models-unapproved-provider`               | 設定的模型提供者或模型參考不在允許清單中。                     |
| `policy/network-private-access-enabled`           | 當 Policy 拒絕時，啟用了私有網路 SSRF 逃生艙。                 |
| `policy/ingress-dm-policy-unapproved`             | 頻道 DM Policy 不在 Policy 允許清單中。                        |
| `policy/ingress-dm-scope-unapproved`              | `session.dmScope` 不符合原則要求的 DM 隔離範圍。               |
| `policy/ingress-open-groups-denied`               | 頻道群組原則為 `open`，而原則拒絕開放群組入口。                |
| `policy/ingress-group-mention-required`           | 頻道或群組項目停用了提及閘門，但原則要求啟用它們。             |
| `policy/gateway-non-loopback-bind`                | 閘道綁定狀態允許非回環暴露，但原則拒絕此情況。                 |
| `policy/gateway-auth-disabled`                    | 閘道驗證已停用，但原則要求驗證。                               |
| `policy/gateway-rate-limit-missing`               | 當原則要求明確指定時，閘道驗證速率限制狀態未明確指定。         |
| `policy/gateway-control-ui-insecure`              | 閘道控制 UI 不安全暴露切換已啟用。                             |
| `policy/gateway-tailscale-funnel`                 | 當原則拒絕時，閘道 Tailscale Funnel 暴露已啟用。               |
| `policy/gateway-remote-enabled`                   | 當原則拒絕時，閘道遠端模式處於啟用狀態。                       |
| `policy/gateway-http-endpoint-enabled`            | 閘道 HTTP API 端點已啟用，但遭原則拒絕。                       |
| `policy/gateway-http-url-fetch-unrestricted`      | 閘道 HTTP URL 擷取輸入缺少必要的 URL 允許清單。                |
| `policy/agents-workspace-access-denied`           | Agent 沙箱模式或工作區存取權限超出原則允許清單範圍。           |
| `policy/agents-tool-not-denied`                   | Agent 或預設配置未拒絕原則要求的工具。                         |
| `policy/tools-profile-unapproved`                 | 設定的全域或個別 Agent 工具設定檔超出允許清單範圍。            |
| `policy/tools-fs-workspace-only-required`         | 檔案系統工具未設定為僅限工作區路徑狀態。                       |
| `policy/tools-exec-security-unapproved`           | Exec 安全模式超出原則允許清單範圍。                            |
| `policy/tools-exec-ask-unapproved`                | Exec 詢問模式超出原則允許清單範圍。                            |
| `policy/tools-exec-host-unapproved`               | Exec 主機路由超出原則允許清單範圍。                            |
| `policy/tools-elevated-enabled`                   | 當原則拒絕時，提升工具模式已啟用。                             |
| `policy/tools-also-allow-missing`                 | 設定的 `alsoAllow` 清單缺少原則要求的項目。                    |
| `policy/tools-also-allow-unexpected`              | 設定的 `alsoAllow` 清單包含原則未預期的項目。                  |
| `policy/tools-required-deny-missing`              | 全域或個別 Agent 工具拒絕清單未包含必要的拒絕工具。            |
| `policy/sandbox-mode-unapproved`                  | 沙箱模式位於政策允許清單之外。                                 |
| `policy/sandbox-backend-unapproved`               | 沙箱後端位於政策允許清單之外。                                 |
| `policy/sandbox-container-posture-unobservable`   | 針對無法觀察的後端啟用了容器姿態規則。                         |
| `policy/sandbox-container-host-network-denied`    | 容器支援的沙箱或瀏覽器使用了主機網路模式。                     |
| `policy/sandbox-container-namespace-join-denied`  | 容器支援的沙箱或瀏覽器加入了另一個容器的命名空間。             |
| `policy/sandbox-container-mount-mode-required`    | 容器支援的沙箱或瀏覽器掛載並非唯讀。                           |
| `policy/sandbox-container-runtime-socket-mount`   | 容器支援的沙箱或瀏覽器掛載暴露了容器執行時期通訊端。           |
| `policy/sandbox-container-unconfined-profile`     | 當政策拒絕時，容器沙箱設定檔不受限制。                         |
| `policy/sandbox-browser-cdp-source-range-missing` | 當政策要求時，缺少沙箱瀏覽器 CDP 來源範圍。                    |
| `policy/secrets-unmanaged-provider`               | 組態 SecretRef 參照了未在 `secrets.providers` 下宣告的提供者。 |
| `policy/secrets-denied-provider-source`           | 組態密碼提供者或 SecretRef 使用了政策拒絕的來源。              |
| `policy/secrets-insecure-provider`                | 當政策拒絕時，密碼提供者選擇了不安全的姿態。                   |
| `policy/auth-profile-invalid-metadata`            | 組態驗證設定檔缺少有效的提供者或模式中繼資料。                 |
| `policy/auth-profile-unapproved-mode`             | 組態驗證設定檔模式位於政策允許清單之外。                       |
| `policy/tools-missing-risk-level`                 | 受管工具宣告缺少風險中繼資料。                                 |
| `policy/tools-unknown-risk-level`                 | 受管工具宣告使用了未知的風險值。                               |
| `policy/tools-missing-sensitivity-token`          | 受管工具宣告缺少敏感性中繼資料。                               |
| `policy/tools-missing-owner`                      | 受管工具宣告缺少擁有者中繼資料。                               |
| `policy/tools-unknown-sensitivity-token`          | 受管工具宣告使用了未知的敏感性值。                             |

Policy 發現結果可以同時包含 `target` 和 `requirement`。`target` 是
觀察到的不符合規範的工作區項目。`requirement` 是使其成為
發現結果的編寫策略規則。這兩個值目前都是位址，通常是
`oc://` 路徑，但欄位名稱描述的是其策略角色，而不是
位址格式。

範例 JSON 發現結果：

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

範例工具發現結果：

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

範例 MCP 發現結果：

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

範例模型提供者 發現結果：

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

範例網路 發現結果：

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

範例 Gateway 暴露 發現結果：

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

範例代理程式工作區 發現結果：

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

`doctor --fix` 僅在明確啟用
`workspaceRepairs` 時，才會編輯受策略管理的工作區設定。如果未選擇加入，策略檢查
會回報它們將修復的內容，並保持設定不變。

在此版本中，修復可以停用在 OpenClaw 設定中啟用
但被 `channels.denyRules` 拒絕的通道。請僅在
審閱策略檔案後啟用 `workspaceRepairs`，因為有效的拒絕規則可以關閉
已設定的通道：

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

| 指令             | `0`                                    | `1`                                      | `2`                  |
| ---------------- | -------------------------------------- | ---------------------------------------- | -------------------- |
| `policy check`   | 在閾值處沒有發現結果。                 | 一或多個發現結果達到閾值。               | 引數或執行階段失敗。 |
| `policy compare` | 策略檔案至少與基準一樣嚴格。           | 策略檔案無效、遺失，或比基準規則更寬鬆。 | 引數或執行階段失敗。 |
| `policy watch`   | 沒有發現結果，且接受的雜湊值是目前的。 | 存在發現結果或接受的認證已過期。         | 引數或執行階段失敗。 |

## 相關

- [Doctor lint 模式](/zh-Hant/cli/doctor#lint-mode)
- [Path CLI](/zh-Hant/cli/path)
