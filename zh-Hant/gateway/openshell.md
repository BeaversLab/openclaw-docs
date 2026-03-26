---
title: OpenShell
summary: "Use OpenShell as a managed sandbox backend for OpenClaw agents"
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

# OpenShell

OpenShell 是 OpenClaw 的受控沙箱後端。OpenClaw 不會在本地執行 Docker 容器，而是將沙箱生命週期委派給 `openshell` CLI，由其佈建支援基於 SSH 的指令執行的遠端環境。

OpenShell 外掛程式重複使用與通用 [SSH backend](/zh-Hant/gateway/sandboxing#ssh-backend) 相同的核心 SSH 傳輸和遠端檔案系統橋接器。它新增了 OpenShell 特有的生命週期 (`sandbox create/get/delete`, `sandbox ssh-config`) 以及可選的 `mirror` 工作區模式。

## 先決條件

- 已安裝 `openshell` CLI 且位於 `PATH` 上 (或透過
  `plugins.entries.openshell.config.command` 設定自訂路徑)
- 具有沙箱存取權限的 OpenShell 帳戶
- 在主機上執行的 OpenClaw Gateway

## 快速入門

1. 啟用外掛程式並設定沙箱後端：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

2. 重新啟動 Gateway。在下一個 agent 輪次中，OpenClaw 將建立一個 OpenShell
   沙箱並透過其路由工具執行。

3. 驗證：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作區模式

這是使用 OpenShell 時最重要的決策。

### `mirror`

當您希望 **本機工作區保持為標準版本 (canonical)** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本機工作區同步到 OpenShell 沙箱中。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本機工作區。
- 檔案工具仍然透過沙箱橋接器運作，但在各輪次之間，本機工作區
  仍然保持為事實來源 (source of truth)。

最適用於：

- 您在 OpenClaw 之外本機編輯檔案，並希望這些變更能自動顯示在沙箱中。
- 您希望 OpenShell 沙箱的行為盡可能與 Docker 後端相似。
- 您希望在每次執行回合後，主機工作區能反映沙箱的寫入。

取捨：每次執行前後會有額外的同步成本。

### `remote`

當您希望 **OpenShell 工作區成為權威來源** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 首次建立沙箱時，OpenClaw 會從本機工作區向遠端工作區植入一次資料。
- 此後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 將直接對遠端 OpenShell 工作區進行操作。
- OpenClaw **不會** 將遠端的變更加同步回本機工作區。
- Prompt-time media reads still work because file and media tools read through
  the sandbox bridge.

Best for:

- The sandbox should live primarily on the remote side.
- You want lower per-turn sync overhead.
- You do not want host-local edits to silently overwrite remote sandbox state.

Important: if you edit files on the host outside OpenClaw after the initial seed,
the remote sandbox does **not** see those changes. Use
`openclaw sandbox recreate` to re-seed.

### Choosing a mode

|                          | `mirror`                   | `remote`                  |
| ------------------------ | -------------------------- | ------------------------- |
| **Canonical workspace**  | Local host                 | Remote OpenShell          |
| **Sync direction**       | Bidirectional (each exec)  | One-time seed             |
| **Per-turn overhead**    | Higher (upload + download) | Lower (direct remote ops) |
| **Local edits visible?** | Yes, on next exec          | No, until recreate        |
| **Best for**             | Development workflows      | Long-running agents, CI   |

## Configuration reference

所有 OpenShell 配置都位於 `plugins.entries.openshell.config` 之下：

| 鍵                        | 類型                     | 預設          | 描述                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作區同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路徑或名稱                  |
| `from`                    | `string`                 | `"openclaw"`  | 首次建立時的沙箱來源                          |
| `gateway`                 | `string`                 | —             | OpenShell 閘道名稱 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 閘道端點 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用於建立沙箱的 OpenShell 原則 ID              |
| `providers`               | `string[]`               | `[]`          | 建立沙箱時要附加的提供者名稱                  |
| `gpu`                     | `boolean`                | `false`       | 請求 GPU 資源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在建立沙箱期間傳遞 `--auto-providers`         |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱內的主要可寫入工作區                      |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作區掛載路徑（用於唯讀存取）          |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的逾時時間                |

沙箱層級的設定 (`mode`、`scope`、`workspaceAccess`) 是在
`agents.defaults.sandbox` 下配置，與任何後端相同。請參閱
[沙箱機制](/zh-Hant/gateway/sandboxing) 以取得完整矩陣。

## 範例

### 最小遠端設定

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### 具 GPU 的鏡像模式

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### 具自訂閘道的每個代理程式 OpenShell

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          policy: "strict",
        },
      },
    },
  },
}
```

## 生命週期管理

OpenShell 沙箱是透過一般沙箱 CLI 來管理：

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

對於 `remote` 模式，**重新建立 尤其重要**：它會刪除該範圍的
標準遠端工作區。下次使用時會從本機工作區植入全新的遠端工作區。

對於 `mirror` 模式，重建主要是重設遠端執行環境，因為本地工作區保持為標準。

### 何時重建

變更以下任何項目後請重建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 目前限制

- OpenShell 後端不支援沙盒瀏覽器。
- `sandbox.docker.binds` 不適用於 OpenShell。
- `sandbox.docker.*` 下的 Docker 特定執行時參數僅適用於 Docker
  後端。

## 運作原理

1. OpenClaw 呼叫 `openshell sandbox create`（依設定帶有 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 旗標）。
2. OpenClaw 呼叫 `openshell sandbox ssh-config <name>` 以取得沙箱的
   SSH 連線詳細資訊。
3. Core 將 SSH 設定寫入暫存檔案，並使用與一般 SSH 後端相同的遠端檔案系統橋接器開啟 SSH 連線階段。
4. 在 `mirror` 模式下：在執行前將本機同步到遠端，執行後同步回來。
5. 在 `remote` 模式下：在建立時植入一次，然後直接在遠端工作區上操作。

## 另請參閱

- [沙箱機制](/zh-Hant/gateway/sandboxing) -- 模式、範圍與後端比較
- [沙箱與工具原則與提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 偵錯被阻擋的工具
- [多重代理沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理的覆寫設定
- [Sandbox CLI](/zh-Hant/cli/sandbox) -- `openclaw sandbox` 指令

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
