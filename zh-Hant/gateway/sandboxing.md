---
summary: "OpenClaw 沙盒運作機制：模式、範圍、工作區存取和映像檔"
title: 沙盒機制
read_when: "您需要關於沙盒機制的專門說明，或者需要調整 agents.defaults.sandbox。"
status: active
---

# 沙盒機制

OpenClaw 可以在沙盒後端內執行 **工具** 以縮小爆炸半徑。
這是 **可選的**，並由配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果關閉沙盒，工具將在主機上執行。
閘道保留在主機上；啟用時，工具執行會在獨立的沙盒中運作。

這不是一個完美的安全邊界，但當模型做出愚蠢行為時，它實質上限制了檔案系統
和行程的存取權限。

## 什麼會被放入沙盒

- 工具執行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可選的沙盒化瀏覽器（`agents.defaults.sandbox.browser`）。
  - 預設情況下，當瀏覽器工具需要時，沙盒瀏覽器會自動啟動（確保可連線至 CDP）。
    透過 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 進行配置。
  - 預設情況下，沙盒瀏覽器容器使用專用的 Docker 網路（`openclaw-sandbox-browser`），而不是全域的 `bridge` 網路。
    使用 `agents.defaults.sandbox.browser.network` 進行配置。
  - 可選的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允許清單來限制容器邊緣的 CDP 進入流量（例如 `172.21.0.1/32`）。
  - 預設情況下，noVNC 觀察者存取受密碼保護；OpenClaw 會發出一個短期有效的權杖 URL，該 URL 提供本地啟動頁面並在 URL 片段（而非查詢/標頭日誌）中攜帶密碼來開啟 noVNC。
  - `agents.defaults.sandbox.browser.allowHostControl` 讓沙盒化工作階段能夠明確指定主機瀏覽器為目標。
  - 可選的允許清單會對 `target: "custom"` 進行把關：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未沙盒化：

- Gateway 程序本身。
- 任何被明確允許在主機上執行的工具（例如 `tools.elevated`）。
  - **提升權限的 exec 在主機上執行並繞過沙盒。**
  - 如果關閉沙盒，`tools.elevated` 不會改變執行方式（本來就在主機上）。請參閱[提升權限模式](/zh-Hant/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何時**使用沙盒：

- `"off"`：無沙盒。
- `"non-main"`：僅對**非主要**工作階段進行沙盒處理（如果您想在主機上進行一般聊天，此為預設值）。
- `"all"`：每個工作階段都在沙盒中執行。
  注意：`"non-main"` 是基於 `session.mainKey`（預設為 `"main"`），而非代理程式 ID。
  群組/頻道工作階段使用自己的金鑰，因此它們被視為非主要工作階段，將會被放入沙盒中。

## 範圍

`agents.defaults.sandbox.scope` 控制建立**多少個容器**：

- `"session"`（預設值）：每個工作階段一個容器。
- `"agent"`：每個代理程式一個容器。
- `"shared"`：所有被沙盒化工作階段共用一個容器。

## 後端

`agents.defaults.sandbox.backend` 控制提供沙盒的**執行時環境**：

- `"docker"` (預設值)：本機 Docker 支援的沙箱執行環境。
- `"ssh"`：通用 SSH 支援的遠端沙箱執行環境。
- `"openshell"`：OpenShell 支援的沙箱執行環境。

SSH 特定的配置位於 `agents.defaults.sandbox.ssh` 之下。
OpenShell 特定的配置位於 `plugins.entries.openshell.config` 之下。

### 選擇後端

|                 | Docker                        | SSH                   | OpenShell                          |
| --------------- | ----------------------------- | --------------------- | ---------------------------------- |
| **執行位置**    | 本機容器                      | 任何 SSH 可存取的主機 | OpenShell 管理的沙箱               |
| **設定**        | `scripts/sandbox-setup.sh`    | SSH 金鑰 + 目標主機   | 已啟用 OpenShell 外掛程式          |
| **工作區模型**  | Bind-mount 或複製             | 遠端為準 (seed once)  | `mirror` 或 `remote`               |
| **網路控制**    | `docker.network` (預設值：無) | 取決於遠端主機        | 取決於 OpenShell                   |
| **瀏覽器沙箱**  | 支援                          | 不支援                | 尚未支援                           |
| **Bind mounts** | `docker.binds`                | N/A                   | N/A                                |
| **最適用於**    | 本地開發，完全隔離            | 卸載到遠端機器        | 具備可選雙向同步功能的受管遠端沙箱 |

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

- OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個每個範圍 的遠端根目錄。
- 在建立或重建後首次使用時，OpenClaw 會從本地工作區一次性將該遠端工作區種子化。
- 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示詞媒體讀取和傳入媒體暫存，將直接透過 SSH 對遠端工作區執行操作。
- OpenClaw 不會自動將遠端變更同步回本機工作區。

認證材料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用現有的本機檔案並透過 OpenSSH 設定傳遞。
- `identityData`、`certificateData`、`knownHostsData`：使用內聯字串或 SecretRefs。OpenClaw 透過正常的 secrets 執行時快照解析它們，使用 `0600` 將其寫入暫存檔案，並在 SSH 工作階段結束時刪除它們。
- 如果同一個項目同時設定了 `*File` 和 `*Data`，則該 SSH 工作階段以 `*Data` 為準。

這是一種 **remote-canonical** 模型。遠端 SSH 工作區在初始種子之後成為真正的沙箱狀態。

重要後果：

- 在種子步驟之後，於 OpenClaw 之外進行的本機編輯將不會在遠端可見，直到您重新建立沙盒為止。
- `openclaw sandbox recreate` 會刪除各範圍的遠端根目錄，並在下次使用時從本機重新進行種子同步。
- SSH 後端不支援瀏覽器沙盒。
- `sandbox.docker.*` 設定不適用於 SSH 後端。

### OpenShell 後端

當您希望 OpenClaw 在 OpenShell 管理的遠端環境中對工具進行沙盒化時，請使用 `backend: "openshell"`。如需完整的設定指南、設定參考以及工作區模式比較，請參閱專屬的
[OpenShell 頁面](/zh-Hant/gateway/openshell)。

OpenShell 重用與通用 SSH 後端相同的核心 SSH 傳輸與遠端檔案系統橋接，並加入 OpenShell 特有的生命週期 (`sandbox create/get/delete`, `sandbox ssh-config`)，以及可選的 `mirror` 工作區模式。

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

- `mirror` (預設)：本機工作區保持為標準。OpenClaw 在執行前將本機檔案同步到 OpenShell，並在執行後將遠端工作區同步回來。
- `remote`：建立沙箱後，OpenShell 工作區即為標準。OpenClaw 從本機工作區將遠端工作區初始化一次，隨後檔案工具與執行操作會直接對遠端沙箱執行，而不將變更同步回來。

遠端傳輸詳情：

- OpenClaw 透過 `openshell sandbox ssh-config <name>` 向 OpenShell 要求沙箱特定的 SSH 設定。
- Core 將該 SSH 配置寫入暫存檔案，開啟 SSH 連線階段，並重複使用 `backend: "ssh"` 所使用的相同遠端檔案系統橋接器。
- 在 `mirror` 模式下，只有生命週期不同：在執行前將本機同步到遠端，然後在執行後同步回來。

目前 OpenShell 的限制：

- 尚未支援沙盒瀏覽器
- OpenShell 後端不支援 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 特定執行時期控制項仍僅適用於 Docker 後端

#### 工作區模式

OpenShell 有兩種工作區模型。這是實務上最重要的部分。

##### `mirror`

當您希望 **本機工作區保持標準** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本機工作區同步到 OpenShell 沙盒中。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本機工作區。
- 檔案工具仍透過沙箱橋接器運作，但在輪次之間，本機工作區仍維持為真實來源（source of truth）。

在以下情況使用：

- 您在 OpenClaw 之外於本機編輯檔案，並希望這些變更自動顯示在沙箱中
- 您希望 OpenShell 沙箱的行為盡可能接近 Docker 後端
- 您希望主機工作區在每次執行輪次後反映沙箱的寫入

權衡：

- 在執行前後有額外的同步成本

##### `remote`

當您希望 **OpenShell 工作區成為標準** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 初次建立沙箱時，OpenClaw 會從本機工作區向遠端工作區進行一次種子同步（seed）。
- 在此之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接對遠端 OpenShell 工作區進行操作。
- 在執行結束後，OpenClaw **不會**將遠端的變更同步回本機工作區。
- 提示詞階段的媒體讀取仍然有效，因為檔案和媒體工具是透過沙箱橋接器進行讀取，而不是假設為本機主機路徑。
- 傳輸方式是透過 SSH 連線到由 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱。

重要的影響：

- 如果在種子步驟之後，您在 OpenClaw 之外的主機上編輯了檔案，遠端沙箱將**不會**自動看到這些變更。
- 如果重建沙箱，遠端工作區將會再次從本機工作區進行種子同步。
- 使用 `scope: "agent"` 或 `scope: "shared"` 時，該遠端工作區會以相同範圍共享。

在以下情況使用：

- 沙盒應主要存在於遠端 OpenShell 端
- 您希望降低每次回合的同步開銷
- 您不希望主機本機編輯無聲地覆寫遠端沙盒狀態

如果您將沙盒視為暫時的執行環境，請選擇 `mirror`。
如果您將沙盒視為真正的工作區，請選擇 `remote`。

#### OpenShell 生命週期

OpenShell 沙盒仍然透過正常的沙盒生命週期進行管理：

- `openclaw sandbox list` 顯示 OpenShell 執行環境以及 Docker 執行環境
- `openclaw sandbox recreate` 刪除目前的執行環境，並讓 OpenClaw 在下次使用時重新建立它
- 修剪邏輯也會感知後端

對於 `remote` 模式，recreate 尤其重要：

- recreate 會刪除該範圍的標準遠端工作區
- 下一次使用時會從本機工作區建立一個全新的遠端工作區

對於 `mirror` 模式，recreate 主要會重置遠端執行環境，
因為本機工作區始終保持為標準。

## 工作區存取權

`agents.defaults.sandbox.workspaceAccess` 控制 **沙箱可以看到什麼**：

- `"none"` (預設值)：工具可以看到 `~/.openclaw/sandboxes` 下的沙箱工作區。
- `"ro"`：將代理工作區以唯讀方式掛載在 `/agent` (停用 `write`/`edit`/`apply_patch`)。
- `"rw"`: 以讀寫方式將 agent 工作區掛載至 `/workspace`。

使用 OpenShell 後端時：

- `mirror` 模式仍然使用本地工作區作為執行週期之間的標準來源
- `remote` 模式在初始種子之後，使用遠端 OpenShell 工作區作為標準來源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同的方式限制寫入行為

傳入的媒體會被複製到啟用的沙箱工作區 (`media/inbound/*`)。
技能注意：`read` 工具是以沙箱為根目錄的。使用 `workspaceAccess: "none"` 時，
OpenClaw 會將符合資格的技能映射到沙箱工作區 (`.../skills`) 以便
讀取。使用 `"rw"` 時，工作區技能可從
`/workspace/skills` 讀取。

## 自訂綁定掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。
格式：`host:container:mode` (例如，`"/home/user/source:/source:rw"`)。

全域和各代理程式的綁定設定會被**合併** (而非替換)。在 `scope: "shared"` 下，各代理程式的綁定會被忽略。

`agents.defaults.sandbox.browser.binds` 僅將額外的主機目錄掛載到 **沙箱瀏覽器** 容器中。

- 設定時（包括 `[]`），它會取代瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略時，瀏覽器容器會回退到 `agents.defaults.sandbox.docker.binds`（向後相容）。

範例（唯讀來源 + 一個額外的資料目錄）：

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

安全性說明：

- 綁定會繞過沙盒檔案系統：它們會以您設定的模式（`:ro` 或 `:rw`）公開主機路徑。
- OpenClaw 會封鎖危險的綁定來源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及會公開它們的上層掛載）。
- 敏感性掛載（secrets、SSH 金鑰、服務認證）除非絕對必要，否則應設為 `:ro`。
- 如果您只需要對工作區進行讀取權限，請結合 `workspaceAccess: "ro"`；綁定模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解綁定如何與工具策略和提升權限執行互動。

## 映像檔 + 設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

建構一次：

```bash
scripts/sandbox-setup.sh
```

注意：預設映像檔**不**包含 Node。如果技能需要 Node（或其他執行時），可以自訂映像檔或透過 `sandbox.docker.setupCommand` 安裝（需要網路出口 + 可寫入根目錄 + root 使用者）。

如果您想要一個功能更齊全且包含常用工具的沙箱映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），請建構：

```bash
scripts/sandbox-common-setup.sh
```

然後將 `agents.defaults.sandbox.docker.image` 設定為 `openclaw-sandbox-common:bookworm-slim`。

Sandboxed browser image:

```bash
scripts/sandbox-browser-setup.sh
```

By default, Docker sandbox containers run with **no network**.
Override with `agents.defaults.sandbox.docker.network`.

The bundled sandbox browser image also applies conservative Chromium startup defaults
for containerized workloads. Current container defaults include:

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
- `--no-sandbox` 和 `--disable-setuid-sandbox` 當 `noSandbox` 啟用時。
- 三個圖形強化標誌 (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) 是可選的，當容器缺少 GPU 支援時很有用。如果您的工作負載需要 WebGL 或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 預設為啟用，並可透過
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 停用以用於依賴擴充功能的流程。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的預設值。

如果您需要不同的運行時設定檔，請使用自訂瀏覽器映像檔並提供您
自己的進入點。對於本機（非容器）Chromium 設定檔，請使用
`browser.extraArgs` 附加額外的啟動旗標。

安全性預設值：

- `network: "host"` 已被封鎖。
- `network: "container:<id>"` 預設被封鎖（有命名空間加入繞過風險）。
- 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安裝和容器化閘道位於此處：
[Docker](/zh-Hant/install/docker)

對於 Docker 閘道部署，`scripts/docker/setup.sh` 可以引導沙箱配置。
設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。您可以使用
`OPENCLAW_DOCKER_SOCKET` 覆蓋 socket 位置。完整的設定與環境變數
參考：[Docker](/zh-Hant/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand（一次性容器設定）

`setupCommand` 在建立沙箱容器後執行**一次**（不是每次執行都會跑）。
它透過 `sh -lc` 在容器內部執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 各代理程式：`agents.list[].sandbox.docker.setupCommand`

常見陷阱：

- 預設的 `docker.network` 是 `"none"`（無出口流量），因此套件安裝將會失敗。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且僅作緊急破例使用。
- `readOnlyRoot: true` 防止寫入；請設定 `readOnlyRoot: false` 或建置自訂映像檔。
- `user` 必須是 root 才能安裝套件（省略 `user` 或設定 `user: "0:0"`）。
- 沙箱執行**不會**繼承主機 `process.env`。請使用
  `agents.defaults.sandbox.docker.env`（或自訂映像檔）來存放技能 API 金鑰。

## 工具原則與緊急逃生門

工具允許/拒絕原則在沙箱規則之前仍然適用。如果某個工具在全域或特定代理中被拒絕，啟用沙箱並不會使其恢復使用。

`tools.elevated` 是一個明確的緊急逃生門，用於在主機上執行 `exec`。
`/exec` 指令僅適用於經授權的發送者並且會對每個會話持續有效；若要強制停用
`exec`，請使用工具策略拒絕（請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 來檢查有效的沙盒模式、工具策略以及修復配置金鑰。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼這被阻擋？」的心理模型。
  請保持鎖定狀態。

## 多代理覆寫

每個代理都可以覆寫沙箱 + 工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上用於沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 了解優先順序。

## 最簡啟用範例

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

- [OpenShell](/zh-Hant/gateway/openshell) -- 受控沙箱後端設定、工作區模式和配置參考
- [Sandbox Configuration](/zh-Hant/gateway/configuration-reference#agents-defaults-sandbox)
- [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) -- 除錯「為什麼這被阻擋？」
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) -- 每個代理的覆寫與優先順序
- [Security](/zh-Hant/gateway/security)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
