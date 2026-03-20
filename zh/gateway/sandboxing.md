---
summary: "How OpenClaw 沙箱隔离 works: modes, scopes, workspace access, and images"
title: 沙箱隔离
read_when: "You want a dedicated explanation of 沙箱隔离 or need to tune agents.defaults.sandbox."
status: active
---

# 沙箱隔离

OpenClaw can run **tools inside sandbox backends** to reduce blast radius.
This is **optional** and controlled by configuration (`agents.defaults.sandbox` or
`agents.list[].sandbox`). If 沙箱隔离 is off, tools run on the host.
The Gateway(网关) stays on the host; 工具 execution runs in an isolated sandbox
when enabled.

This is not a perfect security boundary, but it materially limits filesystem
and process access when the 模型 does something dumb.

## What gets 沙箱隔离

- Tool execution (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Optional 沙箱隔离 browser (`agents.defaults.sandbox.browser`).
  - By default, the sandbox browser auto-starts (ensures CDP is reachable) when the browser 工具 needs it.
    Configure via `agents.defaults.sandbox.browser.autoStart` and `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - By default, sandbox browser containers use a dedicated Docker network (`openclaw-sandbox-browser`) instead of the global `bridge` network.
    Configure with `agents.defaults.sandbox.browser.network`.
  - Optional `agents.defaults.sandbox.browser.cdpSourceRange` restricts container-edge CDP ingress with a CIDR allowlist (for example `172.21.0.1/32`).
  - noVNC observer access is password-protected by default; OpenClaw emits a short-lived token URL that serves a local bootstrap page and opens noVNC with password in URL fragment (not query/header logs).
  - `agents.defaults.sandbox.browser.allowHostControl` lets 沙箱隔离 sessions target the host browser explicitly.
  - Optional allowlists gate `target: "custom"`: `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

Not 沙箱隔离:

- The Gateway(网关) process itself.
- Any 工具 explicitly allowed to run on the host (e.g. `tools.elevated`).
  - **Elevated exec runs on the host and bypasses 沙箱隔离.**
  - 如果关闭沙箱隔离，`tools.elevated` 不会改变执行方式（已在主机上运行）。请参阅 [Elevated Mode](/zh/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱隔离：

- `"off"`：无沙箱隔离。
- `"non-main"`：仅对**非主**会话进行沙箱隔离（如果您希望正常聊天在主机上运行，则为默认值）。
- `"all"`：每个会话都在沙箱中运行。
  注意：`"non-main"` 基于 `session.mainKey`（默认为 `"main"`），而非代理 ID。
  群组/渠道会话使用其自己的密钥，因此它们被视为非主会话并将被沙箱隔离。

## 作用域

`agents.defaults.sandbox.scope` 控制**创建多少个容器**：

- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个代理一个容器。
- `"shared"`：所有被沙箱隔离的会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制**哪个运行时**提供沙箱：

- `"docker"`（默认）：本地 Docker 支持的沙箱运行时。
- `"ssh"`：通用的 SSH 支持的远程沙箱运行时。
- `"openshell"`：OpenShell 支持的沙箱运行时。

SSH 特定的配置位于 `agents.defaults.sandbox.ssh` 下。
OpenShell 特定的配置位于 `plugins.entries.openshell.config` 下。

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

- OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用域创建一个远程根目录。
- 在创建或重新创建后首次使用时，OpenClaw 会从本地工作区一次性将该远程工作区种子化。
- 此后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示媒体读取和入站媒体暂存将通过 SSH 直接针对远程工作区运行。
- OpenClaw 不会自动将远程更改同步回本地工作区。

认证材料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用现有的本地文件并通过 OpenSSH 配置传递。
- `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 通过正常的 secrets 运行时快照解析它们，使用 `0600` 将它们写入临时文件，并在 SSH 会话结束时删除它们。
- 如果为同一项目同时设置了 `*File` 和 `*Data`，则 `*Data` 在该 SSH 会话中优先。

这是一个 **remote-canonical（远程规范）** 模型。远程 SSH 工作区在初始种子之后成为真正的沙箱状态。

重要后果：

- 在种子步骤之后，在 OpenClaw 之外进行的主机本地编辑在远程不可见，直到您重新创建沙箱。
- `openclaw sandbox recreate` 删除每个范围的远程根目录，并在下次使用时从本地重新进行种子处理。
- SSH 后端不支持浏览器沙箱隔离。
- `sandbox.docker.*` 设置不适用于 SSH 后端。

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

- `mirror`（默认）：本地工作区保持规范。OpenClaw 在执行之前将本地文件同步到 OpenShell，并在执行之后将远程工作区同步回来。
- `remote`：OpenShell 工作区在创建沙箱后成为规范。OpenClaw 从本地工作区为远程工作区做一次种子处理，然后文件工具和执行直接针对远程沙箱运行，而无需同步更改。

OpenShell 重用与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接。
该插件添加了 OpenShell 特定的生命周期（`sandbox create/get/delete`、`sandbox ssh-config`）和可选的 `mirror` 模式。

远程传输详细信息：

- OpenClaw 通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求特定于沙箱的 SSH 配置。
- Core 将该 SSH 配置写入临时文件，打开 SSH 会话，并重用与 `backend: "ssh"` 使用的相同的远程文件系统桥接。
- 在 `mirror` 模式下，只有生命周期不同：在执行之前将本地同步到远程，然后在执行之后同步回来。

当前 OpenShell 的限制：

- 尚不支持沙箱浏览器
- OpenShell 后端不支持 `sandbox.docker.binds`
- Docker 特定的运行时开关 `sandbox.docker.*` 仍然仅适用于 Docker 后端

## OpenShell 工作区模式

OpenShell 有两种工作区模型。这是在实践中最重要的部分。

### `mirror`

当您希望 **本地工作区保持权威** 时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙箱中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙箱桥接器运行，但在轮次之间本地工作区仍然是事实来源。

在以下情况使用此模式：

- 您在 OpenClaw 之外本地编辑文件，并希望这些更改自动显示在沙箱中
- 您希望 OpenShell 沙箱的行为尽可能与 Docker 后端相似
- 您希望主机工作区在每次执行轮次后反映沙箱的写入操作

权衡：

- 执行前后需要额外的同步开销

### `remote`

当您希望 **OpenShell 工作区成为权威** 时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 首次创建沙箱时，OpenClaw 会从本地工作区播种远程工作区一次。
- 在此之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接对远程 OpenShell 工作区进行操作。
- 执行后，OpenClaw **不会** 将远程更改同步回本地工作区。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过沙箱桥接器读取，而不是假设本地主机路径。
- 传输方式是通过 SSH 进入 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱。

重要后果：

- 如果在播种步骤之后，您在 OpenClaw 之外的宿主机上编辑文件，远程沙箱将**不会**自动看到这些更改。
- 如果重新创建沙箱，远程工作区将再次从本地工作区播种。
- 使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区将在相同的作用域下共享。

在以下情况使用：

- 沙箱应主要存在于远程 OpenShell 端
- 您希望降低每次轮次的同步开销
- 您不希望主机本地编辑静默覆盖远程沙箱状态

如果您将沙箱视为临时执行环境，请选择 `mirror`。
如果您将沙箱视为真实工作区，请选择 `remote`。

## OpenShell 生命周期

OpenShell 沙箱仍然通过正常的沙箱生命周期进行管理：

- `openclaw sandbox list` 显示 OpenShell 运行时以及 Docker 运行时
- `openclaw sandbox recreate` 删除当前运行时并让 OpenClaw 在下次使用时重新创建它
- 修剪逻辑也具有后端感知能力

对于 `remote` 模式，重新创建尤为重要：

- 重新创建会删除该作用域的规范远程工作区
- 下次使用时将从本地工作区初始化一个新的远程工作区

对于 `mirror` 模式，重新创建主要是重置远程执行环境，
因为本地工作区无论如何仍然是规范的。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制 **沙箱可以看到什么**：

- `"none"`（默认）：工具可以看到 `~/.openclaw/sandboxes` 下的沙箱工作区。
- `"ro"`：在 `/agent` 处以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：在 `/workspace` 处以读写方式挂载代理工作区。

使用 OpenShell 后端时：

- `mirror` 模式在执行轮次之间仍然使用本地工作区作为规范来源
- `remote` 模式在初始初始化后使用远程 OpenShell 工作区作为规范来源
- `workspaceAccess: "ro"` 和 `"none"` 仍然以相同的方式限制写入行为

入站媒体被复制到活动的沙箱工作区（`media/inbound/*`）。
Skills 说明：`read` 工具是以沙箱为根的。使用 `workspaceAccess: "none"` 时，
OpenClaw 会将有资格的 Skills 镜像到沙箱工作区（`.../skills`）中，以便
读取它们。使用 `"rw"` 时，工作区 Skills 可以从 `/workspace/skills` 读取。

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。
格式：`host:container:mode`（例如，`"/home/user/source:/source:rw"`）。

全局和每个代理的绑定会被**合并**（而不是替换）。在 `scope: "shared"` 下，每个代理的绑定将被忽略。

`agents.defaults.sandbox.browser.binds` 将额外的主机目录**仅**挂载到**沙箱浏览器**容器中。

- 设置后（包括 `[]`），它将替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 省略时，浏览器容器将回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

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

安全说明：

- 绑定挂载绕过沙箱文件系统：它们以您设置的任何模式（`:ro` 或 `:rw`）暴露主机路径。
- OpenClaw 会阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露这些目录的父级挂载）。
- 敏感挂载（机密、SSH 密钥、服务凭据）应设为 `:ro`，除非绝对必要。
- 如果您只需要对工作区的读取访问权限，请结合 `workspaceAccess: "ro"` 使用；绑定模式保持独立。
- 请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)，了解绑定如何与工具策略和提升执行权限交互。

## 镜像 + 设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不**包含 Node。如果技能需要 Node（或其他运行时），可以构建自定义镜像或通过 `sandbox.docker.setupCommand` 安装（需要网络出口 + 可写根目录 + root 用户）。

如果您想要一个功能更全、包含常用工具的沙箱镜像（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），请构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

沙箱隔离浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，Docker 沙箱容器在**无网络**模式下运行。可以通过 `agents.defaults.sandbox.docker.network` 覆盖此设置。

捆绑的沙箱浏览器镜像还对容器化工作负载应用了保守的 Chromium 启动默认值。当前的容器默认值包括：

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
- 当启用 `noSandbox` 时，`--no-sandbox` 和 `--disable-setuid-sandbox`。
- 三个图形加固标志（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是可选的，在容器缺乏 GPU 支持时非常有用。如果您的
  工作负载需要 WebGL 或其他 3D/浏览器功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 默认启用，可以通过
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用，用于依赖扩展的流程。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认设置。

如果您需要不同的运行时配置文件，请使用自定义浏览器镜像并提供您自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 附加额外的启动标志。

安全默认设置：

- `network: "host"` 被阻止。
- `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
- 紧急情况覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装和容器化网关位于此处：
[Docker](/zh/install/docker)

对于 Docker 网关部署，`docker-setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以使用 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/zh/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand（一次性容器设置）

`setupCommand` 在创建沙箱容器后运行**一次**（不是每次运行）。
它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个代理：`agents.list[].sandbox.docker.setupCommand`

常见陷阱：

- 默认 `docker.network` 是 `"none"`（无出口），因此软件包安装将失败。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true` 且仅限紧急情况使用。
- `readOnlyRoot: true` 阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
- `user` 必须是 root 用户才能安装软件包（省略 `user` 或设置 `user: "0:0"`）。
- 沙箱执行**不**继承主机 `process.env`。请使用 `agents.defaults.sandbox.docker.env`（或自定义镜像）来配置技能 API 密钥。

## 工具策略 + 逃生舱

工具允许/拒绝策略在沙箱规则之前仍然适用。如果工具在全局或每个代理中被拒绝，沙箱隔离无法使其恢复。

`tools.elevated` 是一个显式的应急方案，用于在主机上运行 `exec`。
`/exec` 指令仅适用于授权发送方，并按会话持久保存；若要彻底禁用
`exec`，请使用工具策略拒绝（请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 来检查有效的沙箱模式、工具策略和修复配置键。
- 请参阅 [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解“为什么这会被阻止？”的思维模型。
  保持锁定状态。

## 多代理覆盖

每个代理都可以覆盖沙箱和工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（以及用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。
请参阅 [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools) 了解优先级。

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

- [沙箱 Configuration](/zh/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools)
- [Security](/zh/gateway/security)

import zh from "/components/footer/zh.mdx";

<zh />
