---
summary: "`openclaw plugins` 的 CLI 参考（list、install、enable/disable、doctor）"
read_when:
  - 需要安装或管理进程内 Gateway 插件
  - 需要排查插件加载失败
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 插件/扩展（进程内加载）。

相关：

- 插件系统：[Plugins](/zh/plugin)
- 插件清单 + schema：[Plugin manifest](/zh/plugins/manifest)
- 安全加固：[Security](/zh/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
```

内置插件随 OpenClaw 一起提供，但默认禁用。使用 `plugins enable` 激活。

所有插件必须包含 `openclaw.plugin.json` 文件，并内嵌 JSON Schema
（`configSchema`，即使为空）。缺失/无效的清单或 schema 会阻止插件加载，
并导致配置校验失败。

### 安装

```bash
openclaw plugins install <path-or-spec>
```

安全说明：插件安装相当于运行代码。建议使用固定版本。

支持的归档：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

使用 `--link` 可避免复制本地目录（写入 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新仅适用于从 npm 安装的插件（记录于 `plugins.installs`）。
