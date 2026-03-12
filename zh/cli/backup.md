---
summary: “`openclaw backup`（创建本地备份归档）的 CLI 参考”
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: “backup”
---

# `openclaw backup`

为 OpenClaw 状态、配置、凭据、会话以及可选的工作区创建本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 注意事项

- 归档包含一个 `manifest.json` 文件，其中包含已解析的源路径和归档布局。
- 默认输出为当前工作目录中带有时间戳的 `.tar.gz` 归档文件。
- 如果当前工作目录位于被备份的源树内，OpenClaw 将回退到您的主目录作为默认归档位置。
- 现有的归档文件永远不会被覆盖。
- 为避免自我包含，源状态/工作区树内部的输出路径将被拒绝。
- `openclaw backup verify <archive>` 会验证归档仅包含一个根清单，拒绝遍历样式的归档路径，并检查清单中声明的每个有效载荷是否存在于 tarball 中。
- `openclaw backup create --verify` 会在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 仅备份活动的 JSON 配置文件。

## 备份内容

`openclaw backup create` 从您的本地 OpenClaw 安装规划备份源：

- 由 OpenClaw 本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 活动配置文件路径
- OAuth / 凭据目录
- 从当前配置中发现的工作区目录，除非您传递了 `--no-include-workspace`

如果您使用 `--only-config`，OpenClaw 将跳过状态、凭据和工作区发现，仅归档活动配置文件路径。

OpenClaw 会在构建归档之前规范化路径。如果配置、凭据或工作区已经位于状态目录内，它们将不会作为单独的顶级备份源重复备份。缺失的路径将被跳过。

归档有效负载存储来自这些源树的文件内容，而嵌入的 `manifest.json` 记录已解析的绝对源路径以及用于每个资产的归档布局。

## 无效配置行为

`openclaw backup` 故意绕过正常的配置预检，以便在恢复期间仍能提供帮助。由于工作区发现依赖于有效的配置，因此当配置文件存在但无效且仍启用了工作区备份时，`openclaw backup create` 现在会快速失败。

如果您在这种情况下仍想要部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这将把状态、配置和凭据保持在范围内，同时完全跳过工作区发现。

如果您只需要配置文件本身的副本，`--only-config` 在配置格式错误时也能工作，因为它不依赖于解析配置来进行工作区发现。

## 大小和性能

OpenClaw 不强制执行内置的最大备份大小或单文件大小限制。

实际限制取决于本地计算机和目标文件系统：

- 用于临时归档写入加上最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果您使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径的文件系统行为。OpenClaw 首选无覆盖的硬链接发布步骤，当不支持硬链接时回退到独占复制

大型工作区通常是归档大小的主要驱动因素。如果您希望备份更小或更快，请使用 `--no-include-workspace`。

要获得最小的归档，请使用 `--only-config`。
