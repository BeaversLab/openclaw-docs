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
  - 如果關閉沙箱，`tools.elevated` 不會改變執行方式（已經在主機上）。請參閱 [提權模式](/zh-Hant/tools/elevated)。

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

如果您將 OpenClaw Gateway 本身部署為 Docker 容器，它會使用主機的 Docker socket (DooD) 來協調同層級的沙箱容器。這會引入特定的路徑對應限制：

- **設定需要主機路徑**：`openclaw.json` `workspace` 設定必須包含**主機的絕對路徑**（例如 `/home/user/.openclaw/workspaces`），而不是內部 Gateway 容器路徑。當 OpenClaw 要求 Docker 守護行程產生沙箱時，守護行程會評估相對於主機 OS 命名空間的路徑，而非 Gateway 命名空間。
- **FS 橋接對等（相同的 volume map）**：OpenClaw Gateway 原生進程也會將心跳和橋接檔案寫入 `workspace` 目錄。由於 Gateway 是在其自身的容器化環境中評估完全相同的字串（即主機路徑），因此 Gateway 部署必須包含連結主機命名空間的相同 volume map (`-v /home/user/.openclaw:/home/user/.openclaw`)。

如果您在沒有絕對主機對等的情況下在內部對應路徑，OpenClaw 會原生擲出 `EACCES` 權限錯誤，因為當它嘗試在容器環境中寫入其心跳時，完全合格的路径字串在原生環境中不存在。

</Warning>

### SSH 後端

當您希望 OpenClaw 在任意可透過 SSH 存取的機器上對 `exec`、檔案工具和媒體讀取進行沙箱處理時，請使用 `backend: "ssh"`。

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
    - OpenClaw 會在 `sandbox.ssh.workspaceRoot` 下建立一個各範圍專用的遠端根目錄。
    - 在建立或重建後首次使用時，OpenClaw 會從本機工作區將該遠端工作區植入一次。
    - 之後，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒體讀取和傳入媒體暫存會透過 SSH 直接對遠端工作區執行。
    - OpenClaw 不會自動將遠端變更同步回本機工作區。

  </Accordion>
  <Accordion title="驗證資料">
    - `identityFile`、`certificateFile`、`knownHostsFile`：使用既有的本機檔案並透過 OpenSSH 設定傳遞它們。
    - `identityData`、`certificateData`、`knownHostsData`：使用內聯字串或 SecretRefs。OpenClaw 會透過正常的 secrets 執行時期快照解析它們，以 `0600` 將其寫入暫存檔，並在 SSH 工作階段結束時將其刪除。
    - 若同時為同一個項目設定了 `*File` 和 `*Data`，則該 SSH 工作階段以 `*Data` 為準。

  </Accordion>
  <Accordion title="以遠端為準的影響">
    這是一個**以遠端為準** 的模型。初始植入後，遠端 SSH 工作區即成為真實的沙盒狀態。

    - 在植入步驟之後，於 OpenClaw 外部進行的本機編輯在重新建立沙盒之前，無法在遠端看到。
    - `openclaw sandbox recreate` 會刪除各範圍專用的遠端根目錄，並在下次使用時從本機再次植入。
    - SSH 後端不支援瀏覽器沙盒。
    - `sandbox.docker.*` 設定不適用於 SSH 後端。

  </Accordion>
</AccordionGroup>

### OpenShell 後端

當您希望 OpenClaw 在 OpenShell 管理的遠端環境中對工具進行沙盒化時，請使用 `backend: "openshell"`。如需完整的設定指南、設定參考以及工作區模式比較，請參閱專屬的 [OpenShell 頁面](/zh-Hant/gateway/openshell)。

OpenShell 重複使用與通用 SSH 後端相同的核心 SSH 傳輸和遠端檔案系統橋接器，並新增 OpenShell 特有的生命週期（`sandbox create/get/delete`、`sandbox ssh-config`）以及可選的 `mirror` 工作區模式。

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

- `mirror`（預設）：本地工作區保持為標準。OpenClaw 會在執行前將本地檔案同步到 OpenShell，並在執行後將遠端工作區同步回來。
- `remote`：建立沙盒後，OpenShell 工作區即為標準。OpenClaw 會從本地工作區一次性植入遠端工作區，然後檔案工具和執行操作將直接針對遠端沙盒執行，而不會將變更同步回來。

<AccordionGroup>
  <Accordion title="Remote transport details">
    - OpenClaw 透過 `openshell sandbox ssh-config <name>` 向 OpenShell 要求沙盒專屬的 SSH 設定。
    - Core 會將該 SSH 設定寫入暫存檔案，開啟 SSH 連線，並重複使用 `backend: "ssh"` 所使用的相同遠端檔案系統橋接器。
    - 在 `mirror` 模式下，僅生命週期不同：在執行前將本地同步到遠端，然後在執行後同步回來。

  </Accordion>
  <Accordion title="Current OpenShell limitations">
    - 尚不支援沙盒瀏覽器
    - OpenShell 後端不支援 `sandbox.docker.binds`
    - `sandbox.docker.*` 下的 Docker 專用執行時控制項仍僅適用於 Docker 後端

  </Accordion>
</AccordionGroup>

#### 工作區模式

OpenShell 有兩種工作區模型。這是在實務上最重要的部分。

<Tabs>
  <Tab title="mirror (local canonical)">
    當您希望**本地工作區保持為基準（canonical）**時，請使用 `plugins.entries.openshell.config.mode: "mirror"`。

    行為：

    - 在 `exec` 之前，OpenClaw 會將本地工作區同步到 OpenShell 沙箱中。
    - 在 `exec` 之後，OpenClaw 會將遠端工作區同步回本地工作區。
    - 檔案工具仍透過沙箱橋接器運作，但本地工作區在輪次之間仍為事實來源（source of truth）。

    在以下情況使用此模式：

    - 您在 OpenClaw 之外編輯本地檔案，並希望這些變更自動顯示在沙箱中
    - 您希望 OpenShell 沙箱的行為盡可能接近 Docker 後端
    - 您希望主機工作區在每次執行輪次後反映沙箱的寫入

    權衡：在執行前後需要額外的同步成本。

  </Tab>
  <Tab title="remote (OpenShell canonical)">
    當您希望**OpenShell 工作區成為基準（canonical）**時，請使用 `plugins.entries.openshell.config.mode: "remote"`。

    行為：

    - 當首次建立沙箱時，OpenClaw 會從本地工作區將遠端工作區初始化一次。
    - 之後，`exec`、`read`、`write`、`edit` 和 `apply_patch` 會直接對遠端 OpenShell 工作區進行操作。
    - OpenClaw 在執行後**不會**將遠端變更同步回本地工作區。
    - 提示時段的媒體讀取仍然有效，因為檔案和媒體工具是透過沙箱橋接器讀取，而不是假設本地主機路徑。
    - 傳輸方式是 SSH 連入由 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱。

    重要後果：

    - 如果您在初始化步驟之後於主機上（OpenClaw 之外）編輯檔案，遠端沙箱將**不會**自動看到這些變更。
    - 如果重建沙箱，遠端工作區將會再次從本地工作區進行初始化。
    - 使用 `scope: "agent"` 或 `scope: "shared"` 時，該遠端工作區會在相同範圍內共享。

    在以下情況使用此模式：

    - 沙箱應主要存在於遠端 OpenShell 端
    - 您希望降低每輪次的同步開銷
    - 您不希望主機本地的編輯靜默覆寫遠端沙箱狀態

  </Tab>
</Tabs>

如果您將沙箱視為暫時的執行環境，請選擇 `mirror`。如果您將沙箱視為真正的工作區，請選擇 `remote`。

#### OpenShell 生命週期

OpenShell 沙箱仍然透過正常的沙箱生命週期進行管理：

- `openclaw sandbox list` 會顯示 OpenShell 執行環境以及 Docker 執行環境
- `openclaw sandbox recreate` 會刪除目前的執行環境，並讓 OpenClaw 在下次使用時重新建立它
- prune 邏輯也具備後端感知能力

對於 `remote` 模式，recreate 尤其重要：

- recreate 會刪除該範圍的標準遠端工作區
- 下次使用時會從本機工作區重新播種一個全新的遠端工作區

對於 `mirror` 模式，recreate 主要是重置遠端執行環境，因為本機工作區本來就保持為標準。

## 工作區存取

`agents.defaults.sandbox.workspaceAccess` 控制**沙箱能看到什麼**：

<Tabs>
  <Tab title="無（預設）">工具會在 `~/.openclaw/sandboxes` 下看到一個沙箱工作區。</Tab>
  <Tab title="ro">在 `/agent` 以唯讀方式掛載代理程式工作區（停用 `write`/`edit`/`apply_patch`）。</Tab>
  <Tab title="rw">在 `/workspace` 以讀寫方式掛載代理程式工作區。</Tab>
</Tabs>

使用 OpenShell 後端時：

- `mirror` 模式仍然在執行週期之間使用本機工作區作為標準來源
- `remote` 模式在初始播種後使用遠端 OpenShell 工作區作為標準來源
- `workspaceAccess: "ro"` 和 `"none"` 仍然會以相同方式限制寫入行為

傳入的媒體會被複製到作用中的沙箱工作區中（`media/inbound/*`）。

<Note>**技能注意：** `read` 工具是沙箱根目錄的。在 `workspaceAccess: "none"` 模式下，OpenClaw 會將符合條件的技能映射到沙箱工作區 (`.../skills`) 以便讀取。在 `"rw"` 模式下，工作區技能可從 `/workspace/skills` 讀取。</Note>

## 自訂綁定掛載

`agents.defaults.sandbox.docker.binds` 將額外的主機目錄掛載到容器中。格式：`host:container:mode` (例如：`"/home/user/source:/source:rw"`)。

全域和個別代理程式的綁定會被**合併** (而非取代)。在 `scope: "shared"` 下，個別代理程式的綁定會被忽略。

`agents.defaults.sandbox.browser.binds` 僅將額外的主機目錄掛載到 **沙箱瀏覽器** 容器中。

- 當設定時 (包括 `[]`)，它會取代瀏覽器容器的 `agents.defaults.sandbox.docker.binds`。
- 當省略時，瀏覽器容器會回退到 `agents.defaults.sandbox.docker.binds` (向後相容)。

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
**綁定安全性**

- 綁定會繞過沙盒檔案系統：它們會根據您設定的模式（`:ro` 或 `:rw`）公開主機路徑。
- OpenClaw 會封鎖危險的綁定來源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及會公開這些路徑的父掛載點）。
- OpenClaw 也會封鎖常見的家目錄憑證根目錄，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 綁定驗證不僅僅是字串比對。OpenClaw 會將來源路徑正規化，然後透過最深的現有祖先路徑再次解析，之後才重新檢查被封鎖的路徑和允許的根目錄。
- 這意味著即使最終的葉節點尚不存在，透過符號連結父目錄逃逸的嘗試仍會失敗並封閉。例如：如果 `run-link` 指向該處，`/workspace/run-link/new-file` 仍會被解析為 `/var/run/...`。
- 允許的來源根目錄也會以相同方式進行正規化，因此任何在解析符號連結前僅在允許清單內的路徑，仍會因 `outside allowed roots` 而被拒絕。
- 敏感掛載（機密、SSH 金鑰、服務憑證）除非絕對必要，否則應該設為 `:ro`。
- 如果您只需要對工作區進行唯讀存取，請結合 `workspaceAccess: "ro"`；綁定模式保持獨立。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解綁定如何與工具政策和提權執行互動。

</Warning>

## 映像檔與設定

預設 Docker 映像檔：`openclaw-sandbox:bookworm-slim`

<Note>
**原始碼簽出與 npm 安裝的差異**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 輔助腳本僅在從[原始碼簽出](https://github.com/openclaw/openclaw)執行時可用。它們並未包含在 npm 套件中。

如果您是透過 `npm install -g openclaw` 安裝 OpenClaw，請改用下方顯示的內嵌 `docker build` 指令。

</Note>

<Steps>
  <Step title="建構預設映像檔">
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

    預設映像檔**不**包含 Node。如果技能需要 Node（或其他執行環境），請烘焙自訂映像檔或透過 `sandbox.docker.setupCommand` 安裝（需要網路出口 + 可寫入根目錄 + root 使用者）。

    當缺少 `openclaw-sandbox:bookworm-slim` 時，OpenClaw 不會靜默替換為純 `debian:bookworm-slim`。針對預設映像檔的沙盒執行會快速失敗並提供建構指示，直到您建構它為止，因為隨附的映像檔帶有沙盒寫入/編輯輔助程式的 `python3`。

  </Step>
  <Step title="選用：建構通用映像檔">
    若要取得具備常見工具且功能更齊全的沙盒映像檔（例如 `curl`、`jq`、`nodejs`、`python3`、`git`）：

    從原始碼簽出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    從 npm 安裝，請先建構預設映像檔（見上方），然後使用存放庫中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其上建構通用映像檔。

    然後將 `agents.defaults.sandbox.docker.image` 設為 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="選用：建構沙盒瀏覽器映像檔">
    從原始碼簽出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    從 npm 安裝，請使用存放庫中的 [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) 進行建構。

  </Step>
</Steps>

預設情況下，Docker 沙盒容器以**無網路**模式執行。可使用 `agents.defaults.sandbox.docker.network` 覆寫。

<AccordionGroup>
  <Accordion title="沙盒瀏覽器 Chromium 預設值">
    隨附的沙盒瀏覽器映像檔也會針對容器化工作負載套用保守的 Chromium 啟動預設值。目前的容器預設值包括：

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
    - 當啟用 `--no-sandbox` 時啟用 `noSandbox`。
    - 三個圖形強化標誌 (`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`) 為選用，當容器缺乏 GPU 支援時很有用。如果您的工作負載需要 WebGL 或其他 3D/瀏覽器功能，請設定 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - `--disable-extensions` 預設為啟用，且可針對依賴擴充功能的工作流程使用 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 來停用。
    - `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 會保留 Chromium 的預設值。

    如果您需要不同的運行設定檔，請使用自訂瀏覽器映像檔並提供您自己的進入點。對於本機 (非容器) Chromium 設定檔，請使用 `browser.extraArgs` 來附加額外的啟動旗標。

  </Accordion>
  <Accordion title="網路安全預設值">
    - `network: "host"` 已被封鎖。
    - `network: "container:<id>"` 預設已被封鎖 (命名空間加入繞過風險)。
    - 緊急覆寫：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安裝程式和容器化的閘道位於此處：[Docker](/zh-Hant/install/docker)

對於 Docker 閘道部署，`scripts/docker/setup.sh` 可以啟動沙盒配置。設定 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以啟用該路徑。您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆寫 socket 位置。完整設定與環境變數參考：[Docker](/zh-Hant/install/docker#agent-sandbox)。

## setupCommand（一次性容器設定）

`setupCommand` 在建立沙盒容器後執行**一次**（並非每次執行）。它透過 `sh -lc` 在容器內執行。

路徑：

- 全域：`agents.defaults.sandbox.docker.setupCommand`
- 個別代理程式：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常見陷阱">
    - 預設的 `docker.network` 為 `"none"`（無出口流量），因此套件安裝將會失敗。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，僅作緊急破壞措施使用。
    - `readOnlyRoot: true` 會阻止寫入；請設定 `readOnlyRoot: false` 或建置自訂映像檔。
    - 進行套件安裝時，`user` 必須是 root（省略 `user` 或設定 `user: "0:0"`）。
    - 沙盒執行**不會**繼承主機的 `process.env`。請針對技能 API 金鑰使用 `agents.defaults.sandbox.docker.env`（或自訂映像檔）。

  </Accordion>
</AccordionGroup>

## 工具原則與緊急應變措施

工具允許/拒絕原則仍會在沙盒規則之前套用。如果某個工具在全域或針對特定代理程式被拒絕，沙盒機制無法使其恢復。

`tools.elevated` 是一個明確的緊急應變機制，它會在沙箱外部執行 `exec`（預設為 `gateway`，或者當執行目標是 `node` 時為 `node`）。`/exec` 指令僅適用於經過授權的發送者，並且會在每個 session 中持續有效；若要徹底停用 `exec`，請使用工具策略拒絕（請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)）。

除錯：

- 使用 `openclaw sandbox explain` 來檢查有效的沙箱模式、工具策略和修復配置鍵。
- 請參閱 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解「為什麼這被阻擋了？」的心智模型。

保持鎖定狀態。

## 多重代理覆寫

每個代理都可以覆寫沙箱和工具：`agents.list[].sandbox` 和 `agents.list[].tools`（以及針對沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。關於優先順序，請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

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

- [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) — 每個代理的覆寫與優先順序
- [OpenShell](/zh-Hant/gateway/openshell) — 受管理的沙箱後端設定、工作區模式和配置參考
- [Sandbox configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) — 除錯「為什麼這被阻擋了？」
- [Security](/zh-Hant/gateway/security)
