---
summary: "OpenClaw 沙盒的工作原理：模式、范围、工作区访问和镜像"
title: 沙盒
read_when: "您需要关于沙盒的专门解释，或者需要调整 agents.defaults.sandbox。"
status: active
---

# 沙盒

OpenClaw 可以在 **Docker 容器内运行工具** 以减小爆炸半径。
这是**可选的**，并通过配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果关闭沙盒，工具将在主机上运行。
网关保留在主机上；启用后，工具执行在隔离的沙盒中
运行。

这并非完美的安全边界，但当模型执行愚蠢的操作时，它在实质上限制了对文件系统
和进程的访问。

## 什么会被沙盒化

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙盒化浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，当浏览器工具需要时，沙盒浏览器会自动启动（确保 CDP 可达）。
    通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 进行配置。
  - 默认情况下，沙盒浏览器容器使用专用的 Docker 网络（`openclaw-sandbox-browser`），而不是全局 `bridge` 网络。
    使用 `agents.defaults.sandbox.browser.network` 进行配置。
  - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 使用 CIDR 允许列表（例如 `172.21.0.1/32`）限制容器边缘 CDP 入站流量。
  - 默认情况下，noVNC 观察者访问受密码保护；OpenClaw 发出一个短期令牌 URL，该 URL 提供本地引导页面并在 URL 片段中打开带有密码的 noVNC（而不是查询/头部日志）。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙盒会话显式定位主机浏览器。
  - 可选的允许列表限制 `target: "custom"`：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

未沙盒化：

- 网关进程本身。
- 任何明确允许在主机上运行的工具（例如 `tools.elevated`）。
  - **特权执行在主机上运行并绕过沙箱。**
  - 如果沙箱处于关闭状态，`tools.elevated` 不会改变执行方式（已在主机上）。参见[特权模式](/zh/en/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱：

- `"off"`：不使用沙箱。
- `"non-main"`：仅对**非主**会话使用沙箱（如果您希望在主机上进行正常聊天，这是默认设置）。
- `"all"`：每个会话都在沙箱中运行。
  注意：`"non-main"` 基于 `session.mainKey`（默认 `"main"`），而不是代理 ID。
  群组/频道会话使用自己的键，因此它们被视为非主会话，并且会被沙箱化。

## 范围

`agents.defaults.sandbox.scope` 控制**创建多少个容器**：

- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个代理一个容器。
- `"shared"`：所有沙箱化会话共享一个容器。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制**沙箱可以看到什么**：

- `"none"`（默认）：工具在 `~/.openclaw/sandboxes` 下看到一个沙箱工作区。
- `"ro"`：在 `/agent` 处以只读方式挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：在 `/workspace` 处以读写方式挂载代理工作区。

传入的媒体被复制到活动的沙箱工作区（`media/inbound/*`）。
技能说明：`read` 工具是基于沙箱根目录的。使用 `workspaceAccess: "none"` 时，
OpenClaw 会将符合条件的技能镜像到沙箱工作区（`.../skills`）中以便读取。
使用 `"rw"` 时，可以从 `/workspace/skills` 读取工作区技能。

## 自定义绑定挂载

`agents.defaults.sandbox.docker.binds` 将额外的主机目录挂载到容器中。
格式：`host:container:mode`（例如，`"/home/user/source:/source:rw"`）。

全局和每个代理的绑定会被**合并**（而不是替换）。在 `scope: "shared"` 下，每个代理的绑定将被忽略。

`agents.defaults.sandbox.browser.binds` 将额外的主机目录挂载到**仅沙箱浏览器**容器中。

- 当设置（包括 `[]`）时，它将替换浏览器容器的 `agents.defaults.sandbox.docker.binds`。
- 当省略时，浏览器容器将回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

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

- 绑定挂载会绕过沙箱文件系统：它们以您设置的任何模式（`:ro` 或 `:rw`）公开主机路径。
- OpenClaw 会阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev` 以及会暴露它们的父挂载）。
- 敏感挂载（机密、SSH 密钥、服务凭据）应为 `:ro`，除非绝对必要。
- 如果您只需要对工作区进行读取访问，请结合 `workspaceAccess: "ro"` 使用；绑定模式保持独立。
- 有关绑定挂载如何与工具策略和提升权限执行交互的信息，请参阅 [Sandbox vs Tool Policy vs Elevated](/zh/en/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 镜像 + 设置

默认镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不**包含 Node。如果技能需要 Node（或其他运行时），请烘焙自定义镜像或通过
`sandbox.docker.setupCommand` 安装（需要网络出口 + 可写根目录 +
root 用户）。

如果您想要一个具有常用工具（例如
`curl`、`jq`、`nodejs`、`python3`、`git`）的更实用的沙箱镜像，请构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为
`openclaw-sandbox-common:bookworm-slim`。

沙箱浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，沙箱容器在**无网络**状态下运行。
使用 `agents.defaults.sandbox.docker.network` 覆盖。

捆绑的沙箱浏览器镜像也对容器化工作负载应用保守的 Chromium 启动默认值。
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
- 当启用 `noSandbox` 时，`--no-sandbox` 和 `--disable-setuid-sandbox`。
- 三个图形加固标志 (`--disable-3d-apis`、
  `--disable-software-rasterizer`, `--disable-gpu`) 是可选的，当容器缺乏 GPU 支持时非常有用。
  如果您的工作负载需要 WebGL 或其他 3D/浏览器功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 默认启用，可以使用
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 为依赖扩展的工作流程禁用它。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保持 Chromium 的默认设置。

如果您需要不同的运行时配置文件，请使用自定义浏览器镜像并提供您自己的入口点。
  对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 附加额外的启动标志。

安全默认值：

- `network: "host"` 被阻止。
- `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
- 紧急情况覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装和容器化网关位于此处：
[Docker](/zh/en/install/docker)

对于 Docker 网关部署，`docker-setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。您可以使用
`OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整设置和环境
参考：[Docker](/zh/en/install/docker#enable-agent-sandbox-for-docker-gateway-opt-in)。

## setupCommand (一次性容器设置)

`setupCommand` 在沙箱容器创建后运行 **一次**（不是每次运行）。
它通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个代理：`agents.list[].sandbox.docker.setupCommand`

常见陷阱：

- 默认的 `docker.network` 是 `"none"`（无出口流量），因此包安装将失败。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且仅限紧急情况使用。
- `readOnlyRoot: true` 阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
- `user` 必须是 root 才能安装软件包（省略 `user` 或设置 `user: "0:0"`）。
- 沙箱执行 **不** 继承主机 `process.env`。请使用
  `agents.defaults.sandbox.docker.env` （或自定义镜像）来获取技能 API 密钥。

## 工具策略与逃生舱口

工具允许/拒绝策略在沙箱规则之前仍然适用。如果某个工具在全局范围内或针对特定代理被拒绝，沙箱化无法使其恢复。

`tools.elevated` 是一个明确的逃生舱口，用于在主机上运行 `exec`。
`/exec` 指令仅适用于经过授权的发件人，并针对每个会话持续存在；若要彻底禁用 `exec`，请使用工具策略拒绝（请参阅 [Sandbox vs Tool Policy vs Elevated](/zh/en/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 来检查有效的沙箱模式、工具策略和修复配置键。
- 有关“为什么这被阻止？”的心理模型，请参阅 [Sandbox vs Tool Policy vs Elevated](/zh/en/gateway/sandbox-vs-tool-policy-vs-elevated)。
  保持锁定状态。

## 多代理覆盖

每个代理都可以覆盖沙箱和工具：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。
请参阅 [Multi-Agent Sandbox & Tools](/zh/en/tools/multi-agent-sandbox-tools) 了解优先级。

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

- [沙箱配置](/zh/en/gateway/configuration#agentsdefaults-sandbox)
- [多代理沙箱与工具](/zh/en/tools/multi-agent-sandbox-tools)
- [安全性](/zh/en/gateway/security)
