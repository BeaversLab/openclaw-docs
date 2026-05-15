---
summary: "插件内部：能力模型、所有权、契约、加载管线和运行时助手"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "插件内部"
sidebarTitle: "内部机制"
---

这是 OpenClaw 插件系统的**深度架构参考**。对于实用指南，请从下面的专题页面之一开始。

<CardGroup cols={2}>
  <Card title="安装和使用插件" icon="plug" href="/zh/tools/plugin">
    用于添加、启用和排除插件故障的最终用户指南。
  </Card>
  <Card title="构建插件" icon="rocket" href="/zh/plugins/building-plugins">
    使用最小工作清单的第一个插件教程。
  </Card>
  <Card title="渠道插件" icon="comments" href="/zh/plugins/sdk-channel-plugins">
    构建消息渠道插件。
  </Card>
  <Card title="提供商插件" icon="microchip" href="/zh/plugins/sdk-provider-plugins">
    构建模型提供商插件。
  </Card>
  <Card title="SDK 概述" icon="book" href="/zh/plugins/sdk-overview">
    导入映射和注册 API 参考。
  </Card>
</CardGroup>

## 公共能力模型

能力是 OpenClaw 内部公共的**原生插件**模型。每个原生 OpenClaw 插件都针对一种或多种能力类型进行注册：

| 能力               | 注册方法                                         | 示例插件                             |
| ------------------ | ------------------------------------------------ | ------------------------------------ |
| 文本推理           | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理后端       | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 语音               | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 实时转录           | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音           | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解           | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 图像生成           | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成           | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成           | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web 获取           | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Web 搜索           | `api.registerWebSearchProvider(...)`             | `google`                             |
| 渠道 / 消息传递    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Gateway(网关) 发现 | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>一个注册了零项能力但提供钩子、工具、发现服务或后台服务的插件是**仅遗留钩子（legacy hook-only）**插件。该模式仍然受到完全支持。</Note>

### 外部兼容性立场

能力模型已在核心中落地，并被当前的捆绑/原生插件使用，但外部插件兼容性仍需要一个比“只要已导出，即视为冻结”更严格的标准。

| 插件情况               | 指导                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| 现有的外部插件         | 保持基于钩子的集成正常工作；这是兼容性基准。                                 |
| 新的捆绑/原生插件      | 优先使用显式能力注册，而不是供应商特定的内部访问或新的仅钩子设计。           |
| 采用能力注册的外部插件 | 允许，但除非文档将其标记为稳定，否则应将特定于能力的辅助表面视为不断演进的。 |

能力注册是预期的方向。在过渡期间，遗留钩子仍然是外部插件最安全且不会破坏的路径。导出的辅助子路径并不都是平等的 —— 优先使用狭窄的、有文档记录的契约，而非偶然的辅助导出。

### 插件形态

OpenClaw 根据每个已加载插件的实际注册行为（而不仅仅是静态元数据）将其分类为一种形状：

<AccordionGroup>
  <Accordion title="plain-capability">仅注册一种能力类型（例如仅提供商插件，如 `mistral`）。</Accordion>
  <Accordion title="hybrid-capability">注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成能力）。</Accordion>
  <Accordion title="hook-only">仅注册钩子（类型化或自定义），不注册能力、工具、命令或服务。</Accordion>
  <Accordion title="non-capability">注册工具、命令、服务或路由，但不注册能力。</Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>`CLI 查看插件的形状和功能细分。详情请参阅 [CLI 参考](/zh/cli/plugins#inspect)。

### 旧版钩子

`before_agent_start` 钩子作为仅钩子插件的兼容路径继续受到支持。现实中的旧版插件仍然依赖它。

方向：

- 保持其工作
- 将其记录为旧版
- 对于 模型/提供商 覆盖工作，首选 `before_model_resolve`
- 对于提示词变更工作，首选 `before_prompt_build`
- 仅在实际使用率下降且测试覆盖证明了迁移安全性后才移除

### 兼容性信号

当您运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，您可能会看到以下标签之一：

| Signal                     | 含义                                             |
| -------------------------- | ------------------------------------------------ |
| **config valid**           | 配置解析正常且插件已解析                         |
| **compatibility advisory** | 插件使用了受支持但较旧的模式（例如 `hook-only`） |
| **legacy warning**         | 插件使用了 `before_agent_start`，该功能已弃用    |
| **hard error**             | 配置无效或插件加载失败                           |

无论是 `hook-only` 还是 `before_agent_start` 都不会在今天破坏您的插件：`hook-only` 仅供参考，而 `before_agent_start` 仅触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概述

OpenClaw 的插件系统分为四层：

<Steps>
  <Step title="Manifest + discovery">OpenClaw 从配置的路径、工作区根目录、全局插件根目录和捆绑插件中查找候选插件。设备发现首先读取原生 `openclaw.plugin.json` 清单以及支持的捆绑清单。</Step>
  <Step title="启用 + 验证">Core 决定已发现的插件是启用、禁用、阻止，还是被选中用于像内存这样的独占插槽。</Step>
  <Step title="Runtime loading" OpenClaw>
    原生 OpenClaw 插件在进程中加载，并将功能注册到中央注册表中。打包的 JavaScript 通过原生 `require` 加载；第三方本地源 TypeScript 是紧急的 Jiti 回退方案。兼容的捆绑包被规范化为注册表记录，而不导入运行时代码。
  </Step>
  <Step title="表面消费">OpenClaw 的其余部分读取注册表以暴露工具、通道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。</Step>
</Steps>

具体对于插件 CLI，根命令发现分为两个阶段：

- 解析时元数据来自 `registerCli(..., { descriptors: [...] })`
- 真正的插件 CLI 模块可以保持惰性，并在首次调用时注册

这使得插件拥有的 CLI 代码保留在插件内部，同时允许 OpenClaw 在解析之前保留根命令名称。

重要的设计边界：

- manifest/config 验证应能通过 **manifest/schema metadata** 工作，而无需执行插件代码
- 原生能力发现可能会加载受信任的插件入口代码，以构建非激活注册表快照
- 原生运行时行为来自插件模块的 `register(api)` 路径，带有 `api.registrationMode === "full"`

这种分离使得 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件，并构建 UI/schema 提示。

### 插件元数据快照和查找表

Gateway 启动时会为当前配置快照构建一个 Gateway(网关)`PluginMetadataSnapshot`。该快照仅包含元数据：它存储已安装的插件索引、清单注册表、清单诊断、所有者映射、插件 ID 规范化器和清单记录。它不保存已加载的插件模块、提供商 SDK、包内容或运行时导出。

感知插件的配置验证、启动时自动启用和 Gateway 插件引导程序使用该快照，而不是独立重建清单/索引元数据。Gateway(网关)`PluginLookUpTable` 派生自同一快照，并添加了当前运行时配置的启动插件计划。

启动后，Gateway 将当前元数据快照作为可替换的运行时产品保留。重复的运行时提供商发现可以借用该快照，而不是为每次提供商目录遍历重建已安装的索引和清单注册表。快照在 Gateway 关闭、配置/插件清单更改以及已安装索引写入时被清除或替换；当不存在兼容的当前快照时，调用者会回退到冷清单/索引路径。兼容性检查必须包括插件发现根目录（例如 Gateway(网关)Gateway(网关)`plugins.load.paths`）和默认代理工作区，因为工作区插件是元数据范围的一部分。

快照和查找表将重复的启动决策保留在快速路径上：

- 渠道所有权
- 延迟的渠道启动
- 启动插件 ID
- 提供商和 CLI 后端所有权
- 设置提供商、命令别名、模型目录提供商和清单契约所有权
- 插件配置架构和渠道配置架构验证
- 启动时自动启用决策

安全边界是快照替换，而不是变更。当配置、插件清单、安装记录或持久化索引策略发生变化时，重新构建快照。不要将其视为广义的可变全局注册表，也不要保留无限制的历史快照。运行时插件加载与元数据快照保持分离，以免陈旧的运行时状态被隐藏在元数据缓存之后。

缓存规则在 [插件架构内部](/zh/plugins/architecture-internals#plugin-cache-boundary) 中有文档说明：清单和发现元数据是新鲜的，除非调用者为当前流持有显式快照、查找表或清单注册表。隐藏的元数据缓存和时钟 TTL 不属于插件加载的一部分。只有运行时加载器、模块和依赖项构件缓存可能会在代码或已安装构件实际加载后持久化。

一些冷路径调用者仍然直接从持久化的已安装插件索引重建清单注册表，而不是接收 Gateway(网关) Gateway(网关)`PluginLookUpTable`。该路径现在按需重建注册表；当调用者已经拥有当前查找表或显式清单注册表时，首选通过运行时流传递它。

### 激活规划

激活规划是控制平面的一部分。调用者可以在加载更广泛的运行时注册表之前，询问哪些插件与具体的命令、提供商、渠道、路由、代理工具或功能相关。

规划器保持当前清单行为的兼容性：

- `activation.*` 字段是显式规划器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子保持清单所有权回退
- 仅 ID 的规划器 API 对现有调用者仍然可用
- 规划 API 报告原因标签，以便诊断可以区分显式提示和所有权回退

<Warning>不要将 `activation` 视为生命周期钩子或 `register(...)` 的替代品。它是用于缩小加载范围的元数据。当所有权字段已经描述了该关系时，请优先使用它们；仅将 `activation` 用于额外的规划器提示。</Warning>

### 渠道插件和共享消息工具

渠道插件不需要为正常的聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 OpenClaw`message` 工具，渠道插件拥有其背后的特定于渠道的发现和执行。

当前的边界是：

- core 拥有共享的 `message` 工具主机、提示词连接、会话/线程记账以及执行调度
- 渠道插件拥有作用域内的操作发现、能力发现以及任何特定于渠道的架构片段
- 渠道插件拥有特定于提供商的会话对话语法，例如对话 ID 如何编码线程 ID 或从父对话继承
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。那个统一的发现调用允许插件一起返回其可见的操作、能力和架构贡献，以便这些部分不会分离。

当特定于渠道的 message-工具 参数携带媒体源（如本地路径或远程媒体 URL）时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。Core 使用该显式列表来应用沙盒路径规范化和出站媒体访问提示，而无需硬编码插件拥有的参数名称。在那里倾向于使用操作作用域映射，而不是一个渠道范围的扁平列表，以便仅限配置文件的媒体参数不会在诸如 `send` 之类的无关操作上被规范化。

Core 将运行时作用域传递到该发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信的入站 `requesterSenderId`

这对于上下文敏感的插件很重要。渠道可以根据活跃账户、当前房间/线程/消息或可信的请求者身份来隐藏或暴露消息操作，而无需在核心 `message` 工具中硬编码特定于渠道的分支。

这就是为什么嵌入式运行器路由更改仍然是插件工作的原因：运行器负责将当前聊天/会话身份转发到插件发现边界，以便共享的 `message` 工具为当前轮次暴露正确的渠道拥有的表面。

对于渠道拥有的执行辅助程序，捆绑插件应将其执行运行时保留在其自己的扩展模块中。Core 不再拥有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入其本地运行时代码。

同样的边界通常适用于提供商命名的 SDK 接缝：Core 不应导入 Slack、Discord、Signal、WhatsApp 或类似扩展的特定于渠道的便捷桶。如果 Core 需要某种行为，要么使用捆绑插件自己的 `api.ts` / `runtime-api.ts` 桶，要么将需求提升为共享 SDK 中一个狭窄的通用能力。

捆绑插件遵循相同的规则。捆绑插件的 `runtime-api.ts` 不应重新导出其自己的品牌 `openclaw/plugin-sdk/<plugin-id>` 外观。这些品牌外观仍然是外部插件和旧使用者的兼容性垫片，但捆绑插件应使用本地导出以及狭窄的通用 SDK 子路径，例如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress`。除非现有外部生态系统的兼容性边界需要，否则新代码不应添加特定于插件 ID 的 SDK 外观。

具体对于投票，有两种执行路径：

- `outbound.sendPoll` 是适合常见投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是特定于渠道的投票语义或额外投票参数的首选路径

Core 现在将共享投票解析推迟到插件投票调度拒绝该操作之后，因此插件拥有的投票处理程序可以接受特定于渠道的投票字段，而不会首先被通用投票解析器阻止。

有关完整的启动序列，请参阅 [插件架构内部](/zh/plugins/architecture-internals)。

## 能力所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是一个杂乱无章的集成包。

这意味着：

- 公司插件通常应该拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应该拥有其引入的完整功能表面
- 通道应该消费共享的核心能力，而不是临时重新实现提供商行为

<AccordionGroup>
  <Accordion title="Vendor multi-capability">`openai` 拥有文本推理、语音、实时语音、媒体理解和图像生成。`google` 拥有文本推理以及媒体理解、图像生成和 Web 搜索。`qwen` 拥有文本推理以及媒体理解和视频生成。</Accordion>
  <Accordion title="Vendor single-capability">`elevenlabs` 和 `microsoft` 拥有语音；`firecrawl` 拥有 web-fetch；`minimax` / `mistral` / `moonshot` / `zai` 拥有媒体理解后端。</Accordion>
  <Accordion title="Feature plugin">`voice-call` 拥有呼叫传输、工具、CLI、路由和 Twilio 媒体流桥接，但消费共享的语音、实时转录和实时语音能力，而不是直接导入供应商插件。</Accordion>
</AccordionGroup>

预期的最终状态是：

- OpenAI 即使跨越文本模型、语音、图像和未来的视频，也位于一个插件中
- 其他供应商可以为其自身的表面区域做同样的事情
- 通道不在乎哪个供应商插件拥有提供商；它们消费核心暴露的共享能力合约

关键区别在于：

- **插件** = 所有权边界
- **能力** = 多个插件可以实现或消费的核心合约

因此，如果 OpenClaw 添加了一个新领域（例如视频），第一个问题不是“哪个提供商应该硬编码视频处理？”，第一个问题应该是“核心视频能力合约是什么？”。一旦该合约存在，供应商插件就可以针对它进行注册，而渠道/功能插件也可以消费它。

如果该能力尚不存在，通常正确的做法是：

<Steps>
  <Step title="Define the capability">在核心中定义缺失的能力。</Step>
  <Step title="Expose through the SDK">以类型化方式通过插件 API/运行时将其公开。</Step>
  <Step title="Wire consumers">针对该能力连接渠道/功能。</Step>
  <Step title="Vendor implementations">让供应商插件注册实现。</Step>
</Steps>

这使得所有权明确，同时避免了依赖于单个供应商或一次性插件特定代码路径的核心行为。

### 能力分层

在决定代码归属时使用此心智模型：

<Tabs>
  <Tab title="Core capability layer">共享的编排、策略、回退、配置合并规则、交付语义以及类型化合约。</Tab>
  <Tab title="Vendor plugin layer">供应商特定的 API、身份验证、模型目录、语音合成、图像生成、未来的视频后端以及使用端点。</Tab>
  <Tab title="Channel/feature plugin layer">消费核心能力并将其呈现于某个表面的 Slack/Discord/语音通话/等集成。</Tab>
</Tabs>

例如，TTS 遵循这种形态：

- core 拥有回复时 TTS 策略、回退顺序、首选项和渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时助手

对于未来的能力，应优先采用相同的模式。

### 多功能公司插件示例

公司插件从外部看应具有内聚性。如果 OpenClaw 针对模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取和 Web 搜索拥有共享合约，供应商可以在一个地方拥有其所有界面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import { describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

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

重要的不是确切的辅助函数名称。重要的是结构：

- 一个插件拥有供应商界面
- 核心仍然拥有功能合约
- 通道和功能插件使用 `api.runtime.*` 辅助函数，而不是供应商代码
- 合约测试可以断言插件注册了它声称拥有的功能

### 功能示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一个共享功能。同样的所有权模型也适用于此：

<Steps>
  <Step title="Core defines the contract">Core defines the media-understanding contract.</Step>
  <Step title="Vendor plugins register">Vendor plugins register `describeImage`, `transcribeAudio`, and `describeVideo` as applicable.</Step>
  <Step title="Consumers use the shared behavior">Channels and feature plugins consume the shared core behavior instead of wiring directly to vendor code.</Step>
</Steps>

这避免了将一个提供商的视频假设硬编码到核心中。插件拥有供应商界面；核心拥有功能合约和回退行为。

视频生成已经使用了相同的序列：核心拥有类型化的功能合约和运行时辅助函数，供应商插件针对它注册 `api.registerVideoGenerationProvider(...)` 实现。

需要具体的发布清单吗？请参阅 [功能手册](/zh/tools/capability-cookbook)。

## 合约与执行

插件 API 界面在 `OpenClawPluginApi` 中经过了有意的类型化和集中处理。该合约定义了支持的注册点以及插件可能依赖的运行时辅助函数。

为什么这很重要：

- 插件作者获得一个稳定的内部标准
- core 可以拒绝重复的所有权，例如两个插件注册同一个 提供商 id
- startup 可以针对格式错误的注册提供可操作的诊断信息
- contract tests 可以强制执行捆绑插件的所有权并防止静默漂移

有两个执行层级：

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">插件注册表会在插件加载时验证注册。例如：重复的 提供商 id、重复的 speech 提供商 id 以及格式错误的注册会产生插件诊断信息，而不是导致未定义的行为。</Accordion>
  <Accordion title="Contract tests">捆绑插件会在测试运行期间被捕获到合约注册表中，以便 OpenClaw 可以显式断言所有权。目前这用于模型提供商、语音提供商、网络搜索提供商以及捆绑注册所有权。</Accordion>
</AccordionGroup>

实际效果是，OpenClaw 可以提前知道哪个插件拥有哪个表面。这使得 core 和渠道可以无缝组合，因为所有权是被声明的、有类型的且可测试的，而不是隐式的。

### 合约中应包含什么

<Tabs>
  <Tab title="Good contracts">
    - 有类型的
    - 小型的
    - 特定于能力的
    - 由 core 拥有
    - 可被多个插件重用
    - 可被渠道/功能使用而无需供应商知识

  </Tab>
  <Tab title="Bad contracts">
    - 隐藏在 core 中的供应商特定策略
    - 绕过注册表的一次性插件逃生通道
    - 直接深入供应商实现的渠道代码
    - 不属于 `OpenClawPluginApi` 或 `api.runtime` 一部分的临时运行时对象

  </Tab>
</Tabs>

如果不确定，请提高抽象级别：先定义能力，再让插件插入其中。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) **在进程内** 运行。它们不是沙箱隔离的。已加载的原生插件具有与 core 代码相同的进程级信任边界。

<Warning>原生插件的影响：插件可以注册工具、网络处理程序、钩子和服务；插件错误可能导致网关崩溃或不稳定；恶意的原生插件等同于在 OpenClaw 进程内执行任意代码。</Warning>

兼容包默认更安全，因为 OpenClaw 目前将其视为元数据/内容包。在当前版本中，这主要是指捆绑的技能。

对非捆绑插件使用允许列表和显式的安装/加载路径。将工作区插件视为开发时代码，而非生产环境默认设置。

对于捆绑的工作区包名称，请保持插件 ID 锚定在 npm 名称中：默认为 `@openclaw/<id>`，或者当包有意暴露更窄的插件角色时，使用批准的类型后缀，如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>**信任说明：** `plugins.allow` 信任的是**插件 ID**，而不是来源出处。当启用/加入允许列表时，与捆绑插件具有相同 ID 的工作区插件会有意遮蔽该捆绑副本。这对于本地开发、补丁测试和热修复来说是正常且有用的。捆绑插件的信任是从源快照（加载时磁盘上的清单和代码）解析的，而不是从安装元数据解析的。损坏或被替换的安装记录无法在静默情况下将捆绑插件的信任范围扩大到实际源声明的范围之外。</Note>

## 导出边界

OpenClaw 导出的是功能，而非实现的便利性。

保持功能注册公开。精简非契约辅助导出：

- 特定于捆绑插件的辅助子路径
- 不打算作为公共 API 的运行时管道子路径
- 特定于供应商的便利辅助工具
- 作为实现细节的设置/新手引导辅助工具

生成的导出映射中已弃用保留的捆绑插件辅助子路径。将所有者特定的辅助函数保留在所属插件包内；仅将可重用的主机行为提升到通用 SDK 契约，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 内部与参考

有关加载管道、注册表模型、提供商运行时挂钩、Gateway(网关) HTTP 路由、消息工具模式、渠道目标解析、提供商目录、上下文引擎插件以及添加新功能的指南，请参阅 [Plugin architecture internals](<Gateway(网关)/en/plugins/architecture-internals>)。

## 相关

- [Building plugins](/zh/plugins/building-plugins)
- [Plugin manifest](/zh/plugins/manifest)
- [Plugin SDK setup](/zh/plugins/sdk-setup)
