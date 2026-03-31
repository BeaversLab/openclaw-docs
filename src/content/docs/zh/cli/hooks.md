---
summary: "`openclaw hooks` (agent hooks) 的 CLI 参考"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "hooks"
---

# `openclaw hooks`

管理 Agent Hook（针对 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

相关：

- 钩子：[Hooks](/en/automation/hooks)
- 插件钩子：[Plugin hooks](/en/plugins/architecture#provider-runtime-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出从工作区、托管、附加和捆绑目录中发现的所有钩子。

**选项：**

- `--eligible`: 仅显示符合资格的 Hook（满足要求）
- `--json`: 输出为 JSON
- `-v, --verbose`: 显示详细信息，包括缺失的要求

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**示例（详细模式）：**

```bash
openclaw hooks list --verbose
```

显示不符合条件的 hooks 的缺失要求。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON 供程序化使用。

## 获取 Hook 信息

```bash
openclaw hooks info <name>
```

显示特定 hook 的详细信息。

**参数：**

- `<name>`: Hook 名称（例如，`session-memory`）

**选项：**

- `--json`: 输出为 JSON

**示例：**

```bash
openclaw hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## 检查 Hooks 资格

```bash
openclaw hooks check
```

显示 hook 资格状态的摘要（有多少已准备就绪，有多少未准备就绪）。

**选项：**

- `--json`: 输出为 JSON

**示例输出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 启用 Hook

```bash
openclaw hooks enable <name>
```

通过将其添加到配置中（`~/.openclaw/config.json`）来启用特定的 Hook。

**注意：**工作区钩子默认处于禁用状态，直到在此处或在配置中启用。由插件管理的钩子在 `openclaw hooks list` 中显示 `plugin:<id>`，并且无法在此处启用/禁用。请改为启用/禁用插件。

**参数：**

- `<name>`: Hook 名称（例如，`session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ Enabled hook: 💾 session-memory
```

**它的作用：**

- 检查 hook 是否存在且符合条件
- 更新配置中的 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

如果钩子来自 `<workspace>/hooks/`，则必须在 Gateway(网关) 加载它之前执行此选择加入步骤。

**启用后：**

- 重启网关以便重新加载钩子（在 macOS 上重启菜单栏应用程序，或在开发环境中重启网关进程）。

## 禁用钩子

```bash
openclaw hooks disable <name>
```

通过更新配置来禁用特定的钩子。

**参数：**

- `<name>`：钩子名称（例如，`command-logger`）

**示例：**

```bash
openclaw hooks disable command-logger
```

**输出：**

```
⏸ Disabled hook: 📝 command-logger
```

**禁用后：**

- 重启网关以便重新加载钩子

## 安装钩子包

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

通过统一的插件安装程序安装钩子包。

`openclaw hooks install` 作为兼容性别名仍然有效，但它会打印弃用警告并转发给 `openclaw plugins install`。

Npm 规范仅限 **registry-only**（包名称 + 可选的 **精确版本** 或 **dist-tag**）。拒绝 Git/URL/文件规范和 semver 范围。依赖安装运行 `--ignore-scripts` 以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 将停止并要求您使用预发布标记（例如 `@beta`/`@rc`）或精确的预发布版本明确选择加入。

**功能说明：**

- 将钩子包复制到 `~/.openclaw/hooks/<id>` 中
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 下记录安装信息

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装记录为 `hooks.internal.installs` 中已解析的精确 `name@version`

**支持的归档格式：** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**示例：**

```bash
# Local directory
openclaw plugins install ./my-hook-pack

# Local archive
openclaw plugins install ./my-hook-pack.zip

# NPM package
openclaw plugins install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw plugins install -l ./my-hook-pack
```

链接的 hook 包被视为来自操作员配置目录的托管 hook，而不是工作区 hook。

## 更新 Hook 包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新器更新跟踪的基于 npm 的 hook 包。

`openclaw hooks update` 仍作为兼容性别名工作，但它会打印弃用警告并转发到 `openclaw plugins update`。

**选项：**

- `--all`：更新所有已跟踪的 hook 包
- `--dry-run`：显示将要更改的内容而不进行写入

当存在存储的完整性哈希值且获取的构件哈希值发生变化时，OpenClaw 会打印警告并要求在继续前进行确认。在 CI/非交互式运行中使用全局 `--yes` 以绕过提示。

## 内置 Hooks

### 会话内存 (会话-memory)

当您发出 `/new` 或 `/reset` 时，将会话上下文保存到内存中。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [会话内存 (会话-memory) 文档](/en/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [bootstrap-extra-files 文档](/en/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到集中式审计文件中。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**参见：** [command-logger 文档](/en/automation/hooks#command-logger)

### boot-md

当网关启动时（通道启动后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/en/automation/hooks#boot-md)
