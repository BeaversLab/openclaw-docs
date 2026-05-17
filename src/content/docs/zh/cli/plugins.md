---
summary: "CLICLI reference for `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "插件"
sidebarTitle: "插件"
---

管理 Gateway(网关) 插件、挂钩包和兼容的包。

<CardGroup cols={2}>
  <Card title="插件系统" href="/zh/tools/plugin">
    用于安装、启用和排除插件故障的终端用户指南。
  </Card>
  <Card title="管理插件" href="/zh/plugins/manage-plugins">
    用于安装、列出、更新、卸载和发布的快速示例。
  </Card>
  <Card title="插件包" href="/zh/plugins/bundles">
    包兼容性模型。
  </Card>
  <Card title="插件清单" href="/zh/plugins/manifest">
    清单字段和配置架构。
  </Card>
  <Card title="安全性" href="/zh/gateway/security">
    插件安装的安全加固。
  </Card>
</CardGroup>

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

对于安装缓慢、检查、卸载或注册表刷新调查，请使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。该跟踪会将阶段计时写入 stderr 并保持 JSON 输出可解析。请参阅 [Debugging](/zh/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (Nix`OPENCLAW_NIX_MODE=1`Nix) 下，插件生命周期变更器被禁用。请使用 Nix 源进行此安装，而不是 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；对于 nix-openclaw，请使用代理优先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

<Note>
捆绑插件随 OpenClaw 一起提供。某些插件默认启用（例如捆绑的模型提供程序、捆绑的语音提供程序和捆绑的浏览器插件）；其他插件则需要 `plugins enable`。

原生 OpenClaw 插件必须随附带有内联 JSON 架构（`configSchema`，即使为空）的 `openclaw.plugin.json`。兼容的捆绑包则使用它们自己的捆绑包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息输出还会显示捆绑包子类型（`codex`、`claude` 或 `cursor`）以及检测到的捆绑包功能。

</Note>

### 安装

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # npm by default
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install npm-pack:<path.tgz>            # local npm pack through npm install semantics
openclaw plugins install git:github.com/<owner>/<repo>  # git repo
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

维护人员测试设置时的安装可以使用受保护的环境变量覆盖自动插件安装源。请参阅
[Plugin install overrides](/zh/plugins/install-overrides)。

<Warning>
在启动切换期间，裸包名称默认从 npm 安装。对于 ClawHub，请使用 `clawhub:<package>`。请像对待运行代码一样对待插件安装。首选固定版本。
</Warning>

`plugins search` 查询 ClawHub 以获取可安装的插件包，并打印
可直接安装的包名称。它搜索 code-plugin 和 bundle-plugin 包，
而不搜索技能。对于 ClawHub 技能，请使用 `openclaw skills search`。

<Note>
  ClawHub 是大多数插件的主要分发和发现平台。Npm 仍然是一个受支持的回退和直接安装路径。OpenClaw 拥有的 ClawHubOpenClaw`@openclaw/*`npm 插件包再次发布在 npm 上；请查看当前列表 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [plugin inventory](/zh/plugins/plugin-inventory)。稳定版安装使用 `latest`npm。 Beta 渠道安装和更新在存在该标签时首选 npm `beta` dist-tag，然后回退到 `latest`。
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    如果您的 `plugins` 部分由单文件 `$include` 支持，`plugins install/update/enable/disable/uninstall` 将直接写入该包含文件，并保持 `openclaw.json` 不变。根包含、包含数组以及具有同级覆盖的包含将失败关闭而不是扁平化。有关支持的形状，请参阅 [Config includes](/zh/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会失败关闭并告诉您先运行 `openclaw doctor --fix`。在 Gateway(网关) 启动和热重载期间，无效的插件配置会像任何其他无效配置一样失败关闭；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一记录的安装时例外情况是针对明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的狭窄捆绑插件恢复路径。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 复用现有的安装目标，并就地覆盖已安装的插件或挂钩包（hook pack）。当您打算从新的本地路径、归档文件、ClawHub 包或 npm 构件重新安装相同的 ID 时，请使用此命令。对于已跟踪的 npm 插件的常规升级，首选 `openclaw plugins update <id-or-npm-spec>`。

    如果您为已安装的插件 ID 运行 `plugins install`，OpenClaw 会停止并指向 `plugins update <id-or-npm-spec>` 以进行正常升级，或者当您确实想从不同的源覆盖当前安装时，指向 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin`npm 仅适用于 npm 安装。它不支持 `git:` 安装；当您需要固定源时，请使用显式的 git 引用，例如 `git:github.com/acme/plugin@v1.2.3`。它不支持 `--marketplace`npm，因为市场安装会持久化市场源元数据，而不是 npm 规范。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是内置危险代码扫描器误报时的应急选项。即使内置扫描器报告 `critical` 发现，它也允许安装继续，但它**不**绕过插件 `before_install` 钩子策略块，也**不**绕过扫描失败。

    此 CLI 标志适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是一个单独的 ClawHub 技能下载/安装流程。

    如果您在 ClawHub 上发布的插件被注册表扫描隐藏或阻止，请使用 [ClawHub 发布](/zh/clawhub/publishing) 中的发布者步骤。`--dangerously-force-unsafe-install` 仅影响您自己机器上的安装；它不会要求 ClawHub 重新扫描插件或使被阻止的发布公开。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是用于安装在 `package.json` 中暴露 `openclaw.hooks` 的 Hook 包的安装界面。请使用 `openclaw hooks` 来过滤 Hook 可见性并按 Hook 启用，而不是用于安装软件包。

    Npm 规范仅限于**注册表**（软件包名称 + 可选的**确切版本**或 **dist-tag**）。拒绝 Git/URL/文件规范和 semver 范围。出于安全考虑，依赖安装在项目本地运行 `--ignore-scripts`，即使您的 shell 具有全局 npm 安装设置。受管插件 npm 根目录继承 OpenClaw 的包级 npm `overrides`，因此主机安全锁定也适用于提升的插件依赖项。

    当您希望明确 npm 解析时，请使用 `npm:<package>`。在启动切换期间，裸软件包规范也会直接从 npm 安装。

    裸规范和 `@latest` 保持在稳定轨道上。OpenClaw 日期戳修正版本（例如 `2026.5.3-1`）是此检查的稳定版本。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 将停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如 `@1.2.3-beta.4`）明确选择加入。

    如果裸安装规范与官方插件 ID 匹配（例如 `diffs`），OpenClaw 将直接安装目录条目。要安装同名的 npm 软件包，请使用显式作用域规范（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 仓库">
    使用 `git:<repo>` 直接从 git 仓库安装。支持的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 以及 `git@host:owner/repo.git` clone URL。添加 `@<ref>` 或 `#<ref>` 以在安装前检出分支、标签或提交。

    Git 安装会克隆到一个临时目录，在存在时检出请求的引用，然后使用常规插件目录安装程序。这意味着清单验证、危险代码扫描、包管理器安装工作以及安装记录的行为与 npm 安装类似。记录的 git 安装包括源 URL/引用以及解析出的提交，以便 `openclaw plugins update` 稍后可以重新解析源。

    从 git 安装后，使用 `openclaw plugins inspect <id> --runtime --json` 验证运行时注册，例如网关方法和 CLI 命令。如果插件使用 `api.registerCli` 注册了 CLI 根，请直接通过 OpenClaw 根 CLI 执行该命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="Archives">
    支持的归档文件：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件归档文件必须在提取后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的归档文件将在 OpenClaw 写入安装记录之前被拒绝。

    当文件是 npm 打包的 tarball 并且您想要
    测试与注册表安装相同的托管 npm 根安装路径时，请使用 `npm-pack:<path.tgz>`，
    包括 `package-lock.json` 验证、提升依赖扫描以及
    npm 安装记录。普通归档路径仍作为本地归档
    安装在插件扩展根目录下。

    也支持 Claude 市场安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

裸的 npm-safe 插件规范在启动切换期间默认从 npm 安装：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 使仅 npm 解析显式化：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 会在安装前检查公布的插件 API / 最低网关兼容性。当所选 ClawHub 版本发布 ClawPack 制品时，OpenClaw 会下载带版本的 npm-pack OpenClawAPIClawHubOpenClawnpm`.tgz`ClawHubClawHubClawHubnpmnpmClawHub，验证 ClawHub 摘要标头和制品摘要，然后通过常规归档路径进行安装。没有 ClawPack 元数据的较旧 ClawHub 版本仍通过遗留的包归档验证路径进行安装。已记录的安装会保留其 ClawHub 源元数据、制品类型、npm 完整性、npm shasum、tarball 名称和 ClawPack 摘要事实，以便后续更新。
未指定版本的 ClawHub 安装会保留未指定版本的已记录规范，以便 `openclaw plugins update`ClawHub 可以跟随较新的 ClawHub 版本；显式版本或标签选择器（例如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）将保持锁定到该选择器。

#### Marketplace 简写

当市场名称存在于 `~/.claude/plugins/known_marketplaces.json` 的 Claude 本地注册表缓存中时，请使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场来源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace sources">
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
    - 本地市场根目录或 `marketplace.json`GitHub 路径
    - GitHub 仓库简写，如 `owner/repo`GitHub
    - GitHub 仓库 URL，如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="Remote marketplace rules">
    对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径的插件源。
  </Tab>
</Tabs>

对于本地路径和存档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (OpenClaw`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容的软件包（`.claude-plugin/plugin.json` 或默认的 Claude 组件布局）
- Cursor 兼容的软件包（`.cursor-plugin/plugin.json`）

<Note>兼容的软件包会安装到常规的插件根目录中，并参与相同的列表/信息/启用/禁用流程。目前，支持软件包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单中声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的软件包功能会在诊断/信息中显示，但尚未接入运行时执行。</Note>

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换到每个插件的详细行，其中包含来源/来源/版本/激活元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单，以及注册表诊断和包依赖安装状态。
</ParamField>

<Note>
`plugins list`Gateway(网关) 首先读取持久化的本地插件注册表，当注册表缺失或无效时，使用仅从清单派生的回退机制。这对于检查插件是否已安装、已启用以及对冷启动计划可见非常有用，但它不是对正在运行的 Gateway(网关) 进程的实时运行时探测。更改插件代码、启用状态、hook 策略或 `plugins.load.paths`Gateway(网关) 后，在期望新的 `register(api)` 代码或 hooks 运行之前，请重启服务于该渠道的 Gateway(网关)。对于远程/容器部署，请验证您正在重启的是实际的 `openclaw gateway run` 子进程，而不仅仅是包装进程。

`plugins list --json` 包括每个插件的 `dependencyStatus`，这些信息来自 `package.json`
`dependencies` 和 `optionalDependencies`OpenClaw。OpenClaw 会检查这些包名是否存在于插件的常规 Node `node_modules` 查找路径中；它不会导入插件运行时代码，不会运行包管理器，也不会修复缺失的依赖项。

</Note>

`plugins search` 是远程 ClawHub 目录查找。它不检查本地状态、修改配置、安装包或加载插件运行时代码。搜索结果包括 ClawHub 包名称、家族、渠道、版本、摘要以及安装提示，例如 `openclaw plugins install clawhub:<package>`。

对于打包的 Docker 镜像中的捆绑插件工作，请将插件源目录绑定挂载到匹配的打包源路径上，例如 `/app/extensions/synology-chat`。OpenClaw 将在 `/app/dist/extensions/synology-chat` 之前发现该挂载的源覆盖层；普通复制的源目录将保持静止，因此正常的打包安装仍使用已编译的 dist。

对于运行时 hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 显示已注册的挂钩和模块加载检查过程中的诊断信息。运行时检查从不安装依赖项；使用 `openclaw doctor --fix` 清理旧的依赖项状态或恢复配置中引用的缺失的可下载插件。
- `openclaw gateway status --deep --require-rpc` 确认可访问的 Gateway(网关)、服务/进程提示、配置路径和 RPC 运行状况。
- 非捆绑的对话挂钩（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支持 `--link`，因为链接安装会重用源路径，而不是复制到受管理的安装目标。

在 npm 安装上使用 `--pin`npm，以便将解析出的确切规范（`name@version`）保存在受管理的插件索引中，同时保持默认行为未固定。

</Note>

### 插件索引

插件安装元数据是机器管理的状态，而非用户配置。安装和更新会将其写入处于活动 OpenClaw 状态目录下的 `plugins/installs.json`OpenClaw 中。其顶层的 `installRecords` 映射是安装元数据的持久来源，包括针对损坏或缺失插件清单的记录。`plugins` 数组是派生自清单的冷注册表缓存。该文件包含禁止编辑的警告，并供 `openclaw plugins update`、卸载、诊断和冷插件注册表使用。

当 OpenClaw 在配置中看到已交付的旧版 `plugins.installs` 记录时，运行时读取会将它们视为兼容性输入，而不会重写 `openclaw.json`。显式的插件写入和 `openclaw doctor --fix` 会将这些记录移动到插件索引中，并在允许配置写入时移除配置键；如果任一写入失败，则保留配置记录，以免丢失安装元数据。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`（持久化插件索引）、插件允许/拒绝列表条目以及适用的关联 `plugins.load.paths` 条目中移除插件记录。除非设置了 `--keep-files`OpenClaw，否则当受管安装目录位于 OpenClaw 的插件扩展根目录下时，卸载操作也会将其移除。对于活动的内存插件，内存插槽会重置为 `memory-core`。

<Note>`--keep-config` 作为 `--keep-files` 的已弃用别名受支持。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于受管插件索引中已跟踪的插件安装以及 `hooks.internal.installs` 中已跟踪的 hook-pack 安装。

<AccordionGroup>
  <Accordion title="npm解析插件 ID 与 npm 规范"OpenClaw>
    当您传递插件 ID 时，OpenClaw 会重用该插件的已记录安装规范。这意味着之前存储的 dist-tags（如 `@beta`）和精确固定的版本将在后续的 `update <id>`npmnpmOpenClawnpmnpm 运行中继续被使用。

    对于 npm 安装，您也可以传递带有 dist-tag 或确切版本的显式 npm 包规范。OpenClaw 会将该包名称解析回已跟踪的插件记录，更新已安装的插件，并记录新的 npm 规范以便将来基于 ID 的更新使用。

    传递不带版本或标签的 npm 包名称也会解析回已跟踪的插件记录。当插件被固定到确切版本，且您希望将其恢复到注册表的默认发布线时，请使用此方法。

  </Accordion>
  <Accordion title="Beta 渠道更新">
    `openclaw plugins update` 会重用已跟踪的插件规范，除非您传入新的规范。`openclaw update` 还能识别当前的 OpenClaw 更新渠道：在 beta 渠道上，默认系列的 npm 和 ClawHub 插件记录会首先尝试 `@beta`，如果不存在插件 beta 版本，则回退到记录的默认/最新规范。该回退操作会作为警告报告，但不会导致核心更新失败。精确版本和显式标签将保持固定到该选择器。

  </Accordion>
  <Accordion title="版本检查和完整性漂移">
    在进行实时的 npm 更新之前，OpenClaw 会对照 npm 注册表元数据检查已安装的软件包版本。如果已安装的版本和记录的工件标识已与解析出的目标匹配，则跳过更新，不进行下载、重新安装或重写 `openclaw.json`。

    当存在存储的完整性哈希且获取的工件哈希发生变化时，OpenClaw 将其视为 npm 工件漂移。交互式 `openclaw plugins update` 命令会打印预期和实际的哈希值，并在继续之前请求确认。非交互式更新辅助程序会自动失败（fail closed），除非调用方提供了明确的继续策略。

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install on update">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作为插件更新期间针对内置危险代码扫描误报的应急覆盖手段。它仍然不会绕过插件 `before_install` 策略阻止或扫描失败阻止，并且仅适用于插件更新，不适用于 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 显示身份、加载状态、来源、清单能力、策略标志、诊断、安装元数据、包能力以及任何检测到的 MCP 或 LSP 服务器支持，默认情况下不导入插件运行时。添加 `--runtime` 以加载插件模块并包含已注册的钩子、工具、命令、服务、网关方法和 HTTP 路由。运行时检查会直接报告缺失的插件依赖项；安装和修复保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

插件拥有的 CLI 命令通常作为根 `openclaw` 命令组安装，但插件也可以在核心父级（例如 `openclaw nodes`）下注册嵌套命令。当 `inspect --runtime` 在 `cliCommands` 下显示命令时，请在列出的路径运行它；例如，注册了 `demo-git` 的插件可以使用 `openclaw demo-git ping` 进行验证。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 单一功能类型（例如仅提供商的插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅有 hooks，没有功能或界面
- **non-capability** — 有 tools/commands/services 但没有功能

有关功能模型的更多信息，请参阅 [Plugin shapes](/zh/plugins/architecture#plugin-shapes)。

<Note>`--json` 标志输出适合脚本编写和审计的机器可读报告。`inspect --all` 渲染一个包含形状、能力类型、兼容性通告、bundle 能力和钩子摘要列的集群范围表格。`info` 是 `inspect` 的别名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断以及兼容性通告。当一切正常时，它会打印 `No plugin issues detected.`

如果磁盘上存在已配置的插件，但被加载程序的路径安全检查阻止，则配置验证会保留该插件条目并将其报告为 `present but blocked`。请修复前面的被阻止插件诊断（例如路径所有权或全局可写权限），而不是删除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于模块形状失败（例如缺少 `register`/`activate` 导出），请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以在诊断输出中包含紧凑的导出形状摘要。

### 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 用于已安装插件身份、启用状态、源元数据和贡献所有权的持久化冷读取模型。正常启动、提供商所有者查找、渠道设置分类和插件清单可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 检查持久化注册表是否存在、是最新还是已过期。使用 `--refresh` 从持久化插件索引、配置策略以及清单/包元数据重建它。这是一条修复路径，而不是运行时激活路径。

`openclaw doctor --fix` 还会修复与注册表相邻的受管 npm 漂移：如果受管插件 npm 根目录下的孤立或已恢复的 `@openclaw/*` 包遮蔽了打包插件，doctor 会删除该过时包并重建注册表，以便启动时根据打包清单进行验证。Doctor 还会将主机 `openclaw` 包重新链接到声明了 `peerDependencies.openclaw` 的受管 npm 插件中，以便在更新或 npm 修复后，解析诸如 `openclaw/plugin-sdk/*` 之类的包本地运行时导入。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一个已弃用的应急兼容性开关，用于处理注册表读取失败。建议优先使用 `plugins registry --refresh` 或 `openclaw doctor --fix`；环境变量回退仅用于迁移期间的紧急启动恢复。</Warning>

### 市场

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 列表接受本地 marketplace 路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。`--json` 会打印解析的源标签以及解析后的 marketplace 清单和插件条目。

## 相关

- [构建插件](/zh/plugins/building-plugins)
- [CLI 参考](/zh/cli)
- [ClawHub](/zh/clawhub)
