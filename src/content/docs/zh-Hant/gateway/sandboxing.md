---
summary: "OpenClaw 沙盒運作方式：模式、範圍、工作區存取及映像檔"
title: "沙盒"
sidebarTitle: "沙盒"
read_when: "您需要關於沙盒的專門說明，或是需要調整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在 **沙盒後端內執行工具** 以縮小影響範圍。這是 **可選的**，並由設定 (`agents.defaults.sandbox` 或 `agents.list[].sandbox`) 控制。如果關閉沙盒，工具將在主機上執行。Gateway 停留在主機上；啟用時，工具執行會在隔離的沙盒中運作。

<Note>這並非完美的安全邊界，但在模型執行錯誤操作時，能實質上限制檔案系統和程序存取權限。</Note>

## 什麼會被沙箱化

- 工具執行 (`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等)。
- 選用的沙盒瀏覽器 (`agents.defaults.sandbox.browser`)。

<AccordionGroup>
  <Accordion title="沙盒瀏覽器詳細資訊">
    - 預設情況下，當瀏覽器工具需要時，沙盒瀏覽器會自動啟動（確保 CDP 可連線）。透過 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 進行設定。
    - 預設情況下，沙盒瀏覽器容器使用專屬的 Docker 網路 (`openclaw-sandbox-browser`)，而不是全域的 `bridge` 網路。使用 `agents.defaults.sandbox.browser.network` 進行設定。
    - 選用的 `agents.defaults.sandbox.browser.cdpSourceRange` 會透過 CIDR 白名單限制容器邊緣的 CDP 連入流量（例如 `172.21.0.1/32`）。
    - noVNC 觀察者存取預設受密碼保護；OpenClaw 會發出一個短期有效的權杖 URL，該 URL 提供本地啟動頁面，並在 URL 片段中包含密碼以開啟 noVNC（而非查詢/標頭日誌）。
    - `agents.defaults.sandbox.browser.allowHostControl` 允許沙盒工作階段明確以主機瀏覽器為目標。
    - 選用的白名單會控管 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

  </Accordion>
</AccordionGroup>

未沙箱化的項目：

- Gateway 程序本身。
- 任何被明確允許在沙箱外執行的工具（例如 `tools.elevated`）。
  - **提權執行會繞過沙箱並使用配置的逃逸路徑（預設為 `gateway`，當執行目標是 `node` 時則為 `node`）。**
  - 如果沙盒功能關閉，`tools.elevated` 不會改變執行方式（已在主機上執行）。請參閱[提權模式](/zh-Hant/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何時**使用沙箱：

<Tabs>
  <Tab title="off">
    無沙箱。
  </Tab>
  <Tab title="non-main">
    僅對**非主要**會話進行沙箱處理（如果您希望一般對話在主機上執行，這是預設值）。

    `"non-main"` 是基於 `session.mainKey`（預設 `"main"`），而非代理程式 ID。群組/頻道會話使用自己的金鑰，因此它們被視為非主要會話並將進入沙箱。

  </Tab>
  <Tab title="all">
    每個會話都在沙箱中執行。
  </Tab>
</Tabs>

## 範圍

`agents.defaults.sandbox.scope` 控制**建立多少個容器**：

- `"agent"`（預設值）：每個代理程式一個容器。
- `"session"`：每個會話一個容器。
- `"shared"`：所有沙箱會話共用一個容器。

## 後端

`agents.defaults.sandbox.backend` 控制**哪個執行時**提供沙箱：

- `"docker"`（啟用沙箱時的預設值）：本機 Docker 支援的沙箱執行時。
- `"ssh"`：通用 SSH 支援的遠端沙箱執行時。
- `"openshell"`：OpenShell 支援的沙箱執行時。

SSH 特定配置位於 `agents.defaults.sandbox.ssh` 之下。OpenShell 特定配置位於 `plugins.entries.openshell.config` 之下。

### 選擇後端

|                | Docker                       | SSH                   | OpenShell                      |
| -------------- | ---------------------------- | --------------------- | ------------------------------ |
| **執行位置**   | 本地容器                     | 任何 SSH 可存取的主機 | OpenShell 管理的沙箱           |
| **設定**       | `scripts/sandbox-setup.sh`   | SSH 金鑰 + 目標主機   | 已啟用 OpenShell 外掛程式      |
| **工作區模型** | Bind-mount 或複製            | 遠端為主（種子一次）  | `mirror` 或 `remote`           |
| **網路控制**   | `docker.network`（預設：無） | 取決於遠端主機        | 取決於 OpenShell               |
| **瀏覽器沙箱** | 支援                         | 不支援                | 尚不支援                       |
| **綁定掛載**   | `docker.binds`               | 不適用                | 不適用                         |
| **最適用於**   | 本地開發，完全隔離           | 卸載到遠端機器        | 受管遠端沙箱，具備可選雙向同步 |

### Docker 後端

沙箱預設為關閉。如果您啟用沙箱但未選擇後端，OpenClaw 將使用 Docker 後端。它透過 Docker 守護行程通訊端 (`/var/run/docker.sock`) 在本機執行工具和沙箱瀏覽器。沙箱容器的隔離由 Docker 命名空間決定。

若要將主機 GPU 暴露給 Docker 沙箱，請設定 `agents.defaults.sandbox.docker.gpus` 或個別代理程式的 `agents.list[].sandbox.docker.gpus` 覆寫。該值會作為獨立參數傳遞給 Docker 的 `--gpus` 標誌，例如 `"all"` 或 `"device=GPU-uuid"`，並且需要相容的主機執行環境，例如 NVIDIA Container Toolkit。

<Warning>
**Docker-out-of-Docker (DooD) 限制**

如果您將 OpenClaw Gateway 本身部署為 Docker 容器，它會使用主機的 Docker socket (DooD) 來協調同級的沙箱容器。這引入了一個特定的路徑映射限制：

- **配置需要主機路徑**：`openclaw.json` `workspace` 配置必須包含 **主機的絕對路徑**（例如 `/home/user/.openclaw/workspaces`），而不是內部 Gateway 容器路徑。當 OpenClaw 要求 Docker 守護進程生成沙箱時，守護進程會相對於主機 OS 命名空間評估路徑，而不是 Gateway 命名空間。
- **FS 橋接一致性（相同的卷映射）**：OpenClaw Gateway 原生進程也會將心跳和橋接文件寫入 `workspace` 目錄。由於 Gateway 從其自身的容器化環境中評估完全相同的字符串（即主機路徑），Gateway 部署必須包含一個相同的卷映射，以原生方式鏈接主機命名空間（`-v /home/user/.openclaw:/home/user/.openclaw`）。
- **Codex 代碼模式**：當 OpenClaw 沙箱處於活動狀態時，OpenClaw 會在該輪次中禁用 Codex app-server 原生代碼模式、用戶 MCP 服務器和應用支持的插件執行，因為這些原生表面是從託管 Gateway 的 app-server 進程運行的，而不是從 OpenClaw 沙箱後端運行的。當常規的 exec/process 工具可用時，Shell 訪問權限通過 OpenClaw 沙箱支持的工具（如 `sandbox_exec` 和 `sandbox_process`）公開。請勿將主機 Docker socket 掛載到代理沙箱容器或自定義 Codex 沙箱中。

在 Ubuntu/AppArmor 主機上，當您故意在沒有活動 OpenClaw 沙箱的情況下運行原生 Codex `workspace-write` 且不允許服務用戶創建非特權用戶命名空間時，Codex `workspace-write` 可能會在 shell 啟動之前失敗。當禁用 Docker 沙箱出口（`network: "none"`，默認值）時，Codex 也需要一個非特權網絡命名空間。常見症狀包括 `bwrap: setting up uid map: Permission denied` 和 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。運行 `openclaw doctor`；如果它報告 Codex bwrap 命名空間探測失敗，請優先使用向 OpenClaw 服務進程授予所需命名空間的 AppArmor 配置文件。`kernel.apparmor_restrict_unprivileged_userns=0` 是一個具有安全性權衡的主機範圍後備方案；僅當該主機姿態可接受時才使用它。

如果您在沒有絕對主機一致性的情況下在內部映射路徑，OpenClaw 會在嘗試將其心跳寫入容器環境內部時本機拋出 `EACCES` 權限錯誤，因為完全限定的路徑字符串在原生中不存在。

</Warning>

### SSH 後端

當您希望 OpenClaw 在任意可透過 SSH 存取的機器上對 `exec`、檔案工具和媒體讀取進行沙盒隔離時，請使用 `backend: "ssh"`。

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

<AccordionGroup>
  <Accordion title="運作方式">
    - OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個 per-scope 遠端根目錄。
    - 在建立或重建後首次使用時，OpenClaw 會從本機工作區將該遠端工作區種植一次。
    - 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒體讀取和入站媒體暫存會透過 SSH 直接對遠端工作區執行。
    - OpenClaw 不會自動將遠端變更同步回本機工作區。

  </Accordion>
  <Accordion title="驗證材質">
    - `identityFile`、`certificateFile`、`knownHostsFile`：使用現有的本機檔案並透過 OpenSSH 設定傳遞它們。
    - `identityData`、`certificateData`、`knownHostsData`：使用內嵌字串或 SecretRef。OpenClaw 會透過正常的 secrets 執行時期快照解析它們，以 `0600` 將其寫入暫存檔，並在 SSH 工作階段結束時將其刪除。
    - 如果為同一個項目同時設定了 `*File` 和 `*Data`，則 `*Data` 對該 SSH 工作階段優先生效。

  </Accordion>
  <Accordion title="遠端標準的後果">
    這是一個 **remote-canonical** 模型。遠端 SSH 工作區在初始種植後會成為真正的沙盒狀態。

    - 在種植步驟之後，於 OpenClaw 之外進行的本機編輯不會在遠端顯示，直到您重建沙盒為止。
    - `openclaw sandbox recreate` 會刪除 per-scope 遠端根目錄，並在下次使用時從本機重新種植。
    - SSH 後端不支援瀏覽器沙盒。
    - `sandbox.docker.*` 設定不適用於 SSH 後端。

  </Accordion>
</AccordionGroup>

### OpenShell 後端

當您希望 OpenClaw 在 OpenShell 管理的遠端環境中對工具進行沙箱化時，請使用 `backend: "openshell"`。如需完整的設定指南、設定參考以及工作區模式比較，請參閱專屬的 [OpenShell 頁面](/zh-Hant/gateway/openshell)。

OpenShell 重複使用與通用 SSH 後端相同的核心 SSH 傳輸和遠端檔案系統橋接器，並新增 OpenShell 專有的生命週期 (`sandbox create/get/delete`、`sandbox ssh-config`) 以及選用的 `mirror` 工作區模式。

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

- `mirror` (預設)：本地工作區保持為基準。OpenClaw 會在執行前將本地檔案同步至 OpenShell，並在執行後將遠端工作區同步回來。
- `remote`：建立沙箱後，OpenShell 工作區即為基準。OpenClaw 會從本地工作區將遠端工作區初始化一次，之後檔案工具和執行操作會直接對遠端沙箱執行，而不會將變更同步回來。

<AccordionGroup>
  <Accordion title="遠端傳輸詳細資訊">
    - OpenClaw 會透過 `openshell sandbox ssh-config <name>` 向 OpenShell 要求沙箱專屬的 SSH 設定。
    - Core 會將該 SSH 設定寫入暫存檔，開啟 SSH 工作階段，並重複使用 `backend: "ssh"` 所使用的相同遠端檔案系統橋接器。
    - 在 `mirror` 模式中，只有生命週期不同：在執行前將本地同步至遠端，然後在執行後同步回來。

  </Accordion>
  <Accordion title="目前的 OpenShell 限制">
    - 尚未支援沙箱瀏覽器
    - OpenShell 後端不支援 `sandbox.docker.binds`
    - `sandbox.docker.*` 下的 Docker 專用運行時間調整選項仍僅適用於 Docker 後端

  </Accordion>
</AccordionGroup>

#### 工作區模式

OpenShell 有兩種工作區模型。這是在實務上最重要的部分。

<Tabs>
  <Tab title="mirror (local canonical)">
    當您希望 **本地工作區保持 canonical** 時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

    行為：

    - 在 `exec` 之前，OpenClaw 會將本地工作區同步到 OpenShell sandbox 中。
    - 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本地工作區。
    - 檔案工具仍透過 sandbox bridge 運作，但本地工作區在各回合之間仍是來源真相 (source of truth)。

    使用時機：

    - 您在 OpenClaw 之外編輯本地檔案，並希望這些變更自動顯示在 sandbox 中
    - 您希望 OpenShell sandbox 的行為盡可能像 Docker backend
    - 您希望主機工作區在每次 exec 回合後反映 sandbox 的寫入

    權衡：exec 前後的額外同步成本。

  </Tab>
  <Tab title="remote (OpenShell canonical)">
    當您希望 **OpenShell 工作區成為 canonical** 時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

    行為：

    - 當 sandbox 首次建立時，OpenClaw 會從本地工作區將遠端工作區初始化 (seed) 一次。
    - 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接對遠端 OpenShell 工作區進行操作。
    - OpenClaw 在 exec 之後**不會**將遠端變更加回同步到本地工作區。
    - Prompt-time 的媒體讀取仍然有效，因為檔案和媒體工具是透過 sandbox bridge 讀取，而非假設本地主機路徑。
    - 傳輸方式是 SSH 連入由 `openshell sandbox ssh-config` 返回的 OpenShell sandbox。

    重要影響：

    - 如果您在初始化步驟後於 OpenClaw 之外編輯主機上的檔案，遠端 sandbox 將**不會**自動看到這些變更。
    - 如果重新建立 sandbox，遠端工作區會再次從本地工作區進行初始化。
    - 若使用 `scope: "agent"` 或 `scope: "shared"`，該遠端工作區會在相同範圍內共享。

    使用時機：

    - sandbox 應主要存在於遠端 OpenShell 端
    - 您希望降低每回合的同步負擔
    - 您不希望主機本地的編輯無聲無息地覆蓋遠端 sandbox 狀態

  </Tab>
</Tabs>

如果您將沙盒視為暫時的執行環境，請選擇 `mirror`。如果您將沙盒視為真正的工作區，請選擇 `remote`。

#### OpenShell 生命週期

OpenShell 沙箱仍然透過正常的沙箱生命週期進行管理：

- `openclaw sandbox list` 會顯示 OpenShell 執行時以及 Docker 執行時
- `openclaw sandbox recreate` 會刪除目前的執行時，並讓 OpenClaw 在下次使用時重新建立它
- prune 邏輯也具備後端感知能力

對於 `remote` 模式，重新建立特別重要：

- recreate 會刪除該範圍的標準遠端工作區
- 下次使用時會從本機工作區重新播種一個全新的遠端工作區

對於 `mirror` 模式，重新建立主要是重設遠端執行環境，因為本機工作區本來就是正規來源。

## 工作區存取

`agents.defaults.sandbox.workspaceAccess` 控制 **沙盒可以看到什麼**：

<Tabs>
  <Tab title="無（預設）">工具會看到 `~/.openclaw/sandboxes` 下的沙盒工作區。</Tab>
  <Tab title="ro">以唯讀方式在 `/agent` 掛載代理程式工作區（停用 `write`/`edit`/`apply_patch`）。</Tab>
  <Tab title="rw">以讀寫方式在 `/workspace` 掛載代理程式工作區。</Tab>
</Tabs>

使用 OpenShell 後端時：

- `mirror` 模式在執行週期之間仍然會使用本機工作區作為正規來源
- `remote` 模式在初始種子之後會使用遠端 OpenShell 工作區作為正規來源
- `workspaceAccess: "ro"` 和 `"none"` 仍然會以相同方式限制寫入行為

傳入的媒體會複製到使用中的沙盒工作區 (`media/inbound/*`)。

<Note>**技能注意事項：** `read` 工具是以沙盒為根。使用 `workspaceAccess: "none"` 時，OpenClaw 會將符合條件的技能鏡像到沙盒工作區 (`.../skills`) 以便讀取。使用 `"rw"` 時，工作區技能可從 `/workspace/skills` 讀取。</Note>

## 自訂綁定掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。格式：`host:container:mode` (例如 `"/home/user/source:/source:rw"`)。

全域和每個代理程式的綁定會被**合併**（而不是取代）。在 `scope: "shared"` 下，每個代理程式的綁定會被忽略。

`agents.defaults.sandbox.browser.binds` 將額外的主機目錄僅掛載到 **沙盒瀏覽器** 容器中。

- 設定時（包括 `[]`），它會取代瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略時，瀏覽器容器會回退到 `agents.defaults.sandbox.docker.binds`（向後相容）。

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

<Warning>
**Bind 安全性**

- Bind 會繞過沙盒檔案系統：它們會以您設定的任何模式（`:ro` 或 `:rw`）公開主機路徑。
- OpenClaw 會阻擋危險的 bind 來源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及會公開它們的父掛載）。
- OpenClaw 也會阻擋常見的家目錄憑證根目錄，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- Bind 驗證不僅僅是字串匹配。OpenClaw 會標準化來源路徑，然後透過最深的現有祖先再次解析，再重新檢查阻擋的路徑和允許的根目錄。
- 這意味著即使最終的 leaf 尚不存在，符號連結父目錄逃逸仍會在失敗時關閉。例如：如果 `run-link` 指向該處，`/workspace/run-link/new-file` 仍會解析為 `/var/run/...`。
- 允許的來源根目錄會以相同方式標準化，因此僅在符號連結解析前位於允許清單內的路徑仍會被拒絕為 `outside allowed roots`。
- 敏感掛載（secrets、SSH 金鑰、服務憑證）應該 `:ro`，除非絕對必要。
- 如果您只需要對工作區進行讀取存取，請結合 `workspaceAccess: "ro"`；bind 模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解 bind 如何與工具政策和提權執行互動。

</Warning>

## 映像檔與設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

<Note>
**原始碼簽出與 npm 安裝**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 輔助腳本僅在從[原始碼簽出](https://github.com/openclaw/openclaw)執行時可用。它們並未包含在 npm 套件中。

如果您是透過 `npm install -g openclaw` 安裝 OpenClaw，請改用下方顯示的內聯 `docker build` 指令。

</Note>

<Steps>
  <Step title="建置預設映像檔">
    從原始碼簽出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    從 npm 安裝（不需要原始碼簽出）：

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    預設映像檔**不**包含 Node。如果技能需要 Node（或其他執行環境），請自行製作自訂映像檔或透過 `sandbox.docker.setupCommand` 安裝（需要網路出口 + 可寫入的根目錄 + root 使用者）。

    當缺少 `openclaw-sandbox:bookworm-slim` 時，OpenClaw 不會無聲地以純 `debian:bookworm-slim` 代替。針對預設映像檔的沙盒執行會因建置指令而快速失敗，直到您建置它，因為捆绑的映像檔攜帶了用於沙盒寫入/編輯輔助工具的 `python3`。

  </Step>
  <Step title="選用：建置通用映像檔">
    若要使用包含常用工具的更完整沙盒映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`）：

    從原始碼簽出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    從 npm 安裝，請先建置預設映像檔（見上文），然後使用儲存庫中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其之上建置通用映像檔。

    然後將 `agents.defaults.sandbox.docker.image` 設為 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="選用：建置沙盒瀏覽器映像檔">
    從原始碼簽出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    從 npm 安裝，請使用儲存庫中的 [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) 進行建置。

  </Step>
</Steps>

預設情況下，Docker 沙盒容器以**無網路**模式執行。可使用 `agents.defaults.sandbox.docker.network` 覆蓋此設定。

<AccordionGroup>
  <Accordion title="沙盒瀏覽器 Chromium 預設值">
    隨附的沙盒瀏覽器映像檔也針對容器化工作負載套用了保守的 Chromium 啟動預設值。目前的容器預設值包括：

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
    - `--no-sandbox` 當啟用 `noSandbox` 時。
    - 這三個圖形強化旗標（`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`）是選用的，當容器缺乏 GPU 支援時很有用。如果您的工作負載需要 WebGL 或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - `--disable-extensions` 預設為啟用，並可透過 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 停用以用於依賴擴充功能的工作流程。
    - `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 會保留 Chromium 的預設值。

    如果您需要不同的運行設定檔，請使用自訂瀏覽器映像檔並提供您自己的進入點 (entrypoint)。對於本機（非容器）Chromium 設定檔，請使用 `browser.extraArgs` 來附加額外的啟動旗標。

  </Accordion>
  <Accordion title="網路安全預設值">
    - `network: "host"` 已被阻擋。
    - `network: "container:<id>"` 預設已被阻擋（命名空間加入繞過風險）。
    - 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安裝檔案與容器化的閘道位於此處：[Docker](/zh-Hant/install/docker)

對於 Docker 閘道部署，`scripts/docker/setup.sh` 可以引導沙盒配置。設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆寫 socket 位置。完整設定與環境變數參考：[Docker](/zh-Hant/install/docker#agent-sandbox)。

## setupCommand（一次性容器設定）

`setupCommand` 會在建立沙盒容器後執行**一次**（而非每次執行）。它會透過 `sh -lc` 在容器內部執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 各代理程式：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常見陷阱">
    - 預設的 `docker.network` 是 `"none"`（無出口流量），因此套件安裝將會失敗。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true` 且僅用於緊急情況。
    - `readOnlyRoot: true` 會防止寫入；請設定 `readOnlyRoot: false` 或建置自訂映像檔。
    - `user` 必須是 root 才能安裝套件（省略 `user` 或設定 `user: "0:0"`）。
    - 沙盒執行並**不**會繼承主機 `process.env`。請使用 `agents.defaults.sandbox.docker.env`（或自訂映像檔）來設定技能 API 金鑰。
    - `agents.defaults.sandbox.docker.env` 中的值會作為明確的 Docker 容器環境變數傳遞。任何具有 Docker daemon 存取權的人都可以使用諸如 `docker inspect` 的 Docker 中繼資料命令來檢查它們。如果該中繼資料暴露不可接受，請使用自訂映像檔、掛載的秘密檔案或其他秘密傳遞路徑。

  </Accordion>
</AccordionGroup>

## 工具原則與緊急應變措施

工具允許/拒絕原則仍會在沙盒規則之前套用。如果某個工具在全域或針對特定代理程式被拒絕，沙盒機制無法使其恢復。

`tools.elevated` 是一個明確的逃逸機制（escape hatch），它會在沙箱外部執行 `exec`（預設為 `gateway`，或者當執行目標為 `node` 時為 `node`）。`/exec` 指令僅適用於經授權的發送者，並且會在每個工作階段中持續有效；若要徹底停用 `exec`，請使用工具策略拒絕（tool policy deny）（請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 來檢查有效的沙箱模式、工具策略以及修復（fix-it）配置金鑰。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼這被阻擋了？」的心智模型。

保持鎖定狀態。

## 多重代理覆寫

每個代理程式（agent）都可以覆寫沙箱與工具設定：`agents.list[].sandbox` 和 `agents.list[].tools`（加上用於沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解優先順序。

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

## 相關

- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) — 每個代理程式的覆寫與優先順序
- [OpenShell](/zh-Hant/gateway/openshell) — 受管理的沙箱後端設定、工作區模式以及設定參考
- [Sandbox configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) — 除錯「為什麼這被阻擋了？」
- [Security](/zh-Hant/gateway/security)
