---
summary: "CLICLI 参考，用于 `openclaw plugins` (init, build, validate, list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to scaffold or validate a simple tool plugin
  - You want to debug plugin load failures
title: "插件"
sidebarTitle: "插件"
---

管理 Gateway(网关) 插件、挂钩包和兼容的包。

<CardGroup cols={2}>
  <Card title="插件系统" href="/zh/tools/plugin">
    用于安装、启用和故障排除插件的最终用户指南。
  </Card>
  <Card title="管理插件" href="/zh/plugins/manage-plugins">
    用于安装、列出、更新、卸载和发布的快速示例。
  </Card>
  <Card title="插件包" href="/zh/plugins/bundles">
    包兼容性模型。
  </Card>
  <Card title="插件清单" href="/zh/plugins/manifest">
    清单字段和配置模式。
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
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
```

对于缓慢的安装、检查、卸载或注册表刷新调查，请使用
`OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 运行命令。跟踪会将阶段计时写入
stderr 并保持 JSON 输出可解析。请参阅[调试](/zh/help/debugging#plugin-lifecycle-trace)。

<Note>在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，插件生命周期变更器已禁用。请使用 Nix 源进行此安装，而不是 `plugins install`、`plugins update`、`plugins uninstall`、`plugins enable` 或 `plugins disable`；对于 nix-openclaw，请使用代理优先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。</Note>

<Note>
捆绑插件随 OpenClaw 一起提供。有些默认启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）；其他的则需要 OpenClaw`plugins enable`OpenClaw。

原生 OpenClaw 插件必须附带内联 JSON Schema（`configSchema`，即使为空）的 `openclaw.plugin.json`。兼容的捆绑包则使用它们自己的捆绑包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息输出还会显示捆绑包子类型（`codex`、`claude` 或 `cursor`）以及检测到的捆绑包功能。

</Note>

### 作者

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` 创建一个使用
`defineToolPlugin` 的最小 TypeScript 工具插件。
`plugins build` 导入该入口，读取其静态工具
元数据，写入 `openclaw.plugin.json`，并保持 `package.json`
`openclaw.extensions` 对齐。`plugins validate` 检查生成的
清单、包元数据和当前入口导出是否仍然一致。请参阅
[Tool Plugins](/zh/plugins/tool-plugins) 了解完整的创作工作流。

脚手架编写 TypeScript 源代码，但从构建的 `./dist/index.js`CLI 入口生成元数据，因此该工作流程也适用于已发布的 CLI。当入口不是默认包入口时，请使用 `--entry <path>`。在 CI 中使用 `plugins build --check`，以便在生成的元数据过时且不重写文件时失败。

### 安装

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # source auto-detection
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

测试安装时安装的维护者可以使用受保护的环境变量覆盖自动插件安装
源。请参阅
[Plugin install overrides](/zh/plugins/install-overrides)。

<Warning>
在启动切换期间，除非它们匹配官方插件 ID，否则裸包名称默认从 npm 安装。与捆绑插件匹配的原始 `@openclaw/*` 包规范将使用当前 OpenClaw 构建附带的捆绑副本。当您明确需要外部 npm 包时，请使用 `npm:<package>`。对于 ClawHub，请使用 `clawhub:<package>`。请像运行代码一样对待插件安装。首选固定版本。
</Warning>

`plugins search` 在 ClawHub 中查询可安装的插件包，并打印可安装的包名称。它搜索 code-plugin 和 bundle-plugin 包，而不是 skills。对于 ClawHub skills，请使用 `openclaw skills search`。

<Note>ClawHub 是大多数插件的主要分发和发现平台。Npm 仍然是受支持的回退和直接安装路径。OpenClaw 拥有的 `@openclaw/*` 插件包再次发布在 npm 上；请查看当前列表 [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) 或 [plugin inventory](/zh/plugins/plugin-inventory)。稳定安装使用 `latest`。 Beta 渠道安装和更新在可用时首选 npm `beta` dist-tag，然后回退到 `latest`。</Note>

<AccordionGroup>
  <Accordion title="配置包含和无效配置修复">
    如果您的 `plugins` 部分由单个文件 `$include` 支持，`plugins install/update/enable/disable/uninstall` 将直接写入该包含文件，并保持 `openclaw.json` 不变。根包含、包含数组以及具有同级覆盖的包含将采用“失效关闭（fail closed）”策略，而不是进行扁平化处理。有关受支持的形状，请参阅 [配置包含](/zh/gateway/configuration)。

    如果在安装期间配置无效，`plugins install` 通常会失效关闭并提示您先运行 `openclaw doctor --fix`Gateway(网关)。在 Gateway(网关) 启动和热重载期间，无效的插件配置会像任何其他无效配置一样失效关闭；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一记录的安装时例外情况是针对明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的狭窄打包插件恢复路径。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force`ClawHubnpmnpm 重用现有的安装目标，并就地覆盖已安装的插件或 hook 包。当您打算从新的本地路径、归档文件、ClawHub 包或 npm 工件有意重新安装相同的 id 时，请使用此选项。对于已跟踪的 npm 插件的常规升级，建议使用 `openclaw plugins update <id-or-npm-spec>`。

    如果您为已安装的插件 id 运行 `plugins install`OpenClaw，OpenClaw 将停止并提示您使用 `plugins update <id-or-npm-spec>` 进行常规升级，或者在您确实想从不同的源覆盖当前安装时，使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin`npm 仅适用于 npm 安装。它不支持 `git:` 安装；当您需要固定的源时，请使用明确的 git 引用，例如 `git:github.com/acme/plugin@v1.2.3`。它也不支持 `--marketplace`npm，因为市场安装会保留市场源元数据，而不是 npm 规范。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的应急选项。它允许安装继续进行，即使内置扫描器报告 `critical` 发现，但它**不**会绕过插件 `before_install` 钩子策略阻止，也**不**会绕过扫描失败。

    安装扫描会忽略常见的测试文件和目录，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试模拟；声明的插件运行时入口点即使使用这些名称之一，仍会被扫描。

    此 CLI 标志适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖项安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

    如果您在 ClawHub 上发布的插件被注册表扫描隐藏或阻止，请使用 [ClawHub 发布](/zh/clawhub/publishing) 中的发布者步骤。`--dangerously-force-unsafe-install` 仅影响您自己机器上的安装；它不会要求 ClawHub 重新扫描插件或公开阻止的版本。

  </Accordion>
  <Accordion title="npmHook packs and npm specs">
    `plugins install` 也是用于在 `package.json` 中暴露 `openclaw.hooks` 的 hook 包的安装界面。使用 `openclaw hooks`npm 来过滤 hook 可见性并逐个启用 hook，而不是用于安装包。

    Npm 规范是**仅限注册表**的（包名称 + 可选的**确切版本**或 **dist-tag**）。Git/URL/文件规范和 semver 范围会被拒绝。依赖安装在每个插件的一个受管 npm 项目中运行，并带有 `--ignore-scripts`npmnpmOpenClawnpm 以确保安全，即使您的 shell 具有全局 npm 安装设置。受管插件 npm 项目继承 OpenClaw 的包级 npm `overrides`，因此主机安全锁定也适用于提升的插件依赖项。

    当您希望明确 npm 解析方式时，请使用 `npm:<package>`npmnpm。除非它们匹配官方插件 ID，否则裸包规范也会在启动切换期间直接从 npm 安装。

    匹配捆绑插件的原始 `@openclaw/*`npm 包规范会在 npm 回退之前解析为镜像拥有的捆绑副本。例如，`openclaw plugins install @openclaw/discord@2026.5.20 --pin`DiscordOpenClawnpmnpm 使用当前 OpenClaw 构建中捆绑的 Discord 插件，而不是创建受管 npm 覆盖。要强制使用外部 npm 包，请使用 `openclaw plugins install npm:@openclaw/discord@2026.5.20 --pin`。

    裸规范和 `@latest`OpenClaw 保持在稳定轨道上。OpenClaw 带日期戳的修正版本（例如 `2026.5.3-1`npmOpenClaw）对于此检查来说是稳定版本。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如 `@1.2.3-beta.4`npm）明确选择加入。

    对于没有确切版本（`npm:<package>` 或 `npm:<package>@latest`OpenClawOpenClawAPIOpenClaw）的 npm 安装，OpenClaw 会在安装前检查已解析的包元数据。如果最新的稳定包需要更新的 OpenClaw 插件 API 或最低主机版本，OpenClaw 会检查较旧的稳定版本并改为安装最新的兼容版本。确切版本和明确的 dist-tag（例如 `@beta`OpenClaw）保持严格：如果所选的包不兼容，命令将失败并要求您升级 OpenClaw 或选择兼容的版本。

    如果裸安装规范匹配官方插件 ID（例如 `diffs`OpenClawnpm），OpenClaw 会直接安装目录条目。要安装同名 npm 包，请使用显式作用域规范（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Git 仓库">
    使用 `git:<repo>` 直接从 git 仓库安装。支持的形式包括 `git:github.com/owner/repo`、`git:owner/repo`、完整的 `https://`、`ssh://`、`git://`、`file://` 以及 `git@host:owner/repo.git` 克隆 URL。在安装前添加 `@<ref>` 或 `#<ref>` 以检出分支、标签或提交。

    Git 安装会克隆到一个临时目录，如果存在请求的 ref 则进行检出，然后使用正常的插件目录安装程序。这意味着清单验证、危险代码扫描、包管理器安装工作以及安装记录的行为与 npm 安装类似。记录的 git 安装包括源 URL/ref 以及解析出的提交，以便 `openclaw plugins update` 稍后可以重新解析源。

    从 git 安装后，使用 `openclaw plugins inspect <id> --runtime --json` 验证运行时注册（如网关方法和 CLI 命令）。如果插件使用 `api.registerCli` 注册了 CLI 根，请直接通过 OpenClaw 根 CLI 执行该命令，例如 `openclaw demo-plugin ping`。

  </Accordion>
  <Accordion title="Archives">
    支持的存档：`.zip`、`.tgz`、`.tar.gz`、`.tar`。原生 OpenClaw 插件存档必须在解压后的插件根目录中包含有效的 `openclaw.plugin.json`；仅包含 `package.json` 的存档会在 OpenClaw 写入安装记录之前被拒绝。

    当文件是 npm 打包的 tarball 且您想要
    测试注册表安装所使用的相同的每插件托管 npm 项目路径时，请使用 `npm-pack:<path.tgz>`，包括 `package-lock.json` 验证、提升的依赖
    扫描和 npm 安装记录。普通存档路径仍然作为本地
    存档安装在插件扩展根目录下。

    也支持 Claude 市场安装。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

在启动切换期间，除非匹配官方插件 ID，否则裸 npm 安全插件规范默认从 npm 安装：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 使 npm 专属解析显式化：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@openclaw/discord@2026.5.20
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 在安装前会检查公布的插件 API / 最低网关兼容性。当所选的 ClawHub 版本发布 ClawPack 构建产物时，OpenClaw 会下载带版本的 OpenClawAPIClawHubOpenClawnpm`.tgz`ClawHubClawHubClawHubnpmnpmClawHub，验证 ClawHub 摘要头和构建产物摘要，然后通过正常归档路径进行安装。没有 ClawPack 元数据的旧版 ClawHub 仍然通过传统包归档验证路径进行安装。已记录的安装会保留其 ClawHub 源元数据、构建产物类型、npm 完整性、npm shasum、tarball 名称和 ClawPack 摘要事实，以便后续更新。
未指定版本的 ClawHub 安装会保留未指定版本的记录规范，以便 `openclaw plugins update`ClawHub 能够跟随较新的 ClawHub 版本；显式版本或标签选择器（如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）则会固定在该选择器上。

#### Marketplace 简写

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，请使用 `plugin@marketplace` 简写：

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
    - GitHub 仓库简写，例如 `owner/repo`GitHub
    - GitHub 仓库 URL，例如 `https://github.com/owner/repo`
    - git URL

  </Tab>
  <Tab title="Remote marketplace rules"GitHubOpenClawGitHub>
    对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 和其他非路径插件源。
  </Tab>
</Tabs>

对于本地路径和归档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (OpenClaw`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容包 (`.claude-plugin/plugin.json` 或默认的 Claude 组件布局)
- Cursor 兼容包 (`.cursor-plugin/plugin.json`)

<Note>兼容的捆绑包安装到常规插件根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持捆绑包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的捆绑包功能会显示在诊断/信息中，但尚未连接到运行时执行。</Note>

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
  从表格视图切换到包含源/来源/版本/激活元数据的每个插件的详细行。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单以及注册表诊断和包依赖安装状态。
</ParamField>

<Note>
`plugins list` 首先读取持久化的本地插件注册表，当注册表缺失或无效时，使用仅从清单派生的后备方案。这对于检查插件是否已安装、启用以及是否对冷启动计划可见很有用，但它不是对正在运行的 Gateway(网关) 进程的实时运行时探测。在更改插件代码、启用状态、hook 策略或 `plugins.load.paths` 后，请重新启动为该渠道提供服务的 Gateway(网关)，然后再期望新的 `register(api)` 代码或 hooks 运行。对于远程/容器部署，请验证您正在重新启动实际的 `openclaw gateway run` 子进程，而不仅仅是包装进程。

`plugins list --json` 包含每个插件的 `dependencyStatus`，来自 `package.json`
`dependencies` 和 `optionalDependencies`。OpenClaw 会检查这些包
名称是否存在于插件的常规 Node `node_modules` 查找路径中；它
不会导入插件运行时代码、运行包管理器或修复缺失的
依赖项。

</Note>

`plugins search` 是一个远程 ClawHub 目录查找。它不检查本地
状态、修改配置、安装包或加载插件运行时代码。搜索
结果包括 ClawHub 包名称、系列、渠道、版本、摘要以及
安装提示，例如 `openclaw plugins install clawhub:<package>`。

对于打包在 Docker 镜像中的捆绑插件工作，请将插件源目录绑定挂载到匹配的打包源路径上，例如 Docker`/app/extensions/synology-chat`OpenClaw。OpenClaw 将在 `/app/dist/extensions/synology-chat` 之前发现挂载的源覆盖层；普通的复制源目录将保持非活动状态，因此正常的打包安装仍然使用编译后的 dist。

对于运行时 Hook 调试：

- `openclaw plugins inspect <id> --runtime --json` 显示从模块加载检查过程中注册的挂钩和诊断信息。运行时检查从不安装依赖项；使用 `openclaw doctor --fix` 清理旧版依赖项状态或恢复配置中引用的缺失的可下载插件。
- `openclaw gateway status --deep --require-rpc`Gateway(网关)RPC 确认可访问的 Gateway(网关) URL/配置文件、服务/进程提示、配置路径和 RPC 运行状况。
- 非捆绑的对话挂钩（`llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

独立插件文件必须在 `plugins.load.paths` 中列出，而不是直接放在 `~/.openclaw/extensions` 或 `<workspace>/.openclaw/extensions` 中。这些自动发现的根目录会加载插件包或 bundle 目录，而顶级脚本文件则被视为本地辅助程序并被跳过。

<Note>
从工作区扩展根目录发现的工作区来源插件在被显式启用之前
不会被导入或执行。对于本地开发，
请运行 `openclaw plugins enable <plugin-id>` 或设置
`plugins.entries.<plugin-id>.enabled: true`；如果您的配置使用了
`plugins.allow`，请也在其中包含相同的插件 id。此失效闭合（fail-closed）规则
同样适用于当渠道设置显式以工作区来源插件为
仅设置加载目标时，因此只要该
工作区插件保持被禁用或被排除在允许列表之外，本地渠道插件设置代码就不会运行。链接安装
和显式 `plugins.load.paths` 条目遵循其解析后的插件来源的正常策略。请参阅
[配置插件策略](/zh/tools/plugin#configure-plugin-policy)
和 [配置参考](/zh/gateway/configuration-reference#plugins)。

不支持将 `--force` 与 `--link` 结合使用，因为链接安装会复用源路径而不是复制到受管安装目标。

在 npm 安装上使用 `--pin`，以便在保持默认行为未固定的情况下，将解析的确切规范 (`name@version`) 保存到受管插件索引中。

</Note>

### 插件索引

插件安装元数据是机器管理的状态，而非用户配置。安装和更新操作会将其写入活动 OpenClaw 状态目录下的共享 SQLite 状态数据库中。`installed_plugin_index` 行存储持久的 `installRecords` 元数据，包括损坏或缺失的插件清单记录，以及一个由清单派生的冷注册表缓存，供 `openclaw plugins update`、卸载、诊断和冷插件注册表使用。

当 OpenClaw 在配置中看到已发布的旧版 `plugins.installs` 记录时，运行时读取会将其视为兼容性输入，而不重写 `openclaw.json`。显式插件写入和 `openclaw doctor --fix` 会将这些记录移动到插件索引中，并在允许配置写入时删除配置键；如果任一写入失败，则会保留配置记录，以免安装元数据丢失。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`（持久化的插件索引）、插件允许/拒绝列表条目以及适用的链接 `plugins.load.paths` 条目中移除插件记录。除非设置了 `--keep-files`，否则当受管安装目录位于 OpenClaw 的插件扩展根目录下时，卸载操作也会将其移除。对于活动的内存插件，内存插槽会重置为 `memory-core`。

<Note>`--keep-config` 作为 `--keep-files` 的已弃用别名受到支持。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于受管插件索引中跟踪的插件安装以及 `hooks.internal.installs` 中跟踪的 hook-pack 安装。

<AccordionGroup>
  <Accordion title="解析插件 ID 与 npm 规范">
    当你传递一个插件 ID 时，OpenClaw 会重用该插件记录的安装规范。这意味着之前存储的 dist-tags（例如 `@beta`）和精确固定的版本将在后续的 `update <id>` 运行中继续被使用。

    对于 npm 安装，你也可以传递带有 dist-tag 或精确版本的显式 npm 包规范。OpenClaw 会将该包名称解析回跟踪的插件记录，更新已安装的插件，并记录新的 npm 规范以供将来基于 ID 的更新使用。

    传递不带版本或标签的 npm 包名称也会解析回跟踪的插件记录。当插件被固定到精确版本而你希望将其恢复到注册表的默认发布线时，请使用此方法。

  </Accordion>
  <Accordion title="Beta 渠道 updates">
    `openclaw plugins update` 会复用已跟踪的插件规范，除非您传入新的规范。`openclaw update`OpenClawnpmClawHub 还知道当前活动的 OpenClaw 更新渠道：在 beta 渠道上，默认行的 npm 和 ClawHub 插件记录会首先尝试 `@beta`npm。如果不存在插件的 beta 版本，它们会回退到记录的 default/latest 规范；如果 beta 包存在但安装验证失败，npm 插件也会回退。该回退会作为警告报告，并且不会导致核心更新失败。确切的版本和显式的标签将固定在该选择器上。

  </Accordion>
  <Accordion title="Version checks and integrity drift"npmOpenClawnpm>
    在进行实际的 npm 更新之前，OpenClaw 会根据 npm 注册表元数据检查已安装的软件包版本。如果已安装的版本和记录的工件标识已匹配解析的目标，则跳过更新，而不进行下载、重新安装或重写 `openclaw.json`OpenClawnpm。

    当存在存储的完整性哈希且获取的工件哈希发生变化时，OpenClaw 将其视为 npm 工件漂移。交互式 `openclaw plugins update` 命令会打印预期和实际的哈希值，并在继续之前请求确认。非交互式更新辅助程序将以失败关闭（fail closed）处理，除非调用者提供了显式的继续策略。

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install on update">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上使用，作为插件更新期间针对内置危险代码扫描误报的应急覆盖选项。它仍然不会绕过插件 `before_install` 策略块或扫描失败阻塞，并且仅适用于插件更新，不适用于 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### Inspect

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect 显示标识、加载状态、来源、清单能力、策略标志、诊断信息、安装元数据、bundle 能力以及检测到的任何 MCP 或 LSP 服务器支持，默认不导入插件运行时。添加 `--runtime` 以加载插件模块并包含已注册的 hooks、tools、commands、services、gateway 方法和 HTTP 路由。运行时检查会直接报告缺失的插件依赖；安装和修复保留在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中。

插件拥有的 CLI 命令通常作为根 CLI`openclaw` 命令组安装，但插件也可以在核心父级下注册嵌套命令，例如 `openclaw nodes`。当 `inspect --runtime` 在 `cliCommands` 下显示某个命令后，请在列出的路径下运行它；例如，注册了 `demo-git` 的插件可以通过 `openclaw demo-git ping` 进行验证。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种功能类型（例如仅提供商插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅 hooks，没有功能或表面
- **non-capability** — 工具/命令/服务但没有功能

有关能力模型的更多信息，请参阅 [Plugin shapes](/zh/plugins/architecture#plugin-shapes)。

<Note>`--json` 标志输出适合脚本编写和审计的机器可读报告。`inspect --all` 渲染一个包含 shape、能力类型、兼容性通知、bundle 能力和 hook 摘要列的 fleet-wide 表。`info` 是 `inspect` 的别名。</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断、兼容性通知以及过时的插件配置引用（如缺失的 plugin slots）。当安装树和插件配置干净时，它会打印 `No plugin issues detected.`。如果存在过时的配置但安装树本身是健康的，摘要将说明这一点，而不是暗示插件完全健康。

如果磁盘上存在已配置的插件，但被加载器的路径安全检查阻止，配置验证将保留该插件条目并将其报告为 `present but blocked`。请修复先前的被阻止插件诊断问题（例如路径所有权或全局可写权限），而不是删除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于缺少 `register`/`activate` 导出等模块形状失败的情况，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以在诊断输出中包含简明的导出形状摘要。

### 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 用于已安装插件身份、启用状态、源元数据和贡献所有权的持久化冷读模型。正常启动、提供商所有者查找、渠道设置分类和插件清单可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 检查持久化注册表是否存在、是最新还是已过期。使用 `--refresh` 从持久化插件索引、配置策略以及清单/包元数据重建它。这是一条修复路径，而非运行时激活路径。

`openclaw doctor --fix` 还会修复与注册表相邻的托管 npm 漂移：如果受管插件 npm 项目下的孤立或恢复的 `@openclaw/*` 包，或者传统的扁平托管 npm 根目录遮蔽了打包插件，医生命令会删除该过期包并重建注册表，以便启动时根据打包清单进行验证。医生命令还将主机 `openclaw` 包重新链接到声明 `peerDependencies.openclaw` 的托管 npm 插件中，以便 `openclaw/plugin-sdk/*` 等包本地运行时导入在更新或 npm 修复后能够正确解析。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一个已弃用的用于注册表读取失败的应急兼容性开关。首选 `plugins registry --refresh` 或 `openclaw doctor --fix`；该环境变量回退仅在迁移推出期间用于紧急启动恢复。</Warning>

### 市场

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 列表接受本地 marketplace 路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写形式、GitHub 仓库 URL 或 git URL。`--json` 会打印已解析的源标签以及解析后的 marketplace 清单和插件条目。

## 相关

- [构建插件](/zh/plugins/building-plugins)
- [CLI 参考](/zh/cli)
- [ClawHub](/zh/clawhub)
