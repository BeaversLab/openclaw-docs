---
summary: "CLI 参考，用于 `openclaw backup`（创建本地备份档案）"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "备份"
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

在创建归档时，OpenClaw 会跳过已知的且不具备恢复价值的实时变异文件，包括活跃代理会话记录、cron 运行日志、滚动日志、传递队列、状态目录下的 socket/pid/临时文件以及相关的持久化队列临时文件。JSON 结果包含 OpenClaw`skippedVolatileCount`，以便自动化工具可以看到有意省略了多少文件。

状态目录下 `extensions/` 树中已安装的插件源文件和清单文件包含在内，但其嵌套的 `node_modules/` 依赖树会被跳过。这些依赖项是可重新构建的安装产物；在恢复归档后，如果恢复的插件报告缺少依赖项，请使用 `openclaw plugins update <id>` 或使用 `openclaw plugins install <spec> --force` 重新安装插件。

## 无效配置行为

`openclaw backup` 故意绕过正常的配置预检查，以便在恢复期间仍能提供帮助。由于工作区发现依赖于有效的配置，因此当配置文件存在但无效且工作区备份仍处于启用状态时，`openclaw backup create` 现在会快速失败。

如果您在这种情况下仍希望进行部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这将保持状态、配置和外部凭证目录在范围内，同时完全跳过工作区发现。

如果您只需要配置文件本身的副本，`--only-config` 在配置格式错误时也有效，因为它不依赖于解析配置来进行工作区发现。

## 大小和性能

OpenClaw 不强制执行内置的最大备份大小或单文件大小限制。

实际限制取决于本地计算机和目标文件系统：

- 用于临时归档写入加上最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果您使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径上的文件系统行为。OpenClaw 优先使用不覆盖的硬链接发布步骤，并在不支持硬链接时回退到独占复制

大型工作区通常是归档大小的主要驱动因素。如果您希望备份更小或更快，请使用 `--no-include-workspace`。

要获得最小的归档，请使用 `--only-config`。

## 相关

- [CLI 参考](CLI/en/cli)
