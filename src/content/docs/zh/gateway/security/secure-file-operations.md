---
summary: "OpenClawOpenClaw 如何安全地处理本地文件访问，以及为何可选的 fs-safe Python 辅助程序默认处于关闭状态"
read_when:
  - Changing file access, archive extraction, workspace storage, or plugin filesystem helpers
title: "安全文件操作"
---

OpenClaw 使用 [OpenClaw`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 进行安全敏感的本地文件操作：有根限制的读/写、原子替换、归档提取、临时工作区、JSON 状态和机密文件处理。

目标是为接收不受信任路径名的受信任 OpenClaw 代码提供一致的 **库防护**。这不是沙盒。主机文件系统权限、操作系统用户、容器和代理/工具策略仍然定义真正的爆炸半径。

## 默认：无 Python 辅助程序

OpenClaw 默认将 fs-safe POSIX Python 辅助程序设置为 **关闭 (off)**。

原因：

- 除非操作员选择启用，否则网关不应生成持久的 Python 伴生服务；
- 许多安装不需要额外的父目录变更强化；
- 禁用 Python 可以使桌面、Docker、CI 和捆绑应用程序环境中的包/运行时行为更具可预测性。

OpenClaw 仅更改默认值。如果您显式设置模式，fs-safe 将遵守该设置：

```bash
# Default OpenClaw behavior: Node-only fs-safe fallbacks.
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# Opt into the helper when available, falling back if unavailable.
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# Fail closed if the helper cannot start.
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# Optional explicit interpreter.
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

通用的 fs-safe 名称也适用：`FS_SAFE_PYTHON_MODE` 和 `FS_SAFE_PYTHON`。

## 没有 Python 仍受保护的内容

在辅助程序关闭的情况下，OpenClaw 仍将 fs-safe 的 Node 路径用于：

- 拒绝相对路径逃逸（例如 `..`）、绝对路径以及仅允许名称处出现的路径分隔符；
- 通过受信任的根句柄解析操作，而不是临时的 `path.resolve(...).startsWith(...)` 检查；
- 在需要该策略的 API 上拒绝符号链接和硬链接模式；
- 在 API 返回或使用文件内容时，通过身份检查打开文件；
- 对状态/配置文件进行原子兄弟临时写入；
- 读取和归档提取的字节限制；
- 针对 API 要求的机密和状态文件的私有模式。

这些防护覆盖了常规的 OpenClaw 威胁模型：受信任的网关代码在单个受信任的操作员边界内处理不受信任的模型/插件/渠道路径输入。

## Python 增加了什么

在 POSIX 系统上，fs-safe 的可选辅助程序会保持一个持久的 Python 进程，并使用基于文件描述符的相对文件系统操作来执行父目录变更，例如重命名、删除、创建目录、stat/列表操作以及某些写入路径。

这缩小了相同 UID 的竞争窗口，即另一个进程可能在验证和变更之间交换父目录。对于不受信任的本地进程可以修改 OpenClaw 正在操作的同一目录的主机，这是一种深度防御。

如果您的部署存在这种风险且保证 Python 存在，请使用：

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

当该辅助程序是您安全态势的一部分时，请使用 `require` 而不是 `auto`；如果辅助程序不可用，`auto` 会故意回退到仅 Node 的行为。

## 插件和核心指导

- 当路径来自消息、模型输出、配置或插件输入时，面向插件的文件访问应通过 `openclaw/plugin-sdk/*` 辅助程序进行，而不是原始的 `fs`。
- 核心代码应使用 `src/infra/*` 下的本地 fs-safe 封装器，以便一致地应用 OpenClaw 的进程策略。
- 归档提取应使用具有明确大小、条目数、链接和目标限制的 fs-safe 归档辅助程序。
- 机密信息应使用 OpenClaw 机密辅助程序或 fs-safe 机密/私有状态辅助程序；不要围绕 `fs.writeFile` 临时编写模式检查。
- 如果您需要针对恶意本地用户的隔离，请不要仅依赖 fs-safe。请在单独的操作系统用户/主机下运行单独的网关，或使用沙箱隔离。

相关：[安全性](/zh/gateway/security)、[沙箱隔离](/zh/gateway/sandboxing)、[执行批准](/zh/tools/exec-approvals)、[机密信息](/zh/gateway/secrets)。
