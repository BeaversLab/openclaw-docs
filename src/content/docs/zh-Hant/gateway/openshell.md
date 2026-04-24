---
title: OpenShell
summary: "Use OpenShell as a managed sandbox backend for OpenClaw agents"
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

# OpenShell

OpenShell 是 OpenClaw 的受控沙箱後端。OpenClaw 不會在本機執行 Docker 容器，而是將沙箱生命週期委派給 `openshell` CLI，該 CLI 會佈建具備 SSH 命令執行功能的遠端環境。

OpenShell 外掛程式重複使用與通用 [SSH 後端](/zh-Hant/gateway/sandboxing#ssh-backend) 相同的核心 SSH 傳輸與遠端檔案系統橋接器。它加入了 OpenShell 專屬的生命週期 (`sandbox create/get/delete`、`sandbox ssh-config`) 與選用的 `mirror` 工作區模式。

## 先決條件

- 已安裝 `openshell` CLI 且位於 `PATH` 中 (或透過 `plugins.entries.openshell.config.command` 設定自訂路徑)
- 具備沙箱存取權的 OpenShell 帳戶
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

2. 重新啟動 Gateway。在下一個代理程式回合時，OpenClaw 會建立一個 OpenShell 沙箱，並透過它路由工具執行。

3. 驗證：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作區模式

這是使用 OpenShell 時最重要的決策。

### `mirror`

當您希望 **本機工作區保持標準** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本機工作區同步至 OpenShell 沙箱。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本機工作區。
- 檔案工具仍透過沙箱橋接器運作，但本機工作區在回合之間仍然是資料來源。

最適用於：

- 您在 OpenClaw 之外編輯本機檔案，並希望這些變更自動在沙箱中顯示。
- 您希望 OpenShell 沙箱的行為盡可能像 Docker 後端。
- 您希望主機工作區在每次 exec 回合後反映沙箱寫入。

取捨：每次 exec 前後有額外的同步成本。

### `remote`

當您希望 **OpenShell 工作區變成標準** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 首次建立沙箱時，OpenClaw 會從本機工作區播種一次遠端工作區。
- 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接在遠端 OpenShell 工作區上運作。
- OpenClaw **不會**將遠端變更同步回本地工作區。
- 提示時期的媒體讀取仍然有效，因為檔案和媒體工具會透過沙盒橋接器進行讀取。

最適用於：

- 沙盒應主要存在於遠端。
- 您希望降低每輪次的同步負擔。
- 您不希望主機本地的編輯無聲無息地覆蓋遠端沙盒狀態。

重要提示：如果您在初始種子之後於 OpenClaw 之外的主機上編輯檔案，遠端沙盒將**不會**看到這些變更。請使用 `openclaw sandbox recreate` 重新種子。

### 選擇模式

|                      | `mirror`           | `remote`            |
| -------------------- | ------------------ | ------------------- |
| **標準工作區**       | 本地主機           | 遠端 OpenShell      |
| **同步方向**         | 雙向 (每次執行)    | 一次性種子          |
| **每輪次負擔**       | 較高 (上傳 + 下載) | 較低 (直接遠端操作) |
| **本地編輯可見嗎？** | 是，於下次執行時   | 否，直到重新建立    |
| **最適用於**         | 開發工作流程       | 長期執行的代理、CI  |

## 設定參考

所有 OpenShell 設定都位於 `plugins.entries.openshell.config` 之下：

| 鍵                        | 類型                     | 預設值        | 描述                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作區同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路徑或名稱                  |
| `from`                    | `string`                 | `"openclaw"`  | 首次建立時的沙盒來源                          |
| `gateway`                 | `string`                 | —             | OpenShell 閘道名稱 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 閘道端點 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用於建立沙盒的 OpenShell 原則 ID              |
| `providers`               | `string[]`               | `[]`          | 建立沙箱時要附加的提供者名稱                  |
| `gpu`                     | `boolean`                | `false`       | 請求 GPU 資源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在建立沙箱期間傳遞 `--auto-providers`         |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱內的主要可寫入工作區                      |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作區掛載路徑（用於唯讀存取）          |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的逾時時間                |

沙箱層級設定 (`mode`、`scope`、`workspaceAccess`) 的配置方式與任何後端相同，皆在
`agents.defaults.sandbox` 之下。請參閱
[Sandboxing](/zh-Hant/gateway/sandboxing) 以取得完整矩陣。

## 範例

### 最精簡的遠端設定

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

### 含 GPU 的鏡像模式

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

### 具有自訂 Gateway 的 Per-agent OpenShell

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

OpenShell 沙箱透過標準的沙箱 CLI 進行管理：

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

對於 `remote` 模式，**重新建立 (recreate) 尤其重要**：它會刪除該範圍的標準
遠端工作區。下次使用時會從本機工作區植入全新的遠端工作區。

對於 `mirror` 模式，重新建立主要會重設遠端執行環境，因為
本機工作區仍是標準來源。

### 何時重新建立

變更下列任何項目後請重新建立：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全加固

讀取遠端工作區檔案的 OpenShell sandbox 輔助程式會針對工作區根目錄使用固定的檔案描述元 (pinned file descriptor)，並從該固定的 fd 開始向上遍歷，而不是在每次讀取時重新解析路徑。結合每次操作時的身分重新檢查，這可以防止中途切換符號連結或熱置換工作區掛載將讀取重導向至預期遠端工作區之外。

- 工作區根目錄會被開啟一次並固定；後續的讀取會重複使用該 fd。
- 向上遍歷會從固定的 fd 遍歷相對條目，因此無法被路徑中較高層級的替換目錄所重導向。
- 在每次讀取之前都會重新檢查 sandbox 身分，因此重建或重新分配的 sandbox 無法靜默地提供來自不同工作區的檔案。

## 目前限制

- OpenShell 後端不支援 Sandbox 瀏覽器。
- `sandbox.docker.binds` 不適用於 OpenShell。
- `sandbox.docker.*` 下的 Docker 特有執行時期 (runtime) 設定僅適用於 Docker 後端。

## 運作原理

1. OpenClaw 呼叫 `openshell sandbox create` (並根據設定使用 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 旗標)。
2. OpenClaw 呼叫 `openshell sandbox ssh-config <name>` 以取得 sandbox 的
   SSH 連線詳細資訊。
3. Core 會將 SSH 設定寫入暫存檔，並使用與通用 SSH 後端相同的遠端檔案系統橋接器開啟 SSH 連線階段。
4. 在 `mirror` 模式下：在 exec 之前將本地同步到遠端，執行，在 exec 之後同步回來。
5. 在 `remote` 模式下：在建立時植入一次，然後直接在遠端
   工作區上操作。

## 另請參閱

- [沙箱機制](/zh-Hant/gateway/sandboxing) -- 模式、範圍與後端比較
- [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 偵錯被封鎖的工具
- [Multi-Agent Sandbox and Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理程式的覆寫設定
- [Sandbox CLI](/zh-Hant/cli/sandbox) -- `openclaw sandbox` 指令
