---
summary: "`openclaw hooks` (agent hooks) 的 CLI 参考"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "hooks"
---

# `openclaw hooks`

管理 Agent Hook（针对 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

运行不带子命令的 `openclaw hooks` 相当于运行 `openclaw hooks list`。

相关内容：

- Hooks: [Hooks](/zh/automation/hooks)
- 插件 Hooks: [Plugin hooks](/zh/plugins/architecture#provider-runtime-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出工作区、受管、附加和捆绑目录中发现的所有 Hooks。

**选项：**

- `--eligible`: 仅显示符合条件的 Hooks（已满足要求）
- `--json`: 以 JSON 格式输出
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

显示不符合条件的 Hooks 的缺失要求。

**示例 (JSON)：**

```bash
openclaw hooks list --json
```

返回结构化 JSON 以便以编程方式使用。

## 获取 Hook 信息

```bash
openclaw hooks info <name>
```

显示关于特定 Hook 的详细信息。

**参数：**

- `<name>`: Hook 名称或 Hook 键（例如，`session-memory`）

**选项：**

- `--json`: 以 JSON 格式输出

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

显示 Hook 资格状态的摘要（有多少已准备就绪 vs 未准备就绪）。

**选项：**

- `--json`: 以 JSON 格式输出

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

通过将特定 Hook 添加到您的配置文件（默认为 `~/.openclaw/openclaw.json`）来启用它。

**注意：** 工作区 Hooks 默认处于禁用状态，直到在此处或配置文件中启用。由插件管理的 Hooks 在 `openclaw hooks list` 中显示为 `plugin:<id>`，无法在此处启用/禁用。请改为启用/禁用插件。

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

**执行的操作：**

- 检查 Hook 是否存在并符合资格
- 更新配置中的 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

如果 Hook 来自 `<workspace>/hooks/`，则 Gateway(网关) 加载它之前必须执行此选择加入步骤。

**启用后：**

- 重启网关以重新加载 Hooks（在 macOS 上重启菜单栏应用，或在开发环境中重启您的网关进程）。

## 禁用 Hook

```bash
openclaw hooks disable <name>
```

通过更新您的配置来禁用特定的 Hook。

**参数：**

- `<name>`: Hook 名称（例如，`command-logger`）

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

## 注意

- `openclaw hooks list --json`、`info --json` 和 `check --json` 会将结构化的 JSON 直接写入 stdout。
- 此处无法启用或禁用由插件管理的钩子；请改为启用或禁用所属插件。

## 安装钩子包

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

通过统一的插件安装程序安装钩子包。

`openclaw hooks install` 仍可作为兼容性别名使用，但它会打印弃用警告并转发到 `openclaw plugins install`。

Npm 规范是**仅限注册表**的（包名称 + 可选的**确切版本**或**分发标签**）。会拒绝 Git/URL/文件规范和 semver 范围。依赖安装出于安全考虑会以 `--ignore-scripts` 运行。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 将停止并要求您通过预发布标签（如 `@beta`/`@rc`）或确切的预发布版本明确选择加入。

**作用：**

- 将钩子包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 下记录安装

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：在 `hooks.internal.installs` 中将 npm 安装记录为确切解析的 `name@version`

**支持的归档：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

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

链接的钩子包被视为来自操作员配置目录的托管钩子，而不是工作区钩子。

## 更新钩子包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新程序更新已跟踪的基于 npm 的钩子包。

`openclaw hooks update` 仍可作为兼容性别名使用，但它会打印弃用警告并转发到 `openclaw plugins update`。

**选项：**

- `--all`：更新所有已跟踪的钩子包
- `--dry-run`：显示将要更改的内容而不实际写入

当存在存储的完整性哈希且获取的构件哈希发生变化时，OpenClaw 会打印警告并在继续之前请求确认。使用全局 `--yes` 以在 CI/非交互式运行中绕过提示。

## 内置 Hooks

### 会话-memory

当您发出 `/new` 或 `/reset` 时，将会话上下文保存到内存。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [会话-memory 文档](/zh/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [bootstrap-extra-files 文档](/zh/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到中心审计文件中。

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

**参见：** [command-logger 文档](/zh/automation/hooks#command-logger)

### boot-md

当网关启动时（在通道启动之后）运行 `BOOT.md`。

**事件**： `gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/zh/automation/hooks#boot-md)
