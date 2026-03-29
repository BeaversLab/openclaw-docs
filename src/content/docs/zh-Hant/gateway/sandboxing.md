---
summary: "OpenClaw 沙箱運作方式：模式、範圍、工作區存取以及映像檔"
title: 沙箱
read_when: "您需要關於沙箱的專屬說明，或需要調整 agents.defaults.sandbox。"
status: active
---

# 沙箱

OpenClaw 可以在**沙箱後端內執行工具**以縮小影響範圍。
這是**可選的**，並由設定檔控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果沙箱功能關閉，工具將在主機上執行。
Gateway 始終停留在主機上；啟用時，工具執行會在隔離的沙箱中進行。

這並非完美的安全邊界，但在模型執行愚蠢操作時，能實質性地限制檔案系統
和程序存取。

## 什麼會被沙箱化

- 工具執行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可選的沙箱化瀏覽器（`agents.defaults.sandbox.browser`）。
  - 預設情況下，當瀏覽器工具需要時，沙箱瀏覽器會自動啟動（確保 CDP 可連線）。
    透過 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 進行設定。
  - 預設情況下，沙箱瀏覽器容器使用專屬的 Docker 網路（`openclaw-sandbox-browser`），而不是全域 `bridge` 網路。
    使用 `agents.defaults.sandbox.browser.network` 進行設定。
  - 可選的 `agents.defaults.sandbox.browser.cdpSourceRange` 會使用 CIDR 允許清單來限制容器邊緣的 CDP 入站流量（例如 `172.21.0.1/32`）。
  - noVNC 觀察者存取預設受密碼保護；OpenClaw 會發出一個短期有效的 Token URL，該 URL 提供本地引導頁面，並在 URL 片段中攜帶密碼開啟 noVNC（而非查詢參數或標頭日誌）。
  - `agents.defaults.sandbox.browser.allowHostControl` 允許沙箱化工作階段明確以主機瀏覽器為目標。
  - 可選的允許清單會控管 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未被沙箱化：

- Gateway 程序本身。
- 任何明確允許在主機上執行的工具（例如 `tools.elevated`）。
  - **提升權限的執行在主機上運行，並繞過沙盒機制。**
  - 如果關閉沙盒，`tools.elevated` 不會改變執行方式（本來就是在主機上）。參閱[提升權限模式](/en/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何時**使用沙盒：

- `"off"`：無沙盒。
- `"non-main"`：僅對**非主要**會話進行沙盒處理（如果您希望在主機上進行正常聊天，此為預設值）。
- `"all"`：每個會話都在沙盒中執行。
  注意：`"non-main"` 是基於 `session.mainKey`（預設 `"main"`），而非代理程式 ID。
  群組/頻道會話使用自己的金鑰，因此它們被視為非主要會話，將會被置入沙盒。

## 範圍

`agents.defaults.sandbox.scope` 控制**建立多少個容器**：

- `"session"`（預設值）：每個會話一個容器。
- `"agent"`：每個代理程式一個容器。
- `"shared"`：所有沙盒會話共用一個容器。

## 後端

`agents.defaults.sandbox.backend` 控制**哪個執行時期**提供沙盒：

- `"docker"`（預設值）：本地 Docker 支援的沙盒執行時期。
- `"ssh"`：通用 SSH 支援的遠端沙盒執行時期。
- `"openshell"`：OpenShell 支援的沙盒執行時期。

SSH 特定設定位於 `agents.defaults.sandbox.ssh` 之下。
OpenShell 特定設定位於 `plugins.entries.openshell.config` 之下。

### 選擇後端

|                | Docker                         | SSH                    | OpenShell                          |
| -------------- | ------------------------------ | ---------------------- | ---------------------------------- |
| **執行位置**   | 本地容器                       | 任何可存取 SSH 的主機  | OpenShell 管理的沙盒               |
| **設定**       | `scripts/sandbox-setup.sh`     | SSH 金鑰 + 目標主機    | 啟用 OpenShell 外掛                |
| **工作區模型** | Bind-mount 或複製              | 遠端為準（僅種植一次） | `mirror` 或 `remote`               |
| **網路控制**   | `docker.network`（預設值：無） | 取決於遠端主機         | 取決於 OpenShell                   |
| **瀏覽器沙盒** | 支援                           | 不支援                 | 尚不支援                           |
| **Bind 掛載**  | `docker.binds`                 | 不適用                 | 不適用                             |
| **最適合用於** | 本地開發，完全隔離             | 卸載到遠端機器         | 具備可選雙向同步功能的託管遠端沙箱 |

### SSH 後端

當您希望 OpenClaw 在任意可透過 SSH 存取的機器上對 `exec`、檔案工具和媒體讀取進行沙箱隔離時，請使用 `backend: "ssh"`。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

運作方式：

- OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個每個範圍（per-scope）專屬的遠端根目錄。
- 在建立或重建後首次使用時，OpenClaw 會從本地工作區一次性將種子資料同步至該遠端工作區。
- 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示詞媒體讀取和傳入媒體暫存都會透過 SSH 直接對遠端工作區執行。
- OpenClaw 不會自動將遠端變更同步回本地工作區。

驗證素材：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用現有的本地檔案並透過 OpenSSH 設定傳遞。
- `identityData`、`certificateData`、`knownHostsData`：使用內聯字串或 SecretRefs。OpenClaw 會透過正常的機密執行快照解析它們，使用 `0600` 將其寫入暫存檔，並在 SSH 會話結束時刪除它們。
- 如果同時為同一個項目設定了 `*File` 和 `*Data`，則 `*Data` 對該 SSH 會話優先生效。

這是一個 **remote-canonical**（以遠端為準）的模型。在初始種子同步後，遠端 SSH 工作區即成為真正的沙箱狀態。

重要後果：

- 在種子同步步驟之後，於 OpenClaw 之外對本地主機進行的編輯，在您重新建立沙箱之前不會在遠端顯示。
- `openclaw sandbox recreate` 會刪除每個範圍專屬的遠端根目錄，並在下次使用時從本地重新進行種子同步。
- SSH 後端不支援瀏覽器沙箱隔離。
- `sandbox.docker.*` 設定不適用於 SSH 後端。

### OpenShell 後端

當您希望 OpenClaw 在 OpenShell 管理的遠端環境中對工具進行沙箱隔離時，請使用 `backend: "openshell"`。如需完整的設定指南、設定參考以及工作區模式比較，請參閱專屬的
[OpenShell 頁面](/en/gateway/openshell)。

OpenShell 重用與通用 SSH 後端相同的核心 SSH 傳輸和遠端檔案系統橋接，並新增 OpenShell 特有的生命週期
(`sandbox create/get/delete`, `sandbox ssh-config`) 以及可選的 `mirror`
工作區模式。

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
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

OpenShell 模式：

- `mirror` (預設)：本地工作區保持標準權威。OpenClaw 會在執行前將本地檔案同步到 OpenShell，並在執行後將遠端工作區同步回來。
- `remote`：建立沙箱後，OpenShell 工作區為標準權威。OpenClaw 從本地工作區向遠端工作區植入一次，之後檔案工具和執行操作直接對遠端沙箱執行，而不會同步變更回來。

遠端傳輸細節：

- OpenClaw 透過 `openshell sandbox ssh-config <name>` 向 OpenShell 要求特定沙箱的 SSH 設定。
- Core 會將該 SSH 設定寫入暫存檔案，開啟 SSH 連線階段，並重複使用與 `backend: "ssh"` 相同的遠端檔案系統橋接。
- 在 `mirror` 模式下，僅生命週期不同：在執行前將本地同步到遠端，然後在執行後同步回來。

目前 OpenShell 的限制：

- 尚不支援沙箱瀏覽器
- OpenShell 後端不支援 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 特定執行時控制項仍僅適用於 Docker 後端

#### 工作區模式

OpenShell 有兩種工作區模型。這是實際上最重要的部分。

##### `mirror`

當您希望 **本地工作區保持標準權威** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本地工作區同步到 OpenShell 沙箱中。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本地工作區。
- 檔案工具仍透過沙箱橋接運作，但本地工作區在輪次之間仍保持事實來源。

在以下情況使用：

- 您在 OpenClaw 外部編輯本地檔案，並希望這些變更自動顯示在沙箱中
- 您希望 OpenShell 沙箱的行為盡可能像 Docker 後端
- 您希望主機工作區在每次執行輪次後反映沙箱的寫入

權衡：

- 執行前後有額外的同步成本

##### `remote`

當您希望 **OpenShell 工作區成為規範** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 當首次建立沙箱時，OpenClaw 會從本機工作區將遠端工作區初始化一次。
- 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接對遠端 OpenShell 工作區進行操作。
- OpenClaw 在執行後**不會**將遠端變更同步回本機工作區。
- 提示時段的媒體讀取仍然有效，因為檔案和媒體工具是透過沙箱橋接器進行讀取，而不是假設本機主機路徑。
- 傳輸方式是 SSH 連入由 `openshell sandbox ssh-config` 傳回的 OpenShell 沙箱。

重要後果：

- 如果您在初始化步驟之後，於 OpenClaw 之外編輯主機上的檔案，遠端沙箱將**不會**自動看到這些變更。
- 如果重新建立沙箱，遠端工作區將會再次從本機工作區進行初始化。
- 若使用 `scope: "agent"` 或 `scope: "shared"`，該遠端工作區會在相同的範圍內共享。

在下列情況使用：

- 沙箱應主要存在於遠端 OpenShell 一側
- 您希望降低每次輪詢的同步負擔
- 您不希望本機編輯無聲無息地覆蓋遠端沙箱狀態

如果您將沙箱視為暫時的執行環境，請選擇 `mirror`。
如果您將沙箱視為真正的工作區，請選擇 `remote`。

#### OpenShell 生命週期

OpenShell 沙箱仍然透過正常的沙箱生命週期進行管理：

- `openclaw sandbox list` 會顯示 OpenShell 執行時以及 Docker 執行時
- `openclaw sandbox recreate` 會刪除目前的執行時，並讓 OpenClaw 在下次使用時重新建立它
- prune 邏輯也是後端感知的

對於 `remote` 模式，重新建立尤其重要：

- 重新建立會刪除該範圍的規範遠端工作區
- 下次使用時會從本機工作區初始化一個全新的遠端工作區

對於 `mirror` 模式，重新建立主要會重置遠端執行環境，
因為本機工作區仍然保持規範狀態。

## 工作區存取

`agents.defaults.sandbox.workspaceAccess` 控制 **沙盒可以看到什麼**：

- `"none"`（預設）：工具會看到位於 `~/.openclaw/sandboxes` 下的沙盒工作區。
- `"ro"`：將代理工作區以唯讀方式掛載於 `/agent`（停用 `write`/`edit`/`apply_patch`）。
- `"rw"`：將代理工作區以讀寫方式掛載於 `/workspace`。

使用 OpenShell 後端時：

- `mirror` 模式在執行回合之間仍然使用本地工作區作為正規來源
- `remote` 模式在初始種子之後使用遠端 OpenShell 工作區作為正規來源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同方式限制寫入行為

傳入的媒體會複製到作用中的沙盒工作區 (`media/inbound/*`)。
技能注意事項：`read` 工具是以沙盒為根目錄的。使用 `workspaceAccess: "none"` 時，
OpenClaw 會將符合資格的技能鏡射到沙盒工作區 (`.../skills`) 以便
讀取。使用 `"rw"` 時，工作區技能可從
`/workspace/skills` 讀取。

## 自訂綁定掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。
格式：`host:container:mode` (例如，`"/home/user/source:/source:rw"`)。

全域和每個代理的綁定會被 **合併**（而非替換）。在 `scope: "shared"` 下，會忽略每個代理的綁定。

`agents.defaults.sandbox.browser.binds` 僅將額外的主機目錄掛載到 **沙盒瀏覽器** 容器中。

- 設定時（包括 `[]`），它會取代瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略時，瀏覽器容器會回退到 `agents.defaults.sandbox.docker.binds`（向後相容）。

範例（唯讀來源 + 額外的資料目錄）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

安全性注意事項：

- 綁定會繞過沙盒檔案系統：它們會根據您設定的模式（`:ro` 或 `:rw`）公開主機路徑。
- OpenClaw 會阻擋危險的綁定來源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及會暴露這些來源的父掛載）。
- 敏感掛載（secrets、SSH 金鑰、服務認證）除非絕對必要，否則應設為 `:ro`。
- 如果您只需要對工作區進行讀取存取，請結合 `workspaceAccess: "ro"`；綁定模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解綁定如何與工具政策和提升權限執行互動。

## 映像檔 + 設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

建置一次：

```bash
scripts/sandbox-setup.sh
```

注意：預設映像檔**不**包含 Node。如果技能需要 Node（或其他執行時），請製作自訂映像檔或透過 `sandbox.docker.setupCommand` 安裝（需要網路出口 + 可寫入根目錄 + root 使用者權限）。

如果您想要一個具備常見工具的更實用沙盒映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），請建置：

```bash
scripts/sandbox-common-setup.sh
```

然後將 `agents.defaults.sandbox.docker.image` 設定為
`openclaw-sandbox-common:bookworm-slim`。

沙盒瀏覽器映像檔：

```bash
scripts/sandbox-browser-setup.sh
```

預設情況下，Docker 沙盒容器在**無網路**環境下執行。
可使用 `agents.defaults.sandbox.docker.network` 覆蓋。

隨附的沙盒瀏覽器映像檔也會針對容器化工作負載套用保守的 Chromium 啟動預設值。
目前的容器預設值包括：

- `--remote-debugging-address=127.0.0.1`
- `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
- `--user-data-dir=${HOME}/.chrome`
- `--no-first-run`
- `--no-default-browser-check`
- `--disable-3d-apis`
- `--disable-gpu`
- `--disable-dev-shm-usage`
- `--disable-background-networking`
- `--disable-extensions`
- `--disable-features=TranslateUI`
- `--disable-breakpad`
- `--disable-crash-reporter`
- `--disable-software-rasterizer`
- `--no-zygote`
- `--metrics-recording-only`
- `--renderer-process-limit=2`
- 當啟用 `noSandbox` 時，`--no-sandbox` 和 `--disable-setuid-sandbox`。
- 三個圖形硬化標誌（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是可選的，當容器缺乏 GPU 支援時很有用。
  如果您的工作負載需要 WebGL 或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 預設為啟用，並可以使用
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 停用以用於依賴擴充功能的流程。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的預設值。

如果您需要不同的運行時設定檔，請使用自訂瀏覽器映像檔並提供您自己的入口點。
對於本機（非容器）Chromium 設定檔，請使用 `browser.extraArgs` 附加額外的啟動標誌。

安全性預設值：

- `network: "host"` 已被封鎖。
- `network: "container:<id>"` 預設已被封鎖（命名空間加入繞過風險）。
- 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安裝和容器化閘道位於此處：
[Docker](/en/install/docker)

對於 Docker 閘道部署，`scripts/docker/setup.sh` 可以引導沙盒設定。
設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。
您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆寫 socket 位置。完整設定和環境變數參考：[Docker](/en/install/docker#enable-agent-sandbox-for-docker-gateway)。

## setupCommand（一次性容器設定）

`setupCommand` 在沙盒容器建立後執行**一次**（而非每次執行時）。
它透過 `sh -lc` 在容器內執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 各代理程式：`agents.list[].sandbox.docker.setupCommand`

常見陷阱：

- 預設 `docker.network` 是 `"none"`（無出口流量），因此套件安裝將會失敗。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且僅限緊急情況使用。
- `readOnlyRoot: true` 防止寫入；設定 `readOnlyRoot: false` 或建置自訂映像檔。
- `user` 必須是 root 才能安裝套件（省略 `user` 或設定 `user: "0:0"`）。
- Sandbox 執行並**不**繼承主機 `process.env`。請使用
  `agents.defaults.sandbox.docker.env`（或自訂映像檔）來存放技能 API 金鑰。

## 工具政策 + 逃生艙

工具允許/拒絕政策在沙箱規則之前仍適用。如果工具在全域或每個代理中被拒絕，
沙箱不會將其恢復。

`tools.elevated` 是一個明確的逃生艙，可在主機上執行 `exec`。
`/exec` 指令僅適用於已授權的發送者並且對每個會話持續有效；若要硬體停用
`exec`，請使用工具政策拒絕（請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 檢查有效的沙箱模式、工具政策和修復配置金鑰。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼這被阻擋？」的心智模型。
  保持鎖定狀態。

## 多重代理覆寫

每個代理都可以覆寫沙箱 + 工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上沙箱工具政策的 `agents.list[].tools.sandbox.tools`）。
請參閱 [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) 以了解優先順序。

## 最小啟用範例

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## 相關文件

- [OpenShell](/en/gateway/openshell) -- 受管理的沙箱後端設定、工作區模式和配置參考
- [Sandbox Configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- 除錯「為什麼這被阻擋？」
- [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) -- 每個代理的覆寫和優先順序
- [Security](/en/gateway/security)
