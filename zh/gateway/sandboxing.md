---
summary: "OpenClaw 沙盒的工作原理：模式、作用域、工作区访问和镜像"
title: 沙盒
read_when: "您需要关于沙盒的专门说明，或者需要调整 agents.defaults.sandbox。"
status: active
---

# 沙盒

OpenClaw 可以在 **Docker 容器内运行工具** 以减小爆炸半径。这是**可选的**，由配置（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）控制。如果沙盒关闭，工具将在主机上运行。
Gateway 网关 始终位于主机上；启用后，工具执行将在隔离的沙盒中运行。

这并非完美的安全边界，但当模型执行愚蠢的操作时，它在实质上限制了对文件系统
和进程的访问。

## 什么会被沙盒化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙盒浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，当浏览器工具需要时，沙箱浏览器会自动启动（确保 CDP 可访问）。
    通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 进行配置。
  - 默认情况下，沙箱浏览器容器使用专用的 Docker 网络 (`openclaw-sandbox-browser`)，而不是全局 `bridge` 网络。
    通过 `agents.defaults.sandbox.browser.network` 进行配置。
  - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表（例如 `172.21.0.1/32`）限制容器边缘的 CDP 入站流量。
  - 默认情况下，noVNC 观察者访问受密码保护；OpenClaw 会发出一个短期令牌 URL，该 URL 提供本地引导页面并在 URL 片段中打开带有密码的 noVNC（而非查询/头部日志）。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱隔离会话显式定位到主机浏览器。
  - 可选的允许列表控制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未进行沙箱隔离：

- Gateway(网关) 进程本身。
- 任何显式允许在主机上运行的工具（例如 `tools.elevated`）。
  - **提升的 exec 在主机上运行并绕过沙箱隔离。**
  - 如果关闭沙箱隔离，`tools.elevated` 不会改变执行方式（已在主机上）。请参阅 [提升模式](/zh/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱隔离：

- `"off"`：无沙箱隔离。
- `"non-main"`：仅对**非主**会话进行沙箱隔离（如果您希望在主机上进行正常聊天，这是默认设置）。
- `"all"`：每个会话都在沙箱中运行。
  注意：`"non-main"` 基于 `session.mainKey`（默认为 `"main"`），而不是代理 ID。
  群组/渠道会话使用自己的密钥，因此它们算作非主会话，将被沙箱隔离。

## 范围

`agents.defaults.sandbox.scope` 控制**创建多少个容器**：

- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个代理一个容器。
- `"shared"`：由所有沙箱隔离会话共享的一个容器。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制沙箱**可以看到的内容**：

- `"none"`（默认）：工具可以看到 `~/.openclaw/sandboxes` 下的沙箱工作区。
- `"ro"`：在 `/agent` 以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：在 `/workspace` 以读写方式挂载代理工作区。

入站媒体会被复制到活动的沙箱工作区（`media/inbound/*`）。
Skills 注意事项：`read` 工具是基于沙箱根目录的。使用 `workspaceAccess: "none"` 时，
OpenClaw 会将符合条件的 Skills 镜像到沙箱工作区（`.../skills`）中以便
读取。使用 `"rw"` 时，可以从 `/workspace/skills` 读取工作区 Skills。

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。
格式：`host:container:mode`（例如，`"/home/user/source:/source:rw"`）。

全局和每个代理的绑定是**合并**的（不是替换）。在 `scope: "shared"` 下，每个代理的绑定将被忽略。

`agents.defaults.sandbox.browser.binds` 仅将额外的主机目录挂载到**沙箱浏览器**容器中。

- 设置后（包括 `[]`），它将替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 如果省略，浏览器容器将回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

示例（只读源目录 + 额外的数据目录）：

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

- 绑定绕过沙箱文件系统：它们以您设置的任何模式（`:ro` 或 `:rw`）公开主机路径。
- OpenClaw 会阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露它们的父挂载点）。
- 敏感挂载（机密信息、SSH 密钥、服务凭据）除非绝对必要，否则应为 `:ro`。
- 如果您只需要对工作区进行读取访问，请结合使用 `workspaceAccess: "ro"`；绑定模式保持独立。
- 有关绑定如何与工具策略和提升执行交互的信息，请参阅 [沙箱与工具策略与提升模式](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 镜像 + 设置

默认镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不**包含 Node。如果某个技能需要 Node（或其他运行时），可以构建自定义镜像或通过 `sandbox.docker.setupCommand` 安装（需要网络出口 + 可写根目录 + root 用户）。

如果您想要一个功能更全且包含常用工具的沙箱镜像（例如 `curl`、`jq`、`nodejs`、`python3`、`git`），请执行以下构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

沙箱浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，沙箱容器在**无网络**环境下运行。
可以使用 `agents.defaults.sandbox.docker.network` 覆盖此设置。

附带的沙箱浏览器镜像还会为容器化工作负载应用保守的 Chromium 启动默认值。
当前的容器默认值包括：

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
- `--no-sandbox` 和 `--disable-setuid-sandbox` 在 `noSandbox` 启用时生效。
- 三个图形加固标志（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是可选的，当容器
  缺少 GPU 支持时非常有用。如果您的工作负载需要 WebGL 或其他 3D/浏览器
  功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 默认启用，可以通过
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用以适用于依赖扩展的流程。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认值。

如果您需要不同的运行时配置文件，请使用自定义浏览器镜像并提供
您自己的入口点。对于本地（非容器）Chromium 配置文件，请使用
`browser.extraArgs` 附加额外的启动标志。

安全默认值：

- `network: "host"` 被阻止。
- `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
- 紧急情况覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装和容器化的网关位于此处：
[Docker](/zh/install/docker)

对于 Docker 网关部署，`docker-setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以通过
`OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境
参考：[Docker](/zh/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand（一次性容器设置）

`setupCommand` 在创建沙箱容器后运行**一次**（不是每次运行时都运行）。
它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个代理：`agents.list[].sandbox.docker.setupCommand`

常见陷阱：

- 默认的 `docker.network` 是 `"none"`（无出口），因此软件包安装将失败。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且仅限紧急情况下使用（break-glass only）。
- `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
- 对于软件包安装，`user` 必须是 root 用户（省略 `user` 或设置 `user: "0:0"`）。
- 沙箱执行**不会**继承主机的 `process.env`。请使用
  `agents.defaults.sandbox.docker.env`（或自定义镜像）来配置技能 API 密钥。

## 工具策略与应急出口

工具允许/拒绝策略在沙箱规则之前仍然适用。如果某个工具在全局或特定代理被拒绝，
沙箱隔离不会使其恢复。

`tools.elevated` 是一个明确的应急出口，用于在主机上运行 `exec`。
`/exec` 指令仅适用于经过授权的发送者，并且在每个会话中持续有效；要彻底禁用
`exec`，请使用工具策略拒绝（参见 [沙箱与工具策略与提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 来检查有效的沙箱模式、工具策略和修复配置键。
- 请参阅 [沙箱与工具策略与提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 以了解“为什么这被阻止？”的思维模型。
  保持锁定状态。

## 多代理覆盖

每个代理都可以覆盖沙箱和工具配置：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools` 用于沙箱工具策略）。
请参阅 [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools) 了解优先级。

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

- [沙箱配置](/zh/gateway/configuration#agentsdefaults-sandbox)
- [多智能体沙箱与工具](/zh/tools/multi-agent-sandbox-tools)
- [安全性](/zh/gateway/security)

import zh from '/components/footer/zh.mdx';

<zh />
