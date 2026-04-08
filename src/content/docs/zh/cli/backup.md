---
summary: "CLI 参考，用于 `openclaw backup`（创建本地备份档案）"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `openclaw backup`

为 OpenClaw 状态、配置、身份验证配置文件、渠道/提供商凭据、会话以及可选的工作区创建本地备份归档。

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

- 该档案包含一个 `manifest.json` 文件，其中包含已解析的源路径和档案布局。
- 默认输出是当前工作目录中带有时间戳的 `.tar.gz` 档案。
- 如果当前工作目录位于被备份的源树内，OpenClaw 将回退到您的主目录作为默认归档位置。
- 现有的归档文件永远不会被覆盖。
- 为避免自我包含，源状态/工作区树内部的输出路径将被拒绝。
- `openclaw backup verify <archive>` 验证档案仅包含一个根清单，拒绝遍历式档案路径，并检查清单中声明的每个负载是否存在于 tarball 中。
- `openclaw backup create --verify` 在写入档案后立即运行该验证。
- `openclaw backup create --only-config` 仅备份活动的 JSON 配置文件。

## 备份内容

`openclaw backup create` 计划来自本地 OpenClaw 安装的备份源：

- 由 OpenClaw 的本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 活动配置文件路径
- 当解析出的 `credentials/` 目录存在于状态目录之外时
- 从当前配置中发现的工作区目录，除非您传递了 `--no-include-workspace`

模型身份验证配置文件已经是 `agents/<agentId>/agent/auth-profiles.json` 下状态目录的一部分，因此它们通常包含在
状态备份条目中。

如果您使用 `--only-config`，OpenClaw 将跳过状态、凭据目录和工作区发现，仅归档活动的配置文件路径。

OpenClaw 在构建归档之前会规范化路径。如果配置、
凭据目录或工作区已经位于状态目录内，
它们将不会作为单独的顶级备份源被重复。缺失的路径将被
跳过。

归档有效负载存储来自这些源树的文件内容，并且嵌入的 `manifest.json` 记录了解析出的绝对源路径以及用于每个资产的归档布局。

## 无效配置行为

`openclaw backup` 故意绕过正常的配置预检，以便在恢复期间仍能提供帮助。由于工作区发现依赖于有效的配置，当配置文件存在但无效且工作区备份仍处于启用状态时，`openclaw backup create` 现在会快速失败。

如果您在这种情况下仍希望进行部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这会将状态、配置和外部凭据目录保留在范围内，同时
完全跳过工作区发现。

如果您只需要配置文件本身的副本，即使配置格式错误，`--only-config` 也能工作，因为它不依赖于解析配置来进行工作区发现。

## 大小和性能

OpenClaw 不强制执行内置的最大备份大小或单文件大小限制。

实际限制来自本地计算机和目标文件系统：

- 用于临时归档写入加上最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果您使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径的文件系统行为。OpenClaw 优先采用不覆盖的硬链接发布步骤，并在不支持硬链接时回退到独占复制

大型工作区通常是存档大小的主要驱动因素。如果您希望备份更小或更快，请使用 `--no-include-workspace`。

要获得最小的存档，请使用 `--only-config`。
