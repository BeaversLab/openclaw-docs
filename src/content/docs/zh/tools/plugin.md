---
summary: "OpenClaw安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "安装与配置"
---

插件通过新功能扩展 OpenClaw：渠道、模型提供商、智能体 驱动程序、工具、技能、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取、Web 搜索等。有些插件是 **核心**（随 OpenClaw 附带），有些是 **外部**。大多数外部插件通过 [ClawHub](/zh/clawhub) 发布和发现。在迁移完成期间，Npm 仍支持直接安装以及临时的一组 OpenClaw 拥有的插件包。

## 快速开始

有关复制粘贴安装、列出、卸载、更新和发布示例，请参阅[管理插件](/zh/plugins/manage-plugins)。

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

插件依赖安装仅在显式安装/更新或 doctor 修复流程期间进行。Gateway(网关) 启动、配置重新加载和运行时检查不会运行包管理器或修复依赖树。本地插件必须已安装其依赖项，而 npm、git 和 ClawHub 插件则安装在 OpenClaw 的受管插件根目录下。npm 依赖项可能会在 OpenClaw 的受管 npm 根目录中被提升；安装/更新会先扫描该受管根目录，然后信任和卸载会通过 npm 移除由 npm 管理的包。外部插件和自定义加载路径仍需通过 `openclaw plugins install` 安装。使用 `openclaw plugins list --json` 可查看每个可见插件的静态 `dependencyStatus`，而无需导入运行时代码或修复依赖项。请参阅[插件依赖解析](/zh/plugins/dependency-resolution)了解安装时的生命周期。

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

放入全局扩展根目录中的未跟踪目录会被视为本地源代码检出，并且可以直接加载 TypeScript 入口。如果目录仍由安装记录命名，包括 `installPath` 或 `sourcePath`，它们将保持受管状态，即使全局扫描看到了它们，也仍需满足编译输出的要求。如果您有意将受管安装转换为未跟踪的本地检出，请先使用卸载或 doctor 清理功能删除过时的安装记录。

如果托管软件包警告提示 `requires compiled runtime output for TypeScript entry ...`，则表示该软件包发布时未包含 OpenClaw 运行时所需的 JavaScript 文件。这是插件打包问题，而非本地配置问题。请在发布者重新发布编译后的 JavaScript 后更新或重新安装该插件，或者在提供修复后的软件包之前禁用/卸载该插件。

当已发布的运行时文件不在与源条目相同的路径中时，请使用 `openclaw.runtimeExtensions`。如果存在此字段，`runtimeExtensions` 必须为每个 `extensions` 条目包含确切的一个条目。列表不匹配会导致安装和插件发现失败，而不是静默回退到源路径。如果您还发布了 `openclaw.setupEntry`，请为已构建的 JavaScript 对应文件使用 `openclaw.runtimeSetupEntry`；声明时该文件是必需的。

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

### 迁移期间的 OpenClaw 拥有的 npm 包

ClawHub 是大多数插件的主要分发途径。当前的打包 OpenClaw 版本已经捆绑了许多官方插件，因此在正常设置中不需要单独进行 npm 安装。在每个 OpenClaw 拥有的插件都迁移到 ClawHub 之前，OpenClaw 仍在 npm 上提供一些 `@openclaw/*` 插件包，用于旧版/自定义安装和直接的 npm 工作流。

如果 npm 将某个 `@openclaw/*` 插件包报告为已弃用，则该包版本来自较旧的外部包系列。在发布新的 OpenClaw 包之前，请使用当前 npm 中捆绑的插件或本地检出版本。

| 插件            | 包                         | 文档                                          |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/zh/channels/discord)               |
| 飞书            | `@openclaw/feishu`         | [飞书](/zh/channels/feishu)                   |
| Matrix          | `@openclaw/matrix`         | [Matrix](/zh/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/zh/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/zh/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/zh/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/zh/channels/nostr)                   |
| 群晖 Chat       | `@openclaw/synology-chat`  | [Synology Chat](/zh/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](Tlon/en/channels/tlon)                 |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](WhatsApp/en/channels/whatsapp)     |
| Zalo            | `@openclaw/zalo`           | [Zalo](/zh/channels/zalo)                     |
| Zalo 个人       | `@openclaw/zalouser`       | [Zalo 个人](/zh/plugins/zalouser)             |

### 核心（随 OpenClaw 提供）

<AccordionGroup>
  <Accordion title="模型提供商（默认启用）">
    `anthropic`、 `byteplus`、 `cloudflare-ai-gateway`、 `github-copilot`、 `google`、
    `huggingface`、 `kilocode`、 `kimi-coding`、 `minimax`、 `mistral`、 `qwen`、
    `moonshot`、 `nvidia`、 `openai`、 `opencode`、 `opencode-go`、 `openrouter`、
    `qianfan`、 `synthetic`、 `together`、 `venice`、
    `vercel-ai-gateway`、 `volcengine`、 `xiaomi`、 `zai`
  </Accordion>

  <Accordion title="Memory plugins">
    - `memory-core` - 捆绑的内存搜索（通过 `plugins.slots.memory` 默认启用）
    - `memory-lancedb` - 由 LanceDB 支持的长期内存，具有自动召回/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）

    参阅 [Memory LanceDB](/zh/plugins/memory-lancedb) 了解 OpenAI 兼容
    的嵌入设置、Ollama 示例、召回限制和故障排除。

  </Accordion>

<Accordion title="语音提供商（默认启用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Other">
    - `browser` - 用于浏览器工具的捆绑浏览器插件，`openclaw browser`CLI CLI，`browser.request` 网关方法，浏览器运行时以及默认浏览器控制服务（默认启用；在替换之前请禁用它）
    - `copilot-proxy` - VS Code Copilot 代理桥接（默认禁用）

  </Accordion>
</AccordionGroup>

正在寻找第三方插件？请参阅 [ClawHub](/zh/clawhub)。

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

| 字段               | 描述                                             |
| ------------------ | ------------------------------------------------ |
| `enabled`          | 主开关（默认值：`true`）                         |
| `allow`            | 插件允许列表（可选）                             |
| `bundledDiscovery` | 打包插件发现模式（默认为 `allowlist`）           |
| `deny`             | 插件拒绝列表（可选；拒绝优先）                   |
| `load.paths`       | 额外的插件文件/目录                              |
| `slots`            | 独占插槽选择器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>`   | 每个插件的开关 + 配置                            |

`plugins.allow` 是互斥的。当它非空时，只有列出的插件可以加载
或暴露工具，即使 `tools.allow` 包含 `"*"` 或特定的插件拥有
的工具名称。如果工具允许列表引用了插件工具，请将拥有者插件 ID
添加到 `plugins.allow` 或移除 `plugins.allow`；`openclaw doctor` 会针对此
情况发出警告。

对于新配置，`plugins.bundledDiscovery` 默认为 `"allowlist"`，因此受限的 `plugins.allow` 清单也会阻止省略的捆绑提供商插件，包括运行时网络搜索提供商发现。Doctor 在迁移过程中会给旧版受限的允许列表配置打上 `"compat"` 标记，以便在操作员选择加入更严格模式之前，升级操作将保持旧版捆绑提供商的行为。空的 `plugins.allow` 仍被视为未设置/开放。

通过 `/plugins enable` 或 `/plugins disable` 进行的配置更改会触发进程内的 Gateway(网关) 插件重新加载。新的 agent 轮次会从刷新的插件注册表中重建其工具列表。安装、更新和卸载等更改源的操作仍会重启 Gateway(网关) 进程，因为已导入的插件模块无法安全地原地替换。

`openclaw plugins list` 是本地插件注册表/配置快照。其中的 `enabled`Gateway(网关) 插件表示持久化注册表和当前配置允许该插件参与。这并不能证明已在运行的远程 Gateway(网关) 已重新加载或重启为相同的插件代码。在带有包装进程的 VPS/容器设置中，请将重启或触发重新加载的写入发送到实际的 `openclaw gateway run` 进程，或者在重新加载报告失败时，对正在运行的 Gateway(网关) 使用 `openclaw gateway restart`Gateway(网关)。

<Accordion title="插件状态：已禁用、缺失还是无效"Gateway(网关)>
  - **已禁用**：插件存在，但启用规则将其关闭。配置被保留。
  - **缺失**：配置引用了一个发现机制未找到的插件 ID。
  - **无效**：插件存在，但其配置与声明的架构不匹配。Gateway(网关) 启动时仅跳过该插件；`openclaw doctor --fix` 可以通过禁用并移除其配置有效载荷来隔离无效条目。

</Accordion>

## 设备发现与优先级

OpenClaw 按以下顺序扫描插件（匹配优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` - 显式文件或目录路径。指向 OpenClaw 自身打包的捆绑插件目录的路径将被忽略；
    运行 `openclaw doctor --fix` 以删除这些过时的别名。
  </Step>

  <Step title="工作区插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    随 OpenClaw 一起提供。许多插件默认处于启用状态（模型提供商，语音）。
    其他插件则需要明确启用。
  </Step>
</Steps>

打包安装和 Docker 镜像通常从编译后的 `dist/extensions` 树中解析捆绑的插件。如果捆绑的插件源目录被绑定挂载到匹配的打包源路径上，例如 `/app/extensions/synology-chat`OpenClaw，OpenClaw 会将该挂载的源目录视为捆绑源覆盖层，并在打包的 `/app/dist/extensions/synology-chat` 包之前发现它。这使得维护者容器循环能够继续工作，而无需将每个捆绑的插件切换回 TypeScript 源码。设置 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 以强制使用打包的 dist 包，即使存在源码覆盖挂载。

### 启用规则

- `plugins.enabled: false` 禁用所有插件并跳过插件的发现/加载工作
- `plugins.deny` 总是优先于允许
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件 **默认禁用**（必须显式启用）
- 打包插件遵循内置的默认启用集合，除非被覆盖
- 独占插槽可以强制启用该插槽选定的插件
- 当配置指定了插件拥有的表面（例如提供商模型引用、渠道配置或工具运行时）时，某些捆绑的可选插件会自动启用
- 当 `plugins.enabled: false` 处于活动状态时，过时的插件配置会被保留；如果您希望删除过时的 ID，请在运行清理程序之前重新启用插件
- OpenAI 系列 Codex 路由保持独立的插件边界：
  `openai-codex/*` 属于 OpenAI 插件，而捆绑的 Codex
  应用服务器插件则通过规范 `openai/*` 代理引用、明确的
  提供商/模型 `agentRuntime.id: "codex"` 或旧版 `codex/*` 模型引用来选择

## 运行时挂钩故障排除

如果插件出现在 `plugins list` 中，但 `register(api)` 副作用或挂钩未在实时聊天流量中运行，请首先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc` 并确认活动的 Gateway(网关) URL、配置文件、配置路径和进程是您正在编辑的那些。
- 在插件安装/配置/代码更改后，重启正在运行的 Gateway(网关)。在包装容器中，PID 1 可能仅是主管进程；请重启或向子进程 `openclaw gateway run` 发送信号。
- 使用 `openclaw plugins inspect <id> --runtime --json` 确认钩子注册和诊断。非打包的对话钩子，例如 `before_model_resolve`、`before_agent_reply`、`before_agent_run`、`llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end` 需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，首选 `before_model_resolve`。它在代理轮次的模型解析之前运行；`llm_output` 仅在模型尝试生成助手输出之后运行。
- 要验证有效的会话模型，请使用 `openclaw sessions`Gateway(网关)Gateway(网关) 或 Gateway(网关) 的 会话/status 界面；在调试提供商负载时，请使用 `--raw-stream --raw-stream-path <path>` 启动 Gateway(网关)。

### 插件工具设置缓慢

如果代理轮次在准备工具时似乎停滞，请启用跟踪日志并检查插件工具工厂计时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要列出了总工厂时间以及最慢的插件工具工厂，包括插件 ID、声明的工具名称、结果形状以及工具是否可选。当单个工厂耗时至少 1 秒或插件工具工厂准备总时间至少 5 秒时，慢速行将被提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便在相同的有效请求上下文中进行重复解析。缓存键包括有效的运行时配置、工作区、代理/会话 ID、沙箱策略、浏览器设置、交付上下文、请求者身份和所有权状态，因此依赖于这些受信任字段的工厂会在上下文更改时重新运行。

如果某个插件占用了大部分时间，请检查其运行时注册项：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖项加载移至工具执行路径之后，而不是在工具工厂内部进行。

### 重复的渠道或工具所有权

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这意味着有多个已启用的插件试图拥有相同的渠道、设置流程或工具名称。最常见的原因是，外部渠道插件与现在提供相同渠道 ID 的捆绑插件一起安装。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose` 以查看每个已启用的插件及其来源。
- 对每个可疑插件运行 `openclaw plugins inspect <id> --runtime --json` 并
  比较 `channels`、`channelConfigs`、`tools` 和诊断信息。
- 在安装或移除插件包后运行 `openclaw plugins registry --refresh`，以便持久化的元数据反映当前的安装状态。
- 在安装、注册表或配置更改后，重启 Gateway(网关)。

修复选项：

- 如果一个插件有意替换另一个具有相同渠道 ID 的插件，首选插件应使用 `channelConfigs.<channel-id>.preferOver` 声明较低优先级的插件 ID。请参阅 [/plugins/manifest#replacing-another-渠道-plugin](/zh/plugins/manifest#replacing-another-channel-plugin)。
- 如果重复是意外的，请使用 `plugins.entries.<plugin-id>.enabled: false` 禁用其中一方，或移除过时的插件安装。
- 如果您同时显式启用了这两个插件，OpenClaw 将保留该请求并报告冲突。请为该渠道选择一个所有者，或重命名插件拥有的工具，以使运行时界面清晰明确。

## 插件槽位（独占类别）

某些类别是独占的（一次只能激活一个）：

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

| 槽位            | 控制内容              | 默认                |
| --------------- | --------------------- | ------------------- |
| `memory`        | 活动内存插件          | `memory-core`       |
| `contextEngine` | Active context engine | `legacy` (built-in) |

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

捆绑插件随 OpenClaw 一起提供。许多默认启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）。其他捆绑插件仍需 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有的已安装插件或钩子包。请使用
`openclaw plugins update <id-or-npm-spec>` 对已跟踪的 npm 插件进行常规升级。
`--link` 不支持此操作，因为它会重用源路径，而不是复制到受管的安装目标。

当 `plugins.allow` 已设置时，`openclaw plugins install` 会在启用插件之前将已安装的插件 ID 添加到该允许列表中。如果相同的插件 ID 存在于 `plugins.deny` 中，安装过程会移除该过时的拒绝条目，以便在重启后立即加载显式安装的插件。

OpenClaw 维护一个持久的本地插件注册表，作为插件清单、贡献所有权和启动规划的冷读取模型。安装、更新、卸载、启用和禁用流程会在更改插件状态后刷新该注册表。同一个 OpenClaw`plugins/installs.json` 文件在顶级 `installRecords` 中保存持久的安装元数据，并在 `plugins` 中保存可重建的清单元数据。如果注册表丢失、过时或无效，`openclaw plugins registry --refresh` 会根据安装记录、配置策略和清单/包元数据重建其清单视图，而无需加载插件运行时模块。

在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，插件生命周期变更器被禁用。
请改用该安装的 Nix 源来管理插件包选择和配置；对于 nix-openclaw，请从代理优先的
[快速开始](https://github.com/openclaw/nix-openclaw#quick-start) 开始。
`openclaw plugins update <id-or-npm-spec>` 适用于受跟踪的安装。传入带有
分发标签或确切版本的 npm 包规范会将包名
解析回受跟踪的插件记录，并记录新规范以供将来更新。
传入不带版本的包名会将精确固定的安装移回
注册表的默认发布线。如果已安装的 npm 插件已匹配
解析的版本和记录的工件标识，OpenClaw 将跳过更新，
而不下载、重新安装或重写配置。
当 `openclaw update` 在 beta 渠道上运行时，默认线的 npm 和 ClawHub
插件记录会首先尝试 `@beta`，当不存在插件
beta 版本时回退到 default/latest。精确版本和显式标签保持固定。

`--pin`npm 仅支持 npm。它不支持 `--marketplace`npm，因为市场安装会保留市场源元数据而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急覆盖选项。它允许插件安装和更新继续进行，忽略内置的 `critical` 发现结果，但它仍然无法绕过插件 `before_install` 策略阻止或扫描失败阻止。安装扫描会忽略常见的测试文件和目录，例如 `tests/`、`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试模拟；即使声明的插件运行时入口点使用了这些名称之一，它们仍然会被扫描。

此 CLI 标志仅适用于插件安装/更新流程。由 Gateway(网关) 支持的技能依赖项安装改用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是独立的 ClawHub 技能下载/安装流程。

如果您在 ClawHub 上发布的插件被扫描隐藏或阻止，请打开 ClawHub 仪表板或运行 `clawhub package rescan <name>` 来请求 ClawHub 再次检查。`--dangerously-force-unsafe-install` 仅影响您自己机器上的安装；它不会请求 ClawHub 重新扫描该插件或将被阻止的发布版本设为公开。

兼容的包参与相同的插件列表/检查/启用/禁用流程。当前运行时支持包括包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex 挂钩目录。

`openclaw plugins inspect <id>` 还会报告检测到的包功能，以及基于包的插件所支持或不支持的 MCP 和 LSP 服务器条目。

Marketplace 来源可以是来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称、本地 marketplace 根目录或 `marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。对于远程 marketplace，插件条目必须位于克隆的 marketplace 仓库内，并且仅使用相对路径来源。

有关完整详细信息，请参阅 [`openclaw plugins`CLI CLI 参考](/zh/cli/plugins)。

## 插件 API 概述

原生插件会导出一个暴露 `register(api)` 的入口对象。旧版
插件可能仍将 `activate(api)` 用作遗留别名，但新插件应
使用 `register`。

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

OpenClaw 加载入口对象并在插件激活期间调用 `register(api)`。加载器仍然会针对旧插件回退到 `activate(api)`，但捆绑插件和新的外部插件应将 `register` 视为公共约定。

`api.registrationMode` 告知插件加载其入口的原因：

| 模式            | 含义                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------- |
| `full`          | 运行时激活。注册工具、钩子、服务、命令、路由和其他实时副作用。                           |
| `discovery`     | 只读能力发现。注册提供程序和元数据；受信任的插件入口代码可能会加载，但会跳过实时副作用。 |
| `setup-only`    | 通过轻量级设置入口加载通道设置元数据。                                                   |
| `setup-runtime` | 也需要运行时条目的通道设置加载。                                                         |
| `cli-metadata`  | 仅 CLI 命令元数据收集。                                                                  |

打开套接字、数据库、后台工作程序或长期运行客户端的插件条目应使用 `api.registrationMode === "full"` 来保护这些副作用。设备发现加载与激活加载分开缓存，且不会替换正在运行的 Gateway(网关) 注册表。设备发现是非激活的，并非不导入：OpenClaw 可能会评估受信任的插件条目或渠道插件模块以构建快照。保持模块顶层轻量且无副作用，并将网络客户端、子进程、监听器、凭据读取和服务启动移至完整运行时路径之后。

常用注册方法：

| 方法                                    | 注册内容            |
| --------------------------------------- | ------------------- |
| `registerProvider`                      | 模型提供商 (LLM)    |
| `registerChannel`                       | 聊天渠道            |
| `registerTool`                          | 代理工具            |
| `registerHook` / `on(...)`              | 生命周期钩子        |
| `registerSpeechProvider`                | 文本转语音 / STT    |
| `registerRealtimeTranscriptionProvider` | 流式 STT            |
| `registerRealtimeVoiceProvider`         | 双向实时语音        |
| `registerMediaUnderstandingProvider`    | 图像/音频分析       |
| `registerImageGenerationProvider`       | 图像生成            |
| `registerMusicGenerationProvider`       | 音乐生成            |
| `registerVideoGenerationProvider`       | 视频生成            |
| `registerWebFetchProvider`              | Web 获取/抓取提供商 |
| `registerWebSearchProvider`             | Web 搜索            |
| `registerHttpRoute`                     | HTTP 端点           |
| `registerCommand` / `registerCli`       | CLI 命令            |
| `registerContextEngine`                 | 上下文引擎          |
| `registerService`                       | 后台服务            |

类型化生命周期钩子的钩子守卫行为：

- `before_tool_call`：`{ block: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `before_tool_call`：`{ block: false }` 是一个空操作，不会清除之前的块。
- `before_install`：`{ block: true }` 是终结性的；将跳过低优先级的处理程序。
- `before_install`：`{ block: false }` 是一个空操作，不会清除之前的块。
- `message_sending`：`{ cancel: true }` 是终端的；较低优先级的处理程序将被跳过。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除先前的取消。

原生 Codex 应用服务器将桥接 Codex 原生工具事件回传到此挂钩表面。插件可以通过 `before_tool_call` 阻止原生 Codex 工具，通过 `after_tool_call` 观察结果，并参与 Codex `PermissionRequest` 的审批。该桥接尚不重写 Codex 原生工具参数。确切的 Codex 运行时支持边界位于 [Codex harness v1 support contract](/zh/plugins/codex-harness-runtime#v1-support-contract)。

如需完整的类型化 Hook 行为，请参阅 [SDK 概述](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关内容

- [构建插件](/zh/plugins/building-plugins) - 创建您自己的插件
- [插件包](/zh/plugins/bundles) - Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) - 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) - 在插件中添加 Agent 工具
- [插件内部机制](/zh/plugins/architecture) - 能力模型与加载流水线
- [ClawHub](ClawHub/en/clawhub) - 第三方插件发现
