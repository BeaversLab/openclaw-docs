---
summary: "Use OpenShell as a managed sandbox backend for OpenClaw agents"
title: OpenShell
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

OpenShell 是 OpenClaw 的受管理沙箱後端。OpenClaw 不在本機執行 Docker
容器，而是將沙箱生命週期委託給 `openshell` CLI，
此 CLI 會佈建具有基於 SSH 的指令執行功能的遠端環境。

OpenShell 外掛程式重複使用與一般 [SSH 後端](/zh-Hant/gateway/sandboxing#ssh-backend) 相同的核心 SSH 傳輸和遠端檔案系統
橋接器。它新增
OpenShell 專屬的生命週期 (`sandbox create/get/delete`, `sandbox ssh-config`)
和選用的 `mirror` 工作區模式。

## 先決條件

- 已安裝 `openshell` CLI 且位於 `PATH` (或透過
  `plugins.entries.openshell.config.command` 設定自訂路徑)
- 具有沙箱存取權的 OpenShell 帳戶
- 在主機上執行的 OpenClaw Gateway

## 快速開始

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

2. 重新啟動 Gateway。在下一個代理程式回合中，OpenClaw 將建立 OpenShell
   沙箱並透過它路由工具執行。

3. 驗證：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作區模式

這是使用 OpenShell 時最重要的決策。

### `mirror`

當您希望 **本機工作區保持為標準** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本機工作區同步至 OpenShell 沙箱。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本機工作區。
- 檔案工具仍透過沙箱橋接器運作，但本機工作區
  在回合之間仍為事實來源。

最適用於：

- 您在 OpenClaw 外部於本機編輯檔案，並希望這些變更自動
  在沙箱中可見。
- 您希望 OpenShell 沙箱的行為盡可能像 Docker 後端一樣。
- 您希望主機工作區在每次執行回合後反映沙箱寫入內容。

取捨：每次執行前後有額外的同步成本。

### `remote`

當您希望
**OpenShell 工作區成為標準** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 首次建立沙箱時，OpenClaw 會從本機工作區
  將遠端工作區植入一次。
- 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接針對遠端 OpenShell 工作區進行操作。
- OpenClaw **不會** 將遠端變更同步回本地工作區。
- 提示時期的媒體讀取仍然有效，因為檔案和媒體工具會透過沙箱橋接器進行讀取。

最適用於：

- 沙箱應主要位於遠端。
- 您希望降低每回合的同步開銷。
- 您不希望主機本機的編輯無聲地覆寫遠端沙箱狀態。

<Warning>如果您在初始種子之後於 OpenClaw 之外的主機上編輯檔案，遠端沙箱將**不會**看到這些變更。請使用 `openclaw sandbox recreate` 重新植入種子。</Warning>

### 選擇模式

|                      | `mirror`           | `remote`               |
| -------------------- | ------------------ | ---------------------- |
| **標準工作區**       | 本地主機           | 遠端 OpenShell         |
| **同步方向**         | 雙向 (每次執行)    | 一次性種子             |
| **每回合開銷**       | 較高 (上傳 + 下載) | 較低 (直接遠端操作)    |
| **本地編輯可見嗎？** | 是，於下次執行時   | 否，直到重新建立       |
| **最適用於**         | 開發工作流程       | 長期執行的代理程式、CI |

## 組態參考

所有 OpenShell 組態都位於 `plugins.entries.openshell.config` 之下：

| 金鑰                      | 類型                     | 預設值        | 說明                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作區同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路徑或名稱                  |
| `from`                    | `string`                 | `"openclaw"`  | 首次建立的沙箱來源                            |
| `gateway`                 | `string`                 | —             | OpenShell 閘道名稱 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 閘道端點 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用於建立沙箱的 OpenShell 原則 ID              |
| `providers`               | `string[]`               | `[]`          | 建立沙箱時要附加的提供者名稱                  |
| `gpu`                     | `boolean`                | `false`       | 請求 GPU 資源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在建立沙箱時傳遞 `--auto-providers`           |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱內的主要可寫入工作區                      |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作區掛載路徑（用於唯讀存取）          |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 作業的逾時時間                |

沙箱層級設定 (`mode`, `scope`, `workspaceAccess`) 設定在
`agents.defaults.sandbox` 之下，如同任何後端。請參閱
[Sandboxing](/zh-Hant/gateway/sandboxing) 以取得完整矩陣。

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

### 具有 GPU 的鏡像模式

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

### 具有自訂閘道的個別 Agent OpenShell

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

OpenShell 沙箱透過一般沙箱 CLI 進行管理：

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

對於 `remote` 模式，**重新建立特別重要**：它會刪除該範圍的標準
遠端工作區。下次使用時會從本機工作區植入一個全新的遠端工作區。

對於 `mirror` 模式，重新建立主要會重設遠端執行環境，因為
本機工作區仍然保持標準。

### 何時重新建立

變更以下任何項目後重新建立：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全性強化

OpenShell 會釘選工作區根 fd 並在每次讀取前重新檢查沙箱身分，因此符號連結交換或重新掛載的工作區無法將讀取重新導向到
預期的遠端工作區之外。

## 目前限制

- OpenShell 後端不支援沙箱瀏覽器。
- `sandbox.docker.binds` 不適用於 OpenShell。
- `sandbox.docker.*` 下 Docker 專屬的執行時參數僅適用於 Docker 後端。

## 運作方式

1. OpenClaw 呼叫 `openshell sandbox create`（並根據設定使用 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 標誌）。
2. OpenClaw 呼叫 `openshell sandbox ssh-config <name>` 以取得沙箱的
   SSH 連線詳細資訊。
3. 核心會將 SSH 設定寫入暫存檔，並使用與通用 SSH 後端相同的遠端檔案系統橋接器開啟 SSH 連線階段。
4. 在 `mirror` 模式下：在執行前同步本地到遠端，執行後同步回本地。
5. 在 `remote` 模式下：在建立時種入一次，然後直接在遠端
   工作區上運作。

## 相關

- [Sandboxing](/zh-Hant/gateway/sandboxing) -- 模式、範圍與後端比較
- [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 偵錯被封鎖的工具
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫
- [Sandbox CLI](/zh-Hant/cli/sandbox) -- `openclaw sandbox` 指令
