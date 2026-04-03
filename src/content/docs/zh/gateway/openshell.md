---
title: OpenShell
summary: "将 OpenShell 用作 OpenClaw 代理的托管沙盒后端"
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

# OpenShell

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 不在本地运行 Docker
容器，而是将沙盒生命周期委托给 `openshell` CLI，
该 CLI 会配置支持基于 SSH 的命令执行的远程环境。

OpenShell 插件复用与通用 [SSH 后端](/en/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统
桥接器。它增加了
OpenShell 特定的生命周期 (`sandbox create/get/delete`、`sandbox ssh-config`)
以及一个可选的 `mirror` 工作区模式。

## 先决条件

- 已安装 `openshell` CLI 并且位于 `PATH` 中（或者通过
  `plugins.entries.openshell.config.command` 设置自定义路径）
- 具有沙盒访问权限的 OpenShell 帐户
- 在主机上运行的 OpenClaw Gateway(网关)

## 快速开始

1. 启用插件并设置沙盒后端：

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

2. 重启 Gateway(网关)。在下一个代理轮次中，OpenClaw 将创建一个 OpenShell
   沙盒并通过它路由工具执行。

3. 验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决定。

### `mirror`

当您希望**本地工作区保持为权威**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙盒中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥接器操作，但本地工作区
  在轮次之间仍然是事实来源。

最适用于：

- 您在 OpenClaw 之外的本地编辑文件，并希望这些更改自动
  在沙盒中可见。
- 您希望 OpenShell 沙盒的行为尽可能像 Docker 后端一样。
- 您希望主机工作区在每次执行轮次后反映沙盒的写入。

权衡：每次执行前后有额外的同步成本。

### `remote`

当您希望**OpenShell 工作区成为权威**时，请使用
`plugins.entries.openshell.config.mode: "remote"`。

行为：

- 首次创建沙盒时，OpenClaw 会从本地工作区
  向远程工作区播种一次。
- 在此之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 直接针对远程 OpenShell 工作区进行操作。
- OpenClaw **不会** 将远程更改同步回本地工作区。
- 提示期间的媒体读取仍然有效，因为文件和媒体工具通过沙箱网桥进行读取。

最适用于：

- 沙箱应主要驻留在远程端。
- 您希望降低每轮同步开销。
- 您不希望主机本地编辑静默覆盖远程沙箱状态。

重要提示：如果您在初始种子之后在 OpenClaw 之外的主机上编辑文件，远程沙箱将**不会**看到这些更改。使用 `openclaw sandbox recreate` 重新设置种子。

### 选择模式

|                    | `mirror`            | `remote`             |
| ------------------ | ------------------- | -------------------- |
| **规范工作区**     | 本地主机            | 远程 OpenShell       |
| **同步方向**       | 双向（每次执行）    | 一次性种子           |
| **每轮开销**       | 较高（上传 + 下载） | 较低（直接远程操作） |
| **本地编辑可见？** | 是，在下次执行时    | 否，直到重新创建     |
| **最适用于**       | 开发工作流          | 长时间运行的代理，CI |

## 配置参考

所有 OpenShell 配置都位于 `plugins.entries.openshell.config` 之下：

| 键                        | 类型                     | 默认值        | 描述                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                  |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建的沙箱来源                            |
| `gateway`                 | `string`                 | —             | OpenShell 网关名称 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 网关端点 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用于创建沙箱的 OpenShell 策略 ID              |
| `providers`               | `string[]`               | `[]`          | 创建沙箱时要附加的提供商名称                  |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在创建沙箱期间传递 `--auto-providers`         |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内的主要可写工作区                        |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | 代理工作区挂载路径（用于只读访问）            |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                |

沙箱级设置（`mode`、`scope`、`workspaceAccess`）与任何后端一样配置在
`agents.defaults.sandbox` 下。有关完整矩阵，请参阅
[沙箱隔离](/en/gateway/sandboxing)。

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

### 启用 GPU 的镜像模式

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

### 带有自定义网关的每个代理 OpenShell

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

对于 `remote` 模式，**重新创建（recreate）尤为重要**：它会删除该作用域的规范
远程工作区。下次使用时会根据本地工作区填充一个新的远程工作区。

对于 `mirror` 模式，重新创建主要会重置远程执行环境，因为
本地工作区仍然是规范的。

### 何时重新创建

更改以下任何内容后重新创建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 当前限制

- OpenShell 后端不支持沙箱浏览器。
- `sandbox.docker.binds` 不适用于 OpenShell。
- Docker 特定的运行时控制项（位于 `sandbox.docker.*` 下）仅适用于 Docker
  后端。

## 工作原理

1. OpenClaw 调用 `openshell sandbox create`（根据配置附带 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 `openshell sandbox ssh-config <name>` 以获取沙箱的 SSH 连接
   详细信息。
3. Core 将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的远程文件系统
   桥接打开 SSH 会话。
4. 在 `mirror` 模式下：在执行前将本地同步到远程，运行，然后在执行后同步回。
5. 在 `remote` 模式下：创建时播种一次，然后直接在远程
   工作区上操作。

## 另请参阅

- [沙箱隔离](/en/gateway/sandboxing) -- 模式、范围和后端比较
- [沙箱 vs 工具策略 vs 提权](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试被阻止的工具
- [多代理沙箱和工具](/en/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖设置
- [沙箱 CLI](/en/cli/sandbox) -- `openclaw sandbox` 命令
