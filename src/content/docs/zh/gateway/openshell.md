---
summary: "OpenClaw将 OpenShell 用作 OpenClaw 代理的托管沙盒后端"
title: OpenShell
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 不在本地运行 Docker 容器，而是将沙盒生命周期委托给 OpenClawDockerOpenClaw`openshell`CLI CLI，该 CLI 负责配置支持基于 SSH 的命令执行的远程环境。

OpenShell 插件复用与通用 [SSH 后端](/zh/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统桥接。它添加了 OpenShell 特定的生命周期 (`sandbox create/get/delete`, `sandbox ssh-config`) 和一个可选的 `mirror` 工作区模式。

## 先决条件

- 已安装 OpenShell 插件 (`openclaw plugins install @openclaw/openshell-sandbox`)
- 已安装 `openshell` CLI 并位于 `PATH` 上（或通过 `plugins.entries.openshell.config.command` 设置自定义路径）
- 具有沙箱访问权限的 OpenShell 账户
- 在主机上运行的 OpenClaw Gateway(网关)

## 快速开始

1. 安装并启用插件，然后设置沙箱后端：

```bash
openclaw plugins install @openclaw/openshell-sandbox
```

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
          mode: "remote",
        },
      },
    },
  },
}
```

2. 重启 Gateway(网关)。在下一个 agent 轮次中，OpenClaw 创建一个 OpenShell 沙箱并通过其路由工具执行。

3. 验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决定。

### `mirror`

当您希望 **本地工作区保持权威** 时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec`OpenClaw 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙盒中。
- 在 `exec`OpenClaw 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥进行操作，但在轮次之间，本地工作区仍然是事实来源。

最适合：

- 您在 OpenClaw 之外本地编辑文件，并希望这些更改在沙箱中自动可见。
- 您希望 OpenShell 沙箱的行为尽可能与 Docker 后端相似。
- 您希望主机工作空间在每次执行后反映沙箱的写入内容。

权衡：每次执行前后会有额外的同步开销。

### `remote`

当您希望
**OpenShell 工作区成为权威源**时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 当首次创建沙箱时，OpenClaw 会从本地工作区向远程工作区同步一次数据。
- 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接
  对远程 OpenShell 工作区进行操作。
- OpenClaw **不会**将远程更改同步回本地工作区。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过
  沙盒桥接进行读取。

最适用于：

- 沙箱应主要位于远程端。
- 您希望降低每轮同步的开销。
- 您不希望主机本地编辑静默覆盖远程沙箱状态。

<Warning>如果您在初始种子之后，于 OpenClaw 之外的主机上编辑文件，远程沙箱将**不会**看到这些更改。请使用 `openclaw sandbox recreate` 重新播种。</Warning>

### 选择模式

|                        | `mirror`            | `remote`             |
| ---------------------- | ------------------- | -------------------- |
| **规范工作区**         | 本地主机            | 远程 OpenShell       |
| **同步方向**           | 双向（每次执行）    | 一次性种子           |
| **每轮开销**           | 较高（上传 + 下载） | 较低（直接远程操作） |
| **本地编辑是否可见？** | 是，下次执行时      | 否，直到重新创建     |
| **最适用于**           | 开发工作流          | 长时间运行的代理，CI |

## 配置参考

所有 OpenShell 配置都位于 `plugins.entries.openshell.config` 之下：

| 键                        | 类型                     | 默认值        | 描述                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell`CLI CLI 的路径或名称               |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建时的沙箱来源                          |
| `gateway`                 | `string`                 | —             | OpenShell 网关名称 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 网关端点 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用于创建沙箱的 OpenShell 策略 ID              |
| `providers`               | `string[]`               | `[]`          | 创建沙箱时要附加的提供程序名称                |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在创建沙箱时传递 `--auto-providers`           |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内的主要可写工作区                        |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Agent 工作区挂载路径（用于只读访问）          |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell`CLI CLI 操作的超时时间             |

沙箱级设置（`mode`、`scope`、`workspaceAccess`）配置在
`agents.defaults.sandbox` 下，与任何后端一样。有关完整矩阵，请参阅
[沙箱隔离](/zh/gateway/sandboxing)。

## 示例

### 最小远程设置

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### 使用 GPU 的镜像模式

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
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
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### 带有自定义网关的每代理 OpenShell

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          policy: "strict",
        },
      },
    },
  },
}
```

## 生命周期管理

OpenShell 沙箱通过常规沙箱 CLI 进行管理：

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

对于 `remote` 模式，**重新创建 (recreate) 尤其重要**：它会删除该作用域的规范远程工作区。下次使用时会从本地工作区初始化一个新的远程工作区。

对于 `mirror` 模式，重新创建 (recreate) 主要会重置远程执行环境，因为本地工作区仍然保持规范。

### 何时重新创建

更改以下任何内容后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全加固

OpenShell 固定工作区根文件描述符并在每次读取前重新检查沙箱标识，因此符号链接交换或重新挂载的工作区无法将读取重定向到预期的远程工作区之外。

## 当前限制

- OpenShell 后端不支持沙箱浏览器。
- `sandbox.docker.binds` 不适用于 OpenShell。
- Docker`sandbox.docker.*` 特定的运行时配置项仅适用于 Docker 后端。

## 工作原理

1. OpenClaw 调用 OpenClaw`openshell sandbox create`（根据配置使用 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 OpenClaw`openshell sandbox ssh-config <name>` 以获取沙箱的
   SSH 连接详细信息。
3. Core 将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：执行前将本地同步到远程，运行，执行后同步回本地。
5. 在 `remote` 模式下：创建时一次性播种，然后直接在远程工作区上操作。

## 相关

- [沙箱隔离](/zh/gateway/sandboxing) -- 模式、作用域和后端比较
- [沙箱与工具策略与提升权限](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试被阻止的工具
- [多智能体沙箱和工具](/zh/tools/multi-agent-sandbox-tools) -- 每个智能体的覆盖设置
- [沙箱 CLI](/zh/cli/sandbox) -- `openclaw sandbox` 命令
