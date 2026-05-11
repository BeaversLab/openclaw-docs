---
summary: "将 OpenShell 用作 OpenClaw 代理的托管沙盒后端"
title: OpenShell
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

OpenShell 是 OpenClaw 的托管沙盒后端。OpenClaw 不在本地运行 Docker 容器，而是将沙盒生命周期委托给 `openshell` CLI，后者配置支持基于 SSH 命令执行的远程环境。

OpenShell 插件重用与通用 [SSH 后端](/zh/gateway/sandboxing#ssh-backend) 相同的核心 SSH 传输和远程文件系统桥接。它增加了 OpenShell 特定的生命周期 (`sandbox create/get/delete`，`sandbox ssh-config`) 和可选的 `mirror` 工作区模式。

## 先决条件

- 已安装 `openshell` CLI 并位于 `PATH` 上（或通过 `plugins.entries.openshell.config.command` 设置自定义路径）
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

2. 重启 Gateway(网关)。在下一个代理轮次中，OpenClaw 将创建一个 OpenShell 沙盒并通过它路由工具执行。

3. 验证：

```bash
openclaw sandbox list
openclaw sandbox explain
```

## 工作区模式

这是使用 OpenShell 时最重要的决定。

### `mirror`

当您希望**本地工作区保持规范**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 将本地工作区同步到 OpenShell 沙盒中。
- 在 `exec` 之后，OpenClaw 将远程工作区同步回本地工作区。
- 文件工具仍然通过沙盒桥接进行操作，但在轮次之间，本地工作区仍然是事实来源。

最适用于：

- 您在 OpenClaw 外部本地编辑文件，并希望这些更改自动在沙盒中可见。
- 您希望 OpenShell 沙盒的行为尽可能像 Docker 后端。
- 您希望主机工作区在每次执行轮次后反映沙盒写入的内容。

权衡：每次执行前后额外的同步成本。

### `remote`

当您希望**OpenShell 工作区成为规范**时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 首次创建沙盒时，OpenClaw 会从本地工作区向远程工作区播种一次。
- 在此之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 将
  直接针对远程 OpenShell 工作区运行。
- OpenClaw **不会**将远程更改同步回本地工作区。
- 提示时的媒体读取仍然有效，因为文件和媒体工具通过
  沙箱桥进行读取。

最适合：

- 沙箱应主要驻留在远程端。
- 您希望降低每轮同步开销。
- 您不希望主机本地编辑静默覆盖远程沙箱状态。

<Warning>如果您在初始种子之后，于 OpenClaw 之外的宿主机上编辑文件，远程沙箱将**不会**看到这些更改。请使用 `openclaw sandbox recreate` 重新播种。</Warning>

### 选择模式

|                      | `mirror`            | `remote`             |
| -------------------- | ------------------- | -------------------- |
| **规范工作区**       | 本地主机            | 远程 OpenShell       |
| **同步方向**         | 双向（每次执行）    | 一次性播种           |
| **每轮开销**         | 较高（上传 + 下载） | 较低（直接远程操作） |
| **本地编辑可见吗？** | 是，下次执行时      | 否，直到重新创建     |
| **最适合**           | 开发工作流          | 长期运行的代理、CI   |

## 配置参考

所有 OpenShell 配置均位于 `plugins.entries.openshell.config` 下：

| 键                        | 类型                     | 默认值        | 描述                                          |
| ------------------------- | ------------------------ | ------------- | --------------------------------------------- |
| `mode`                    | `"mirror"` 或 `"remote"` | `"mirror"`    | 工作区同步模式                                |
| `command`                 | `string`                 | `"openshell"` | `openshell` CLI 的路径或名称                  |
| `from`                    | `string`                 | `"openclaw"`  | 首次创建的沙箱源                              |
| `gateway`                 | `string`                 | —             | OpenShell 网关名称 (`--gateway`)              |
| `gatewayEndpoint`         | `string`                 | —             | OpenShell 网关端点 URL (`--gateway-endpoint`) |
| `policy`                  | `string`                 | —             | 用于创建沙箱的 OpenShell 策略 ID              |
| `providers`               | `string[]`               | `[]`          | 创建沙箱时要附加的提供者名称                  |
| `gpu`                     | `boolean`                | `false`       | 请求 GPU 资源                                 |
| `autoProviders`           | `boolean`                | `true`        | 在创建沙箱期间传递 `--auto-providers`         |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | 沙箱内的主要可写工作区                        |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | 代理工作区挂载路径（用于只读访问）            |
| `timeoutSeconds`          | `number`                 | `120`         | `openshell` CLI 操作的超时时间                |

沙箱级别的设置（`mode`、`scope`、`workspaceAccess`）在
`agents.defaults.sandbox` 下配置，与任何后端一样。参见
[沙箱隔离](/zh/gateway/sandboxing)以获取完整矩阵。

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

### 带 GPU 的镜像模式

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

### 使用自定义网关的每代理 OpenShell

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

OpenShell 沙箱通过常规的沙箱 CLI 进行管理：

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

对于 `remote` 模式，**recreate 尤其重要**：它会删除该作用域的规范远程工作区。
下次使用时会从本地工作区初始化一个新的远程工作区。

对于 `mirror` 模式，recreate 主要重置远程执行环境，因为本地工作区仍然是规范的。

### 何时重建

更改以下任何项目后重建：

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## 安全加固

OpenShell 固定工作区根 fd 并在每次读取前重新检查沙箱身份，因此符号链接交换或重新挂载的工作区无法将读取重定向到
预期之外的远程工作区。

## 当前限制

- OpenShell 后端不支持沙箱浏览器。
- `sandbox.docker.binds` 不适用于 OpenShell。
- Docker 特定的运行时参数在 `sandbox.docker.*` 下仅适用于 Docker
  后端。

## 工作原理

1. OpenClaw 调用 `openshell sandbox create`（根据配置带有 `--from`、`--gateway`、
   `--policy`、`--providers`、`--gpu` 标志）。
2. OpenClaw 调用 `openshell sandbox ssh-config <name>` 以获取沙箱的 SSH 连接
   详细信息。
3. Core 将 SSH 配置写入临时文件，并使用与通用 SSH 后端相同的远程文件系统桥接打开 SSH 会话。
4. 在 `mirror` 模式下：在执行前将本地同步到远程，运行，执行后同步回。
5. 在 `remote` 模式下：创建时播种一次，然后直接在远程
   工作区上操作。

## 相关

- [沙箱隔离](/zh/gateway/sandboxing) -- 模式、作用域和后端对比
- [沙箱 vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试被阻止的工具
- [Multi-Agent 沙箱 and Tools](/zh/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖设置
- [沙箱 CLI](/zh/cli/sandbox) -- `openclaw sandbox` 命令
