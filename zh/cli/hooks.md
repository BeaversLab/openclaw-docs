---
summary: "`openclaw hooks`（agent hooks）的 CLI 参考"
read_when:
  - You want to manage agent hooks
  - You want to install or update hooks
title: "hooks"
---

# `openclaw hooks`

管理 agent hooks（针对 `/new`、`/reset` 和 网关启动 等命令的事件驱动自动化）。

相关：

- Hooks: [Hooks](/zh/en/automation/hooks)
- 插件 hooks: [Plugins](/zh/en/tools/plugin#plugin-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出从工作区、托管和捆绑目录中发现的所有 hooks。

**选项：**

- `--eligible`: 仅显示符合条件的 hooks（已满足要求）
- `--json`: 以 JSON 格式输出
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

- `<name>`: Hook 名称（例如 `session-memory`）

**选项：**

- `--json`: 以 JSON 格式输出

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

通过将其添加到您的配置中来启用特定的 hook (`~/.openclaw/config.json`)。

**注意：** 由插件管理的 hooks 在 `openclaw hooks list` 中显示为 `plugin:<id>`，
无法在此处启用/禁用。请改为启用/禁用插件。

**参数：**

- `<name>`: Hook 名称（例如 `session-memory`）

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

- `<name>`: Hook 名称（例如 `command-logger`）

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

Npm 规范仅限于**注册表**（包名称 + 可选的**确切版本**或
**dist-tag**）。拒绝 Git/URL/文件规范和语义化版本范围。为了安全起见，依赖项安装运行时带有 `--ignore-scripts`。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您明确选择加入，方法是使用预发布标签，如 `@beta`/`@rc` 或确切的预发布版本。

**功能：**

- 将 hook 包复制到 `~/.openclaw/hooks/<id>` 中
- 在 `hooks.internal.entries.*` 中启用已安装的 hooks
- 在 `hooks.internal.installs` 下记录安装

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装记录为 `hooks.internal.installs` 中确切解析的 `name@version`

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

- `--all`：更新所有跟踪的 hook 包
- `--dry-run`：显示将要更改的内容而不进行写入

当存在存储的完整性哈希且获取的工件哈希发生变化时，
OpenClaw 会打印警告并在继续之前请求确认。使用
全局 `--yes` 在 CI/非交互式运行中绕过提示。

## 内置 Hooks

### session-memory

当您发出 `/new` 时，将会话上下文保存到内存中。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [session-memory 文档](/zh/en/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [bootstrap-extra-files 文档](/zh/en/automation/hooks#bootstrap-extra-files)

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

**参见：** [command-logger 文档](/zh/en/automation/hooks#command-logger)

### boot-md

当网关启动时（在通道启动之后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/zh/en/automation/hooks#boot-md)

import zh from '/components/footer/zh.mdx';

<zh />
