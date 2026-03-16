---
summary: "`openclaw hooks` (agent hooks) 的 CLI 参考"
read_when:
  - You want to manage agent hooks
  - You want to install or update hooks
title: "hooks"
---

# `openclaw hooks`

管理 Agent Hook（针对 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

相关：

- Hooks：[Hooks](/en/automation/hooks)
- 插件挂钩：[Plugins](/en/tools/plugin#plugin-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出从工作区、托管和捆绑目录中发现的所有 hooks。

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
  💾 session-memory ✓ - Save session context to memory when /new command is issued
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

Save session context to memory when /new command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new

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

**注意：**由插件管理的 Hook 在 `openclaw hooks list` 中显示为 `plugin:<id>`，
并且无法在此处启用/禁用。请改为启用/禁用该插件。

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

**启用后：**

- 重启网关以重新加载 hooks（在 macOS 上重启菜单栏应用程序，或在开发环境中重启您的网关进程）。

## 禁用 Hook

```bash
openclaw hooks disable <name>
```

通过更新您的配置来禁用特定的 hook。

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

- 重启网关以重新加载 hooks

## 安装 Hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

从本地文件夹/存档或 npm 安装 hook 包。

Npm 规范仅限 **registry**（包名称 + 可选的 **exact version** 或
**dist-tag**）。不接受 Git/URL/file 规范和 semver 范围。出于安全考虑，
依赖项安装使用 `--ignore-scripts` 运行。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 将停止并要求您通过预发布标签（例如 `@beta`/`@rc`）
或精确的预发布版本来显式选择加入。

**功能：**

- 将 Hook 包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的 Hook
- 将安装记录在 `hooks.internal.installs` 下

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装记录为 `hooks.internal.installs` 中精确解析的 `name@version`

**支持的归档格式：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# Local directory
openclaw hooks install ./my-hook-pack

# Local archive
openclaw hooks install ./my-hook-pack.zip

# NPM package
openclaw hooks install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw hooks install -l ./my-hook-pack
```

## 更新 Hooks

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

更新已安装的 hook 包（仅限 npm 安装）。

**选项：**

- `--all`：更新所有已跟踪的 hook 包
- `--dry-run`：显示将要更改的内容而不进行实际写入

当存储的完整性哈希存在且获取的工件哈希发生变化时，OpenClaw 会打印警告并在继续之前请求确认。在 CI/非交互式运行中，使用全局 `--yes` 来绕过这些提示。

## 内置 Hooks

### 会话-memory

当您发出 `/new` 时，将会话上下文保存到内存中。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**请参阅：** [会话-memory 文档](/en/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**请参阅：** [bootstrap-extra-files 文档](/en/automation/hooks#bootstrap-extra-files)

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

**请参阅：** [command-logger 文档](/en/automation/hooks#command-logger)

### boot-md

当网关启动时（在频道启动之后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**请参阅：** [boot-md 文档](/en/automation/hooks#boot-md)

import zh from "/components/footer/zh.mdx";

<zh />
