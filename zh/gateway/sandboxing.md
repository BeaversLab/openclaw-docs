---
summary: "OpenClaw 沙盒如何工作：模式、范围、工作区访问与镜像"
title: "沙盒"
read_when: "你需要专门的沙盒说明或想调优 agents.defaults.sandbox。"
status: active
---

# 沙盒

OpenClaw 可以 **在 Docker 容器内运行工具** 来降低爆炸半径。
这是 **可选项**，由配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果关闭沙盒，工具在宿主运行。
Gateway 始终在宿主；启用时，工具执行在隔离沙盒内。

这不是完美的安全边界，但当模型做蠢事时，它能显著限制文件系统
和进程访问。

## 哪些会进入沙盒

- 工具执行（`exec`, `read`, `write`, `edit`, `apply_patch`, `process` 等）。
- 可选的沙盒浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，沙盒浏览器在需要时会自动启动（确保 CDP 可达）。
    配置：`agents.defaults.sandbox.browser.autoStart` 与 `agents.defaults.sandbox.browser.autoStartTimeoutMs`。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙盒会话显式连接宿主浏览器。
  - 可选 allowlist 约束 `target: "custom"`：`allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`。

不进入沙盒：

- Gateway 进程本身。
- 任何明确允许在宿主运行的工具（例如 `tools.elevated`）。
  - **提升 exec 在宿主运行并绕过沙盒。**
  - 如果沙盒关闭，`tools.elevated` 不会改变执行（已在宿主）。见 [提升模式](/zh/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制 **何时** 使用沙盒：

- `"off"`：不启用沙盒。
- `"non-main"`：仅 **非 main** 会话进入沙盒（若你想让正常聊天在宿主运行，这是默认常见选择）。
- `"all"`：所有会话都在沙盒。
  注意：`"non-main"` 基于 `session.mainKey`（默认 `"main"`），不是 agent id。
  群/频道会话使用自己的 key，因此会被视为 non-main 并进入沙盒。

## 范围

`agents.defaults.sandbox.scope` 控制 **创建多少容器**：

- `"session"`（默认）：每会话一个容器。
- `"agent"`：每 agent 一个容器。
- `"shared"`：所有沙盒会话共享一个容器。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制 **沙盒能看到什么**：

- `"none"`（默认）：工具看到 `~/.openclaw/sandboxes` 下的沙盒工作区。
- `"ro"`：将 agent 工作区只读挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：将 agent 工作区读写挂载到 `/workspace`。

入站媒体会复制到活动沙盒工作区（`media/inbound/*`）。
技能说明：`read` 工具以沙盒为根。若 `workspaceAccess: "none"`，
OpenClaw 会把可用 skills 镜像到沙盒工作区（`.../skills`）以便读取。
若 `"rw"`，工作区 skills 可从 `/workspace/skills` 读取。

## 自定义 bind 挂载

`agents.defaults.sandbox.docker.binds` 将额外宿主目录挂载到容器。
格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全局与每 agent 的 binds 会 **合并**（不替换）。在 `scope: "shared"` 下会忽略每 agent binds。

示例（只读源码 + docker socket）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/run/docker.sock:/var/run/docker.sock"],
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

- Binds 会绕过沙盒文件系统：暴露宿主路径，权限取决于你设置的模式（`:ro` 或 `:rw`）。
- 敏感挂载（例如 `docker.sock`、机密、SSH key）应为 `:ro`，除非绝对必要。
- 如果只需要读工作区，配合 `workspaceAccess: "ro"`；bind 模式互不影响。
- Binds 与工具策略/提升 exec 的交互见 [沙盒 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 镜像 + setup

默认镜像：`openclaw-sandbox:bookworm-slim`

构建一次：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像 **不包含** Node。若某个 skill 需要 Node（或其他运行时），
请烘焙自定义镜像，或通过
`sandbox.docker.setupCommand` 安装（需要出站网络 + 可写根文件系统 + root 用户）。

沙盒浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，沙盒容器 **无网络**。
使用 `agents.defaults.sandbox.docker.network` 覆盖。

Docker 安装与容器化 gateway 在此：
[Docker](/zh/install/docker)

## setupCommand（一次性容器初始化）

`setupCommand` 在创建沙盒容器后 **仅运行一次**（不是每次运行）。
它在容器内通过 `sh -lc` 执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每 agent：`agents.list[].sandbox.docker.setupCommand`

常见坑：

- 默认 `docker.network` 为 `"none"`（无出站），安装包会失败。
- `readOnlyRoot: true` 禁止写入；设 `readOnlyRoot: false` 或烘焙自定义镜像。
- 安装包时 `user` 必须为 root（省略 `user` 或设 `user: "0:0"`）。
- 沙盒 exec **不继承** 宿主 `process.env`。为 skill API key 使用
  `agents.defaults.sandbox.docker.env`（或自定义镜像）。

## 工具策略 + 逃生舱

工具 allow/deny 策略在沙盒规则之前仍会生效。若全局或 per-agent 禁用某工具，
沙盒不会把它带回来。

`tools.elevated` 是显式的逃生舱，在宿主运行 `exec`。
`/exec` 指令仅对授权发件人生效并按会话持久；若要硬禁用
`exec`，请用工具策略 deny（见 [沙盒 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 检查生效的沙盒模式、工具策略和修复键。
- “为何被阻止”的心智模型见 [沙盒 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)。
  保持锁紧。

## 多 agent 覆盖

每个 agent 可以覆盖沙盒 + 工具：
`agents.list[].sandbox` 与 `agents.list[].tools`（沙盒工具策略用 `agents.list[].tools.sandbox.tools`）。
优先级见 [多 agent 沙盒与工具](/zh/multi-agent-sandbox-tools)。

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

- [沙盒配置](/zh/gateway/configuration#agentsdefaults-sandbox)
- [多 agent 沙盒与工具](/zh/multi-agent-sandbox-tools)
- [安全](/zh/gateway/security)
