---
summary: "CLI 参考，用于 `openclaw plugins`（list、install、marketplace、uninstall、enable/disable、doctor）"
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
  <Card title="插件包" href="/zh/plugins/bundles">
    包兼容性模型。
  </Card>
  <Card title="插件清单" href="/zh/plugins/manifest">
    清单字段和配置架构。
  </Card>
  <Card title="安全性" href="/zh/gateway/security">
    针对插件安装的安全加固。
  </Card>
</CardGroup>

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
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

<Note>
捆绑插件随 OpenClaw 一起提供。有些默认启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）；其他的则需要 `plugins enable`。

原生 OpenClaw 插件必须随附 `openclaw.plugin.json` 及内联 JSON 架构（`configSchema`，即使为空）。兼容的包则使用其自己的包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息输出还会显示包子类型（`codex`、`claude` 或 `cursor`）以及检测到的包功能。

</Note>

### 安装

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>裸包名称会先在 ClawHub 中检查，然后在 npm 中检查。请像运行代码一样对待插件安装。首选固定版本。</Warning>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config recovery">
    如果您的 `plugins` 部分由单个文件 `$include` 提供支持，`plugins install/update/enable/disable/uninstall` 将直接写入该包含的文件，并保持 `openclaw.json` 原样不变。根包含、包含数组以及具有同级覆盖的包含将采用“封闭失败”策略，而不是进行扁平化处理。有关支持的格式，请参阅 [Config includes](/zh/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会失败并提示您先运行 `openclaw doctor --fix`。在 Gateway(网关) 启动期间，一个插件的无效配置会被隔离在该插件中，以便其他通道和插件可以继续运行；`openclaw doctor --fix` 可以隔离无效的插件条目。唯一文档记录的安装时例外情况，是针对明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的狭义捆绑插件恢复路径。

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` 复用现有的安装目标，并就地覆盖已安装的插件或挂钩包。当您打算从新的本地路径、存档、ClawHub 包或 npm 构件重新安装相同的 ID 时，请使用此选项。对于已跟踪的 npm 插件的常规升级，建议首选 `openclaw plugins update <id-or-npm-spec>`。

    如果您为已安装的插件 ID 运行 `plugins install`，OpenClaw 会停止并提示您使用 `plugins update <id-or-npm-spec>` 进行正常升级，或者当您确实想从不同源覆盖当前安装时，使用 `plugins install <package> --force`。

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` 仅适用于 npm 安装。不支持与 `--marketplace` 一起使用，因为市场安装保留的是市场源元数据，而不是 npm 规范。
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的应急选项。它允许在内置扫描器报告 `critical` 发现时继续安装，但它**不**会绕过插件 `before_install` 钩子策略块，也**不**会绕过扫描失败。

    此 CLI 标志适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍是一个单独的 ClawHub 技能下载/安装流程。

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` 也是用于在 `package.json` 中暴露 `openclaw.hooks` 的 hook pack 的安装界面。使用 `openclaw hooks` 进行过滤的 hook 可见性和逐个 hook 启用，而不是用于包安装。

    npm 规范**仅限注册表**（包名 + 可选的**确切版本**或 **dist-tag**）。会拒绝 Git/URL/文件规范和 semver 范围。依赖安装在项目本地以 `--ignore-scripts` 运行以确保安全，即使您的 shell 具有全局 npm 安装设置。

    当您想跳过 ClawHub 查找并直接从 npm 安装时，请使用 `npm:<package>`。裸包规范仍然首选 ClawHub，并且仅在 ClawHub 没有该包或版本时才回退到 npm。

    裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您通过预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如 `@1.2.3-beta.4`）显式选择加入。

    如果裸安装规范与捆绑插件 ID 匹配（例如 `diffs`），OpenClaw 将直接安装捆绑插件。要安装同名的 npm 包，请使用显式作用域规范（例如 `@scope/diffs`）。

  </Accordion>
  <Accordion title="Archives"
    Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Native OpenClaw 插件存档必须在解压后的插件根目录下包含一个有效的 `openclaw.plugin.json`；仅包含 `package.json` 的存档会在 OpenClaw 写入安装记录之前被拒绝。

    Claude marketplace 安装也受支持。

  </Accordion>
</AccordionGroup>

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 现在也优先使用 ClawHub 来处理裸 npm-safe 插件规范。仅当 npm 没有该包或版本时才会回退到 ClawHub：

```bash
openclaw plugins install openclaw-codex-app-server
```

使用 `npm:` 强制仅解析 npm，例如当 ClawHub 无法访问，或者您知道该包仅存在于 npm 上时：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 从 ClawHub 下载软件包存档，检查声明的插件 API / 最低网关兼容性，然后通过常规存档路径进行安装。记录的安装会保留其 ClawHub 源元数据以便稍后更新。

未指定版本的 ClawHub 安装会保留一个未指定版本的记录规范，以便 `openclaw plugins update` 可以跟随 ClawHub 的较新版本；显式版本或标签选择器（如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`）将保持固定到该选择器。

#### Marketplace 简写

当 marketplace 名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递 marketplace 源时，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace sources"
    - 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
    - 本地 marketplace 根目录或 `marketplace.json` 路径
    - GitHub 仓库简写，如 `owner/repo`
    - GitHub 仓库 URL，如 `https://github.com/owner/repo`
    - git URL
  </Tab>
  <Tab title="Remote marketplace rules">
    对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径插件源。
  </Tab>
</Tabs>

对于本地路径和归档文件，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容的包 (`.codex-plugin/plugin.json`)
- Claude 兼容的包 (`.claude-plugin/plugin.json` 或默认的 Claude 组件布局)
- Cursor 兼容的包 (`.cursor-plugin/plugin.json`)

<Note>兼容的包会安装到常规插件根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持包技能、Claude command-skills、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单声明的 `lspServers` 默认值、Cursor command-skills 以及兼容的 Codex hook 目录；其他检测到的包功能会在诊断/信息中显示，但尚未连接到运行时执行。</Note>

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  仅显示已启用的插件。
</ParamField>
<ParamField path="--verbose" type="boolean">
  从表格视图切换到每个插件的详细行，其中包含来源/产地/版本/激活元数据。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的清单以及注册表诊断。
</ParamField>

<Note>
  `plugins list` 首先读取持久化的本地插件注册表，当注册表缺失或无效时，使用仅从清单派生的回退机制。这对于检查插件是否已安装、已启用以及在冷启动规划中是否可见非常有用，但它不是对正在运行的 Gateway(网关) 进程的实时运行时探测。在更改插件代码、启用状态、钩子策略或 `plugins.load.paths` 后，在期望新的 `register(api)` 代码或钩子运行之前，请重启服务于该渠道的
  Gateway(网关)。对于远程/容器部署，请验证您正在重启实际的 `openclaw gateway run` 子进程，而不仅仅是包装进程。
</Note>

对于打包的 Docker 镜像中的捆绑插件工作，请将插件源目录绑定挂载到匹配的打包源路径上，例如 `/app/extensions/synology-chat`。OpenClaw 将在 `/app/dist/extensions/synology-chat` 之前发现该挂载的源覆盖层；普通的复制源目录保持惰性，因此正常的打包安装仍使用编译后的 dist。

对于运行时钩子调试：

- `openclaw plugins inspect <id> --json` 显示来自模块加载检查阶段的已注册钩子和诊断信息。
- `openclaw gateway status --deep --require-rpc` 确认可访问的 Gateway(网关)、服务/进程提示、配置路径和 RPC 运行状况。
- 非捆绑的对话钩子（`llm_input`、`llm_output`、`before_agent_finalize`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` 不支持与 `--link` 一起使用，因为链接安装会重用源路径，而不是复制到受管理的安装目标。

在 npm 安装上使用 `--pin`，可以在保持默认行为未固定的情况下，将解析出的确切规范（`name@version`）保存在受管理的插件索引中。

</Note>

### 插件索引

插件安装元数据是机器管理的状态，而非用户配置。安装和更新操作会将其写入活动 OpenClaw 状态目录下的 `plugins/installs.json` 中。其顶层的 `installRecords` 映射是安装元数据的持久来源，包含损坏或缺失的插件清单记录。`plugins` 数组是派生自清单的冷注册表缓存。该文件包含请勿编辑的警告，并由 `openclaw plugins update`、卸载、诊断和冷插件注册表使用。

当 OpenClaw 在配置中看到已发布的旧版 `plugins.installs` 记录时，它会将其移动到插件索引中并删除配置键；如果任一写入操作失败，将保留配置记录，以免丢失安装元数据。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、持久化的插件索引、插件允许/拒绝列表条目以及适用的关联 `plugins.load.paths` 条目中移除插件记录。除非设置了 `--keep-files`，否则当受跟踪的托管安装目录位于 OpenClaw 的插件扩展根目录下时，卸载操作也会将其移除。对于活动的内存插件，内存槽位将重置为 `memory-core`。

<Note>`--keep-config` 作为 `--keep-files` 的已弃用别名受到支持。</Note>

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于托管插件索引中已跟踪的插件安装以及 `hooks.internal.installs` 中已跟踪的 hook-pack 安装。

<AccordionGroup>
  <Accordion title="解析插件 ID 与 npm 规范">
    当您传递插件 ID 时，OpenClaw 会重用该插件的已记录安装规范。这意味着先前存储的 dist-tags（如 `@beta`）和精确固定的版本将在后续 `update <id>` 运行中继续被使用。

    对于 npm 安装，您还可以传递带有 dist-tag 或精确版本的显式 npm 包规范。OpenClaw 会将该包名称解析回已跟踪的插件记录，更新该已安装的插件，并记录新的 npm 规范以便将来基于 ID 的更新。

    传递不带版本或标签的 npm 包名称也会解析回已跟踪的插件记录。当插件被固定到精确版本并且您想将其移回注册表的默认发布线时，请使用此方法。

  </Accordion>
  <Accordion title="版本检查和完整性偏移">
    在实时 npm 更新之前，OpenClaw 会根据 npm 注册表元数据检查已安装的包版本。如果已安装的版本和记录的工件标识已匹配解析的目标，则会跳过更新，而不下载、重新安装或重写 `openclaw.json`。

    当存在存储的完整性哈希且获取的工件哈希发生变化时，OpenClaw 将其视为 npm 工件偏移。交互式 `openclaw plugins update` 命令会打印预期哈希和实际哈希，并在继续之前请求确认。非交互式更新助手将执行失败关闭，除非调用方提供显式的继续策略。

  </Accordion>
  <Accordion title="更新时的 --dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` 也可在 `plugins update` 上作为“应急”覆盖选项使用，以解决插件更新期间内置危险代码扫描的误报问题。它仍然不会绕过插件 `before_install` 策略阻止或扫描失败阻止，并且仅适用于插件更新，不适用于 hook-pack 更新。
  </Accordion>
</AccordionGroup>

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度自省。显示身份、加载状态、来源、已注册的功能、钩子、工具、命令、服务、网关方法、HTTP 路由、策略标志、诊断信息、安装元数据、包功能以及检测到的任何 MCP 或 LSP 服务器支持。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种功能类型（例如仅提供商的插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅钩子，没有功能或界面
- **non-capability** — 工具/命令/服务但没有功能

有关功能模型的更多信息，请参阅 [Plugin shapes](/zh/plugins/architecture#plugin-shapes)。

<Note>`--json` 标志输出适合脚本和审计的机器可读报告。`inspect --all` 呈现一个范围广泛的表格，其中包含形状、功能类型、兼容性通知、包功能和钩子摘要列。`info` 是 `inspect` 的别名。</Note>

### 医生

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断和兼容性通知。当一切正常时，它会打印 `No plugin issues detected.`

对于模块形状故障（如缺少 `register`/`activate` 导出），请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以便在诊断输出中包含紧凑的导出形状摘要。

### 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 的持久化冷读取模型，用于存储已安装插件的身份、启用状态、源元数据和贡献所有权。正常启动、提供商所有者查找、渠道设置分类和插件清单可以在不导入插件运行时模块的情况下读取它。

使用 `plugins registry` 检查持久化注册表是否存在、是当前版本还是已过期。使用 `--refresh` 从持久化插件索引、配置策略和清单/包元数据重建它。这是一条修复路径，而不是运行时激活路径。

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` 是一个已弃用的应急兼容性开关，用于注册表读取失败。首选 `plugins registry --refresh` 或 `openclaw doctor --fix`；环境变量回退仅用于在迁移推出期间的紧急启动恢复。</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 列表接受本地 marketplace 路径、`marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。`--json` 会打印解析的源标签以及解析的 marketplace 清单和插件条目。

## 相关

- [构建插件](/zh/plugins/building-plugins)
- [CLI 参考](/zh/cli)
- [社区插件](/zh/plugins/community)
