---
summary: "OpenClaw安装、列出、卸载、更新和发布 OpenClaw 插件的快速示例"
read_when:
  - You want quick plugin install, list, update, or uninstall examples
  - You want to choose between ClawHub and npm plugin distribution
  - You are publishing a plugin package
title: "管理插件"
sidebarTitle: "管理插件"
---

大多数插件工作流只需几条命令：搜索、安装、重启 Gateway(网关)、
验证，以及在不再需要插件时将其卸载。

## 列出插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

对脚本请使用 `--json`。它包括注册表诊断，以及当插件包声明 `dependencies` 或
`optionalDependencies` 时每个插件的
静态 `dependencyStatus`。

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list`OpenClawGateway(网关) 是一种冷清单检查。它显示 OpenClaw 可以从配置、清单和插件注册表中
发现的内容；它不能证明正在运行的 Gateway(网关) 进程已导入插件运行时。

## 安装插件

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Bare package specs try ClawHub first, then npm fallback.
openclaw plugins install <package>

# Force one source.
openclaw plugins install clawhub:<package>
openclaw plugins install npm:<package>

# Install a specific version or dist-tag.
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

安装插件代码后，请重启为您的通道提供服务的 Gateway(网关)：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

当您需要证明插件已注册运行时表面（如工具、挂钩、服务、Gateway(网关) 方法或插件拥有的 CLI
命令）时，请使用 `inspect --runtime`Gateway(网关)CLI。

## 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
```

如果插件是从 npm dist-tag（例如 npm`@beta`）安装的，随后的
`update <plugin-id>`npm 调用将重复使用该记录的标签。传递显式的 npm 规范会将
跟踪的安装切换到该规范，以便将来更新。

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

第二条命令将插件移回注册表的默认发布行，
前提是之前将其固定到了确切的版本或标签。

当 `openclaw update`npmClawHub 在 beta 渠道上运行时，默认版本的 npm 和 ClawHub
插件记录会首先尝试匹配的插件 `@beta`OpenClawnpmOpenClaw 版本。如果该 beta
版本不存在，OpenClaw 将回退到记录的默认/最新规范。
对于 npm 插件，当 beta 包存在但安装验证失败时，OpenClaw
也会回退。精确版本和显式标签（如 `@rc` 或 `@beta`）
将被保留。

## 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
openclaw gateway restart
```

卸载操作会移除插件的配置条目、插件索引记录、允许/拒绝列表
条目（如适用）以及关联的加载路径。除非您传递 `--keep-files`，否则
托管的安装目录将被移除。

在 Nix 模式（Nix`OPENCLAW_NIX_MODE=1`Nix）下，插件的安装、更新、卸载、启用
和禁用命令将被禁用。请改为在用于安装的 Nix 源中管理这些选项；
对于 nix-openclaw，请使用代理优先的
[快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。

## 发布插件

您可以将外部插件发布到 [ClawHub](ClawHubhttps://clawhub.ai)、npmjs.com，或
两者兼有。

### 发布到 ClawHub

ClawHub 是 OpenClaw 插件的主要公共发现平台。它在安装前
为用户提供可搜索的元数据、版本历史记录和注册表扫描结果。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

用户使用以下命令从 ClawHub 安装：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins install <package>
```

简写形式仍然会首先检查 ClawHub。

### 发布到 npmjs.com

原生 npm 插件必须包含插件清单和 npm`package.json`OpenClaw OpenClaw
入口点元数据。

```json package.json
{
  "name": "@acme/openclaw-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

```bash
npm publish --access public
```

用户使用以下命令仅从 npm 安装：

```bash
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

如果同一软件包也在 ClawHub 上可用，ClawHub`npm:`ClawHubnpm 将跳过 ClawHub 查找并
强制使用 npm 解析。

## 源选择

- **ClawHub**：当您想要 OpenClaw 原生发现、扫描摘要、版本和安装提示时使用。
- **npmjs.com**：当您已经发布 JavaScript 包或需要 npm dist-tags/私有注册表工作流时使用。
- **Git**：当您想直接从分支、标签或提交安装时使用。
- **本地路径**：当您在同一台机器上开发或测试插件时使用。

## 相关

- [插件](/zh/tools/plugin) - 概述和故障排除
- [`openclaw plugins`](/zh/cli/plugins) - 完整的 CLI 参考
- [ClawHub](/zh/clawhub/cli) - 发布和注册表操作
- [构建插件](/zh/plugins/building-plugins) - 创建插件包
- [插件清单](/zh/plugins/manifest) - 清单和包元数据
