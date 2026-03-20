---
summary: "CLI 参考，用于 `openclaw hooks` (agent hooks)"
read_when:
  - 您想要管理 agent hooks
  - 您想要安装或更新 hooks
title: "hooks"
---

# `openclaw hooks`

管理 agent hooks（针对 `/new`、`/reset` 等命令以及网关启动的事件驱动自动化）。

相关：

- Hooks: [Hooks](/zh/automation/hooks)
- Plugin hooks: [Plugins](/zh/tools/plugin#plugin-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出从工作区、托管目录和捆绑目录中发现的所有 hooks。

**选项：**

- `--eligible`: 仅显示符合条件的 hooks（满足要求）
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

**示例 (JSON)：**

```bash
openclaw hooks list --json
```

返回用于程序化使用的结构化 JSON。

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

显示 hook 资格状态的摘要（有多少已准备就绪与未就绪）。

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

通过将其添加到您的配置 (`~/.openclaw/config.json`) 来启用特定的 hook。

**注意：** 由插件管理的 hooks 在 `openclaw hooks list` 中显示为 `plugin:<id>`，并且
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

**执行的操作：**

- 检查 hook 是否存在以及是否符合条件
- 更新您的配置中的 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

**启用后：**

- 重启网关以重新加载 hooks（在 macOS 上重启菜单栏应用，或在开发环境中重启您的网关进程）。

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

- 重启网关以便重新加载 hooks

## 安装 Hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

从本地文件夹/归档文件或 npm 安装 hook 包。

Npm 规范**仅限注册表**（包名称 + 可选的**精确版本**或
**dist-tag**）。Git/URL/文件规范和 semver 范围将被拒绝。依赖项
安装运行 `--ignore-scripts` 以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 将停止并要求您使用
预发布标签（例如 `@beta`/`@rc`）或精确的预发布版本显式选择加入。

**作用：**

- 将 hook 包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的 hooks
- 在 `hooks.internal.installs` 下记录安装

**选项：**

- `-l, --link`: 链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`: 将 npm 安装记录为 `hooks.internal.installs` 中已解析的确切 `name@version`

**支持的归档文件：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

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

- `--all`: 更新所有已跟踪的 hook 包
- `--dry-run`: 显示将会更改的内容而不进行写入

当存在存储的完整性哈希值且获取的工件哈希值发生变化时，
OpenClaw 会打印警告并在继续之前要求确认。请使用
全局 `--yes` 在 CI/非交互式运行中绕过提示。

## 捆绑的 Hooks

### 会话-memory

当您发出 `/new` 时，将会话上下文保存到内存。

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

将所有命令事件记录到集中的审计文件中。

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

在网关启动时（通道启动后）运行 `BOOT.md`。

**事件**： `gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/zh/automation/hooks#boot-md)

import en from "/components/footer/en.mdx";

<en />
