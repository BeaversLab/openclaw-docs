---
summary: "OpenClawOpenClaw 沙箱隔离的工作原理：模式、范围、工作区访问和镜像"
title: "沙箱隔离"
sidebarTitle: "沙箱隔离"
read_when: "您需要关于沙箱隔离的专门说明，或者需要调整 agents.defaults.sandbox。"
status: active
---

OpenClaw 可以在沙箱后端内运行**工具**以减少爆炸半径。这是**可选的**，并通过配置（OpenClaw`agents.defaults.sandbox` 或 `agents.list[].sandbox`Gateway(网关)）进行控制。如果关闭沙箱隔离，工具将在主机上运行。Gateway 始终停留在主机上；启用后，工具执行将在隔离的沙箱中运行。

<Note>这并不是一个完美的安全边界，但当模型做出愚蠢操作时，它能在实质上限制文件系统和进程的访问权限。</Note>

## 什么会被沙盒化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱隔离浏览器（`agents.defaults.sandbox.browser`）。

<AccordionGroup>
  <Accordion title="沙箱隔离浏览器详情">
    - 默认情况下，当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可达）。通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 进行配置。
    - 默认情况下，沙箱浏览器容器使用专用的 Docker 网络 (`openclaw-sandbox-browser`)，而不是全局 `bridge` 网络。使用 `agents.defaults.sandbox.browser.network` 进行配置。
    - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表限制容器边缘 CDP 入站流量（例如 `172.21.0.1/32`）。
    - noVNC 观察者访问默认受密码保护；OpenClaw 会生成一个短期令牌 URL，该 URL 提供本地引导页面并在 URL 片段中打开带有密码的 noVNC（而不是查询/头部日志）。
    - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱隔离会话明确以宿主浏览器为目标。
    - 可选的允许列表限制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

  </Accordion>
</AccordionGroup>

未沙箱隔离：

- Gateway(网关) 进程本身。
- 任何被明确允许在沙箱之外运行的工具（例如 `tools.elevated`）。
  - **提升执行（Elevated exec）会绕过沙箱隔离，并使用配置的逃生路径（默认为 `gateway`，当执行目标是 `node` 时则为 `node`）。**
  - 如果关闭沙箱隔离，`tools.elevated` 不会改变执行方式（已在主机上运行）。请参阅 [提权模式](/zh/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱隔离：

<Tabs>
  <Tab title="off">
    不进行沙箱隔离。
  </Tab>
  <Tab title="non-main">
    仅对 **非主要** 会话进行沙箱隔离（如果您希望在主机上进行正常聊天，此为默认设置）。

    `"non-main"` 基于 `session.mainKey`（默认为 `"main"`），而非代理 ID。群组/渠道会话使用自己的密钥，因此它们被视为非主要会话，并将被沙箱隔离。

  </Tab>
  <Tab title="all">
    每个会话都在沙箱中运行。
  </Tab>
</Tabs>

## 范围

`agents.defaults.sandbox.scope` 控制**创建多少个容器**：

- `"agent"`（默认）：每个代理一个容器。
- `"session"`：每个会话一个容器。
- `"shared"`：所有沙箱隔离的会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制**哪个运行时**提供沙箱：

- `"docker"`（启用沙箱隔离时的默认值）：本地 Docker 支持的沙箱运行时。
- `"ssh"`：通用的 SSH 支持的远程沙箱运行时。
- `"openshell"`：OpenShell 支持的沙箱运行时。

SSH 特定的配置位于 `agents.defaults.sandbox.ssh` 下。OpenShell 特定的配置位于 `plugins.entries.openshell.config` 下。

### 选择后端

|                | Docker                       | SSH                       | OpenShell                        |
| -------------- | ---------------------------- | ------------------------- | -------------------------------- |
| **运行位置**   | 本地容器                     | 任何可通过 SSH 访问的主机 | OpenShell 托管的沙箱             |
| **设置**       | `scripts/sandbox-setup.sh`   | SSH 密钥 + 目标主机       | 启用 OpenShell 插件              |
| **工作区模型** | 绑定挂载或复制               | 远程规范（播种一次）      | `mirror` 或 `remote`             |
| **网络控制**   | `docker.network`（默认：无） | 取决于远程主机            | 取决于 OpenShell                 |
| **浏览器沙箱** | 支持                         | 不支持                    | 暂不支持                         |
| **绑定挂载**   | `docker.binds`               | 不适用                    | 不适用                           |
| **最适用于**   | 本地开发，完全隔离           | 卸载到远程机器            | 托管远程沙箱，支持可选的双向同步 |

### Docker 后端

沙箱隔离默认处于关闭状态。如果您启用了沙箱隔离但未选择后端，OpenClaw 将使用 Docker 后端。它通过 Docker 守护进程套接字（`/var/run/docker.sock`）在本地执行工具和沙箱浏览器。沙箱容器隔离由 Docker 命名空间决定。

要将主机 GPU 暴露给 Docker 沙箱，请设置 `agents.defaults.sandbox.docker.gpus` 或每个代理的 `agents.list[].sandbox.docker.gpus` 覆盖。该值将作为单独的参数传递给 Docker 的 `--gpus` 标志，例如 `"all"` 或 `"device=GPU-uuid"`，并且需要兼容的主机运行时，例如 NVIDIA Container Toolkit。

<Warning>
**Docker-out-of-Docker (DooD) 约束**

如果您将 OpenClaw Gateway 本身部署为 DockerDockerOpenClawGateway(网关)Docker 容器，它会使用主机的 Docker 套接字 (DooD) 来编排同级沙箱容器。这引入了一个特定的路径映射约束：

- **配置需要主机路径**：`openclaw.json` `workspace` 配置必须包含**主机的绝对路径**（例如 `/home/user/.openclaw/workspaces`），而不是内部 Gateway(网关)OpenClaw 容器路径。当 OpenClaw 请求 Docker 守护进程生成沙箱时，守护进程是相对于主机操作系统命名空间来评估路径的，而不是相对于 Gateway(网关)OpenClawGateway(网关) 命名空间。
- **FS 桥接一致性（相同的卷映射）**：OpenClaw Gateway 原生进程还会将心跳和桥接文件写入 `workspace` 目录。由于 Gateway(网关) 在其自身的容器化环境中评估完全相同的字符串（即主机路径），因此 Gateway(网关) 部署必须包含一个相同的卷映射，以本机方式链接主机命名空间（`-v /home/user/.openclaw:/home/user/.openclaw`OpenClawOpenClaw）。
- **Codex 代码模式**：当 OpenClaw 沙箱处于活动状态时，即使 Codex 插件默认设置为 `danger-full-access`，OpenClaw 也会将 Codex 应用服务器轮次限制为 Codex `workspace-write` 沙箱隔离。请勿将主机 DockerOpenClaw 套接字挂载到代理沙箱容器或自定义 Codex 沙箱中。

如果您在没有绝对主机对等性的情况下在内部映射路径，OpenClaw 会在尝试将心跳写入容器环境内部时本机抛出 `EACCES` 权限错误，因为完全限定的路径字符串在本机中不存在。

</Warning>

### SSH 后端

当您希望 OpenClaw 在任意可访问 SSH 的机器上对 `exec`、文件工具和媒体读取进行沙盒化时，请使用 `backend: "ssh"`OpenClaw。

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
  <Accordion title="工作原理"OpenClaw>
    - OpenClaw 会在 `sandbox.ssh.workspaceRoot`OpenClaw 下为每个作用域创建一个远程根目录。
    - 在创建或重建后的首次使用时，OpenClaw 会从本地工作区将该远程工作区初始化一次。
    - 之后，`exec`、`read`、`write`、`edit`、`apply_patch`OpenClaw、提示词媒体读取和入站媒体暂存将直接通过 SSH 对远程工作区运行。
    - OpenClaw 不会自动将远程更改同步回本地工作区。

  </Accordion>
  <Accordion title="认证材料">
    - `identityFile`、`certificateFile`、`knownHostsFile`：使用现有的本地文件并通过 OpenSSH 配置传递它们。
    - `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 通过常规的机密运行时快照解析它们，使用 `0600` 将它们写入临时文件，并在 SSH 会话结束时删除它们。
    - 如果为同一项同时设置了 `*File` 和 `*Data`，则 `*Data` 在该 SSH 会话中胜出。

  </Accordion>
  <Accordion title="Remote-canonical 后果"OpenClaw>
    这是一个 **remote-canonical（远程规范）** 模型。远程 SSH 工作区在初始种子之后将成为真实的沙箱状态。

    - 在种子步骤之后，在 OpenClaw 之外进行的本地主机编辑在您重新创建沙箱之前对远程不可见。
    - `openclaw sandbox recreate` 会删除每个作用域的远程根目录，并在下次使用时从本地重新进行种子初始化。
    - SSH 后端不支持浏览器沙箱隔离。
    - `sandbox.docker.*` 设置不适用于 SSH 后端。

  </Accordion>
</AccordionGroup>

### OpenShell 后端

当您希望 OpenClaw 在 OpenShell 管理的远程环境中对工具进行沙箱隔离时，请使用 `backend: "openshell"`OpenClaw。有关完整的设置指南、配置参考和工作区模式比较，请参阅专门的 [OpenShell 页面](/zh/gateway/openshell)。

OpenShell 复用与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接，并添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`，`sandbox ssh-config`）以及可选的 `mirror` 工作区模式。

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

- `mirror`OpenClaw (默认): 本地工作区保持为权威。OpenClaw 会在执行前将本地文件同步到 OpenShell 中，并在执行后将远程工作区同步回本地。
- `remote`OpenClaw：OpenShell 工作区在沙箱创建后即为标准工作区。OpenClaw 从本地工作区向远程工作区初始化一次数据，随后文件工具和 exec 直接在远程沙箱中运行，而不会将更改同步回来。

<AccordionGroup>
  <Accordion title="Remote transport details"OpenClaw>
    - OpenClaw 向 OpenShell 请求特定于沙箱的 SSH 配置，方式为通过 `openshell sandbox ssh-config <name>`。
    - Core 将该 SSH 配置写入临时文件，打开 SSH 会话，并复用 `backend: "ssh"` 所使用的同一远程文件系统桥接。
    - 在 `mirror` 模式下，仅生命周期有所不同：在执行前将本地同步到远程，然后在执行后同步回来。

  </Accordion>
  <Accordion title="OpenShell 目前的限制">
    - 尚不支持沙箱浏览器
    - OpenShell 后端不支持 `sandbox.docker.binds`
    - Docker 特有的运行时参数（位于 `sandbox.docker.*` 下）仍然仅适用于 Docker 后端

  </Accordion>
</AccordionGroup>

#### 工作区模式

OpenShell 有两种工作区模型。这是在实践中最重要的部分。

<Tabs>
  <Tab title="mirror (local canonical)">
    当您希望**本地工作区保持权威**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

    行为：

    - 在 `exec`OpenClaw 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙箱中。
    - 在 `exec`OpenClawOpenClawDocker 之后，OpenClaw 会将远程工作区同步回本地工作区。
    - 文件工具仍然通过沙箱桥接器操作，但本地工作区在轮次之间仍然是唯一真实来源。

    在以下情况下使用此模式：

    - 您在 OpenClaw 之外本地编辑文件，并希望这些更改自动显示在沙箱中
    - 您希望 OpenShell 沙箱的行为尽可能像 Docker 后端
    - 您希望主机工作区在每次执行轮次后反映沙箱的写入

    权衡：执行前后会有额外的同步开销。

  </Tab>
  <Tab title="remote (OpenShell canonical)">
    当您希望 **OpenShell 工作区成为标准** 时，请使用 `plugins.entries.openshell.config.mode: "remote"`OpenClaw。

    行为：

    - 首次创建沙箱时，OpenClaw 会将本地工作区的内容一次性同步到远程工作区。
    - 此后，`exec`、`read`、`write`、`edit` 和 `apply_patch`OpenClaw 将直接在远程 OpenShell 工作区上运行。
    - OpenClaw **不会**在执行后将远程更改同步回本地工作区。
    - 提示阶段的媒体读取仍然有效，因为文件和媒体工具通过沙箱桥接进行读取，而不是假设本地主机路径。
    - 传输方式是通过 SSH 连接到由 `openshell sandbox ssh-config`OpenClaw 返回的 OpenShell 沙箱。

    重要后果：

    - 如果在初始同步步骤之后，您在 OpenClaw 之外的主机上编辑文件，远程沙箱将**不会**自动看到这些更改。
    - 如果重新创建沙箱，远程工作区将再次从本地工作区进行同步。
    - 使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区将在同一范围内共享。

    在以下情况使用此模式：

    - 沙箱应主要存在于远程 OpenShell 端
    - 您希望降低每轮同步的开销
    - 您不希望主机本地的编辑静默覆盖远程沙箱状态

  </Tab>
</Tabs>

如果您将沙盒视为临时执行环境，请选择 `mirror`。如果您将沙盒视为真实的工作空间，请选择 `remote`。

#### OpenShell 生命周期

OpenShell 沙箱仍然通过正常的沙箱生命周期进行管理：

- `openclaw sandbox list`Docker 显示了 OpenShell 运行时以及 Docker 运行时
- `openclaw sandbox recreate` 删除当前运行时，并让 OpenClaw 在下次使用时重新创建它
- 修剪逻辑也是后端感知的

对于 `remote` 模式，recreate 尤其重要：

- 重新创建会删除该作用域的权威远程工作区
- 下一次使用会从本地工作区植入一个新的远程工作区

对于 `mirror` 模式，recreate 主要会重置远程执行环境，因为本地工作区无论如何仍保持为标准来源。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制沙箱**可以看到的内容**：

<Tabs>
  <Tab title="none (默认)">工具可以看到位于 `~/.openclaw/sandboxes` 下的沙箱工作区。</Tab>
  <Tab title="ro">以只读方式在 `/agent` 挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。</Tab>
  <Tab title="rw">以读写方式在 `/workspace` 挂载代理工作区。</Tab>
</Tabs>

使用 OpenShell 后端时：

- `mirror` 模式仍在执行回合之间使用本地工作区作为权威来源
- 在初始种子之后，`remote` 模式使用远程 OpenShell 工作区作为规范源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同的方式限制写入行为

入站媒体会被复制到活动的沙箱工作区 (`media/inbound/*`)。

<Note>**Skills 注意：** `read` 工具是以沙盒为根的。使用 `workspaceAccess: "none"`OpenClaw 时，OpenClaw 会将符合条件的 Skills 镜像到沙盒工作区（`.../skills`）以便读取。使用 `"rw"` 时，工作区 Skills 可从 `/workspace/skills` 读取。</Note>

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。格式：`host:container:mode`（例如，`"/home/user/source:/source:rw"`）。

全局和每个代理的绑定是**合并**（而非替换）的。在 `scope: "shared"` 下，每个代理的绑定将被忽略。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到 **沙盒浏览器** 容器中。

- 设置时（包括 `[]`），它会替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 如果省略，浏览器容器将回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

示例（只读源 + 额外的数据目录）：

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
**绑定安全性**

- 绑定会绕过沙箱文件系统：它们会以您设置的任何模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 会阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露它们的父级挂载）。
- OpenClaw 还会阻止常见的家目录凭据根目录，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 绑定验证不仅仅是字符串匹配。OpenClaw 会对源路径进行规范化，然后通过最深的现有祖先再次解析它，然后再重新检查被阻止的路径和允许的根目录。
- 这意味着即使最终的叶子节点尚不存在，符号链接父级逃逸仍然会失败关闭。例如：如果 `run-link` 指向那里，`/workspace/run-link/new-file` 仍然会被解析为 `/var/run/...`。
- 允许的源根目录以相同方式进行规范化处理，因此一个在符号链接解析前仅看起来位于允许列表内的路径仍然会被拒绝为 `outside allowed roots`。
- 敏感挂载（密钥、SSH 密钥、服务凭据）应该是 `:ro`，除非绝对需要。
- 如果您只需要对工作区进行读取访问，请结合使用 `workspaceAccess: "ro"`；绑定模式保持独立。
- 请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解绑定如何与工具策略和提升执行交互。

</Warning>

## 镜像和设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Note>
**源代码检出 vs npm 安装**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 辅助脚本仅在从[源代码检出](https://github.com/openclaw/openclaw)运行时可用。它们不包含在 npm 包中。

如果您是通过 `npm install -g openclaw` 安装的 OpenClaw，请改用下面显示的内联 `docker build` 命令。

</Note>

<Steps>
  <Step title="构建默认镜像">
    从源代码检出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    从 npm 安装（无需源代码检出）：

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

    默认镜像**不**包含 Node。如果一个技能需要 Node（或其他运行时），要么构建自定义镜像，要么通过 `sandbox.docker.setupCommand` 安装（需要网络出站 + 可写根目录 + root 用户）。

    当缺少 `openclaw-sandbox:bookworm-slim` 时，OpenClaw 不会默默替换普通的 `debian:bookworm-slim`。针对默认镜像的沙箱运行会快速失败并给出构建说明，直到你构建它，因为打包的镜像携带了 `python3` 用于沙箱写入/编辑辅助功能。

  </Step>
  <Step title="可选：构建通用镜像">
    若要获得功能更完善的沙箱镜像并包含常用工具（例如 `curl`、`jq`、`nodejs`、`python3`、`git`）：

    从源码检出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    通过 npm 安装时，请先构建默认镜像（见上文），然后使用仓库中的 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 在其基础上构建通用镜像。

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step title="Optional: build the sandbox browser image">
    从源码检出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    从 npm 安装，使用仓库中的 [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) 进行构建。

  </Step>
</Steps>

默认情况下，Docker 沙盒容器以 **无网络** 模式运行。可以使用 Docker`agents.defaults.sandbox.docker.network` 覆盖此设置。

<AccordionGroup>
  <Accordion title="沙箱浏览器 Chromium 默认设置">
    附带的沙箱浏览器镜像也为容器化工作负载应用了保守的 Chromium 启动默认值。当前的容器默认值包括：

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
    - `--no-sandbox` 当启用 `noSandbox` 时。
    - 三个图形加固标志（`--disable-3d-apis`、`--disable-software-rasterizer`、`--disable-gpu`）是可选的，在容器缺乏 GPU 支持时非常有用。如果您的工作负载需要 WebGL 或其他 3D/浏览器功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - `--disable-extensions` 默认启用，可以使用 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用，以用于依赖扩展的工作流。
    - `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认值。

    如果您需要不同的运行时配置文件，请使用自定义浏览器镜像并提供您自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 附加其他启动标志。

  </Accordion>
  <Accordion title="Network security defaults">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（命名空间加入绕过风险）。
    - 应急覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关位于此处：[Docker](/zh/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/zh/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后运行**一次**（而不是每次运行都执行）。它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个代理：`agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="常见陷阱">
    - 默认 `docker.network` 为 `"none"`（无出口），因此包安装将失败。
    - `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，仅限紧急情况使用。
    - `readOnlyRoot: true` 阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
    - 进行包安装时，`user` 必须为 root（省略 `user` 或设置 `user: "0:0"`）。
    - 沙箱执行**不**继承主机 `process.env`。请使用 `agents.defaults.sandbox.docker.env`API（或自定义镜像）来存放技能 API 密钥。
    - `agents.defaults.sandbox.docker.env`DockerDockerDocker 中的值将作为显式 Docker 容器环境变量传递。任何拥有 Docker 守护进程访问权限的人都可以使用 Docker 元数据命令（例如 `docker inspect`）检查它们。如果这种元数据暴露不可接受，请使用自定义镜像、挂载的机密文件或其他机密传递路径。

  </Accordion>
</AccordionGroup>

## 工具策略和逃生舱

工具允许/拒绝策略仍然在沙箱规则之前应用。如果某个工具在全局或每个代理级别被拒绝，沙箱隔离不会使其恢复。

`tools.elevated` 是一个显式的应急手段，用于在沙箱外部运行 `exec`（默认为 `gateway`，或者当执行目标是 `node` 时为 `node`）。`/exec` 指令仅适用于经过授权的发送方，并且每个会话持续有效；若要彻底禁用 `exec`，请使用工具策略拒绝（参见 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 来检查有效的沙箱模式、工具策略和修复配置键。
- 关于“为什么被阻止？”的思维模型，请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)。

保持锁定状态。

## 多代理覆盖

每个代理可以覆盖沙箱 + 工具：`agents.list[].sandbox` 和 `agents.list[].tools`（加上用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。有关优先级，请参阅[多代理沙箱和工具](/zh/tools/multi-agent-sandbox-tools)。

## 最小启用示例

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

## 相关

- [多代理沙箱和工具](/zh/tools/multi-agent-sandbox-tools) — 每个代理的覆盖和优先级
- [OpenShell](/zh/gateway/openshell) — 托管沙箱后端设置、工作区模式和配置参考
- [沙箱配置](/zh/gateway/config-agents#agentsdefaultssandbox)
- [沙箱与工具策略与提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么被阻止？”
- [安全](/zh/gateway/security)
