---
summary: "`openclaw hooks` 的 CLI 参考（agent hooks）"
read_when:
  - 你想管理 agent hooks
  - 你想安装或更新 hooks
title: "hooks"
---

# `openclaw hooks`

管理 agent hooks（针对 `/new`、`/reset`、gateway 启动等命令的事件驱动自动化）。

相关：

- Hooks：[钩子](/zh/hooks)
- 插件 hooks：[插件](/zh/plugin#plugin-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出工作区、managed 与 bundled 目录中发现的所有 hooks。

**选项：**

- `--eligible`：仅显示满足要求的 hooks
- `--json`：JSON 输出
- `-v, --verbose`：显示更详细信息（含缺失的要求）

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
  😈 soul-evil ✓ - Swap injected SOUL content during a purge window or by random chance
```

**示例（详细）：**

```bash
openclaw hooks list --verbose
```

会显示未满足要求的 hooks 及其缺失项。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON，便于程序处理。

## 查看 Hook 信息

```bash
openclaw hooks info <name>
```

显示指定 hook 的详细信息。

**参数：**

- `<name>`：Hook 名称（如 `session-memory`）

**选项：**

- `--json`：JSON 输出

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
  Homepage: https://docs.openclaw.ai/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## 检查 Hook 可用性

```bash
openclaw hooks check
```

显示 hook 可用性摘要（就绪 vs 未就绪）。

**选项：**

- `--json`：JSON 输出

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

通过修改配置（`~/.openclaw/config.json`）启用指定 hook。

**注意：** 插件管理的 hooks 在 `openclaw hooks list` 中会显示 `plugin:<id>`，
不能在这里启用/禁用，请改为启用/禁用插件。

**参数：**

- `<name>`：Hook 名称（如 `session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ Enabled hook: 💾 session-memory
```

**行为：**

- 检查 hook 是否存在且可用
- 更新 `hooks.internal.entries.<name>.enabled = true`
- 保存配置到磁盘

**启用后：**

- 重启 gateway 以重新加载 hooks（macOS 菜单栏 app 重启，或在 dev 中重启 gateway 进程）。

## 禁用 Hook

```bash
openclaw hooks disable <name>
```

通过更新配置禁用指定 hook。

**参数：**

- `<name>`：Hook 名称（如 `command-logger`）

**示例：**

```bash
openclaw hooks disable command-logger
```

**输出：**

```
⏸ Disabled hook: 📝 command-logger
```

**禁用后：**

- 重启 gateway 以重新加载 hooks

## 安装 Hooks

```bash
openclaw hooks install <path-or-spec>
```

从本地目录/压缩包或 npm 安装 hook pack。

**行为：**

- 将 hook pack 复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装 hooks
- 在 `hooks.internal.installs` 中记录安装信息

**选项：**

- `-l, --link`：链接本地目录而非复制（添加到 `hooks.internal.load.extraDirs`）

**支持的压缩包：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# 本地目录
openclaw hooks install ./my-hook-pack

# 本地压缩包
openclaw hooks install ./my-hook-pack.zip

# NPM 包
openclaw hooks install @openclaw/my-hook-pack

# 链接本地目录（不复制）
openclaw hooks install -l ./my-hook-pack
```

## 更新 Hooks

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

更新已安装的 hook packs（仅 npm 安装）。

**选项：**

- `--all`：更新所有已跟踪 hook packs
- `--dry-run`：仅展示变更，不写入

## Bundled Hooks

### session-memory

当你执行 `/new` 时保存会话上下文到 memory。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [session-memory 文档](/zh/hooks#session-memory)

### command-logger

记录所有命令事件到集中审计文件。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# 最近命令
tail -n 20 ~/.openclaw/logs/commands.log

# 美化输出
cat ~/.openclaw/logs/commands.log | jq .

# 按 action 过滤
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**参见：** [command-logger 文档](/zh/hooks#command-logger)

### soul-evil

在 purge 窗口或随机时机用 `SOUL_EVIL.md` 替换注入的 `SOUL.md` 内容。

**启用：**

```bash
openclaw hooks enable soul-evil
```

**参见：** [SOUL Evil Hook](/zh/hooks/soul-evil)

### boot-md

在 gateway 启动后（channels 启动完成）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/zh/hooks#boot-md)
