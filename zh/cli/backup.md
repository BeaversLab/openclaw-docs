---
summary: "CLI reference for `openclaw backup` (create local backup archives)"
read_when:
  - 您需要为本地 OpenClaw 状态创建一流的备份归档
  - 您希望在重置或卸载之前预览将包含哪些路径
title: "backup"
---

# `openclaw backup`

为 OpenClaw 状态、配置、凭据、会话以及（可选）工作区创建本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 注意

- 该归档包含一个 `manifest.json` 文件，其中记录了解析后的源路径和归档布局。
- 默认输出是当前工作目录中带有时间戳的 `.tar.gz` 归档文件。
- 如果当前工作目录位于备份的源树内，OpenClaw 将回退到您的主目录作为默认归档位置。
- 现有的归档文件永远不会被覆盖。
- 源状态/工作区树内的输出路径会被拒绝，以避免自我包含。
- `openclaw backup verify <archive>` 会验证归档是否仅包含一个根清单，拒绝遍历风格的归档路径，并检查清单中声明的每个负载是否存在于 tarball 中。
- `openclaw backup create --verify` 会在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 仅备份活动的 JSON 配置文件。

## 备份内容

`openclaw backup create` 从本地 OpenClaw 安装中规划备份源：

- 由 OpenClaw 本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 活动的配置文件路径
- OAuth / 凭据目录
- 从当前配置中发现的工作区目录，除非您传递了 `--no-include-workspace`

如果您使用 `--only-config`，OpenClaw 将跳过状态、凭据和工作区发现，仅归档活动的配置文件路径。

OpenClaw 在构建归档之前会对路径进行规范化处理。如果配置、凭据或工作区已经位于状态目录内，它们将不会作为单独的顶级备份源重复出现。缺失的路径将被跳过。

归档负载存储来自这些源树的文件内容，嵌入的 `manifest.json` 记录了解析后的绝对源路径以及用于每个资产的归档布局。

## 无效配置的行为

`openclaw backup` 故意绕过正常的配置预检，以便它仍能在恢复期间提供帮助。由于工作区发现依赖于有效的配置，因此当配置文件存在但无效且工作区备份仍处于启用状态时，`openclaw backup create` 现在会快速失败。

如果在这种情况下您仍希望进行部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这样可以在保持状态、配置和凭据在范围内的同时，完全跳过工作区发现。

如果您只需要配置文件本身的副本，由于 `--only-config` 不依赖于解析配置来进行工作区发现，因此它在配置格式错误时也能正常工作。

## 大小和性能

OpenClaw 不强制执行内置的最大备份大小或单文件大小限制。

实际限制取决于本地计算机和目标文件系统：

- 用于临时归档写入加上最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果您使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径上的文件系统行为。OpenClaw 优先采用无覆盖的硬链接发布步骤，并在不支持硬链接时回退到独占复制

大型工作区通常是归档大小的主要驱动因素。如果您希望备份更小或更快，请使用 `--no-include-workspace`。

要获取最小的归档，请使用 `--only-config`。

import en from "/components/footer/en.mdx";

<en />
