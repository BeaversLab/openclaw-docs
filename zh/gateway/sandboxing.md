---
summary: "OpenClaw 沙箱隔离的工作原理：模式、范围、工作区访问和镜像"
title: 沙盒
read_when: "您希望获得有关沙箱隔离的详细说明，或者需要调整 agents.defaults.sandbox."
status: active
---

# 沙盒

OpenClaw 可以在**沙箱后端内运行工具**以减少爆炸半径。
这是**可选的**，并通过配置（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）进行控制。如果关闭沙箱隔离，工具将在主机上运行。
Gateway(网关) 始终位于主机上；启用后，工具执行将在隔离的沙箱中运行。

这并非完美的安全边界，但当模型执行愚蠢的操作时，它在实质上限制了对文件系统
和进程的访问。

## 什么会被沙盒化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱隔离浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可访问）。
    通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 进行配置。
  - 默认情况下，沙箱浏览器容器使用专用的 Docker 网络（`openclaw-sandbox-browser`），而不是全局 `bridge` 网络。
    使用 `agents.defaults.sandbox.browser.network` 进行配置。
  - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表（例如 `172.21.0.1/32`）限制容器边缘的 CDP 入站流量。
  - 默认情况下，noVNC 观察者访问受密码保护；OpenClaw 会发出一个短期令牌 URL，该 URL 提供本地引导页面并在 URL 片段中打开带有密码的 noVNC（而非查询/头部日志）。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱隔离的会话明确指定主机浏览器。
  - 可选的允许列表控制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未进行沙箱隔离：

- Gateway(网关) 进程本身。
- 任何明确允许在主机上运行的工具（例如 `tools.elevated`）。
  - **提升的 exec 在主机上运行并绕过沙箱隔离。**
  - 如果沙箱隔离已关闭，`tools.elevated` 不会改变执行方式（已在主机上运行）。请参阅[提升模式](/zh/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱隔离：

- `"off"`：不进行沙箱隔离。
- `"non-main"`：仅对**非主**会话进行沙箱隔离（如果您希望在主机上进行正常聊天，则为默认值）。
- `"all"`：每个会话都在沙箱中运行。
  注意：`"non-main"` 是基于 `session.mainKey`（默认为 `"main"`），而不是代理 ID。
  组/渠道会话使用自己的密钥，因此它们被视为非主会话并将被沙箱隔离。

## 范围

`agents.defaults.sandbox.scope` 控制**创建多少个容器**：

- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个 Agent 一个容器。
- `"shared"`：所有沙箱隔离的会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制**哪个运行时**提供沙箱：

- `"docker"`（默认）：本地 Docker 支持的沙箱运行时。
- `"ssh"`：通用的 SSH 支持的远程沙箱运行时。
- `"openshell"`：OpenShell 支持的沙箱运行时。

SSH 特定配置位于 `agents.defaults.sandbox.ssh` 下。
OpenShell 特定配置位于 `plugins.entries.openshell.config` 下。

### 选择后端

|                | Docker                      | SSH                       | OpenShell                      |
| -------------- | --------------------------- | ------------------------- | ------------------------------ |
| **运行位置**   | 本地容器                    | 任何可通过 SSH 访问的主机 | OpenShell 托管沙箱             |
| **设置**       | `scripts/sandbox-setup.sh`  | SSH 密钥 + 目标主机       | 已启用 OpenShell 插件          |
| **工作区模型** | 绑定挂载或复制              | 远程规范 (种子一次)       | `mirror` 或 `remote`           |
| **网络控制**   | `docker.network` (默认：无) | 取决于远程主机            | 取决于 OpenShell               |
| **浏览器沙箱** | 支持                        | 不支持                    | 暂不支持                       |
| **绑定挂载**   | `docker.binds`              | 不适用                    | 不适用                         |
| **最适用于**   | 本地开发，完全隔离          | 卸载到远程机器            | 托管远程沙箱，支持可选双向同步 |

### SSH 后端

当您希望 OpenClaw 在任意可通过 SSH 访问的机器上对 `exec`、文件工具和媒体读取进行沙箱隔离时，请使用 `backend: "ssh"`。

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

工作原理：

- OpenClaw 在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。
- 在创建或重建后首次使用时，OpenClaw 会从本地工作区向该远程工作区进行一次种子同步。
- 此后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒体读取和入站媒体暂存将直接通过 SSH 对远程工作区运行。
- OpenClaw 不会自动将远程更改同步回本地工作区。

认证材料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用现有的本地文件并通过 OpenSSH 配置传递。
- `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 会通过常规的机密运行时快照解析它们，使用 `0600` 将其写入临时文件，并在 SSH 会话结束时将其删除。
- 如果为同一项目设置了 `*File` 和 `*Data`，则 `*Data` 在该 SSH 会话中优先。

这是一种 **remote-canonical（远程权威）** 模型。远程 SSH 工作区在初始同步后将成为真实的沙箱状态。

重要后果：

- 在初始化步骤之后，在 OpenClaw 之外进行的主机本地编辑在远程端不可见，直到您重新创建沙箱。
- `openclaw sandbox recreate` 将删除每个作用域的远程根目录，并在下次使用时从本地重新初始化。
- SSH 后端不支持浏览器沙箱隔离。
- `sandbox.docker.*` 设置不适用于 SSH 后端。

### OpenShell 后端

当您希望 OpenClaw 在 OpenShell 管理的远程环境中对工具进行沙箱隔离时，请使用 `backend: "openshell"`。有关完整的设置指南、配置参考和工作区模式比较，请参阅专门的
[OpenShell 页面](/zh/gateway/openshell)。

OpenShell 复用与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥，并增加了 OpenShell 特定的生命周期
(`sandbox create/get/delete`, `sandbox ssh-config`) 以及可选的 `mirror`
工作区模式。

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

- `mirror`（默认）：本地工作区保持权威。OpenClaw 在执行前将本地文件同步到 OpenShell，并在执行后将远程工作区同步回来。
- `remote`：创建沙箱后，OpenShell 工作区成为权威。OpenClaw 从本地工作区向远程工作区进行一次初始化，随后文件工具和执行直接在远程沙箱上运行，而不会将更改同步回来。

远程传输详细信息：

- OpenClaw 通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求特定于沙箱的 SSH 配置。
- 核心将该 SSH 配置写入临时文件，打开 SSH 会话，并复用与 `backend: "ssh"` 相同的远程文件系统桥。
- 在 `mirror` 模式下，仅生命周期有所不同：在执行前将本地同步到远程，然后在执行后同步回来。

当前的 OpenShell 限制：

- 尚不支持沙箱浏览器
- OpenShell 后端不支持 `sandbox.docker.binds`
- Docker 特定的运行时配置项位于 `sandbox.docker.*` 下，但仍然仅适用于 Docker 后端

#### 工作区模式

OpenShell 有两种工作区模型。这是在实际操作中最重要的部分。

##### `mirror`

当您希望**本地工作区保持权威**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙箱中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙箱桥接器操作，但在轮次之间，本地工作区保持为事实来源。

在以下情况使用此模式：

- 您在 OpenClaw 之外本地编辑文件，并希望这些更改自动显示在沙箱中
- 您希望 OpenShell 沙箱的行为尽可能像 Docker 后端
- 您希望主机工作区在每次执行轮次后反映沙箱的写入操作

权衡：

- 执行前后需要额外的同步开销

##### `remote`

当您希望**OpenShell 工作区成为权威**时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 首次创建沙箱时，OpenClaw 会从本地工作区向远程工作区进行一次播种。
- 此后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接对远程 OpenShell 工作区进行操作。
- 执行后，OpenClaw **不会**将远程更改同步回本地工作区。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过沙箱桥接器读取，而不是假设本地主机路径。
- 传输方式是通过 SSH 进入由 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱。

重要影响：

- 如果在播种步骤之后，您在 OpenClaw 之外的主机上编辑文件，远程沙箱将**不会**自动看到这些更改。
- 如果重新创建沙箱，远程工作区将从本地工作区再次播种。
- 使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区将在相同的作用域内共享。

在以下情况使用此模式：

- 沙箱应主要存在于远程 OpenShell 端
- 您希望降低每次轮询的同步开销
- 您不希望本地编辑在不知不觉中覆盖远程沙箱状态

如果您将沙箱视为临时执行环境，请选择 `mirror`。
如果您将沙箱视为真正的工作区，请选择 `remote`。

#### OpenShell 生命周期

OpenShell 沙箱仍通过正常的沙箱生命周期进行管理：

- `openclaw sandbox list` 显示 OpenShell 运行时以及 Docker 运行时
- `openclaw sandbox recreate` 删除当前运行时，并让 OpenClaw 在下次使用时重新创建它
- 修剪逻辑也针对后端进行了感知

对于 `remote` 模式，重新创建尤为重要：

- 重新创建会删除该作用域的规范远程工作区
- 下次使用时会从本地工作区初始化一个新的远程工作区

对于 `mirror` 模式，重新创建主要重置远程执行环境，
因为本地工作区无论如何仍然是规范的。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制沙箱**可以看到什么**：

- `"none"`（默认）：工具可以在 `~/.openclaw/sandboxes` 下看到沙箱工作区。
- `"ro"`：在 `/agent` 处以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：在 `/workspace` 处以读写方式挂载代理工作区。

使用 OpenShell 后端时：

- `mirror` 模式仍然在执行轮询之间使用本地工作区作为规范来源
- `remote` 模式在初始种子之后使用远程 OpenShell 工作区作为规范来源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同的方式限制写入行为

入站媒体会被复制到活动的沙箱工作区 (`media/inbound/*`) 中。
Skills 注意：`read` 工具是以沙箱为根的。使用 `workspaceAccess: "none"` 时，
OpenClaw 会将符合条件的 skills 镜像到沙箱工作区 (`.../skills`) 中以便
读取。使用 `"rw"` 时，工作区 skills 可从
`/workspace/skills` 读取。

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。
格式：`host:container:mode` (例如，`"/home/user/source:/source:rw"`)。

全局和每个代理的绑定会被**合并** (而不是替换)。在 `scope: "shared"` 下，每个代理的绑定会被忽略。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到**沙箱浏览器** 容器中。

- 当设置此值时 (包括 `[]`)，它将替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 当省略时，浏览器容器将回退到 `agents.defaults.sandbox.docker.binds` (向后兼容)。

示例 (只读源 + 一个额外的数据目录)：

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

安全说明：

- 绑定会绕过沙箱文件系统：它们以您设置的任何模式 (`:ro` 或 `:rw`) 暴露主机路径。
- OpenClaw 会阻止危险的绑定源 (例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露它们的父级挂载)。
- 敏感挂载 (机密、SSH 密钥、服务凭据) 除非绝对必要，否则应为 `:ro`。
- 如果您只需要对工作区进行读取访问，请结合 `workspaceAccess: "ro"` 使用；绑定模式保持独立。
- 请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 了解绑定如何与工具策略和提升执行交互。

## 镜像 + 设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不**包含 Node。如果技能需要 Node（或其他运行时），可以构建自定义镜像或通过 `sandbox.docker.setupCommand` 安装（需要网络出口 + 可写根目录 + root 用户）。

如果你想要一个功能更全且包含常用工具的沙箱镜像（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），请构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

沙箱隔离浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，Docker 沙箱容器在**无网络**模式下运行。可以使用 `agents.defaults.sandbox.docker.network` 覆盖此设置。

随附的沙箱浏览器镜像还为容器化工作负载应用了保守的 Chromium 启动默认值。当前的容器默认值包括：

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
- 当 `noSandbox` 启用时，设置 `--no-sandbox` 和 `--disable-setuid-sandbox`。
- 这三个图形强化标志（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是可选的，当容器缺乏 GPU 支持时很有用。如果你的工作负载需要 WebGL 或其他 3D/浏览器功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 默认启用，对于依赖扩展的流程，可以通过 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用。
- `--renderer-process-limit=2` 由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认值。

如果您需要不同的运行时配置文件，请使用自定义浏览器镜像并提供您自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 附加额外的启动标志。

安全默认值：

- `network: "host"` 被阻止。
- `network: "container:<id>"` 默认被阻止（存在绕过命名空间加入的风险）。
- 紧急情况覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装和容器化网关位于此处：
[Docker](/zh/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以使用
`OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境
参考：[Docker](/zh/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand（一次性容器设置）

`setupCommand` 在沙箱容器创建后运行**一次**（不是每次运行时）。
它通过 `sh -lc` 在容器内部执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个代理：`agents.list[].sandbox.docker.setupCommand`

常见陷阱：

- 默认 `docker.network` 是 `"none"`（无出口），因此软件包安装将失败。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true` 并且仅供紧急情况使用。
- `readOnlyRoot: true` 防止写入；设置 `readOnlyRoot: false` 或构建自定义镜像。
- 对于软件包安装，`user` 必须是 root 用户（省略 `user` 或设置 `user: "0:0"`）。
- 沙箱执行**不**继承主机 `process.env`。请使用
  `agents.defaults.sandbox.docker.env`（或自定义镜像）来获取技能 %%PH:GLOSSARY:267:11e336a2\*\* 密钥。

## 工具策略 + 逃生舱口

工具允许/拒绝策略在沙箱规则之前仍然适用。如果工具被全局或按代理拒绝，沙箱隔离不会将其恢复。

`tools.elevated` 是一个显式的逃生舱口，用于在主机上运行 `exec`。
`/exec` 指令仅适用于经过授权的发送者，并且在每个会话中持续有效；要彻底禁用
`exec`，请使用工具策略拒绝（参见 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 来检查有效的沙箱模式、工具策略和修复配置键。
- 有关“为什么被阻止？”的心智模型，请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)。
  请保持锁定状态。

## 多代理覆盖

每个代理都可以覆盖沙箱和工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（以及用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。
有关优先级，请参阅 [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools)。

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

## 相关文档

- [OpenShell](/zh/gateway/openshell) -- 托管沙箱后端设置、工作区模式和配置参考
- [沙箱 Configuration](/zh/gateway/configuration-reference#agents-defaults-sandbox)
- [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么被阻止？”
- [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖和优先级
- [Security](/zh/gateway/security)

import zh from "/components/footer/zh.mdx";

<zh />
