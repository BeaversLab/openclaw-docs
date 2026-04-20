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
- 任何被明確允許在沙箱外執行的工具（例如 `tools.elevated`）。
  - **提權執行會繞過沙箱並使用設定的逃逸路徑（預設為 `gateway`，或當執行目標為 `node` 時使用 `node`）。**
  - 如果沙箱關閉，`tools.elevated` 不會改變執行方式（已在主機上）。請參閱 [提升模式](/en/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何時**使用沙箱：

- `"off"`：無沙箱。
- `"non-main"`：僅對**非主要**工作階段使用沙箱（如果您希望在主機上進行正常聊天，此為預設值）。
- `"all"`：每個工作階段都在沙箱中執行。
  注意：`"non-main"` 是基於 `session.mainKey`（預設 `"main"`），而不是代理程式 ID。
  群組/頻道工作階段使用自己的金鑰，因此被視為非主要工作階段並將被放入沙箱。

## 範圍

`agents.defaults.sandbox.scope` 控制**建立多少個容器**：

- `"agent"`（預設值）：每個代理程式一個容器。
- `"session"`：每個工作階段一個容器。
- `"shared"`：所有沙箱工作階段共用一個容器。

## 後端

`agents.defaults.sandbox.backend` 控制**哪個執行時**環境提供沙箱：

- `"docker"`（預設值）：本機 Docker 支援的沙箱執行時。
- `"ssh"`：通用 SSH 支援的遠端沙箱執行時。
- `"openshell"`：OpenShell 支援的沙箱執行時。

SSH 專用配置位於 `agents.defaults.sandbox.ssh` 下。
OpenShell 專用配置位於 `plugins.entries.openshell.config` 下。

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

### Docker 後端

Docker 後端是預設的執行環境，透過 Docker daemon socket (`/var/run/docker.sock`) 在本機執行工具和沙箱瀏覽器。沙箱容器的隔離由 Docker 命名空間決定。

**Docker-out-of-Docker (DooD) 限制**：
如果您將 OpenClaw Gateway 本身部署為 Docker 容器，它會使用主機的 Docker socket (DooD) 來編排同層級的沙箱容器。這會引入一個特定的路徑映射限制：

- **配置需要主機路徑**：`openclaw.json` `workspace` 配置必須包含 **主機的絕對路徑**（例如 `/home/user/.openclaw/workspaces`），而不是內部 Gateway 容器路徑。當 OpenClaw 要求 Docker daemon 產生沙箱時，daemon 會根據主機 OS 命名空間評估路徑，而不是 Gateway 命名空間。
- **FS 橋接一致性（相同的 Volume 映射）**：OpenClaw Gateway 原生進程也會將 heartbeat 和 bridge 檔案寫入 `workspace` 目錄。由於 Gateway 在其自己的容器化環境中評估完全相同的字串（主機路徑），Gateway 部署必須包含一個連結主機命名空間的相同 volume 映射 (`-v /home/user/.openclaw:/home/user/.openclaw`)。

如果您在沒有絕對主機一致性的情況下在內部映射路徑，OpenClaw 會在嘗試將其 heartbeat 寫入容器環境時原生拋出 `EACCES` 權限錯誤，因為完全限定的路徑字串在原生環境中不存在。

### SSH 後端

當您希望 OpenClaw 在任意可透過 SSH 存取的機器上對 `exec`、檔案工具和媒體讀取進行沙箱化時，請使用 `backend: "ssh"`。

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

- OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個範圍特定的遠端根目錄。
- 在建立或重建後首次使用時，OpenClaw 會從本地工作區將該遠端工作區植入一次。
- 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒體讀取以及入站媒體暫存，會透過 SSH 直接對遠端工作區執行。
- OpenClaw 不會自動將遠端變更同步回本地工作區。

驗證材料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用既有的本地檔案並透過 OpenSSH 設定傳遞。
- `identityData`、`certificateData`、`knownHostsData`：使用內嵌字串或 SecretRefs。OpenClaw 透過一般的 secrets 執行時期快照解析它們，使用 `0600` 將其寫入暫存檔，並在 SSH 會話結束時刪除它們。
- 如果對同一個項目同時設定了 `*File` 和 `*Data`，則 `*Data` 在該 SSH 會話中優先採用。

這是一個 **remote-canonical** 模型。在初始種子之後，遠端 SSH 工作區會成為真正的沙箱狀態。

重要影響：

- 在種子步驟之後於 OpenClaw 之外進行的主機本地編輯，在您重新建立沙箱之前，遠端是看不到的。
- `openclaw sandbox recreate` 會刪除各範圍的遠端根目錄，並在下次使用時從本地重新種子。
- SSH 後端不支援瀏覽器沙箱。
- `sandbox.docker.*` 設定不適用於 SSH 後端。

### OpenShell 後端

當您希望 OpenClaw 在 OpenShell 管理的遠端環境中對工具進行沙箱化時，請使用 `backend: "openshell"`。如需完整的設定指南、設定參考以及工作區模式比較，請參閱專屬的
[OpenShell 頁面](/en/gateway/openshell)。

OpenShell 重複使用與通用 SSH 後端相同的核心 SSH 傳輸和遠端檔案系統橋接器，並新增 OpenShell 特有的生命週期
(`sandbox create/get/delete`、`sandbox ssh-config`) 以及可選的 `mirror`
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

- `mirror` (預設)：本地工作區保持標準狀態。OpenClaw 在執行前將本地檔案同步到 OpenShell，並在執行後將遠端工作區同步回來。
- `remote`：建立沙箱後，OpenShell 工作區為標準狀態。OpenClaw 從本地工作區向遠端工作區植入資料一次，之後檔案工具和執行操作直接在遠端沙箱上運行，而不將變更同步回來。

遠端傳輸細節：

- OpenClaw 透過 `openshell sandbox ssh-config <name>` 向 OpenShell 請求沙箱特定的 SSH 設定。
- Core 將該 SSH 設定寫入暫存檔，開啟 SSH 會話，並重複使用 `backend: "ssh"` 所使用的相同遠端檔案系統橋接器。
- 在 `mirror` 模式下，只有生命週期有所不同：在執行前從本地同步到遠端，然後在執行後同步回來。

目前的 OpenShell 限制：

- 尚未支援沙箱瀏覽器
- OpenShell 後端不支援 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 特定執行時期控制項仍然僅適用於 Docker 後端

#### 工作區模式

OpenShell 有兩種工作區模型。這是實務上最重要的部分。

##### `mirror`

當您希望 **本地工作區保持標準狀態** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本地工作區同步到 OpenShell 沙箱中。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本地工作區。
- 檔案工具仍透過沙箱橋接器運作，但本地工作區在回合之間仍維持為真實來源。

使用時機：

- 您在 OpenClaw 之外於本地編輯檔案，並希望這些變更能自動顯示在沙箱中
- 您希望 OpenShell 沙箱的表現盡可能像 Docker 後端
- 您希望主機工作區在每次執行回合後反映沙箱的寫入

取捨：

- 執行前後的額外同步成本

##### `remote`

當您希望 **OpenShell 工作區成為標準狀態** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 首次建立沙箱時，OpenClaw 會從本地工作區向遠端工作區植入資料一次。
- 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接對遠端 OpenShell 工作區進行操作。
- OpenClaw **不會**在執行後將遠端的變更同步回本地工作區。
- 提示時段的媒體讀取仍然有效，因為檔案和媒體工具是透過沙盒橋接器讀取，而不是假設為本地主機路徑。
- 傳輸方式是 SSH 到由 `openshell sandbox ssh-config` 傳回的 OpenShell 沙盒。

重要後果：

- 如果您在種子步驟之後於 OpenClaw 之外的主機上編輯檔案，遠端沙盒將**不會**自動看到那些變更。
- 如果重新建立沙盒，遠端工作區會再次從本地工作區進行種子同步。
- 使用 `scope: "agent"` 或 `scope: "shared"` 時，該遠端工作區會在相同範圍內共享。

在以下情況使用：

- 沙盒應主要存在於遠端 OpenShell 端
- 您希望降低每輪次的同步開銷
- 您不希望本地主機的編輯無聲無息地覆寫遠端沙盒狀態

如果您將沙盒視為暫時的執行環境，請選擇 `mirror`。
如果您將沙盒視為真實的工作區，請選擇 `remote`。

#### OpenShell 生命週期

OpenShell 沙盒仍透過正常的沙盒生命週期進行管理：

- `openclaw sandbox list` 會顯示 OpenShell 執行時以及 Docker 執行時
- `openclaw sandbox recreate` 會刪除目前的執行時，並讓 OpenClaw 在下次使用時重新建立
- 修剪邏輯也具備後端感知能力

對於 `remote` 模式，重新建立尤其重要：

- 重新建立會刪除該範圍的正式遠端工作區
- 下次使用會從本地工作區重新植入一個全新的遠端工作區

對於 `mirror` 模式，重新建立主要會重置遠端執行環境，
因為本地工作區仍然是正式來源。

## 工作區存取

`agents.defaults.sandbox.workspaceAccess` 控制**沙盒可以看到什麼**：

- `"none"` (預設)：工具會看到 `~/.openclaw/sandboxes` 下的沙盒工作區。
- `"ro"`：將代理工作區以唯讀方式掛載於 `/agent`（停用 `write`/`edit`/`apply_patch`）。
- `"rw"`：將代理工作區以讀寫方式掛載於 `/workspace`。

使用 OpenShell 後端時：

- `mirror` 模式在執行回合之間仍使用本地工作區作為標準來源
- `remote` 模式在初始種子之後，使用遠端 OpenShell 工作區作為標準來源
- `workspaceAccess: "ro"` 和 `"none"` 仍以相同方式限制寫入行為

傳入媒體會被複製到啟用的沙箱工作區（`media/inbound/*`）。
技能注意事項：`read` 工具是以沙箱為根目錄。使用 `workspaceAccess: "none"` 時，
OpenClaw 會將符合條件的技能映射到沙箱工作區（`.../skills`）以便
讀取。使用 `"rw"` 時，可從 `/workspace/skills` 讀取工作區技能。

## 自訂繫結掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。
格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全域和各代理的繫結設定會被**合併**（而非取代）。在 `scope: "shared"` 下，各代理的繫結設定會被忽略。

`agents.defaults.sandbox.browser.binds` 僅將額外的主機目錄掛載到 **沙箱瀏覽器** 容器中。

- 設定時（包括 `[]`），它會取代瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 若省略，瀏覽器容器會回退使用 `agents.defaults.sandbox.docker.binds`（向後相容）。

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

安全注意事項：

- 繫設定會繞過沙箱檔案系統：它們會以您設定的任何模式（`:ro` 或 `:rw`）公開主機路徑。
- OpenClaw 會阻擋危险的綁定來源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及會暴露它們的上層掛載）。
- OpenClaw 也會阻擋常見的主目錄憑證根目錄，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 綁定驗證不僅僅是字串匹配。OpenClaw 會將來源路徑正規化，然後透過最深的現有上層路徑再次解析，然後再重新檢查封鎖路徑和允許的根目錄。
- 這意味著即使最終的葉子節點尚未存在，透過符號連結父目錄的逃逸仍然會被安全地阻擋（fail closed）。例如：如果 `run-link` 指向該處，`/workspace/run-link/new-file` 仍然會解析為 `/var/run/...`。
- 允許的來源根目錄也會以同樣方式進行正規化，因此一條在解析符號連結前看似只在允許清單內的路徑，仍會被拒絕並視為 `outside allowed roots`。
- 敏感的掛載（secrets、SSH 金鑰、服務憑證）除非絕對必要，否則應該設為 `:ro`。
- 如果您只需要對工作區進行讀取存取，請結合使用 `workspaceAccess: "ro"`；綁定模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解綁定如何與工具政策和提權執行 互動。

## 映像檔 + 設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

建構一次：

```bash
scripts/sandbox-setup.sh
```

注意：預設映像檔**不**包含 Node。如果技能需要 Node（或其他執行時期環境），請製作自訂映像檔或透過 `sandbox.docker.setupCommand` 安裝（需要網路出口 + 可寫入根目錄 + root 使用者權限）。

如果您想要一個功能更齊全且包含常見工具的沙盒映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），請建構：

```bash
scripts/sandbox-common-setup.sh
```

然後將 `agents.defaults.sandbox.docker.image` 設定為
`openclaw-sandbox-common:bookworm-slim`。

沙盒瀏覽器映像檔：

```bash
scripts/sandbox-browser-setup.sh
```

預設情況下，Docker 沙盒容器以**無網路**模式執行。
可使用 `agents.defaults.sandbox.docker.network` 覆蓋此設定。

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
- 當啟用 `noSandbox` 時，
  `--no-sandbox` 和 `--disable-setuid-sandbox`。
- 這三個圖形強化旗標 (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) 為選用項目，
  當容器不支援 GPU 時特別有用。如果您的工作負載需要 WebGL
  或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 預設為啟用，可透過
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 停用以支援依賴擴充功能的流程。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 會保留 Chromium 的預設值。

如果您需要不同的執行時設定檔，請使用自訂瀏覽器映像檔並提供
您自己的進入點。對於本機 (非容器) Chromium 設定檔，請使用
`browser.extraArgs` 來附加額外的啟動旗標。

安全性預設值：

- `network: "host"` 已被封鎖。
- `network: "container:<id>"` 預設已被封鎖 (有命名空間加入繞過風險)。
- 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安裝程式和容器化閘道位於此處：
[Docker](/en/install/docker)

對於 Docker Gateway 部署，`scripts/docker/setup.sh` 可以引導沙箱配置。
設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。您可以使用
`OPENCLAW_DOCKER_SOCKET` 覆蓋 socket 位置。完整的設定與環境變數
參考：[Docker](/en/install/docker#agent-sandbox)。

## setupCommand（一次性容器設定）

`setupCommand` 會在建立沙箱容器後執行**一次**（而非每次執行）。
它透過 `sh -lc` 在容器內執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 各代理：`agents.list[].sandbox.docker.setupCommand`

常見陷阱：

- 預設的 `docker.network` 是 `"none"`（無出口流量），因此套件安裝會失敗。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true` 且僅供緊急打破沙箱時使用。
- `readOnlyRoot: true` 會防止寫入；請設定 `readOnlyRoot: false` 或建置自訂映像檔。
- 進行套件安裝時，`user` 必須是 root（省略 `user` 或設定 `user: "0:0"`）。
- 沙箱執行並**不會**繼承主機 `process.env`。請使用
  `agents.defaults.sandbox.docker.env`（或自訂映像檔）來存放技能 API 金鑰。

## 工具原則 + 緊急應變措施

工具允許/拒絕原則仍會在沙箱規則之前套用。如果工具被全域或特定代理拒絕，
沙箱化也不會恢復其使用權限。

`tools.elevated` 是一個明確的緊急應變措施，會在沙箱外部執行 `exec`（預設為 `gateway`，當執行目標是 `node` 時則為 `node`）。
`/exec` 指令僅適用於授權的發送者並在每個工作階段中持續有效；若要完全停用
`exec`，請使用工具原則拒絕（請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 來檢查有效的沙箱模式、工具原則和修復配置鍵。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼被阻擋？」的心智模型。
  保持鎖定狀態。

## 多代理覆寫

每個代理都可以覆寫沙箱 + 工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上用於沙箱工具政策的 `agents.list[].tools.sandbox.tools`）。
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

- [OpenShell](/en/gateway/openshell) -- 受管沙箱後端設定、工作區模式和設定參考
- [Sandbox Configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- 除錯「為什麼被阻擋？」
- [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) -- 各代理覆寫與優先順序
- [Security](/en/gateway/security)
