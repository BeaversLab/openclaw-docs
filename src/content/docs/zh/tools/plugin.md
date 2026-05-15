---
summary: "OpenClaw安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "安装与配置"
---

插件为 OpenClaw 带来了新功能：通道、模型提供方、代理连接器、工具、技能、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页获取、网页搜索等等。有些插件是**核心**插件（随 OpenClaw 附带），其他的则是**外部**插件。大多数外部插件通过 [ClawHub](OpenClawOpenClawClawHub/en/clawhubOpenClaw) 发布和发现。在迁移完成之前，npm 仍支持直接安装以及临时的一套 OpenClaw 拥有的插件包。

## 快速开始

有关复制粘贴安装、列出、卸载、更新和发布的示例，请参阅[管理插件](/zh/plugins/manage-plugins)。

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # Search ClawHub plugins
    openclaw plugins search "calendar"

    # From ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # From npm
    openclaw plugins install npm:@acme/openclaw-plugin
    openclaw plugins install npm-pack:./openclaw-plugin-1.2.3.tgz

    # From git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="Gateway(网关)重启 Gateway(网关)">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件中的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>

  <Step title="聊天原生管理"Gateway(网关)>
    在正在运行的 Gateway(网关) 中，仅限所有者使用的 `/plugins enable` 和 `/plugins disable`Gateway(网关)Gateway(网关)
    会触发 Gateway(网关) 配置重新加载器。Gateway(网关) 会在进程中重新加载插件运行时表面，新的 Agent 轮次会从刷新后的注册表中重建工具列表。`/plugins install`Gateway(网关) 会更改插件源代码，因此
    Gateway(网关) 会请求重启，而不是假装当前进程可以安全地重新加载已导入的模块。

  </Step>

  <Step title="验证插件">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # If the plugin registered a CLI root, run one command from that root.
    openclaw <plugin-command> --help
    ```

    当您需要证明已注册的工具、服务、Gateway(网关) 方法、钩子或插件拥有的 CLI 命令时，请使用 `--runtime`CLI。普通的 `inspect` 是一个冷清单/注册表检查，有意避免导入插件运行时。

  </Step>
</Steps>

如果您更喜欢聊天原生控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式 CLI`clawhub:<pkg>`、显式 `npm:<pkg>`、显式 `npm-pack:<path.tgz>`、显式 `git:<repo>`npm 或通过 npm 的裸包规范。

如果配置无效，安装通常会失败并指向 `openclaw doctor --fix`。唯一的恢复例外是针对选择加入 `openclaw.install.allowInvalidConfigRecovery`Gateway(网关) 的插件的一条狭窄的捆绑插件重新安装路径。
在 Gateway(网关) 启动期间，无效的插件配置会像任何其他无效配置一样失败。运行 `openclaw doctor --fix`Gateway(网关) 通过禁用该插件条目并删除其无效的配置负载来隔离不良的插件配置；正常的配置备份会保留以前的值。
当渠道配置引用了不再可发现的插件，但相同的过时插件 ID 仍保留在插件配置或安装记录中时，Gateway(网关) 启动会记录警告并跳过该渠道，而不是阻止所有其他渠道。
运行 `openclaw doctor --fix` 以删除过时的渠道/插件条目；没有过时插件证据的未知渠道键仍然无法通过验证，因此拼写错误仍然可见。
如果设置了 `plugins.enabled: false`Gateway(网关)，过时的插件引用将被视为无效：Gateway(网关) 启动会跳过插件发现/加载工作，并且 `openclaw doctor` 会保留禁用的插件配置而不是自动删除它。如果您希望删除过时的插件 ID，请在运行医生清理之前重新启用插件。

插件依赖安装仅在显式安装/更新或诊断修复流程期间发生。Gateway(网关) 启动、配置重载和运行时检查不会运行包管理器或修复依赖树。本地插件必须已安装其依赖，而 npm、git 和 ClawHub 插件则安装在 OpenClaw 的受管插件根目录下。npm 依赖可能会在 OpenClaw 的受管 npm 根目录内被提升；安装/更新会在信任之前扫描该受管根目录，而卸载会通过 npm 移除 npm 管理的包。外部插件和自定义加载路径仍必须通过 `openclaw plugins install` 进行安装。使用 `openclaw plugins list --json` 查看每个可见插件的静态 `dependencyStatus`，而无需导入运行时代码或修复依赖。有关安装时的生命周期，请参阅 [插件依赖解析](/zh/plugins/dependency-resolution)。

### 阻止的插件路径所有权

如果插件诊断显示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
且随后的配置验证显示 `plugin present but blocked`，则说明 OpenClaw 发现插件文件的所有者与加载它们的进程不同。请保留插件配置不变；请修复文件系统所有权，或以拥有状态目录的同一用户身份运行 OpenClaw。

对于 Docker 安装，官方镜像以 `node` (uid `1000`) 身份运行，因此主机绑挂的 OpenClaw 配置和工作区目录通常应由 uid `1000` 拥有：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您有意以 root 身份运行 OpenClaw，请将受管插件根目录修复为 root 所有权：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修复所有权后，请重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件注册表与修复后的文件相匹配。

对于 npm 安装，可变选择器（如 `latest` 或 dist-tag）会在安装前解析，然后固定到 OpenClaw 托管的 npm 根目录中的确切已验证版本。npm 完成后，OpenClaw 会验证已安装的 `package-lock.json` 条目是否仍与解析出的版本和完整性匹配。如果 npm 写入了不同的包元数据，安装将失败，并且会回滚托管的包，而不是接受不同的插件产物。托管的 npm 根目录还会继承 OpenClaw 的包级 npm `overrides`，因此保护打包主机的安全固定项也适用于提升的外部插件依赖项。

源代码检出是 pnpm 工作区。如果您克隆 OpenClaw 以修改捆绑插件，请运行 `pnpm install`；然后 OpenClaw 会从 `extensions/<id>` 加载捆绑插件，以便直接使用编辑和包本地依赖项。普通的 npm 根安装适用于打包的 OpenClaw，而不适用于源代码检出开发。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作原理                                           | 示例                                                   |
| ---------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程内执行  | 官方插件、社区 npm 包                                  |
| **捆绑包** | Codex/Claude/Cursor 兼容布局；映射到 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关捆绑包的详细信息，请参阅[插件捆绑包](/zh/plugins/bundles)。

如果您正在编写原生插件，请从[构建插件](/zh/plugins/building-plugins)和[插件 SDK 概述](/zh/plugins/sdk-overview)开始。

## 包入口点

原生插件 npm 包必须在 `package.json` 中声明 npm`openclaw.extensions`。
每个条目必须保留在包目录内，并解析为可读的运行时文件，或解析为 TypeScript 源文件，并附带推断的已构建 JavaScript 同级文件，例如从 `src/index.ts` 到 `dist/index.js`。
打包安装必须包含该 JavaScript 运行时输出。TypeScript 源文件回退机制仅适用于源代码检出和本地开发路径，不适用于安装到 npm 托管插件根目录中的 OpenClaw 包。

如果托管包警告提示其 `requires compiled runtime output for
TypeScript entry ...`，则说明该包在发布时未包含 OpenClaw 运行时所需的 JavaScript 文件。
这是插件打包问题，而非本地配置问题。请在发布者重新发布编译后的 JavaScript 后更新或重新安装该插件，或者在修复的包可用之前禁用/卸载该插件。

当发布的运行时文件与源条目路径不同时，请使用 `openclaw.runtimeExtensions`。如果存在，`runtimeExtensions` 必须为每个 `extensions` 条目包含确切的一个条目。
列表不匹配将导致安装和插件发现失败，而不是静默回退到源路径。如果您还发布 `openclaw.setupEntry`，请使用 `openclaw.runtimeSetupEntry` 指向其已构建的 JavaScript 同级文件；如果声明了该文件，则必须提供。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方插件

### 迁移期间的 OpenClaw 所有的 npm 包

ClawHub 是大多数插件的主要分发途径。当前的 OpenClaw 打包版本已经捆绑了许多官方插件，因此在常规设置中不需要单独安装 npm。
在所有 OpenClaw 所有的插件迁移到 ClawHub 之前，OpenClaw 仍在 npm 上发布一些 `@openclaw/*` 插件包，用于旧版/自定义安装和直接的 npm 工作流。

如果 npm 报告某个 npm`@openclaw/*` 插件包已弃用，则该包版本来自较旧的外部包系列。请使用当前 OpenClaw 中捆绑的插件或本地检出版本，直到发布更新的 npm 包。

| 插件            | 包                         | 文档                                          |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/zh/channels/discord)               |
| 飞书            | `@openclaw/feishu`         | [飞书](/zh/channels/feishu)                   |
| Matrix          | `@openclaw/matrix`         | [Matrix](/zh/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/zh/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/zh/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/zh/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/zh/channels/nostr)                   |
| 群晖 Chat       | `@openclaw/synology-chat`  | [群晖 Chat](/zh/channels/synology-chat)       |
| Tlon            | `@openclaw/tlon`           | [Tlon](/zh/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/zh/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/zh/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/zh/plugins/zalouser)         |

### 核心（随 OpenClaw 附带）

<AccordionGroup>
  <Accordion title="模型提供商（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="记忆插件">
    - `memory-core` - 捆绑的记忆搜索（默认通过 `plugins.slots.memory`）
    - `memory-lancedb` - 基于 LanceDB 的长期记忆，具有自动回忆/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）

    请参阅 [Memory LanceDB](/zh/plugins/memory-lancedb) 了解与 OpenAI 兼容的
    嵌入设置、Ollama 示例、回忆限制和故障排除。

  </Accordion>

<Accordion title="语音提供商（默认启用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` - 用于浏览器工具的捆绑浏览器插件，`openclaw browser` CLI，`browser.request` 网关方法、浏览器运行时和默认浏览器控制服务（默认启用；在替换前请禁用）
    - `copilot-proxy` - VS Code Copilot 代理桥（默认禁用）

  </Accordion>
</AccordionGroup>

正在寻找第三方插件？请参阅 [ClawHub](ClawHub/en/clawhub)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段               | 描述                                               |
| ------------------ | -------------------------------------------------- |
| `enabled`          | 主开关（默认：`true`）                             |
| `allow`            | 插件允许列表（可选）                               |
| `bundledDiscovery` | 打包插件发现模式（默认为 `allowlist`）             |
| `deny`             | 插件拒绝列表（可选；拒绝优先）                     |
| `load.paths`       | 额外的插件文件/目录                                |
| `slots`            | 排他性插槽选择器（例如 `memory`，`contextEngine`） |
| `entries.\<id\>`   | 每个插件的开关 + 配置                              |

`plugins.allow` 是排他的。当它非空时，只有列出的插件可以加载
或暴露工具，即使 `tools.allow` 包含 `"*"` 或特定的插件拥有的
工具名称。如果工具允许列表引用了插件工具，请将拥有者插件 ID
添加到 `plugins.allow` 或移除 `plugins.allow`；
`openclaw doctor` 会对此形状发出警告。

对于新配置，`plugins.bundledDiscovery` 默认为 `"allowlist"`，因此
限制性的 `plugins.allow` 清单也会阻止被省略的打包提供商
插件，包括运行时网络搜索提供商的发现。在迁移过程中，Doctor 会使用 `"compat"` 标记较旧的
限制性允许列表配置，以便在操作员选择加入更严格模式之前，升级能保持
旧的打包提供商行为。空的 `plugins.allow` 仍被视为未设置/开放。

通过 `/plugins enable` 或 `/plugins disable`Gateway(网关)Gateway(网关) 进行的配置更改会触发
进程内 Gateway(网关) 插件重新加载。新的代理回合会从
刷新的插件注册表重建其工具列表。源更改操作（如安装、
更新和卸载）仍会重启 Gateway(网关) 进程，因为已导入的
插件模块无法就地安全替换。

`openclaw plugins list` 是本地插件注册表/配置的快照。那里的 `enabled` 插件意味着持久化的注册表和当前配置允许该插件参与。这并不证明已经运行的远程 Gateway(网关) 已重新加载或重启到相同的插件代码。在带有包装器进程的 VPS/容器设置中，向实际的 `openclaw gateway run` 进程发送重启或触发重新加载的写入操作，或者在重新加载报告失败时，对正在运行的 Gateway(网关) 使用 `openclaw gateway restart`。

<Accordion title="Plugin states: disabled vs missing vs invalid">
  - **Disabled**（已禁用）：插件存在，但启用规则将其关闭。配置被保留。
  - **Missing**（缺失）：配置引用了一个设备发现未找到的插件 ID。
  - **Invalid**（无效）：插件存在，但其配置与声明的架构不匹配。Gateway(网关) 启动时仅跳过该插件；`openclaw doctor --fix` 可以通过禁用并移除其配置负载来隔离无效条目。

</Accordion>

## 设备发现和优先级

OpenClaw 按以下顺序扫描插件（首次匹配者获胜）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` - 明确的文件或目录路径。指向 OpenClaw 自带打包捆绑插件目录的路径将被忽略；
    运行 `openclaw doctor --fix` 以移除那些过时的别名。
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    随 OpenClaw 一起提供。许多默认启用（模型提供者、语音）。
    其他的需要显式启用。
  </Step>
</Steps>

打包安装和 Docker 镜像通常从已编译的 `dist/extensions` 树中解析捆绑插件。如果将捆绑插件源目录绑定挂载到匹配的打包源路径上，例如 `/app/extensions/synology-chat`，OpenClaw 会将该挂载的源目录视为捆绑源覆盖层，并在打包的 `/app/dist/extensions/synology-chat` 包之前发现它。这使得维护者容器循环能够正常工作，而无需将每个捆绑插件都切换回 TypeScript 源代码。设置 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 可强制使用打包的 dist 包，即使存在源覆盖层挂载也是如此。

### 启用规则

- `plugins.enabled: false` 禁用所有插件并跳过插件发现/加载工作
- `plugins.deny` 总是优先于 allow（允许）
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区起源的插件 **默认禁用**（必须显式启用）
- 除非被覆盖，捆绑插件遵循内置的默认开启集
- 独占插槽可以强制启用该插槽选定的插件
- 当配置命名了插件拥有的表面（例如提供商模型引用、渠道配置或 harness 运行时）时，某些捆绑的可选插件会自动启用
- 当 `plugins.enabled: false` 处于活动状态时，过时的插件配置将被保留；如果您希望删除过时的 ID，请在运行清理程序之前重新启用插件
- OpenAI 系列 Codex 路由保持独立的插件边界：`openai-codex/*` 属于 OpenAI 插件，而捆绑的 Codex 应用服务器插件由规范的 `openai/*` agent 引用、显式的提供商/模型 `agentRuntime.id: "codex"` 或遗留的 `codex/*` 模型引用选择

## 运行时挂钩故障排除

如果插件出现在 `plugins list` 中，但 `register(api)` 副作用或挂钩未在实时聊天流量中运行，请首先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc` 并确认活动的 Gateway(网关) URL、配置文件、配置路径和进程是您正在编辑的那些。
- 在插件安装/配置/代码更改后，重启正在运行的 Gateway(网关)。在包装容器中，PID 1 可能只是一个监督程序；请重启或向子 Gateway(网关)`openclaw gateway run` 进程发送信号。
- 使用 `openclaw plugins inspect <id> --runtime --json` 确认钩子注册和诊断。非捆绑的对话钩子（如 `before_model_resolve`、`before_agent_reply`、`before_agent_run`、`llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，首选 `before_model_resolve`。它在代理轮次的模型解析之前运行；`llm_output` 仅在模型尝试生成助手输出之后运行。
- 要验证有效的会话模型，请使用 `openclaw sessions`Gateway(网关)Gateway(网关) 或 Gateway(网关) 会话/状态界面，并在调试提供商负载时，使用 `--raw-stream --raw-stream-path <path>` 启动 Gateway(网关)。

### 插件工具设置缓慢

如果代理轮次在准备工具时似乎停滞不前，请启用跟踪日志并检查插件工具工厂计时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要列出了总工厂时间和最慢的插件工具工厂，包括插件 ID、声明的工具名称、结果形状以及工具是否可选。当单个工厂耗时至少 1 秒或插件工具工厂准备总耗时至少 5 秒时，慢速行将提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便在具有相同有效请求上下文的重复解析中使用。缓存键包括有效的运行时配置、工作区、代理/会话 ID、沙箱策略、浏览器设置、交付上下文、请求者身份和所有权状态，因此依赖这些受信任字段的工厂会在上下文更改时重新运行。

如果某个插件占用了大部分时间，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖项加载移至工具执行路径之后，而不是在工具工厂内部进行。

### 渠道或工具所有权重复

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这意味着有多个已启用的插件试图拥有同一个渠道、设置流或工具名称。最常见的原因是安装了一个外部渠道插件，而某个现在提供相同渠道 ID 的捆绑插件也已存在。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose` 以查看每个已启用的插件
  及其来源。
- 对每个可疑的插件运行 `openclaw plugins inspect <id> --runtime --json` 并
  比较 `channels`、`channelConfigs`、`tools` 和诊断信息。
- 在安装或删除插件包后运行 `openclaw plugins registry --refresh`，
  以便持久化的元数据能反映当前的安装情况。
- 在安装、注册表或配置更改后，重启 Gateway(网关)。

修复选项：

- 如果一个插件有意为相同的渠道 ID 替换另一个插件，
  首选插件应使用优先级较低的插件 ID 声明 `channelConfigs.<channel-id>.preferOver`。请参阅 [/plugins/manifest#replacing-another-渠道-plugin](/zh/plugins/manifest#replacing-another-channel-plugin)。
- 如果重复是意外的，请使用
  `plugins.entries.<plugin-id>.enabled: false` 禁用其中一方，或者删除
  过时的插件安装。
- 如果您显式启用了这两个插件，OpenClaw 将保留该请求
  并报告冲突。请为该渠道选择一个所有者，或者重命名插件拥有的工具，
  以使运行时界面明确无误。

## 插件插槽（独占类别）

某些类别是独占的（一次只能有一个处于活动状态）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| 插槽            | 控制内容       | 默认值           |
| --------------- | -------------- | ---------------- |
| `memory`        | 活动记忆插件   | `memory-core`    |
| `contextEngine` | 活动上下文引擎 | `legacy`（内置） |

## CLI 参考

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins search <query>            # search ClawHub plugin catalog
openclaw plugins inspect <id>              # static detail
openclaw plugins inspect <id> --runtime    # registered hooks/tools/CLI/gateway methods
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install from npm by default
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install git:<repo>        # install from git
openclaw plugins install git:<repo>@<ref>  # install from git ref
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

# Verify runtime registrations after install.
openclaw plugins inspect <id> --runtime --json

# Run plugin-owned CLI commands directly from the OpenClaw root CLI.
openclaw <plugin-command> --help

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑插件随 OpenClaw 一起提供。许多插件默认处于启用状态（例如
捆绑的模型提供商、捆绑的语音提供商以及捆绑的浏览器
插件）。其他捆绑插件仍需要 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有的已安装插件或挂钩包。对于已跟踪的 npm 插件的常规升级，请使用 `openclaw plugins update <id-or-npm-spec>`npm。它不支持与 `--link` 一起使用，因为后者会重用源路径，而不是复制到受管的安装目标。

当 `plugins.allow` 已设置时，`openclaw plugins install` 会在启用插件之前将已安装的插件 ID 添加到该允许列表中。如果相同的插件 ID 存在于 `plugins.deny` 中，安装操作将删除该过时的拒绝条目，以便在重启后立即可以加载显式安装的插件。

OpenClaw 维护一个持久的本地插件注册表，作为插件清单、贡献所有权和启动规划的冷读取模型。安装、更新、卸载、启用和禁用流程会在更改插件状态后刷新该注册表。同一个 OpenClaw`plugins/installs.json` 文件在顶层的 `installRecords` 中保存持久的安装元数据，并在 `plugins` 中保存可重建的清单元数据。如果注册表缺失、过时或无效，`openclaw plugins registry --refresh` 会根据安装记录、配置策略和清单/包元数据重建其清单视图，而无需加载插件运行时模块。

在 Nix 模式 (Nix`OPENCLAW_NIX_MODE=1`Nix) 下，插件生命周期变更器已禁用。
请改为通过安装的 Nix 源管理插件包选择和配置；对于 nix-openclaw，请从 agent-first
[快速开始](https://github.com/openclaw/nix-openclaw#quick-start) 开始。
`openclaw plugins update <id-or-npm-spec>`npmnpmOpenClaw 适用于已跟踪的安装。传递带有 dist-tag 或确切版本的
npm 包规范会将包名称解析回已跟踪的插件记录，并记录新规范以供将来更新。
传递不带版本的包名称会将精确固定的安装恢复到注册表的默认发布线。
如果已安装的 npm 插件已匹配解析的版本和记录的工件身份，OpenClaw 将跳过更新，
而无需下载、重新安装或重写配置。
当 `openclaw update`npmClawHub 在 beta 渠道上运行时，默认线的 npm 和 ClawHub
插件记录会首先尝试 `@beta`，并在不存在插件 beta 版本时回退到 default/latest。
确切版本和显式标签保持固定。

`--pin`npm 仅适用于 npm。它不支持 `--marketplace`npm，因为
marketplace 安装持久化的是 marketplace 源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急覆盖选项。
它允许插件安装和插件更新继续执行，忽略内置 `critical` 发现，但它仍然
不会绕过插件 `before_install` 策略阻止或扫描失败阻止。
安装扫描会忽略常见的测试文件和目录，例如 `tests/`、
`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试模拟；
声明的插件运行时入口点即使使用这些名称之一，仍然会被扫描。

此 CLI 标志仅适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖项安装改用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是独立的 ClawHub 技能下载/安装流程。

如果您在 ClawHub 上发布的插件被扫描隐藏或阻止，请打开 ClawHub 仪表板或运行 `clawhub package rescan <name>` 请求 ClawHub 重新检查它。`--dangerously-force-unsafe-install` 仅影响您自己机器上的安装；它不会请求 ClawHub 重新扫描插件或使被阻止的版本公开。

兼容的捆绑包参与相同的插件列表/检查/启用/禁用流程。当前的运行时支持包括捆绑包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex 挂钩目录。

`openclaw plugins inspect <id>` 还会报告检测到的捆绑包功能，以及捆绑包支持插件的受支持或不受支持的 MCP 和 LSP 服务器条目。

Marketplace 源可以是 `~/.claude/plugins/known_marketplaces.json` 中的 Claude 已知 marketplace 名称、本地 marketplace 根目录或 `marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。对于远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内，并且仅使用相对路径源。

有关完整详细信息，请参阅 [`openclaw plugins` CLI 参考](/zh/cli/plugins)。

## 插件 API 概述

原生插件导出一个暴露 `register(api)` 的入口对象。较旧的插件可能仍将 `activate(api)` 用作传统别名，但新插件应使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 在插件激活期间加载入口对象并调用 OpenClaw`register(api)`。对于旧插件，加载器仍然会回退到 `activate(api)`，但打包插件和新的外部插件应将 `register` 视为公共契约。

`api.registrationMode` 告诉插件其入口被加载的原因：

| 模式            | 含义                                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| `full`          | 运行时激活。注册工具、钩子、服务、命令、路由和其他实时副作用。                       |
| `discovery`     | 只读功能发现。注册提供商和元数据；受信任的插件入口代码可能会加载，但跳过实时副作用。 |
| `setup-only`    | 通过轻量级设置入口进行渠道设置元数据加载。                                           |
| `setup-runtime` | 还需要运行时入口的渠道设置加载。                                                     |
| `cli-metadata`  | 仅收集 CLI 命令元数据。                                                              |

打开套接字、数据库、后台工作器或长生命周期的客户端的插件入口应该使用 `api.registrationMode === "full"`Gateway(网关)OpenClaw 来保护这些副作用。发现加载与激活加载是分开缓存的，并且不会替换正在运行的 Gateway(网关) 注册表。发现是非激活的，而不是免导入的：OpenClaw 可能会评估受信任的插件入口或渠道插件模块以构建快照。保持模块顶层轻量级且无副作用，并将网络客户端、子进程、监听器、凭据读取和服务启动移至完全运行时路径之后。

常用注册方法：

| 方法                                    | 注册内容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供商 (LLM)      |
| `registerChannel`                       | 聊天渠道              |
| `registerTool`                          | Agent 工具            |
| `registerHook` / `on(...)`              | 生命周期钩子          |
| `registerSpeechProvider`                | 文本转语音 / STT      |
| `registerRealtimeTranscriptionProvider` | 流式 STT              |
| `registerRealtimeVoiceProvider`         | 双工实时语音          |
| `registerMediaUnderstandingProvider`    | 图像/音频分析         |
| `registerImageGenerationProvider`       | 图像生成              |
| `registerMusicGenerationProvider`       | 音乐生成              |
| `registerVideoGenerationProvider`       | 视频生成              |
| `registerWebFetchProvider`              | Web 抓取 / 爬取提供商 |
| `registerWebSearchProvider`             | Web 搜索              |
| `registerHttpRoute`                     | HTTP 端点             |
| `registerCommand` / `registerCli`       | CLI 命令              |
| `registerContextEngine`                 | 上下文引擎            |
| `registerService`                       | 后台服务              |

类型化生命周期挂钩的守卫行为：

- `before_tool_call`: `{ block: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除之前的阻止。
- `before_install`: `{ block: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `before_install`: `{ block: false }` 是空操作，不会清除之前的阻止。
- `message_sending`: `{ cancel: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `message_sending`: `{ cancel: false }` 是空操作，不会清除之前的取消。

原生 Codex 应用服务器运行桥接，将 Codex 原生工具事件回传到此挂钩表面。插件可以通过 `before_tool_call` 阻止原生 Codex 工具，通过 `after_tool_call` 观察结果，并参与 Codex `PermissionRequest` 批准。该桥接尚不重写 Codex 原生工具参数。确切的 Codex 运行时支持边界位于 [Codex harness v1 support contract](/zh/plugins/codex-harness-runtime#v1-support-contract)。

有关完整的类型化挂钩行为，请参阅 [SDK overview](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/zh/plugins/building-plugins) - 创建您自己的插件
- [插件包](/zh/plugins/bundles) - Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) - 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) - 在插件中添加代理工具
- [插件内部原理](/zh/plugins/architecture) - 能力模型与加载流水线
- [ClawHub](ClawHub/en/clawhub) - 第三方插件发现
