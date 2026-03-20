---
summary: "OpenClaw 沙盒運作方式：模式、範圍、工作區存取與映像檔"
title: 沙盒機制
read_when: "您需要關於沙盒機制的專門說明，或需要調整 agents.defaults.sandbox。"
status: active
---

# 沙盒機制

OpenClaw 可以在 **沙盒後端內執行工具**，以減少影響範圍。
這是 **可選的**，並由配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果關閉沙盒，工具會在主機上執行。
Gateway 保留在主機上；啟用時，工具執行會在隔離的沙盒中運作。

這並非完美的安全邊界，但當模型執行不當操作時，它能實質性地限制檔案系統
與程序存取。

## 什麼會被放入沙盒

- 工具執行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等等）。
- 選用的沙盒瀏覽器（`agents.defaults.sandbox.browser`）。
  - 根據預設，當瀏覽器工具有需要時，沙盒瀏覽器會自動啟動（確保 CDP 可連線）。
    透過 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 進行配置。
  - 根據預設，沙盒瀏覽器容器使用專用的 Docker 網路（`openclaw-sandbox-browser`），而不是全域 `bridge` 網路。
    使用 `agents.defaults.sandbox.browser.network` 進行配置。
  - 選用的 `agents.defaults.sandbox.browser.cdpSourceRange` 會使用 CIDR 允許清單來限制容器邊緣的 CDP 進站流量（例如 `172.21.0.1/32`）。
  - 根據預設，noVNC 觀察者存取受到密碼保護；OpenClaw 會發出一個短期有效的 token URL，該 URL 提供本機啟動頁面，並在 URL 片段（而非查詢/標頭日誌）中帶有密碼以開啟 noVNC。
  - `agents.defaults.sandbox.browser.allowHostControl` 讓沙盒工作階段能明確指定以主機瀏覽器為目標。
  - 選用的允許清單控管 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未放入沙盒：

- Gateway 程序本身。
- 任何被明確允許在主機上執行的工具（例如 `tools.elevated`）。
  - **提權 exec 會在主機上執行並繞過沙盒機制。**
  - 如果沙箱功能關閉，`tools.elevated` 不會改變執行方式（因為已經在主機上）。請參閱[提權模式](/zh-Hant/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何時**使用沙箱：

- `"off"`：不使用沙箱。
- `"non-main"`：僅對**非主要**工作階段使用沙箱（如果您希望一般對話在主機上執行，此為預設值）。
- `"all"`：每個工作階段都在沙箱中執行。
  注意：`"non-main"` 是基於 `session.mainKey`（預設為 `"main"`），而非代理程式 ID。
  群組/頻道工作階段使用它們自己的金鑰，因此被視為非主要工作階段，並將會被放入沙箱。

## 範圍

`agents.defaults.sandbox.scope` 控制**建立多少個容器**：

- `"session"`（預設值）：每個工作階段一個容器。
- `"agent"`：每個代理程式一個容器。
- `"shared"`：所有沙箱化工作階段共用一個容器。

## 後端

`agents.defaults.sandbox.backend` 控制**哪個執行環境**提供沙箱：

- `"docker"`（預設值）：本機 Docker 支援的沙箱執行環境。
- `"ssh"`：透過 SSH 支援的一般遠端沙箱執行環境。
- `"openshell"`：OpenShell 支援的沙箱執行環境。

SSH 特定設定位於 `agents.defaults.sandbox.ssh` 之下。
OpenShell 特定設定位於 `plugins.entries.openshell.config` 之下。

### SSH 後端

當您希望 OpenClaw 在可透過 SSH 存取的任意機器上，將 `exec`、檔案工具和媒體讀取進行沙箱處理時，請使用 `backend: "ssh"`。

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

- OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個每個範圍專屬的遠端根目錄。
- 在建立或重建後首次使用時，OpenClaw 會從本機工作區將該遠端工作區植入一次。
- 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示詞媒體讀取以及傳入媒體暫存，會透過 SSH 直接對遠端工作區執行。
- OpenClaw 不會自動將遠端的變更同步回本機工作區。

驗證資料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用現有的本地檔案並透過 OpenSSH 設定傳遞它們。
- `identityData`、`certificateData`、`knownHostsData`：使用內聯字串或 SecretRefs。OpenClaw 透過正常的機密執行時快照解析它們，使用 `0600` 將它們寫入暫存檔案，並在 SSH 工作階段結束時刪除它們。
- 如果為同一個項目同時設定了 `*File` 和 `*Data`，則 `*Data` 在該 SSH 工作階段中優先。

這是一種 **remote-canonical** 模型。遠端 SSH 工作區在初始種子之後成為真正的沙箱狀態。

重要的後果：

- 在種子步驟之後於 OpenClaw 之外進行的本機編輯，在您重新建立沙箱之前，無法在遠端看到。
- `openclaw sandbox recreate` 會刪除每個範圍的遠端根目錄，並在下次使用時從本地重新種子。
- SSH 後端不支援瀏覽器沙箱。
- `sandbox.docker.*` 設定不適用於 SSH 後端。

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
- `remote`：建立沙箱後，OpenShell 工作區為標準狀態。OpenClaw 從本地工作區將遠端工作區種子一次，然後檔案工具和執行直接對遠端沙箱執行，而不將變更同步回來。

OpenShell 重複使用與通用 SSH 後端相同的核心 SSH 傳輸和遠端檔案系統橋接器。
該插件新增了 OpenShell 特定的生命週期 (`sandbox create/get/delete`、`sandbox ssh-config`) 和可選的 `mirror` 模式。

遠端傳輸詳細資訊：

- OpenClaw 透過 `openshell sandbox ssh-config <name>` 向 OpenShell 要求特定於沙箱的 SSH 設定。
- 核心將該 SSH 設定寫入暫存檔案，開啟 SSH 工作階段，並重複使用 `backend: "ssh"` 所使用的相同遠端檔案系統橋接器。
- 在 `mirror` 模式下，僅生命週期不同：在執行前將本機同步到遠端，然後在執行後同步回來。

目前 OpenShell 的限制：

- 尚不支援沙盒瀏覽器
- OpenShell 後端不支援 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 特定執行時（runtime）設定僅適用於 Docker 後端

## OpenShell 工作區模式

OpenShell 有兩種工作區模型。這是實務上最重要的部分。

### `mirror`

當您希望**本地工作區保持為基準（canonical）**時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

行為：

- 在 `exec` 之前，OpenClaw 會將本地工作區同步到 OpenShell 沙盒中。
- 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本地工作區。
- 檔案工具仍透過沙盒橋接器運作，但本地工作區在回合之間仍是事實來源。

使用時機：

- 您在 OpenClaw 之外於本地編輯檔案，並希望這些變更自動顯示在沙盒中
- 您希望 OpenShell 沙盒的行為盡可能像 Docker 後端
- 您希望主機工作區在每次 exec 回合後反映沙盒的寫入

取捨：

- 在 exec 前後有額外的同步成本

### `remote`

當您希望**OpenShell 工作區成為基準（canonical）**時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

行為：

- 首次建立沙盒時，OpenClaw 會從本地工作區植入遠端工作區一次。
- 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接對遠端 OpenShell 工作區進行操作。
- 在 exec 之後，OpenClaw **不會**將遠端變更同步回本地工作區。
- 提示時段（Prompt-time）的媒體讀取仍然有效，因為檔案和媒體工具是透過沙盒橋接器讀取，而不是假設本地主機路徑。
- 傳輸方式是 SSH 連入由 `openshell sandbox ssh-config` 傳回的 OpenShell 沙盒。

重要後果：

- 如果您在植入步驟之後，於 OpenClaw 之外在主機上編輯檔案，遠端沙盒將**不會**自動看到這些變更。
- 如果重新建立沙盒，將會再次從本地工作區植入遠端工作區。
- 使用 `scope: "agent"` 或 `scope: "shared"` 時，該遠端工作區會在同一範圍內共享。

在以下情況使用：

- 沙盒應主要存在於遠端 OpenShell 端
- 您希望降低每輪同步開銷
- 您不希望主機本機編輯無聲覆蓋遠端沙盒狀態

如果您將沙盒視為暫時執行環境，請選擇 `mirror`。
如果您將沙盒視為真正的工作區，請選擇 `remote`。

## OpenShell 生命週期

OpenShell 沙盒仍透過正常的沙盒生命週期進行管理：

- `openclaw sandbox list` 顯示 OpenShell 執行時以及 Docker 執行時
- `openclaw sandbox recreate` 刪除當前執行時，並讓 OpenClaw 在下次使用時重新建立
- prune 邏輯也具備後端感知能力

對於 `remote` 模式，recreate 尤為重要：

- recreate 會刪除該範圍的正式遠端工作區
- 下次使用會從本機工作區播種一個新的遠端工作區

對於 `mirror` 模式，recreate 主要會重置遠端執行環境，
因為本機工作區仍是正式來源。

## 工作區存取權限

`agents.defaults.sandbox.workspaceAccess` 控制**沙盒可見內容**：

- `"none"` (預設)：工具會在 `~/.openclaw/sandboxes` 下看到沙盒工作區。
- `"ro"`：以唯讀方式在 `/agent` 掛載 agent 工作區 (停用 `write`/`edit`/`apply_patch`)。
- `"rw"`：以讀寫方式在 `/workspace` 掛載 agent 工作區。

使用 OpenShell 後端時：

- `mirror` 模式在各執行回合之間仍使用本機工作區作為正式來源
- `remote` 模式在初始播種後，會使用遠端 OpenShell 工作區作為正式來源
- `workspaceAccess: "ro"` 和 `"none"` 仍會以相同方式限制寫入行為

傳入的媒體會複製到啟用的沙盒工作區 (`media/inbound/*`)。
技能注意事項：`read` 工具是以沙盒為根目錄的。使用 `workspaceAccess: "none"` 時，
OpenClaw 會將合格的技能鏡像到沙盒工作區 (`.../skills`) 以便
讀取。使用 `"rw"` 時，工作區技能可從
`/workspace/skills` 讀取。

## 自訂綁定掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。
格式：`host:container:mode` (例如：`"/home/user/source:/source:rw"`)。

全域和每個代理程式的綁定會被**合併** (而非替換)。在 `scope: "shared"` 下，每個代理程式的綁定會被忽略。

`agents.defaults.sandbox.browser.binds` 僅將額外的主機目錄掛載到 **沙盒瀏覽器** 容器中。

- 設定時 (包括 `[]`)，它會替換瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略時，瀏覽器容器會回退到 `agents.defaults.sandbox.docker.binds` (向後相容)。

範例 (唯讀來源 + 額外的資料目錄)：

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

- 綁定會繞過沙盒檔案系統：它們會以您設定的任何模式 (`:ro` 或 `:rw`) 公開主機路徑。
- OpenClaw 會封鎖危險的綁定來源 (例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及會公開它們的上層掛載)。
- 敏感的掛載 (機密、SSH 金鑰、服務認證) 應該設為 `:ro`，除非絕對必要。
- 如果您只需要對工作區的讀取權限，請結合 `workspaceAccess: "ro"`；綁定模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解綁定如何與工具政策和提權執行互動。

## 映像檔 + 設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

建構一次：

```bash
scripts/sandbox-setup.sh
```

注意：預設映像檔**不**包含 Node。如果某個技能需要 Node（或其他執行環境），請製作自訂映像檔，或透過 `sandbox.docker.setupCommand` 進行安裝（需要網路出口 + 可寫入的根目錄 + root 使用者）。

如果您想要一個功能更齊全且包含常用工具的沙箱映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），請執行：

```bash
scripts/sandbox-common-setup.sh
```

然後將 `agents.defaults.sandbox.docker.image` 設定為 `openclaw-sandbox-common:bookworm-slim`。

沙箱瀏覽器映像檔：

```bash
scripts/sandbox-browser-setup.sh
```

預設情況下，Docker 沙箱容器以**無網路**模式執行。
可透過 `agents.defaults.sandbox.docker.network` 覆寫。

隨附的沙箱瀏覽器映像檔也會針對容器化工作負載，套用保守的 Chromium 啟動預設值。目前的容器預設值包括：

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
- 這三個圖形強化標誌（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是選用的，當容器缺乏 GPU 支援時很有用。
  如果您的工作負載需要 WebGL 或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 預設為啟用，可針對依賴擴充功能的流程，
  透過 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 加以停用。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 會保留 Chromium 的預設值。

如果您需要不同的運行時設定檔，請使用自訂瀏覽器映像檔並提供您自己的進入點。對於本機（非容器）Chromium 設定檔，請使用 `browser.extraArgs` 來附加額外的啟動旗標。

安全性預設值：

- `network: "host"` 已被阻擋。
- `network: "container:<id>"` 預設已被阻擋（命名空間連結繞過風險）。
- 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安裝程式和容器化閘道位於此處：
[Docker](/zh-Hant/install/docker)

對於 Docker 閘道部署，`docker-setup.sh` 可以啟動沙盒配置。
設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆寫 socket 位置。完整設定與環境變數參考：[Docker](/zh-Hant/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand (一次性容器設定)

`setupCommand` 在沙盒容器建立後執行 **一次**（並非每次執行）。
它會透過 `sh -lc` 在容器內執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 各代理程式：`agents.list[].sandbox.docker.setupCommand`

常見陷阱：

- 預設的 `docker.network` 是 `"none"`（無出口流量），因此套件安裝將會失敗。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true` 且僅用於緊急情況。
- `readOnlyRoot: true` 會防止寫入；請設定 `readOnlyRoot: false` 或製作自訂映像檔。
- 對於套件安裝，`user` 必須是 root（省略 `user` 或設定 `user: "0:0"`）。
- 沙盒執行 **不會** 繼承主機 `process.env`。請使用
  `agents.defaults.sandbox.docker.env`（或自訂映像檔）來存放技能 API 金鑰。

## 工具原則 + 逃逸艙

工具允許/拒絕原則仍會在沙盒規則之前套用。如果工具被全域或各代理程式拒絕，沙盒無法將其復原。

`tools.elevated` 是一個明確的逃生艙，會在主機上執行 `exec`。
`/exec` 指令僅適用於已授權的發送者，並且會在每個 session 中持續有效；若要強制停用
`exec`，請使用工具原則拒絕（請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 來檢查有效的沙箱模式、工具原則以及修復配置鍵。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼這被阻擋了？」的心智模型。
  請保持鎖定狀態。

## 多代理覆寫

每個代理都可以覆寫沙箱 + 工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上沙箱工具原則的 `agents.list[].tools.sandbox.tools`）。
請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解優先順序。

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

- [Sandbox Configuration](/zh-Hant/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)
- [Security](/zh-Hant/gateway/security)

import en from "/components/footer/en.mdx";

<en />
