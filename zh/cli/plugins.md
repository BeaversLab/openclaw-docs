---
summary: "`openclaw plugins` 的 CLI 参考（列表、安装、卸载、启用/禁用、诊断）"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 网关 插件/扩展（进程内加载）。

相关内容：

- 插件系统：[插件](/zh/tools/plugin)
- 插件清单 + 架构：[插件清单](/zh/plugins/manifest)
- 安全加固：[安全性](/zh/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
```

捆绑插件随 OpenClaw 一起提供，但默认处于禁用状态。使用 `plugins enable` 来
激活它们。

所有插件必须附带一个包含内联 JSON Schema 的 `openclaw.plugin.json` 文件
（`configSchema`，即使为空）。缺少或无效的清单或 schema 将
阻止插件加载，并导致配置验证失败。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

安全提示：请像运行代码一样对待插件安装。首选固定版本。

Npm 规范**仅限于注册表**（包名称 + 可选的**精确版本**或
**dist-tag**）。Git/URL/文件规范和 semver 范围将被拒绝。为了安全起见，依赖项
安装运行时使用 `--ignore-scripts`。

裸规范和 `@latest` 保持稳定版本轨道。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 会停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或精确的预发布版本（例如
`@1.2.3-beta.4`）明确选择加入。

如果裸安装规范匹配捆绑的插件 ID（例如 `diffs`），OpenClaw
将直接安装捆绑的插件。要安装同名 npm 包，请使用显式作用域规范（例如 `@scope/diffs`）。

支持的归档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

使用 `--link` 避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装上使用 `--pin` 将解析出的精确规范（`name@version`）保存在
`plugins.installs` 中，同时保持默认行为不受固定限制。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、插件允许列表以及适用的关联 `plugins.load.paths` 条目中移除插件记录。对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载也会移除活动状态目录扩展根目录 (`$OPENCLAW_STATE_DIR/extensions/<id>`) 下的插件安装目录。使用 `--keep-files` 可在磁盘上保留文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名受到支持。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新仅适用于从 npm 安装的插件（在 `plugins.installs` 中跟踪）。

当存在存储的完整性哈希且获取的工件哈希发生变化时，OpenClaw 会打印警告并在继续之前要求确认。使用全局 `--yes` 可在 CI/非交互式运行中跳过提示。

import zh from '/components/footer/zh.mdx';

<zh />
