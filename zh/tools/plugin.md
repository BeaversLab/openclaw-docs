---
summary: "OpenClaw 插件/扩展：发现、配置和安全"
read_when:
  - 添加或修改插件/扩展
  - 记录插件安装或加载规则
  - 使用 Codex/Claude 兼容的插件包
title: "插件"
---

# 插件（扩展）

## 快速开始（插件新手？）

插件是以下两者之一：

- 原生 **OpenClaw 插件**（`openclaw.plugin.json` + 运行时模块），或者
- 兼容的 **包**（`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`）

两者都会显示在 `openclaw plugins` 下，但只有原生 OpenClaw 插件在进程内执行
运行时代码。

大多数情况下，当你想要一个尚未内置
到核心 OpenClaw 的功能时（或者你想将可选功能保留在主
安装之外），你会使用插件。

快速路径：

1. 查看已加载的内容：

```bash
openclaw plugins list
```

2. 安装官方插件（例如：Voice Call）：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 规范仅限于注册表。有关固定版本、预发布控制和支持的规范格式的详细信息，请参阅 [安装规则](/zh/cli/plugins#install)。

3. 重启 Gateway(网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体的插件示例，请参阅 [Voice Call](/zh/plugins/voice-call)。
正在寻找第三方列表？请参阅 [社区插件](/zh/plugins/community)。
需要包兼容性详细信息？请参阅 [插件包](/zh/plugins/bundles)。

对于兼容的包，从本地目录或存档安装：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

对于 Claude 应用市场安装，先列出市场，然后按
市场条目名称安装：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 从 `~/.claude/plugins/known_marketplaces.json` 解析已知的 Claude 应用市场名称。你也可以使用 `--marketplace` 传递显式的
市场源。

## 对话绑定回调

绑定对话的插件现在可以在审批得到解决时做出反应。

使用 `api.onConversationBindingResolved(...)` 在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调负载字段：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`: 已批准请求的已解析绑定
- `request`: 原始请求摘要、分离提示、发送者 ID 和
  对话元数据

此回调仅用于通知。它不会更改允许绑定对话的对象，
并且在核心批准处理完成后运行。

## 公共能力模型

能力是 OpenClaw 内部的公共 **本机插件** 模型。每个
本机 OpenClaw 插件都会针对一种或多种能力类型进行注册：

| 能力            | 注册方法                                      | 示例插件                  |
| --------------- | --------------------------------------------- | ------------------------- |
| 文本推理        | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| 语音            | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| 图像生成        | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Web 搜索        | `api.registerWebSearchProvider(...)`          | `google`                  |
| 频道 / 消息传递 | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

注册零项能力但提供钩子、工具或
服务的插件是 **仅传统钩子** 插件。该模式仍完全受支持。

### 外部兼容性立场

能力模型已在核心中落地，并被捆绑/本机插件
目前使用，但外部插件兼容性仍需要一个比“它
已导出，因此它已冻结”更严格的标准。

当前指导原则：

- **现有的外部插件：** 保持基于钩子的集成正常工作；将
  此视为兼容性基线
- **新的捆绑/本机插件：** 相比
  特定于供应商的内部访问或新的仅钩子设计，优先使用显式能力注册
- **采用能力注册的外部插件：** 允许，但除非文档明确将
  契约标记为稳定，否则将特定于能力的辅助接口视为正在演进

实用规则：

- 能力注册 API 是预期的发展方向
- 在过渡期间，传统钩子仍然是外部插件最安全的不中断路径
- 导出的辅助子路径并非全都等同；应优先使用窄范围的已文档化约定，而非偶然的辅助导出

### 插件形态

OpenClaw 根据每个已加载插件的实际注册行为（不仅仅是静态元数据）将其归类为一种形态：

- **plain-capability** — 仅注册一种能力类型（例如，仅提供商的插件，如 `mistral`）
- **hybrid-capability** — 注册多种能力类型（例如，`openai` 拥有文本推理、语音、媒体理解和图像生成能力）
- **hook-only** — 仅注册钩子（类型化或自定义），不注册能力、工具、命令或服务
- **non-capability** — 注册工具、命令、服务或路由，但不注册能力

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力细分。详细信息请参阅 [CLI reference](/zh/cli/plugins#inspect)。

### 传统钩子

`before_agent_start` 钩子作为仅钩子插件的兼容路径仍然受到支持。现实中的传统插件仍然依赖于它。

方向：

- 保持其正常工作
- 将其记录为传统（legacy）
- 对于模型/提供商覆盖工作，优先使用 `before_model_resolve`
- 对于提示词变更工作，优先使用 `before_prompt_build`
- 仅在实际使用下降，且装置覆盖率证明迁移安全后移除

### 兼容性信号

当您运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，可能会看到以下标签之一：

| Signal                     | 含义                                             |
| -------------------------- | ------------------------------------------------ |
| **config valid**           | 配置解析正常且插件已解析                         |
| **compatibility advisory** | 插件使用了受支持但较旧的模式（例如 `hook-only`） |
| **legacy warning**         | 插件使用了 `before_agent_start`，该接口已弃用    |
| **hard error**             | 配置无效或插件加载失败                           |

无论是 `hook-only` 还是 `before_agent_start` 目前都不会破坏您的插件 —— `hook-only` 仅是建议性的，而 `before_agent_start` 仅触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构

OpenClaw 的插件系统有四个层级：

1. **清单 + 设备发现**
   OpenClaw 从配置路径、工作区根目录、全局扩展根目录和捆绑扩展中查找候选插件。设备发现首先读取原生 `openclaw.plugin.json` 清单以及支持的捆绑清单。
2. **启用 + 验证**
   核心决定已发现的插件是启用、禁用、阻止，还是被选中用于内存等独占插槽。
3. **运行时加载**
   原生 OpenClaw 插件通过 jiti 在进程内加载，并将功能注册到中央注册表中。兼容的捆绑包被规范化为注册表记录，而无需导入运行时代码。
4. **Surface 消费**
   OpenClaw 的其余部分读取注册表以公开工具、渠道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。

重要的设计边界：

- 设备发现 + 配置验证应能从 **清单/架构元数据** 开始工作，而无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种分离让 OpenClaw 能够在完整运行时激活之前验证配置，解释缺失/禁用的插件，并构建 UI/架构提示。

### 渠道插件和共享消息工具

渠道插件不需要为正常的聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，渠道插件拥有其背后的特定于渠道的发现和执行。

当前的边界是：

- 核心拥有共享的 `message` 工具宿主、提示连接、会话/线程记账和执行分发
- 渠道插件拥有范围化的操作发现、功能发现以及任何特定于渠道的架构片段
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。这个统一的发现调用允许插件一起返回其可见操作、功能和架构贡献，以便这些部分不会分离。

核心将运行时范围传递到该发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信入站 `requesterSenderId`

这对上下文敏感的插件很重要。渠道可以根据活动账户、当前房间/线程/消息或可信请求者身份来隐藏或显示消息操作，而无需在核心 `message` 工具中硬编码特定于渠道的分支。

这就是为什么嵌入式运行器路由更改仍然是插件工作的原因：运行器负责将当前聊天/会话身份转发到插件发现边界，以便共享 `message` 工具为当前轮次暴露正确的渠道拥有的表面。

对于渠道拥有的执行助手，捆绑插件应将执行运行时保留在其自己的扩展模块中。核心不再拥有 Discord、Slack、Telegram 或 WhatsApp 在 `src/agents/tools` 下的消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入其自己的本地运行时代码。

特别是对于投票，有两个执行路径：

- `outbound.sendPoll` 是适合常见投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是针对特定于渠道的投票语义或额外投票参数的首选路径

核心现在将共享投票解析推迟到插件投票调度拒绝该操作之后，因此插件拥有的投票处理程序可以接受特定于渠道的投票字段，而不会首先被通用投票解析程序阻止。

有关完整的启动序列，请参阅 [加载管道](#load-pipeline)。

## 功能所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是无关集成的集合。

这意味着：

- 公司插件通常应该拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应该拥有它引入的完整功能表面
- 渠道应该消费共享核心能力，而不是临时重新实现提供商行为

示例：

- 内置的 `openai` 插件拥有 OpenAI 模型提供商行为以及 OpenAI
  语音 + 媒体理解 + 图像生成行为
- 内置的 `elevenlabs` 插件拥有 ElevenLabs 语音行为
- 内置的 `microsoft` 插件拥有 Microsoft 语音行为
- 内置的 `google` 插件拥有 Google 模型提供商行为，以及 Google
  媒体理解 + 图像生成 + 网络搜索行为
- 内置的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件拥有它们各自的
  媒体理解后端
- `voice-call` 插件是一个功能插件：它拥有调用传输、工具、
  CLI、路由和运行时，但它使用核心 TTS/STT 能力，而不是
  发明第二个语音堆栈

预期的最终状态是：

- OpenAI 驻留在一个插件中，即使它跨越文本模型、语音、图像和
  未来的视频
- 另一个供应商可以为自己的领域做同样的事情
- 渠道不在乎哪个供应商插件拥有该提供商；它们使用核心暴露的
  共享能力合约

这是关键的区别：

- **插件** = 所有权边界
- **能力** = 多个插件可以实现或使用的核心合约

因此，如果 OpenClaw 添加一个新域（如视频），第一个问题不是
“哪个提供商应该硬编码视频处理？”。第一个问题是“核心
视频能力合约是什么？”。一旦该合约存在，供应商插件
就可以注册它，渠道/功能插件就可以使用它。

如果该能力尚不存在，正确的做法通常是：

1. 在核心中定义缺失的能力
2. 以类型化方式通过插件 API/运行时暴露它
3. 针对该能力连接渠道/功能
4. 让供应商插件注册实现

这保持了所有权的明确性，同时避免了依赖于单个供应商
或一次性插件特定代码路径的核心行为。

### 能力分层

在确定代码归属时使用此心智模型：

- **核心能力层**：共享编排、策略、回退、配置
  合并规则、交付语义和类型化合约
- **vendor plugin layer**: 供应商特定的 API、身份验证、模型目录、语音合成、图像生成、未来的视频后端、使用端点
- **渠道/feature plugin layer**: Slack/Discord/voice-call/etc. 集成，它消费核心能力并将其呈现在某个表面上

例如，TTS 遵循以下形态：

- core 拥有回复时的 TTS 策略、回退顺序、偏好设置以及渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时辅助程序

对于未来的能力，应首选这种模式。

### 多能力公司插件示例

从外部来看，公司插件应该让人感觉浑然一体。如果 OpenClaw 拥有针对模型、语音、媒体理解和网络搜索的共享合约，供应商可以在一个地方拥有其所有表面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import {
  buildOpenAISpeechProvider,
  createPluginBackedWebSearchProvider,
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider(
      buildOpenAISpeechProvider({
        id: "exampleai",
        // vendor speech config
      }),
    );

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

重要的不是确切的辅助程序名称。重要的是形态：

- 一个插件拥有供应商表面
- core 仍然拥有能力合约
- 渠道和功能插件消费 `api.runtime.*` 辅助程序，而不是供应商代码
- 合约测试可以断言插件注册了其声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一个共享能力。同样的所有权模型也适用于此：

1. core 定义媒体理解合约
2. 供应商插件视情况注册 `describeImage`、`transcribeAudio` 和 `describeVideo`
3. 渠道和功能插件消费共享的 core 行为，而不是直接连接到供应商代码

这避免了将某个提供商的视频假设固化到 core 中。插件拥有供应商表面；core 拥有能力合约和回退行为。

如果 OpenClaw 稍后添加新领域（例如视频生成），请再次使用相同的顺序：首先定义核心能力，然后让供应商插件针对它注册实现。

需要具体的发布检查清单？请参阅 [Capability Cookbook](/zh/tools/capability-cookbook)。

## 兼容的软件包

OpenClaw 还识别两种兼容的外部软件包布局：

- Codex 风格的捆绑包：`.codex-plugin/plugin.json`
- Claude 风格的捆绑包：`.claude-plugin/plugin.json` 或没有清单的默认 Claude
  组件布局
- Cursor 风格的捆绑包：`.cursor-plugin/plugin.json`

Claude 市场条目可以指向任何这些兼容的捆绑包，也可以指向
原生 OpenClaw 插件源。OpenClaw 首先解析市场条目，
然后为解析后的源运行正常的安装路径。

它们在插件列表中显示为 `format=bundle`，在详细/检查输出中
带有 `codex`、`claude` 或 `cursor` 的子类型。

有关确切的检测规则、映射
行为和当前支持矩阵，请参阅 [Plugin bundles](/zh/plugins/bundles)。

目前，OpenClaw 将这些视为 **功能包 (capability packs)**，而不是原生运行时
插件：

- 现已支持：捆绑的 `skills`
- 现已支持：Claude `commands/` markdown 根目录，映射到正常的
  OpenClaw 技能加载器
- 现已支持：Claude 捆绑包 `settings.json` 默认值，用于嵌入式 Pi 代理
  设置（已清理 shell 覆盖键）
- 现已支持：捆绑包 MCP 配置，作为 `mcpServers` 合并到嵌入式 Pi 代理设置中，
  支持的 stdio 捆绑包 MCP 工具在嵌入式
  Pi 代理轮次中暴露
- 现已支持：Cursor `.cursor/commands/*.md` 根目录，映射到正常的
  OpenClaw 技能加载器
- 现已支持：使用 OpenClaw hook-pack 布局的 Codex 捆绑包 hook 目录
  (`HOOK.md` + `handler.ts`/`handler.js`)
- 已检测但尚未连接：其他声明的捆绑包功能，例如
  代理、Claude hook 自动化、Cursor rules/hooks 元数据、应用/LSP
  元数据、输出样式

这意味着捆绑包安装/发现/列表/信息/启用均可正常工作，并且捆绑包
技能、Claude command-skills、Claude 捆绑包设置默认值和兼容的
Codex hook 目录会在启用捆绑包时加载。支持的捆绑包 MCP
服务器在使用支持的 stdio 传输时，也可能作为子进程运行以进行嵌入式 Pi 工具调用，
但捆绑包运行时模块不会加载
到进程中。

Bundle hook 支持仅限于标准的 OpenClaw hook 目录格式
（在声明的 hook 根目录下的 `HOOK.md` 加上 `handler.ts`/`handler.js`）。
特定于供应商的 shell/JSON hook 运行时，包括 Claude `hooks.json`，
目前仅被检测到，而不会直接执行。

## 执行模型

原生 OpenClaw 插件与 Gateway **在同一进程** 中运行。它们不是
沙箱隔离的。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、hooks 和服务
- 原生插件中的 bug 可能会导致网关崩溃或不稳定
- 恶意的原生插件相当于在 OpenClaw 进程内执行任意代码

兼容的 bundles 默认更安全，因为 OpenClaw 目前将它们
视为元数据/内容包。在当前版本中，这主要意味着打包的技能（skills）。

对于非打包插件，请使用允许列表和明确的安装/加载路径。将
工作区插件视为开发时代码，而不是生产环境默认值。

重要信任说明：

- `plugins.allow` 信任 **插件 id**，而不是来源出处。
- 当启用/允许具有与打包插件相同 id 的工作区插件时，该工作区插件会
  有意遮蔽打包的副本。
- 这对于本地开发、补丁测试和热修复来说是正常且有用的。

## 可用插件（官方）

- 自 2026.1.15 起，Microsoft Teams 仅支持插件；如果您使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 打包的内存搜索插件（通过 `plugins.slots.memory` 默认启用）
- Memory (LanceDB) — 打包的长期记忆插件（自动召回/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [语音通话](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo 个人版](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Anthropic 提供商运行时 — 捆绑为 `anthropic`（默认启用）
- BytePlus 提供商目录 — 捆绑为 `byteplus`（默认启用）
- Cloudflare AI Gateway(网关) 提供商目录 — 捆绑为 `cloudflare-ai-gateway`（默认启用）
- Google 网络搜索 + Gemini CLI OAuth — 捆绑为 `google`（网络搜索会自动加载它；提供商身份验证保持可选加入）
- GitHub Copilot 提供商运行时 — 捆绑为 `github-copilot`（默认启用）
- Hugging Face 提供商目录 — 捆绑为 `huggingface`（默认启用）
- Kilo Gateway(网关) 提供商运行时 — 捆绑为 `kilocode`（默认启用）
- Kimi Coding 提供商目录 — 捆绑为 `kimi-coding`（默认启用）
- MiniMax 提供商目录 + 用量 + OAuth — 捆绑为 `minimax`（默认启用；拥有 `minimax` 和 `minimax-portal`）
- Mistral 提供商功能 — 捆绑为 `mistral`（默认启用）
- Model Studio 提供商目录 — 捆绑为 `modelstudio`（默认启用）
- Moonshot 提供商运行时 — 捆绑为 `moonshot`（默认启用）
- NVIDIA 提供商目录 — 捆绑为 `nvidia`（默认启用）
- ElevenLabs 语音提供商 — 捆绑为 `elevenlabs`（默认启用）
- Microsoft 语音提供商 — 捆绑为 `microsoft`（默认启用；传统 `edge` 输入映射到此处）
- OpenAI 提供商运行时 — 捆绑为 `openai`（默认启用；拥有 `openai` 和 `openai-codex` 两者）
- OpenCode Go 提供商功能 — 捆绑为 `opencode-go`（默认启用）
- OpenCode Zen 提供商功能 — 捆绑为 `opencode`（默认启用）
- OpenRouter 提供商运行时 — 捆绑为 `openrouter`（默认启用）
- Qianfan 提供商目录 — 打包为 `qianfan`（默认启用）
- Qwen OAuth（提供商身份验证 + 目录） — 打包为 `qwen-portal-auth`（默认启用）
- Synthetic 提供商目录 — 打包为 `synthetic`（默认启用）
- Together 提供商目录 — 打包为 `together`（默认启用）
- Venice 提供商目录 — 打包为 `venice`（默认启用）
- Vercel AI Gateway(网关) 提供商目录 — 打包为 `vercel-ai-gateway`（默认启用）
- Volcengine 提供商目录 — 打包为 `volcengine`（默认启用）
- Xiaomi 提供商目录 + 使用情况 — 打包为 `xiaomi`（默认启用）
- Z.AI 提供商运行时 — 打包为 `zai`（默认启用）
- Copilot Proxy（提供商身份验证） — 本地 VS Code Copilot Proxy 网桥；与内置 `github-copilot` 设备登录不同（已打包，默认禁用）

原生 OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。
**配置验证不执行插件代码**；它使用插件清单
和 JSON Schema 代替。参见 [Plugin manifest](/zh/plugins/manifest)。

原生 OpenClaw 插件可以注册能力和表面：

**能力**（公共插件模型）：

- 文本推理提供商（模型目录、身份验证、运行时钩子）
- 语音提供商
- 媒体理解提供商
- 图像生成提供商
- 网络搜索提供商
- 通道 / 消息连接器

**表面**（支持性基础设施）：

- Gateway(网关) RPC 方法和 HTTP 路由
- Agent 工具
- CLI 命令
- 后台服务
- 上下文引擎
- 可选配置验证
- **技能**（通过在插件清单中列出 `skills` 目录）
- **自动回复命令**（执行而不调用 AI agent）

原生 OpenClaw 插件与 Gateway(网关) 运行在同一进程中（参见
[Execution 模型](#execution-model) 了解信任影响）。
工具创作指南：[Plugin agent tools](/zh/plugins/agent-tools)。

可以将这些注册视为**能力声明**。插件不应随意访问内部组件并试图“直接让其工作”。它应该针对 OpenClaw 能够理解、验证且能在配置、新手引导、状态、文档和运行时行为中一致暴露的显式接口进行注册。

## 契约与执行

插件 API 表面是有意进行类型化并集中在 `OpenClawPluginApi` 中的。该契约定义了支持的注册点以及插件可以依赖的运行时辅助程序。

这为什么重要：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复的所有权，例如两个插件注册相同的 提供商 id
- 启动时可以针对格式错误的注册提供可操作的诊断信息
- 契约测试可以执行捆绑插件的所有权并防止静默漂移

有两个执行层：

1. **运行时注册执行**
   插件注册表会在插件加载时验证注册。例如：重复的 提供商 id、重复的语音 提供商 id 以及格式错误的注册会产生插件诊断，而不是未定义的行为。
2. **契约测试**
   捆绑插件在测试运行期间被捕获在契约注册表中，以便 OpenClaw 可以显式断言所有权。目前这用于模型提供商、语音提供商、网络搜索提供商以及捆绑注册所有权。

实际效果是，OpenClaw 能够预先知道哪个插件拥有哪个表面。这使得核心和渠道能够无缝组合，因为所有权是声明的、类型化的且可测试的，而不是隐式的。

### 契约中应包含什么

良好的插件契约是：

- 类型化的
- 小型的
- 特定于能力的
- 归核心所有
- 可被多个插件重用
- 可被渠道/功能消费而无需了解供应商

糟糕的插件契约是：

- 隐藏在核心中的特定于供应商的策略
- 绕过注册表的一次性插件应急手段
- 直接访问供应商实现的渠道代码
- 不属于 `OpenClawPluginApi` 或
  `api.runtime` 一部分的临时运行时对象

如有疑问，请提高抽象级别：先定义能力，然后让插件接入其中。

## 导出边界

OpenClaw 导出的是能力，而非实现便利性。

保持能力注册公开。修剪非契约辅助导出：

- 特定于打包插件的辅助子路径
- 非公共 API 的运行时管道子路径
- 特定于供应商的便捷辅助程序
- 属于实现细节的设置/新手引导辅助程序

## 插件检查

使用 `openclaw plugins inspect <id>` 进行深度插件内省。这是理解插件形态和注册行为的规范命令。

```bash
openclaw plugins inspect openai
openclaw plugins inspect openai --json
```

检查报告显示：

- 身份、加载状态、来源和根目录
- 插件形态（plain-capability、hybrid-capability、hook-only、non-capability）
- 能力模式和已注册的能力
- 钩子（类型化和自定义）、工具、命令、服务
- 渠道注册
- 配置策略标志
- 诊断信息
- 插件是否使用了旧版 `before_agent_start` 钩子
- 安装元数据

分类来自实际的注册行为，而不仅仅是静态元数据。

摘要命令仍以摘要为中心：

- `plugins list` — 简明清单
- `plugins status` — 运营摘要
- `doctor` — 专注于问题的诊断
- `plugins inspect` — 深度详细信息

## 提供程序运行时钩子

提供程序插件现在有两个层级：

- 清单元数据：`providerAuthEnvVars` 用于在运行时加载前进行廉价的环境身份验证查找，以及 `providerAuthChoices` 用于在运行时加载前进行廉价的新手引导/身份验证选择标签和 CLI 标志元数据查找
- 配置时钩子：`catalog` / 旧版 `discovery`
- 运行时挂钩：`resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、`capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、`refreshOAuth`、`buildAuthDoctorHint`、`isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、`resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot`

OpenClaw 仍然拥有通用代理循环、故障转移、转录处理和工具策略。这些挂钩是特定于提供商的行为的扩展表面，而无需完整的自定义推理传输。

当提供商拥有基于环境的凭据，并且通用身份验证/状态/模型选择器路径应该在不加载插件运行时的情况下看到这些凭据时，请使用清单 `providerAuthEnvVars`。当新手引导/身份验证选择 CLI 界面应该知道提供商的选择 ID、组标签和简单的单标志身份验证连线，而不需要加载提供商运行时时，请使用清单 `providerAuthChoices`。保留提供商运行时 `envVars` 以供面向操作员的提示使用，例如新手引导标签或 OAuth 客户端 ID/客户端密钥设置变量。

### 挂钩顺序和用法

对于模型/提供商插件，OpenClaw 大致按此顺序调用挂钩。“何时使用”列是快速决策指南。

| #   | 挂钩                          | 作用                                                                 | 何时使用                                                   |
| --- | ----------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期间将提供商配置发布到 `models.providers`       | 提供商拥有目录或基本 URL 默认值                            |
| —   | _（内置模型查找）_            | OpenClaw 首先尝试正常的注册表/目录路径                               | _（不是插件挂钩）_                                         |
| 2   | `resolveDynamicModel`         | 针对不在本地注册表中的提供商拥有的模型 ID 的同步回退                 | 提供商接受任意的上游模型 ID                                |
| 3   | `prepareDynamicModel`         | 异步预热，然后 `resolveDynamicModel` 再次运行                        | 提供商在解析未知 ID 之前需要网络元数据                     |
| 4   | `normalizeResolvedModel`      | 嵌入式运行器使用解析的模型之前的最终重写                             | 提供商需要传输重写，但仍使用核心传输                       |
| 5   | `capabilities`                | 共享核心逻辑使用的提供商拥有的转录/工具元数据                        | 提供商需要转录/提供商系列的怪癖                            |
| 6   | `prepareExtraParams`          | 通用流选项包装器之前的请求参数规范化                                 | 提供商需要默认请求参数或按提供商的参数清理                 |
| 7   | `wrapStreamFn`                | 应用通用包装器后的流包装器                                           | 提供商需要请求头/正文/模型兼容性包装器，而无需自定义传输   |
| 8   | `formatApiKey`                | 身份验证配置文件格式化程序：存储的配置文件变为运行时 `apiKey` 字符串 | 提供商存储额外的身份验证元数据，并需要自定义运行时令牌形状 |
| 9   | `refreshOAuth`                | OAuth 刷新覆盖，用于自定义刷新端点或刷新失败策略                     | 提供商不符合共享 `pi-ai` 刷新器                            |
| 10  | `buildAuthDoctorHint`         | 当 OAuth 刷新失败时附加的修复提示                                    | 提供商在刷新失败后需要提供商拥有的身份验证修复指导         |
| 11  | `isCacheTtlEligible`          | 代理/回传提供商的提示缓存策略                                        | 提供商需要特定于代理的缓存 TTL 限制                        |
| 12  | `buildMissingAuthMessage`     | 通用缺失身份验证恢复消息的替代                                       | 提供商需要特定于提供商的缺失身份验证恢复提示               |
| 13  | `suppressBuiltInModel`        | 过时的上游模型抑制以及可选的用户面向错误提示                         | 提供商需要隐藏过时的上游行或将其替换为供应商提示           |
| 14  | `augmentModelCatalog`         | 发现后附加的合成/最终目录行                                          | 提供商需要在 `models list` 和选择器中使用合成向前兼容行    |
| 15  | `isBinaryThinking`            | 二元思维提供商的推理开关                                             | 提供商仅暴露二元思维开关                                   |
| 16  | `supportsXHighThinking`       | 所选 `xhigh` 模型的 `xhigh` 推理支持                                 | 提供商希望仅在一部分模型上拥有 `xhigh`                     |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的默认 `/think` 级别                                     | 提供商拥有模型系列的默认 `/think` 策略                     |
| 18  | `isModernModelRef`            | 用于实时配置文件过滤和冒烟测试选择的现代模型匹配器                   | 提供商拥有实时/冒烟测试的首选模型匹配                      |
| 19  | `prepareRuntimeAuth`          | 在推理之前将配置的凭据交换为实际的运行时令牌/密钥                    | 提供商需要令牌交换或短期请求凭据                           |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 及相关状态表面的使用/计费凭据                          | 提供商需要自定义使用/配额令牌解析或不同的使用凭据          |
| 21  | `fetchUsageSnapshot`          | 在解析身份验证后获取并规范化特定于提供商的使用/配额快照              | 提供商需要特定于提供商的使用端点或有效负载解析器           |

如果提供商需要完全自定义的线协议或自定义请求执行程序，
那是另一类扩展。这些钩子用于仍运行在 OpenClaw 正常推理循环上的提供商行为。

### 提供商示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因为它拥有 Claude
  4.6 前向兼容性、提供商系列提示、身份验证修复指南、使用
  端点集成、提示缓存资格以及 Claude 默认/自适应
  思维策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  是因为它拥有 GPT-5.4 前向兼容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 归一化、感知 Codex 的身份验证
  提示、Spark 抑制、合成 OpenAI 列表行以及 GPT-5 思维 /
  实时模型策略。
- OpenRouter 使用 `catalog` 以及 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为该提供商是透传的，并且可能会在 OpenClaw 的静态目录更新之前
  暴露新的模型 ID。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 以及 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它
  需要提供商拥有的设备登录、模型回退行为、Claude 转录怪癖、
  GitHub 令牌 -> Copilot 令牌交换以及提供商拥有的使用量
  端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog` 以及
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  仍在核心 OpenAI 传输上运行，但拥有其传输/基础 URL
  归一化、OAuth 刷新回退策略、默认传输选择、
  合成 Codex 目录行以及 ChatGPT 使用量端点集成。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因为它们拥有 Gemini 3.1 前向兼容回退和
  现代模型匹配；Gemini CLI OAuth 还使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 进行令牌格式化、令牌
  解析和配额端点连接。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`
  将特定于提供商的请求头、路由元数据、推理补丁和提示缓存策略排除在核心之外。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因为它仍然使用共享的
  OpenAI 传输层，但需要提供商拥有的思考负载标准化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、推理负载标准化、Gemini 脚本提示以及 Anthropic
  缓存 TTL 闸控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、
  `tool_stream` 默认值、二进制思考 UX、现代模型匹配以及使用身份验证 + 配额获取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities` 来保持
  脚本/工具特性的怪癖排除在核心之外。
- 仅限目录的捆绑提供商（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）仅
  使用 `catalog`。
- Qwen 门户使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用钩子，因为它们的 `/usage`
  行为是插件拥有的，即使推理仍然通过共享传输层运行。

## 加载流水线

启动时，OpenClaw 大致会执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的清单（bundle manifests）和包元数据
3. 拒绝不安全的候选项
4. 规范化插件配置 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 决定是否启用每个候选项
6. 通过 jiti 加载已启用的原生模块
7. 调用原生 `register(api)` 钩子并将注册信息收集到插件注册表中
8. 向命令/运行时表面公开注册表

安全检查发生在运行时执行**之前**。当入口项超出插件根目录、路径全局可写，或者对于非打包插件路径所有权看起来可疑时，候选项将被阻止。

### 清单优先行为

清单是控制平面的唯一真实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的通道/技能/配置架构或包功能
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

对于原生插件，运行时模块是数据平面部分。它注册实际行为，如钩子、工具、命令或提供商流。

### 加载器缓存的内容

OpenClaw 为以下内容保留简短的进程内缓存：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存减少了突发启动和重复命令的开销。可以安全地将它们视为短期性能缓存，而不是持久化存储。

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

备注：

- `textToSpeech` 返回文件/语音笔记表面的正常核心 TTS 输出载荷。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区和采样率。插件必须为提供商重采样/编码。
- `listVoices` 对于每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和个性化标签，用于支持提供商感知的选择器。
- OpenAI 和 ElevenLabs 目前支持电话功能。Microsoft 不支持。

插件还可以通过 `api.registerSpeechProvider(...)` 注册语音提供商。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

备注：

- 将 TTS 策略、回退和回复传递保留在核心中。
- 使用语音提供商处理供应商拥有的合成行为。
- 传统的 Microsoft `edge` 输入被规范化为 `microsoft` 提供商 ID。
- 首选的所有权模型是以公司为导向的：随着 OpenClaw 添加这些能力契约，一个供应商插件可以拥有文本、语音、图像和未来的媒体提供商。

对于图像/音频/视频理解，插件注册一个类型化的媒体理解提供商，而不是通用的键/值包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

备注：

- 将编排、回退、配置和渠道连接保留在核心中。
- 将供应商行为保留在提供商插件中。
- 增量扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 如果 OpenClaw 稍后添加视频生成等新功能，请先定义核心能力契约，然后让供应商插件针对其进行注册。

对于媒体理解运行时辅助程序，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

对于音频转录，插件可以使用媒体理解运行时，也可以使用较旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

备注：

- `api.runtime.mediaUnderstanding.*` 是图像/音频/视频理解的首选共享表面。
- 使用核心媒体理解音频配置 (`tools.media.audio`) 和提供商回退顺序。
- 当未产生转录输出时（例如跳过/不支持的输入），返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 保留为兼容性别名。

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

备注：

- `provider` 和 `model` 是每次运行的可选覆盖项，而非持久的会话更改。
- OpenClaw 仅对受信任的调用者遵守这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须通过 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 明确允许任何目标。
- 不受信任的插件子代理运行仍然有效，但覆盖请求将被拒绝，而不是静默回退。

对于网络搜索，插件可以使用共享运行时助手，而不是深入到代理工具连接中：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件还可以通过 `api.registerWebSearchProvider(...)` 注册网络搜索提供商。

注意：

- 将提供商选择、凭据解析和共享请求语义保留在核心中。
- 使用网络搜索提供商进行特定于供应商的搜索传输。
- `api.runtime.webSearch.*` 是需要搜索行为但不依赖代理工具包装器的功能/渠道插件的首选共享表面。

## Gateway(网关) HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`：Gateway(网关) HTTP 服务器下的路由路径。
- `auth`：必需。使用 `"gateway"` 要求正常的 Gateway(网关) 身份验证，或使用 `"plugin"` 进行插件管理的身份验证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己现有的路由注册。
- `handler`：当路由处理请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已过时。请使用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非 `replaceExisting: true`，否则精确的 `path + match` 冲突将被拒绝，并且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由将被拒绝。请将 `exact`/`prefix` 直通链保持在同一身份验证级别上。

## 插件 SDK 导入路径

在编写插件时，使用 SDK 子路径而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/core` 用于最小通用插件面向的契约。
  它还携带了一些小的程序集助手，例如 `definePluginEntry`、`defineChannelPluginEntry`、`defineSetupPluginEntry`
  和 `createChannelPluginBase`，用于捆绑或第三方插件入口连接。
- 域子路径，例如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/channel-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime`，用于共享运行时/配置助手。
- 狭窄的渠道核心子路径，例如 `openclaw/plugin-sdk/discord-core`、
  `openclaw/plugin-sdk/telegram-core`、`openclaw/plugin-sdk/whatsapp-core`
  和 `openclaw/plugin-sdk/line-core`，用于特定于渠道的原语，这些原语
  应保持小于完整的渠道助手集合。
- `openclaw/plugin-sdk/compat` 仍作为旧版外部插件的迁移表面。捆绑插件不应使用它，并且非测试导入会在测试环境之外发出一次弃用警告。
- 捆绑扩展内部保持私有。外部插件应仅使用 `openclaw/plugin-sdk/*` 子路径。OpenClaw 核心/测试代码可以使用 `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 下的仓库公共入口点以及范围狭窄的文件（例如 `login-qr-api.js`）。切勿
  从核心或其他扩展导入 `extensions/<id>/src/*`。
- 仓库入口点拆分：
  `extensions/<id>/api.js` 是助手/类型集合，
  `extensions/<id>/runtime-api.js` 是仅运行时集合，
  `extensions/<id>/index.js` 是捆绑插件入口，
  而 `extensions/<id>/setup-entry.js` 是设置插件入口。
- `openclaw/plugin-sdk/telegram` 用于 Telegram 渠道插件类型和共享的面向渠道的助手。内置 Telegram 实现内部对捆绑扩展保持私有。
- `openclaw/plugin-sdk/discord` 用于 Discord 渠道插件类型和共享面向渠道的帮助程序。内置的 Discord 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/slack` 用于 Slack 渠道插件类型和共享面向渠道的帮助程序。内置的 Slack 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/signal` 用于 Signal 渠道插件类型和共享面向渠道的帮助程序。内置的 Signal 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/imessage` 用于 iMessage 渠道插件类型和共享面向渠道的帮助程序。内置的 iMessage 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/whatsapp` 用于 WhatsApp 渠道插件类型和共享面向渠道的帮助程序。内置的 WhatsApp 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/line` 用于 LINE 渠道插件。
- `openclaw/plugin-sdk/msteams` 用于捆绑的 Microsoft Teams 插件表面。
- 额外的捆绑扩展特定子路径仍然可用，只要 OpenClaw 有意公开面向扩展的帮助程序：
  `openclaw/plugin-sdk/acpx`、`openclaw/plugin-sdk/bluebubbles`、
  `openclaw/plugin-sdk/feishu`、`openclaw/plugin-sdk/googlechat`、
  `openclaw/plugin-sdk/irc`、`openclaw/plugin-sdk/lobster`、
  `openclaw/plugin-sdk/matrix`、
  `openclaw/plugin-sdk/mattermost`、`openclaw/plugin-sdk/memory-core`、
  `openclaw/plugin-sdk/minimax-portal-auth`、
  `openclaw/plugin-sdk/nextcloud-talk`、`openclaw/plugin-sdk/nostr`、
  `openclaw/plugin-sdk/synology-chat`、`openclaw/plugin-sdk/test-utils`、
  `openclaw/plugin-sdk/tlon`、`openclaw/plugin-sdk/twitch`、
  `openclaw/plugin-sdk/voice-call`、
  `openclaw/plugin-sdk/zalo` 和 `openclaw/plugin-sdk/zalouser`。

## 渠道目标解析

渠道插件应拥有特定渠道的目标语义。保持共享出站主机通用，并使用消息适配器表面来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，是否应将规范化目标视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告知核心是否应跳过目录搜索而直接进行类似 ID 的解析。
- `messaging.targetResolver.resolveTarget(...)` 是插件的后备方案，当核心在规范化或目录未命中后需要最终的提供商拥有的解析时使用。
- 一旦解析出目标，`messaging.resolveOutboundSessionRoute(...)` 负责提供商特定的会话路由构造。

建议的拆分：

- 使用 `inferTargetChatType` 进行应在搜索对等/组之前做出的类别决策。
- 使用 `looksLikeId` 进行“将其视为显式/原生目标 ID”的检查。
- 使用 `resolveTarget` 进行特定于提供商的规范化回退，而不用于
  广泛的目录搜索。
- 将提供商原生 ID（如聊天 ID、线程 ID、JID、句柄和房间
  ID）保留在 `target` 值或特定于提供商的参数中，而不是在通用 SDK
  字段中。

## 基于配置的目录

从配置派生目录条目的插件应将该逻辑保留在
插件中，并复用来自
`openclaw/plugin-sdk/directory-runtime` 的共享辅助程序。

当渠道需要基于配置的对等方/组时使用此功能，例如：

- 由允许列表驱动的私信对等方
- 配置的渠道/组映射
- 帐户范围的静态目录回退

`directory-runtime` 中的共享辅助程序仅处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化辅助程序
- 构建 `ChannelDirectoryEntry[]`

特定于频道的账户检查和 ID 标准化应保留在插件实现中。

## 提供商目录

提供商插件可以为使用 `registerProvider({ catalog: { run(...) { ... } } })` 进行推理定义模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 相同的形状：

- 用于一个提供商条目的 `{ provider }`
- 用于多个提供商条目的 `{ providers }`

当插件拥有提供商特定的 模型 ID、基础 URL 默认值或基于身份验证的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw 内置隐式提供商的合并时机：

- `simple`：纯 API 密钥或环境驱动的提供商
- `profile`：当身份验证配置文件存在时出现的提供商
- `paired`：合成多个相关提供商条目的提供商
- `late`：最后一轮，在其他隐式提供商之后

后续的提供商在键冲突时获胜，因此插件可以使用相同的提供商 ID 有意覆盖内置提供商条目。

兼容性：

- `discovery` 仍可作为旧版别名使用
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

兼容性说明：

- `openclaw/plugin-sdk` 仍支持现有的外部插件。
- 新的和已迁移的捆绑插件应使用 渠道 或特定于扩展的子路径；对于通用界面，使用 `core` 加上显式域子路径，并将 `compat` 视为仅用于迁移。
- 特定于功能的子路径（例如 `image-generation`、`media-understanding` 和 `speech`）之所以存在，是因为捆绑/原生插件当前在使用它们。它们的存在本身并不意味着每个导出的辅助工具都是长期冻结的外部契约。

## 只读 渠道 检查

如果您的插件注册了一个 渠道，建议在实现 `resolveAccount(...)` 的同时实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它允许假定凭据已完全具体化，并且在缺少所需密钥时可以快速失败。
- 诸如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 之类的只读命令路径以及 doctor/config 修复流程不应仅为了描述配置而具体化运行时凭据。

建议的 `inspectAccount(...)` 行为：

- 仅返回描述性帐户状态。
- 保留 `enabled` 和 `configured`。
- 在适当时包含凭据来源/状态字段，例如：
  - `tokenSource`， `tokenStatus`
  - `botTokenSource`， `botTokenStatus`
  - `appTokenSource`， `appTokenStatus`
  - `signingSecretSource`， `signingSecretStatus`
- 您不需要仅仅为了报告只读可用性而返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的 source
  字段）对于状态类命令来说就足够了。
- 当凭据通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这允许只读命令报告“已配置但在此命令路径中不可用”，而不是崩溃或错误地将帐户报告为未配置。

性能说明：

- 插件发现和清单元数据使用短进程内缓存来减少
  突发启动/重新加载工作。
- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存时间窗口。

## 发现与优先级

OpenClaw 按顺序扫描：

1. 配置路径

- `plugins.load.paths` (文件或目录)

2. 工作区扩展

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全局扩展

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 捆绑扩展（随 OpenClaw 附带；混合默认开启/默认关闭）

- `<openclaw>/extensions/*`

许多捆绑提供商插件默认处于启用状态，因此模型目录/运行时
钩子在无需额外设置的情况下保持可用。其他插件仍需通过 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 显式启用。

默认开启的捆绑插件示例：

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- active memory slot plugin (default slot: `memory-core`)

Installed plugins are enabled by default, but can be disabled the same way.

Workspace plugins are **disabled by default** unless you explicitly enable them
or allowlist them. This is intentional: a checked-out repo should not silently
become production gateway code.

Hardening notes:

- If `plugins.allow` is empty and non-bundled plugins are discoverable, OpenClaw logs a startup warning with plugin ids and sources.
- Candidate paths are safety-checked before discovery admission. OpenClaw blocks candidates when:
  - extension entry resolves outside plugin root (including symlink/path traversal escapes),
  - plugin root/source path is world-writable,
  - path ownership is suspicious for non-bundled plugins (POSIX owner is neither current uid nor root).
- Loaded non-bundled plugins without install/load-path provenance emit a warning so you can pin trust (`plugins.allow`) or install tracking (`plugins.installs`).

Each native OpenClaw plugin must include a `openclaw.plugin.json` file in its
root. If a path points at a file, the plugin root is the file's directory and
must contain the manifest.

Compatible bundles may instead provide one of:

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`

Bundle directories are discovered from the same roots as native plugins.

如果多个插件解析为同一个 id，则按上述顺序排列的第一个匹配项胜出，优先级较低的副本将被忽略。

这意味着：

- 工作区插件会故意遮蔽（shadow）具有相同 id 的捆绑插件
- `plugins.allow: ["foo"]` 通过 id 授权活动的 `foo` 插件，即使活动副本来自工作区而不是捆绑扩展根目录
- 如果您需要更严格的来源控制，请使用显式的安装/加载路径，并在启用之前检查解析后的插件来源

### 启用规则

启用是在发现之后解析的：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 总是胜出
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区来源的插件默认被禁用
- 当 `plugins.allow` 非空时，允许列表会限制活动集
- 允许列表是**基于 id 的**，而不是基于来源的
- 捆绑插件默认被禁用，除非：
  - 捆绑的 id 位于内置的默认启用集中，或者
  - 您显式启用了它，或者
  - 渠道配置隐式启用了捆绑的渠道插件
- 独占插槽可以强制启用该插槽选定的插件

在当前核心中，捆绑的默认启用 id 包括上述的 local/提供商 辅助程序以及活动的内存插槽插件。

### 包组合

插件目录可能包含一个带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都变成一个插件。如果该组合列出了多个扩展，则插件 id 变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请在该目录中安装它们，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：解析符号链接后，每个 `openclaw.extensions` 条目必须保留在插件目录内。转义包目录的条目将被拒绝。

安全说明：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安装插件依赖项（无生命周期脚本）。保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置模块。当 OpenClaw 需要为已禁用的渠道插件提供设置界面时，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。这可以在你的主插件入口还连接了工具、钩子或其他仅运行时代码的情况下，保持启动和设置的轻量化。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以让渠道插件在网关的预监听启动阶段进入与 `setupEntry` 相同的路径，即使该渠道已经配置。

仅当 `setupEntry` 完全覆盖网关开始监听之前必须存在的启动界面时，才使用此选项。实际上，这意味着设置入口必须注册启动所依赖的每一个渠道拥有的能力，例如：

- 渠道注册本身
- 任何必须在网关开始监听之前可用的 HTTP 路由
- 任何在同一窗口期间必须存在的网关方法、工具或服务

如果你的完整入口仍然拥有任何启动所需的能力，请不要启用此标志。保持插件的默认行为，并让 OpenClaw 在启动期间加载完整入口。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 提供安装提示。这使核心目录保持无数据状态。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw 还可以合并**外部渠道目录**（例如，MPM 注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 ID：

- 包打包：`package.json` `name`
- 独立文件：文件基本名称（`~/.../voice-call.ts` → `voice-call`）

如果插件导出 `id`，OpenClaw 将使用它，但在它与配置的 ID 不匹配时会发出警告。

## 注册表模型

已加载的插件不会直接修改随机的核心全局变量。它们会注册到一个中心化的插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起点、状态、诊断）
- 工具
- 旧版钩子和类型化钩子
- 渠道
- 提供者
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块通信。这使得加载过程保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表使用

这种分离对于可维护性至关重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“对每个插件模块进行特殊处理”。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

字段：

- `enabled`：主开关（默认：true）
- `allow`：允许列表（可选）
- `deny`：拒绝列表（可选；拒绝优先）
- `load.paths`：额外的插件文件/目录
- `slots`：独占槽选择器，如 `memory` 和 `contextEngine`
- `entries.<id>`：每个插件的开关 + 配置

配置更改**需要重启网关**。有关完整的配置架构，请参阅[配置参考](/zh/configuration)。

验证规则（严格）：

- 在 `entries`、`allow`、`deny` 或 `slots` 中的未知插件 ID 是**错误**。
- 未知的 `channels.<id>` 键是**错误**，除非插件清单声明了该渠道 ID。
- 原生插件配置使用嵌入在 `openclaw.plugin.json`（`configSchema`）中的 JSON 架构进行验证。
- 兼容的捆绑包目前不公开原生 OpenClaw 配置架构。
- 如果插件被禁用，其配置会被保留并发出**警告**。

### 已禁用 vs 缺失 vs 无效

这些状态是有意区分的：

- **已禁用**：插件存在，但启用规则将其关闭
- **缺失**：配置引用了一个发现机制未找到的插件 ID
- **无效**：插件存在，但其配置与声明的架构不匹配

OpenClaw 保留已禁用插件的配置，因此重新启用它们不会造成破坏。

## 插件插槽（独占类别）

某些插件类别是**独占**的（一次只能激活一个）。使用
`plugins.slots` 来选择哪个插件拥有该插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

支持的独占插槽：

- `memory`：激活的内存插件（`"none"` 禁用内存插件）
- `contextEngine`：激活的上下文引擎插件（`"legacy"` 是内置默认值）

如果多个插件声明 `kind: "memory"` 或 `kind: "context-engine"`，则只有
所选插件会为该插槽加载。其他插件将被禁用并显示诊断信息。
在您的 [插件清单](/zh/plugins/manifest) 中声明 `kind`。

### 上下文引擎插件

上下文引擎插件拥有会话上下文的摄取、组装
和压缩编排。通过
`api.registerContextEngine(id, factory)` 从您的插件中注册它们，然后使用
`plugins.slots.contextEngine` 选择激活的引擎。

当您的插件需要替换或扩展示默认上下文管道，而不仅仅是添加内存搜索或钩子时，请使用此功能。

## 控制 UI（架构 + 标签）

控制 UI 使用 `config.schema`（JSON 架构 + `uiHints`）来呈现更好的表单。

OpenClaw 根据已发现的插件在运行时增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加每个插件的标签
- 在以下位置合并可选的插件提供的配置字段提示：
  `plugins.entries.<id>.config.<field>`

如果您希望插件配置字段显示良好的标签/占位符（并将机密标记为敏感），
请在插件清单中与 JSON 架构一起提供 `uiHints`。

示例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

有关每个命令的详细信息（安装规则、检查输出、marketplace 安装、卸载），请参阅 [`openclaw plugins` CLI 参考](/zh/cli/plugins)。

插件也可以注册自己的顶层命令（例如：
`openclaw voicecall`）。

## 插件 API（概述）

插件导出以下内容之一：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件附加行为的地方。常见的注册包括：

- `registerTool`
- `registerHook`
- 用于类型化生命周期钩子的 `on(...)`
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

实际上，`register(api)` 也是插件声明**所有权**的地方。
该所有权应清晰地映射到以下任一项：

- 供应商表面，如 OpenAI、ElevenLabs 或 Microsoft
- 功能表面，如语音通话

除非有充分的产品理由，否则避免将一个供应商的功能分散到不相关的插件中。
默认设置应为每个供应商/功能对应一个插件，并通过核心功能契约将共享编排与供应商特定行为分离开来。

## 添加新功能

当插件需要不符合当前 API 的行为时，不要绕过插件系统进行私有侵入。请添加缺失的功能。

推荐顺序：

1. 定义核心契约
   决定核心应拥有哪些共享行为：策略、回退、配置合并、
   生命周期、面向渠道的语义和运行时辅助程序形状。
2. 添加类型化插件注册/运行时表面
   使用最小有用的类型化功能表面扩展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 渠道/功能消费者
   渠道和功能插件应通过核心使用新功能，
   而不是直接导入供应商实现。
4. 注册供应商实现
   然后供应商插件根据该功能注册其后端。
5. 添加契约覆盖
   添加测试，以便所有权和注册形状随时间推移保持明确。

这就是 OpenClaw 在保持自身见解的同时，不局限于某个提供商视图的方式。有关具体的文件清单和实际示例，请参阅 [Capability Cookbook](/zh/tools/capability-cookbook)。

### 功能清单

添加新功能时，实现通常需要同时涉及以下方面：

- `src/<capability>/types.ts` 中的核心合约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时辅助程序
- `src/plugins/types.ts` 中的插件 API 注册接口
- `src/plugins/registry.ts` 中的插件注册表连接
- 当功能/渠道插件需要使用时，`src/plugins/runtime/*` 中的插件运行时暴露
- `src/test-utils/plugin-registration.ts` 中的捕获/测试辅助程序
- `src/plugins/contracts/registry.ts` 中的所有权/合约断言
- `docs/` 中的操作员/插件文档

如果缺少其中某个方面，这通常表明该功能尚未完全集成。

### 功能模板

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generateFile({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

合约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这使规则保持简单：

- 核心拥有功能合约 + 编排
- 供应商插件拥有供应商实现
- 功能/渠道插件使用运行时辅助程序
- 合约测试明确所有权

上下文引擎插件也可以注册运行时拥有的上下文管理器：

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

如果您的引擎**不**拥有压缩算法，请保持 `compact()` 已实现并显式委托它：

```ts
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

`ownsCompaction: false` 不会自动回退到传统压缩。如果您的引擎处于活动状态，其 `compact()` 方法仍然处理 `/compact` 和溢出恢复。

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 插件钩子

插件可以在运行时注册钩子。这允许插件捆绑事件驱动的自动化，而无需单独安装钩子包。

### 示例

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

注意：

- 通过 `api.registerHook(...)` 显式注册钩子。
- 钩子资格规则仍然适用（操作系统/二进制文件/环境/配置要求）。
- 插件管理的钩子会通过 `plugin:<id>` 出现在 `openclaw hooks list` 中。
- 您无法通过 `openclaw hooks` 启用/禁用插件管理的钩子；请改为启用/禁用插件。

### Agent 生命周期钩子 (`api.on`)

对于类型化运行时生命周期钩子，请使用 `api.on(...)`：

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

用于提示词构建的重要钩子：

- `before_model_resolve`：在会话加载之前运行（`messages` 不可用）。使用此项以确定性方式覆盖 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：在会话加载之后运行（`messages` 可用）。使用此项来塑造提示词输入。
- `before_agent_start`：遗留兼容性钩子。优先使用上述两个显式钩子。

核心强制执行的钩子策略：

- 操作员可以通过 `plugins.entries.<id>.hooks.allowPromptInjection: false` 针对每个插件禁用提示词变更钩子。
- 当被禁用时，OpenClaw 将阻止 `before_prompt_build` 并忽略从遗留 `before_agent_start` 返回的提示词变更字段，同时保留遗留的 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 结果字段：

- `prependContext`：将文本预置到此运行的用户提示词之前。最适用于特定轮次或动态内容。
- `systemPrompt`：完全覆盖系统提示词。
- `prependSystemContext`：将文本预置到当前系统提示词之前。
- `appendSystemContext`：将文本附加到当前系统提示词之后。

嵌入式运行时中的提示词构建顺序：

1. 将 `prependContext` 应用于用户提示词。
2. 如果提供了 `systemPrompt` 覆盖，则应用它。
3. 应用 `prependSystemContext + current system prompt + appendSystemContext`。

合并和优先级说明：

- 钩子处理程序按优先级运行（优先级高的先执行）。
- 对于合并的上下文字段，值按执行顺序连接。
- `before_prompt_build` 值在遗留 `before_agent_start` 回退值之前应用。

迁移指南：

- 将静态指导从 `prependContext` 移至 `prependSystemContext`（或 `appendSystemContext`），以便提供商能够缓存稳定的系统前缀内容。
- 保留 `prependContext` 用于应与用户消息保持关联的每轮动态上下文。

## 提供商插件（模型身份验证）

插件可以注册 **模型提供商**，以便用户可以在 OpenClaw 内部运行 OAuth 或 API 密钥设置，在 新手引导/模型选择器中展示提供商设置，并贡献隐式提供商发现。

提供商插件是模型提供商设置的模块化扩展表面。它们不再仅仅是 "OAuth 助手"。

### 提供商插件生命周期

提供商插件可以参与五个不同的阶段：

1. **Auth (认证)**
   `auth[].run(ctx)` 执行 OAuth、API 密钥捕获、设备代码或自定义设置，并返回认证配置文件以及可选的配置补丁。
2. **Non-interactive setup (非交互式设置)**
   `auth[].runNonInteractive(ctx)` 处理 `openclaw onboard --non-interactive` 而不进行提示。当提供商需要超出内置简单 API 密钥路径的自定义无头设置时，请使用此选项。
3. **Wizard integration (向导集成)**
   `wizard.setup` 向 `openclaw onboard` 添加一个条目。
   `wizard.modelPicker` 向模型选择器添加一个设置条目。
4. **Implicit discovery (隐式发现)**
   `discovery.run(ctx)` 可以在模型解析/列表期间自动贡献提供商配置。
5. **Post-selection follow-up (选择后跟进)**
   `onModelSelected(ctx)` 在选择模型后运行。将其用于特定于提供商的工作，例如下载本地模型。

这是推荐的划分方式，因为这些阶段具有不同的生命周期要求：

- 认证是交互式的，并且会写入凭据/配置
- 非交互式设置由标志/环境变量驱动，且不得提示
- 向导元数据是静态的且面向 UI
- 发现应该是安全的、快速的且容错的
- 选择后挂钩是与所选模型绑定的副作用

### 提供商认证合同

`auth[].run(ctx)` 返回：

- `profiles`：要写入的认证配置文件
- `configPatch`：可选的 `openclaw.json` 更改
- `defaultModel`：可选的 `provider/model` 引用
- `notes`：可选的用户说明

核心随后：

1. 写入返回的认证配置文件
2. 应用认证配置文件配置连接
3. 合并配置补丁
4. 选择性地应用默认模型
5. 适当时运行提供商的 `onModelSelected` 挂钩

这意味着提供商插件拥有特定于提供商的设置逻辑，而核心拥有通用的持久化和配置合并路径。

### 提供商非交互式协议

`auth[].runNonInteractive(ctx)` 是可选的。当提供商需要无法通过内置通用 API 密钥流程表达的无头设置时，请实现它。

非交互式上下文包括：

- 当前配置和基础配置
- 已解析的新手引导 CLI 选项
- 运行时日志记录/错误辅助工具
- 代理/工作区目录，以便提供商可以将身份验证持久化到与新手引导其余部分使用的相同作用域存储中
- `resolveApiKey(...)` 用于从标志、环境变量或现有身份验证配置文件读取提供商密钥，同时遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 用于将解析的密钥转换为身份验证配置文件凭据，并具有正确的纯文本与密钥引用存储

将此接口用于以下提供商：

- 需要 `--custom-base-url` + `--custom-model-id` 的自托管 OpenAI 兼容运行时
- 特定于提供商的非交互式验证或配置合成

不要从 `runNonInteractive` 提示。请用可操作的错误拒绝缺失的输入。

### 提供商向导元数据

提供商身份验证/新手引导元数据可以存在于两个层级：

- 清单 `providerAuthChoices`：廉价的标签、分组、`--auth-choice` id 和可在运行时加载之前使用的简单 CLI 标志元数据
- 运行时 `wizard.setup` / `auth[].wizard`：依赖于已加载提供商代码的更丰富行为

对静态标签/标志使用清单元数据。当设置依赖于动态身份验证方法、方法回退或运行时验证时，请使用运行时向导元数据。

`wizard.setup` 控制提供商在分组新手引导中的显示方式：

- `choiceId`：身份验证选择值
- `choiceLabel`：选项标签
- `choiceHint`：简短提示
- `groupId`：分组存储桶 id
- `groupLabel`：分组标签
- `groupHint`：分组提示
- `methodId`：要运行的身份验证方法
- `modelAllowlist`：可选的身份验证后允许列表策略（`allowedKeys`、`initialSelections`、`message`）

`wizard.modelPicker` 控制提供商在模型选择中如何显示为“立即设置”
条目：

- `label`
- `hint`
- `methodId`

当提供商具有多种身份验证方法时，向导可以指向一种
显式方法，也可以让 OpenClaw 为每种方法综合生成选项。

当插件注册时，OpenClaw 会验证提供商向导元数据：

- 重复或空白的身份验证方法 ID 会被拒绝
- 当提供商没有身份验证方法时，向导元数据将被忽略
- 无效的 `methodId` 绑定会被降级为警告，并回退到
  提供商剩余的身份验证方法

### 提供商设备发现契约

`discovery.run(ctx)` 返回以下内容之一：

- `{ provider }`
- `{ providers }`
- `null`

对于插件拥有一个提供商 ID 的常见情况，请使用 `{ provider }`。
当插件发现多个提供商条目时，请使用 `{ providers }`。

设备发现上下文包括：

- 当前配置
- 代理/工作区目录
- 进程环境变量
- 一个用于解析提供商 API 密钥和设备发现安全 API 密钥值的辅助程序

设备发现应：

- 快速
- 尽力而为
- 失败时可以安全跳过
- 注意副作用

它不应依赖提示或长时间运行的设置。

### 设备发现顺序

提供商设备发现按顺序分阶段运行：

- `simple`
- `profile`
- `paired`
- `late`

使用：

- `simple` 进行低成本的环境仅设备发现
- 当设备发现依赖于身份验证配置文件时，使用 `profile`
- `paired` 用于需要与另一个设备发现步骤协调的提供商
- `late` 用于昂贵或本地网络探测

大多数自托管提供商应使用 `late`。

### 良好的提供商插件边界

适用于提供商插件的情况：

- 具有自定义设置流程的本地/自托管提供商
- 特定于提供商的 OAuth/设备代码登录
- 本地模型服务器的隐式发现
- 选择后的副作用，例如模型拉取

不太合适的场景：

- 仅通过环境变量、基础 URL 和一个默认模型来区分的简单 API 密钥提供商

这些仍然可以成为插件，但主要的模块化收益来自于首先提取行为丰富的提供商。

通过 `api.registerProvider(...)` 注册提供商。每个提供商公开一种或多种身份验证方法（OAuth、API 密钥、设备代码等）。这些方法可以支持：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型选择器中的“自定义提供商”设置条目
- 在模型解析/列出期间的隐式提供商发现

示例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

备注：

- `run` 接收一个 `ProviderAuthContext`，其中包含 `prompter`、`runtime`、
  `openUrl`、`oauth.createVpsAwareHandlers`、`secretInputMode` 和
  `allowSecretRefPrompt` 辅助器/状态。新手引导/配置流程可以使用这些来遵守 `--secret-input-mode` 或提供 env/file/exec secret-ref
  捕获，而 `openclaw models auth` 则保持更紧凑的提示界面。
- `runNonInteractive` 接收一个 `ProviderAuthMethodNonInteractiveContext`
  以及用于无头新手引导的 `opts`、`agentDir`、`resolveApiKey` 和 `toApiKeyCredential` 辅助器。
- 当您需要添加默认模型或提供商配置时，返回 `configPatch`。
- 返回 `defaultModel`，以便 `--set-default` 可以更新代理默认值。
- `wizard.setup` 向新手引导界面（如 `openclaw onboard` / `openclaw setup --wizard`）添加提供商选择。
- `wizard.setup.modelAllowlist` 允许提供商在新手引导/配置期间缩小后续模型允许列表提示的范围。
- `wizard.modelPicker` 向模型选择器添加“设置此提供商”条目。
- `deprecatedProfileIds` 允许提供商拥有已停用的 auth-profile id 的 `openclaw doctor` 清理工作。
- `discovery.run` 针对插件自己的提供商 id 返回 `{ provider }`，或针对多提供商发现返回 `{ providers }`。
- `discovery.order` 控制提供商相对于内置发现阶段的运行时机：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用于特定于提供商的后续工作（例如拉取本地模型）的后置选择挂钩。

### 注册消息渠道

插件可以注册行为类似内置渠道（WhatsApp、Telegram 等）的**渠道插件**。渠道配置位于 `channels.<id>` 下，并由您的渠道插件代码验证。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

备注：

- 将配置放在 `channels.<id>` 下（而不是 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表中的标签。
- `meta.aliases` 添加用于规范化和 CLI 输入的备用 id。
- `meta.preferOver` 列出当两者都已配置时要跳过自动启用的渠道 id。
- `meta.detailLabel` 和 `meta.systemImage` 允许 UI 显示更丰富的渠道标签/图标。

### 渠道设置挂钩

首选设置拆分：

- `plugin.setup` 负责账户 id 规范化、验证和配置写入。
- `plugin.setupWizard` 允许主机运行通用向导流程，而渠道仅提供状态、凭证、私信允许列表和渠道访问描述符。

`plugin.setupWizard` 最适合符合共享模式的渠道：

- 由 `plugin.config.listAccountIds` 驱动的一个账户选择器
- 提示之前的可选预检/准备步骤（例如安装程序/引导工作）
- 用于捆绑凭证集（例如配对的机器人/应用令牌）的可选环境快捷方式提示
- 一个或多个凭证提示，每个步骤通过 `plugin.setup.applyAccountConfig` 写入或由渠道拥有的部分修补程序写入
- 可选的非机密文本提示（例如 CLI 路径、基本 URL、账户 ID）
- 由主机解析的可选 渠道/组访问允许列表提示
- 可选的 私信 允许列表解析（例如 `@username` -> 数字 ID）
- 设置完成后可选的完成说明

### 编写新的消息渠道（分步指南）

当您需要**新的聊天界面**（即“消息渠道”），而不是模型 提供商 时使用此选项。
模型 提供商 文档位于 `/providers/*` 下。

1. 选择一个 ID + 配置结构

- 所有渠道配置均位于 `channels.<id>` 下。
- 对于多账户设置，首选 `channels.<id>.accounts.<accountId>`。

2. 定义渠道元数据

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向一个文档页面，例如 `/channels/<id>`。
- `meta.preferOver` 允许插件替换另一个渠道（自动启用功能会优先选择它）。
- `meta.detailLabel` 和 `meta.systemImage` 由 UI 用于详情文本/图标。

3. 实现所需的适配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、主题等）
- `outbound.deliveryMode` + `outbound.sendText`（用于基本发送）

4. 根据需要添加可选适配器

- `setup`（验证 + 配置写入）、`setupWizard`（主机拥有的向导）、`security`（私信 策略）、`status`（健康/诊断）
- `gateway`（启动/停止/登录）、`mentions`、`threading`、`streaming`
- `actions`（消息操作）、`commands`（本机命令行为）

5. 在插件中注册渠道

- `api.registerChannel({ plugin })`

最小配置示例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最小渠道插件（仅限出站）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

加载插件（extensions 目录或 `plugins.load.paths`），重启网关，然后在配置中配置 `channels.<id>`。

### Agent 工具

请参阅专用指南：[Plugin agent tools](/zh/plugins/agent-tools)。

### 注册网关 RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 注册 CLI 命令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 注册自动回复命令

插件可以注册自定义斜杠命令，这些命令在执行时**不会调用 AI agent**。这对于不需要 LLM 处理的切换命令、状态检查或快速操作非常有用。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

命令处理程序上下文：

- `senderId`：发送者的 ID（如果有）
- `channel`：发送命令的渠道
- `isAuthorizedSender`：发送者是否为授权用户
- `args`：命令后传递的参数（如果 `acceptsArgs: true`）
- `commandBody`：完整的命令文本
- `config`：当前的 OpenClaw 配置

命令选项：

- `name`：命令名称（不含前导 `/`）
- `nativeNames`：斜杠/菜单界面的可选本机命令别名。对于所有本机提供商使用 `default`，或使用提供商特定的键，如 `discord`
- `description`：命令列表中显示的帮助文本
- `acceptsArgs`：命令是否接受参数（默认：false）。如果为 false 且提供了参数，则命令将不匹配，消息将传递给其他处理程序
- `requireAuth`：是否要求发送者已授权（默认：true）
- `handler`：返回 `{ text: string }` 的函数（可以是异步的）

包含授权和参数的示例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

注意：

- 插件命令在内置命令和 AI agent **之前** 处理
- 命令是全局注册的，并在所有渠道中工作
- 命令名称不区分大小写（`/MyStatus` 匹配 `/mystatus`）
- 命令名称必须以字母开头，且仅包含字母、数字、连字符和下划线
- 保留的命令名称（如 `help`、`status`、`reset` 等）不能被插件覆盖
- 跨插件注册重复的命令将会失败，并报出诊断错误

### 注册后台服务

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名规范

- Gateway(网关) 方法：`pluginId.action`（例如：`voicecall.status`）
- 工具：`snake_case`（例如：`voice_call`）
- CLI 命令：kebab 或 camel 格式，但避免与核心命令冲突

## Gateway(网关)

插件可以在代码仓库中附带一个 skill（`skills/<name>/SKILL.md`）。
使用 `plugins.entries.<id>.enabled`（或其他配置门控）启用它，并确保
它存在于您的工作区/托管 skills 位置。

## 分发（npm）

推荐的打包方式：

- 主包：`openclaw`（此仓库）
- 插件：在 `@openclaw/*` 下独立的 npm 包（例如：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，其中含有一个或多个入口文件。
- 可选：`openclaw.setupEntry` 可以指向一个轻量级的、仅用于设置的入口，用于已禁用或尚未配置的渠道设置。
- 可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以选择让渠道插件在监听前 Gateway(网关) 启动期间使用 `setupEntry`，但前提是该设置入口完全覆盖了插件启动的关键表面。
- 入口文件可以是 `.js` 或 `.ts`（jiti 在运行时加载 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，提取到 `~/.openclaw/extensions/<id>/` 中，并在配置中启用它。
- 配置键的稳定性：作用域包被标准化为 `plugins.entries.*` 的 **非作用域** id。

## 示例插件：语音通话

此仓库包含一个语音通话插件（Twilio 或日志回退）：

- 源代码：`extensions/voice-call`
- Skill：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`、`voicecall.status`
- 配置 (twilio)：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可选 `statusCallbackUrl`、`twimlUrl`）
- 配置 (dev)：`provider: "log"`（无网络）

有关设置和用法，请参阅 [Voice Call](/zh/plugins/voice-call) 和 `extensions/voice-call/README.md`。

## 安全注意事项

插件与 Gateway(网关) 在同一进程中运行（请参阅 [Execution 模型](#execution-model)）：

- 仅安装您信任的插件。
- 首选 `plugins.allow` 允许列表。
- 请记住，`plugins.allow` 是基于 ID 的，因此启用的工作区插件可以故意隐藏具有相同 ID 的捆绑插件。
- 更改后重启 Gateway(网关)。

## 测试插件

插件可以（也应该）附带测试：

- 存储库内的插件可以将 Vitest 测试保留在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 单独发布的插件应运行其自己的 CI（lint/build/test）并验证 `openclaw.extensions` 指向构建的入口点（`dist/index.js`）。

import zh from "/components/footer/zh.mdx";

<zh />
