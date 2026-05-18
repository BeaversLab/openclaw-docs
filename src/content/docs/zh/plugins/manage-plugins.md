---
summary: "OpenClaw列出、安装、更新、检查和卸载 OpenClaw 插件的快速示例"
read_when:
  - You want quick plugin list, install, update, inspect, or uninstall examples
  - You want to choose a plugin install source
  - You want the right reference for publishing plugin packages
title: "管理插件"
sidebarTitle: "管理插件"
doc-schema-version: 1
---

使用此页面获取常用的插件管理命令。有关详尽的命令约定、标志、源选择规则和边缘情况，请参阅[`openclaw plugins`](/zh/cli/plugins)。

大多数安装工作流程如下：

1. 查找软件包
2. 从 ClawHub、npm、git 或本地路径安装它
3. 让受管 Gateway(网关) 自动重启，或者在非受管时手动重启
4. 验证插件的运行时注册

## 列出并搜索插件

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search "calendar"
```

在脚本中使用 `--json`：

```bash
openclaw plugins list --json \
  | jq '.plugins[] | {id, enabled, format, source, dependencyStatus}'
```

`plugins list`OpenClawGateway(网关) 是冷库存检查。它显示 OpenClaw 可以从配置、清单和插件注册表中发现的内容；它不能证明正在运行的 Gateway(网关) 已导入插件运行时。当插件包声明 `dependencies` 或 `optionalDependencies` 时，JSON 输出包括注册表诊断和每个插件的静态 `dependencyStatus`。

`plugins search`ClawHub 查询 ClawHub 以获取可安装的插件包，并打印安装提示，例如 `openclaw plugins install clawhub:<package>`。

## 安装插件

```bash
# Search ClawHub for plugin packages.
openclaw plugins search "calendar"

# Install from ClawHub.
openclaw plugins install clawhub:<package>
openclaw plugins install clawhub:<package>@1.2.3
openclaw plugins install clawhub:<package>@beta

# Install from npm.
openclaw plugins install npm:<package>
openclaw plugins install npm:@scope/openclaw-plugin@1.2.3
openclaw plugins install npm:@openclaw/codex

# Install from a local npm pack artifact.
openclaw plugins install npm-pack:<path.tgz>

# Install from git or a local development checkout.
openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0
openclaw plugins install ./my-plugin
openclaw plugins install --link ./my-plugin
```

裸软件包规范在启动切换期间从 npm 安装。当您需要确定性的源选择时，请使用 npm`clawhub:`、`npm:`、`git:` 或 `npm-pack:`OpenClaw。如果裸名称与官方插件 ID 匹配，OpenClaw 可以直接安装目录条目。

仅当您有意要覆盖现有安装目标时才使用 `--force`npmClawHub。对于已跟踪的 npm、ClawHub 或 hook-pack 安装的常规升级，请使用 `openclaw plugins update`。

## 重启并检查

在安装、更新或卸载插件代码后，启用了配置重载的运行中受管 Gateway(网关) 会自动重启。如果 Gateway(网关) 不受管或已禁用重载，请在检查实时运行时表面之前自行重启它：

```bash
openclaw gateway restart
openclaw plugins inspect <plugin-id> --runtime --json
```

当您需要证明插件已注册运行时表面（如工具、钩子、服务、Gateway(网关) 方法、HTTP 路由或插件拥有的 CLI 命令）时，请使用 `inspect --runtime`Gateway(网关)CLI。普通的 `inspect` 和 `list` 是冷清单、配置和注册表检查。

## 更新插件

```bash
openclaw plugins update <plugin-id>
openclaw plugins update <npm-package-or-spec>
openclaw plugins update --all
openclaw plugins update <plugin-id> --dry-run
```

当您传递插件 id 时，OpenClaw 会重用跟踪的安装规范。存储的 dist-tags（例如 OpenClaw`@beta`）和精确的固定版本将在后续 `update <plugin-id>` 运行中继续使用。

对于 npm 安装，您可以传递显式的包规范来切换跟踪的记录：

```bash
openclaw plugins update @scope/openclaw-plugin@beta
openclaw plugins update @scope/openclaw-plugin
```

当之前将插件固定到精确版本或标签时，第二条命令会将插件移回注册表的默认发布线。

当 `openclaw update` 在 beta 渠道上运行时，插件记录可以优先匹配 `@beta` 版本。有关确切的回退和固定规则，请参阅 [`openclaw plugins`](/zh/cli/plugins#update)。

## 卸载插件

```bash
openclaw plugins uninstall <plugin-id> --dry-run
openclaw plugins uninstall <plugin-id>
openclaw plugins uninstall <plugin-id> --keep-files
```

卸载会移除插件的配置条目、持久化插件索引记录、允许/拒绝列表条目以及相关的加载路径（如适用）。除非您传递 `--keep-files`Gateway(网关)，否则受管安装目录将被移除。当卸载更改插件源时，运行中的受管 Gateway(网关) 会自动重启。

在 Nix 模式 (Nix`OPENCLAW_NIX_MODE=1`Nix) 下，插件安装、更新、卸载、启用和禁用命令被禁用。请在 Nix 源中管理这些安装选项。

## 选择源

| 源          | 何时使用                                                  | 示例                                                           |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | 您需要 OpenClaw 原生发现、扫描摘要、版本和提示            | `openclaw plugins install clawhub:<package>`                   |
| npmjs.com   | 您已经发布 JavaScript 包或者需要 npm dist-tags/私有注册表 | `openclaw plugins install npm:@acme/openclaw-plugin`           |
| git         | 您想要来自仓库的分支、标签或提交                          | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径    | 您正在同一台机器上开发或测试插件                          | `openclaw plugins install --link ./my-plugin`                  |
| npm pack    | 您正在通过 npm install 语义提供本地包工件                 | `openclaw plugins install npm-pack:<path.tgz>`                 |
| marketplace | 您正在安装 Claude 兼容的 marketplace 插件                 | `openclaw plugins install <plugin> --marketplace <source>`     |

## 发布插件

ClawHub 是 OpenClaw 插件的主要公开发现平台。当您希望用户在安装之前找到插件元数据、版本历史、注册表扫描结果和安装提示时，请在此发布。

```bash
npm i -g clawhub
clawhub login
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

原生 npm 插件在发布之前必须包含插件清单和包元数据：

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
openclaw plugins install npm:@acme/openclaw-plugin
openclaw plugins install npm:@acme/openclaw-plugin@beta
openclaw plugins install npm:@acme/openclaw-plugin@1.0.0
```

请使用这些页面查看完整的发布约定，而不是将此页面作为发布参考：

- [ClawHub 发布](/zh/clawhub/publishing) 解释了所有者、作用域、发布版本、审查、包验证和包转移。
- [构建插件](/zh/plugins/building-plugins) 展示了插件包结构
  和首次发布工作流。
- [插件清单](/zh/plugins/manifest) 定义了原生插件清单字段。

如果同一个包在 ClawHub 和 npm 上都可用，当您需要强制指定一个来源时，请使用显式的
`clawhub:` 或 `npm:` 前缀。

## 相关

- [插件](/zh/tools/plugin) - 安装、配置、重新启动和故障排除
- [`openclaw plugins`](/zh/cli/plugins) - 完整的 CLI 参考
- [社区插件](/zh/plugins/community) - 公开发现和 ClawHub 发布
- [ClawHub](/zh/clawhub/cli) - 注册表 CLI 操作
- [构建插件](/zh/plugins/building-plugins) - 创建插件包
- [插件清单](/zh/plugins/manifest) - 清单和包元数据
