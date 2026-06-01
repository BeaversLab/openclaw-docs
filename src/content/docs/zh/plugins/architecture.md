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
| 嵌入               | `api.registerEmbeddingProvider(...)`             | 提供商拥有的向量插件                 |
| 语音               | `api.registerSpeechProvider(...)`                | `elevenlabs`， `microsoft`           |
| 实时转录           | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音           | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解           | `api.registerMediaUnderstandingProvider(...)`    | `openai`， `google`                  |
| Transcripts 源     | `api.registerTranscriptSourceProvider(...)`      | `discord`                            |
| 图像生成           | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成           | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成           | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| 网页获取           | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| 网络搜索           | `api.registerWebSearchProvider(...)`             | `google`                             |
| 频道 / 消息传递    | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Gateway(网关) 发现 | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>如果一个插件注册的功能为零，但提供了钩子、工具、发现服务或后台服务，则它是一个 **纯遗留钩子（legacy hook-only）** 插件。这种模式仍然完全受支持。</Note>

### 外部兼容性立场

功能模型已落地核心代码，目前由内置/原生插件使用，但外部插件兼容性仍需比“只要导出就冻结”更严格的标准。

| 插件情况               | 指导原则                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| 现有的外部插件         | 保持基于钩子的集成正常工作；这是兼容性基线。                           |
| 新的内置/原生插件      | 优先使用显式的功能注册，而不是特定供应商的内部侵入或新的纯钩子设计。   |
| 采用功能注册的外部插件 | 允许，但除非文档标记为稳定，否则将特定于能力的辅助接口视为不断演进的。 |

能力注册是预期的方向。在过渡期间，传统挂钩仍然是外部插件最安全的无中断路径。导出的辅助子路径并非都平等——首选狭窄的已记录契约，而非偶然的辅助导出。

### 插件形态

OpenClaw 根据每个已加载插件的实际注册行为（而不仅仅是静态元数据）将其归类为一种形态：

<AccordionGroup>
  <Accordion title="plain-capability">仅注册一种能力类型（例如像 `mistral` 这样的仅提供商插件）。</Accordion>
  <Accordion title="hybrid-capability">注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成能力）。</Accordion>
  <Accordion title="hook-only">仅注册挂钩（类型化或自定义），不注册能力、工具、命令或服务。</Accordion>
  <Accordion title="non-capability">注册工具、命令、服务或路由，但不注册能力。</Accordion>
</AccordionGroup>

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力细分。详情请参阅 [CLI 参考](/zh/cli/plugins#inspect)。

### 传统挂钩

`before_agent_start` 钩子作为仅钩子插件的兼容路径仍然受支持。现有的旧版插件仍然依赖它。

方向：

- 保持其正常工作
- 将其记录为传统方式
- 对于 模型/提供商 覆盖工作，优先使用 `before_model_resolve`
- 对于 提示词 变更工作，优先使用 `before_prompt_build`
- 仅在实际使用量下降且装置覆盖证明迁移安全后移除

### 兼容性信号

运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，您可能会看到以下标签之一：

| Signal         | 含义                                           |
| -------------- | ---------------------------------------------- |
| **配置有效**   | 配置解析正常且插件已解析                       |
| **兼容性建议** | 插件使用受支持但较旧的模式（例如 `hook-only`） |
| **旧版警告**   | 插件使用 `before_agent_start`，该接口已弃用    |
| **硬错误**     | 配置无效或插件加载失败                         |

`hook-only` 和 `before_agent_start` 都不会导致您的插件今天崩溃：`hook-only` 仅起建议作用，而 `before_agent_start` 仅触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概述

OpenClaw 的插件系统分为四层：

<Steps>
  <Step title="清单 + 设备发现" OpenClaw>
    OpenClaw 从配置的路径、工作区根目录、全局插件根目录和捆绑插件中查找候选插件。设备发现首先读取原生 `openclaw.plugin.json` 清单以及支持的捆绑清单。
  </Step>
  <Step title="启用 + 验证">核心决定已发现的插件是启用、禁用、被阻止，还是被选中用于内存等独占插槽。</Step>
  <Step title="运行时加载" OpenClaw>
    原生 OpenClaw 插件在进程内加载，并将功能注册到中央注册表中。打包的 JavaScript 通过原生 `require` 加载；第三方本地源 TypeScript 是紧急的 Jiti 后备方案。兼容的捆绑包会被规范化为注册表记录，而无需导入运行时代码。
  </Step>
  <Step title="表层消费" OpenClawCLI>
    OpenClaw 的其余部分读取注册表以公开工具、通道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。
  </Step>
</Steps>

具体针对插件 CLI，根命令发现分为两个阶段：

- 解析时元数据来自 `registerCli(..., { descriptors: [...] })`
- 真正的插件 CLI 模块可以保持懒加载，并在首次调用时注册

这样可以在插件内保留由插件拥有的 CLI 代码，同时仍允许 OpenClaw 在解析之前保留根命令名称。

重要的设计边界：

- manifest/config 验证应通过 **manifest/schema metadata** 进行，而无需执行插件代码
- 原生功能发现可能会加载受信任的插件入口代码，以构建非激活注册表快照
- 原生运行时行为来自插件模块的 `register(api)` 路径，并带有 `api.registrationMode === "full"`

这种分离使 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件并构建 UI/schema 提示。

### 插件元数据快照和查找表

Gateway(网关) 启动时会为当前配置快照构建一个 Gateway(网关)`PluginMetadataSnapshot`。该快照仅包含元数据：它存储已安装的插件索引、清单注册表、清单诊断、所有者映射、插件 ID 规范化器和清单记录。它不保存已加载的插件模块、提供商 SDK、包内容或运行时导出。

感知插件的配置验证、启动时自动启用和 Gateway(网关) 插件引导程序会使用该快照，而不是独立重建清单/索引元数据。Gateway(网关)`PluginLookUpTable` 派生自同一快照，并添加了针对当前运行时配置的启动插件计划。

启动后，Gateway(网关)将当前元数据快照保持为可替换的运行时产品。重复的运行时提供商发现可以借用该快照，而不是为每次提供商目录传递重建已安装的索引和清单注册表。快照在 Gateway(网关)关闭、配置/插件清单更改以及已安装索引写入时被清除或替换；当不存在兼容的当前快照时，调用者将回退到冷清单/索引路径。兼容性检查必须包含插件发现根（如 Gateway(网关)Gateway(网关)`plugins.load.paths`）和默认代理工作区，因为工作区插件是元数据范围的一部分。

快照和查找表使重复的启动决策保持在快速路径上：

- 渠道所有权
- 延迟渠道启动
- 启动插件 ID
- 提供商和 CLI 后端所有权
- 设置提供商、命令别名、模型目录提供商和清单合约所有权
- 插件配置架构和渠道配置架构验证
- 启动自动启用决策

安全边界是快照替换，而非变更。当配置、插件清单、安装记录或持久化索引策略发生变化时，重建快照。不要将其视为一个广泛的可变全局注册表，也不要保存无限制的历史快照。运行时插件加载与元数据快照保持分离，以免过时的运行时状态被隐藏在元数据缓存之后。

缓存规则记录在 [Plugin architecture internals](/zh/plugins/architecture-internals#plugin-cache-boundary) 中：清单和发现元数据是新鲜的，除非调用者为当前流程持有显式快照、查找表或清单注册表。隐藏的元数据缓存和挂钟 TTL 不是插件加载的一部分。只有运行时加载器、模块和依赖项构件缓存可能会在代码或已安装构件实际加载后保留。

一些冷路径调用者仍然直接从持久化的已安装插件索引重建清单注册表，而不是接收 Gateway(网关) Gateway(网关)`PluginLookUpTable`。该路径现在按需重建注册表；当调用者已经拥有当前查找表或显式清单注册表时，首选通过运行时流程传递它们。

### 激活规划

激活规划是控制平面的一部分。调用者可以在加载更广泛的运行时注册表之前，询问哪些插件与具体的命令、提供商、渠道、路由、代理工具或能力相关。

规划器保持当前的清单行为兼容：

- `activation.*` 字段是显式的规划器提示
- `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子仍然是清单所有权的后备
- 仅 ID 规划器 API 仍然可供现有调用者使用
- 规划 API 报告原因标签，以便诊断可以区分显式提示和所有权回退

<Warning>不要将 `activation` 视为生命周期钩子或 `register(...)` 的替代品。它是用于缩小加载范围的元数据。当所有权字段已经描述了该关系时，请优先使用它们；仅将 `activation` 用于额外的规划器提示。</Warning>

### 渠道插件和共享消息工具

渠道插件不需要为普通的聊天操作注册单独的发送/编辑/回应工具。OpenClaw 在核心中保留一个共享的 OpenClaw`message` 工具，渠道插件拥有其背后特定于渠道的发现和执行逻辑。

当前的边界是：

- 核心拥有共享的 `message` 工具主机、提示词连接、会话/线程簿记以及执行分发
- 渠道插件拥有范围内的操作发现、能力发现以及任何特定于渠道的架构片段
- 渠道插件拥有特定于提供商的会话对话语法，例如对话 ID 如何编码线程 ID 或从父对话继承
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是 `ChannelMessageActionAdapter.describeMessageTool(...)`。那个统一的发现调用允许插件一次性返回其可见的操作、能力和模式贡献，以防止这些部分发生偏离。

当特定于渠道的消息工具参数携带媒体源（例如本地路径或远程媒体 URL）时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。核心使用该显式列表来应用沙箱路径规范化和出站媒体访问提示，而无需硬编码由插件拥有的参数名称。在那里优先使用操作作用域映射，而不是一个渠道范围的扁平列表，这样仅在配置文件中使用的媒体参数就不会在 `send` 等不相关的操作上被规范化。

核心将运行时范围传入该发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信的入站 `requesterSenderId`

这对于上下文敏感的插件很重要。渠道可以根据当前的活动帐户、房间/线程/消息或可信请求者身份来隐藏或暴露消息操作，而无需在核心 `message` 工具中硬编码特定于渠道的分支。

这就是为什么嵌入式运行器路由更改仍然是插件工作的原因：运行器负责将当前的聊天/会话身份转发到插件发现边界，以便共享的 `message` 工具为当前回合暴露正确的渠道拥有的表面。

对于渠道拥有的执行助手，捆绑插件应将执行运行时保留在其自己的扩展模块中。核心不再拥有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入其本地运行时代码。

同样的边界适用于通常以提供商命名的 SDK 接缝：核心不应为 Slack、Discord、Signal、WhatsApp 或类似扩展导入特定于渠道的便捷汇总模块。如果核心需要某种行为，要么使用捆绑插件自己的 `api.ts` / `runtime-api.ts` 汇总模块，要么将该需求提升到共享 SDK 中的狭窄通用能力。

捆绑插件遵循相同的规则。捆绑插件的 `runtime-api.ts` 不应重新导出自己的品牌化 `openclaw/plugin-sdk/<plugin-id>` 外观。那些品牌化外观仍然是外部插件和旧版消费者的兼容性垫片，但捆绑插件应使用本地导出以及狭窄的通用 SDK 子路径，例如 `openclaw/plugin-sdk/channel-policy`、`openclaw/plugin-sdk/runtime-store` 或 `openclaw/plugin-sdk/webhook-ingress`。除非现有外部生态系统的兼容性边界有要求，否则新代码不应添加特定于插件 ID 的 SDK 外观。

具体对于投票，有两种执行路径：

- `outbound.sendPoll` 是适合通用轮询模型的渠道的共享基线
- `actions.handleAction("poll")` 是针对特定于渠道的轮询语义或额外轮询参数的首选路径

Core 现在将共享轮询解析推迟到插件轮询调度拒绝该操作之后，因此插件拥有的轮询处理程序可以接受特定于渠道的轮询字段，而不会先被通用轮询解析器阻止。

有关完整的启动序列，请参阅 [插件架构内部](/zh/plugins/architecture-internals)。

## 功能所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是 unrelated integrations 的拼凑。

这意味着：

- 公司插件通常应拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应拥有其引入的完整功能表面
- 渠道应消费共享核心功能，而不是临场重新实现提供商行为

<AccordionGroup>
  <Accordion title="Vendor multi-capability">`openai` 拥有文本推理、语音、实时语音、媒体理解和图像生成功能。`google` 拥有文本推理以及媒体理解、图像生成和网络搜索功能。`qwen` 拥有文本推理以及媒体理解和视频生成功能。</Accordion>
  <Accordion title="Vendor single-capability">`elevenlabs` 和 `microsoft` 拥有语音功能；`firecrawl` 拥有 web-fetch 功能；`minimax` / `mistral` / `moonshot` / `zai` 拥有媒体理解后端。</Accordion>
  <Accordion title="Feature plugin">`voice-call` 拥有呼叫传输、工具、CLI、路由和 Twilio 媒体流桥接功能，但使用共享的语音、实时转录和实时语音能力，而不是直接导入供应商插件。</Accordion>
</AccordionGroup>

预期的最终状态是：

- OpenAI 位于一个插件中，即使它跨越了文本模型、语音、图像和未来的视频
- 另一个供应商可以对其自己的覆盖范围做同样的事情
- 渠道不关心哪个供应商插件拥有该提供商；它们消费核心暴露的共享功能合约

关键区别在于：

- **插件** = 所有权边界
- **功能** = 多个插件可以实现或消费的核心合约

因此，如果 OpenClaw 添加了一个新域（例如视频），第一个问题不是“哪个提供商应该硬编码视频处理？”。第一个问题是“核心视频功能合约是什么？”。一旦该合约存在，供应商插件就可以对其进行注册，而渠道/功能插件就可以消费它。

如果该功能尚不存在，正确的做法通常是：

<Steps>
  <Step title="定义功能">在核心中定义缺失的功能。</Step>
  <Step title="通过 SDK 暴露">通过插件 API/运行时以类型化方式暴露它。</Step>
  <Step title="连接消费者">针对该功能连接渠道/功能。</Step>
  <Step title="供应商实现">让供应商插件注册实现。</Step>
</Steps>

这使得所有权明确，同时避免了依赖于单一供应商或一次性插件特定代码路径的核心行为。

### 功能分层

在决定代码归属时，请使用此心智模型：

<Tabs>
  <Tab title="核心功能层">共享编排、策略、回退、配置合并规则、传递语义和类型化合约。</Tab>
  <Tab title="供应商插件层">特定于供应商的 API、身份验证、模型目录、语音合成、图像生成、未来的视频后端、使用端点。</Tab>
  <Tab title="Channel/feature plugin layer" SlackDiscord>
    Slack/Discord/语音通话/等集成，它们使用核心能力并将其呈现在界面上。
  </Tab>
</Tabs>

例如，TTS 遵循这种形式：

- core 拥有回复时的 TTS 策略、回退顺序、偏好设置以及渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 使用电话 TTS 运行时辅助程序

对于未来的能力，应优先采用相同的模式。

### 多能力公司插件示例

公司插件在外部应该让人感觉是一个整体。如果 OpenClaw 针对 模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络抓取和网络搜索都有共享合约，供应商就可以在一个地方拥有其所有界面：

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

重要的不是确切的辅助程序名称。形式才是重要的：

- 一个插件拥有供应商界面
- core 仍然拥有能力合约
- 通道和功能插件使用 `api.runtime.*` 辅助程序，而不是供应商代码
- 合约测试可以断言插件注册了其声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一种共享能力。相同的所有权模型也适用于此处：

<Steps>
  <Step title="Core defines the contract">Core 定义媒体理解合约。</Step>
  <Step title="Vendor plugins register">供应商插件根据适用情况注册 `describeImage`、`transcribeAudio` 和 `describeVideo`。</Step>
  <Step title="Consumers use the shared behavior">渠道和功能插件使用共享的 core 行为，而不是直接连接到供应商代码。</Step>
</Steps>

这避免了将某一提供商的视频假设硬编码到核心中。插件拥有供应商接口；核心拥有能力契约和回退行为。

视频生成已经使用了相同的序列：核心拥有类型化能力合约和运行时辅助程序，供应商插件针对其注册 `api.registerVideoGenerationProvider(...)` 实现。

需要具体的发布检查清单？请参阅 [Capability Cookbook](/zh/tools/capability-cookbook)。

## 契约与强制执行

插件 API 表面是有意类型化并集中在 `OpenClawPluginApi` 中的。该合约定义了支持的注册点以及插件可以依赖的运行时辅助工具。

为什么这很重要：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复的所有权，例如两个插件注册相同的提供商 ID
- 启动时可以为格式错误的注册提供可执行的诊断信息
- 契约测试可以强制执行捆绑插件的所有权并防止静默漂移

有两个执行层级：

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">插件注册表在插件加载时验证注册。例如：重复的提供商 ID、重复的语音提供商 ID 以及格式错误的注册会产生插件诊断，而不是未定义的行为。</Accordion>
  <Accordion title="Contract tests">捆绑插件在测试运行期间被捕获在契约注册表中，以便 OpenClaw 可以显式断言所有权。目前这用于模型提供商、语音提供商、网络搜索提供商以及捆绑注册所有权。</Accordion>
</AccordionGroup>

实际效果是，OpenClaw 能够预先知道哪个插件拥有哪个接口。这让核心和频道能够无缝组合，因为所有权是声明的、类型化的和可测试的，而不是隐式的。

### 契约中应包含什么

<Tabs>
  <Tab title="Good contracts">
    - 类型化
    - 小型
    - 特定于能力
    - 由核心拥有
    - 可被多个插件重用
    - 可被频道/功能使用，而无需供应商知识

  </Tab>
  <Tab title="Bad contracts">
    - 隐藏在核心中的特定于供应商的策略
    - 绕过注册表的一次性插件应急逃生通道
    - 直接访问供应商实现的渠道代码
    - 不属于 `OpenClawPluginApi` 或 `api.runtime` 一部分的临时运行时对象

  </Tab>
</Tabs>

如有疑问，请提高抽象级别：先定义能力，然后让插件接入其中。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) 在同一进程中运行。它们不是沙箱隔离的。已加载的原生插件具有与核心代码相同的进程级信任边界。

<Warning>原生插件的影响：插件可以注册工具、网络处理程序、挂钩和服务；插件错误可能导致网关崩溃或不稳定；恶意的原生插件等同于在 OpenClaw 进程内执行任意代码。</Warning>

兼容捆绑包默认更安全，因为 OpenClaw 目前将其视为元数据/内容包。在当前版本中，这主要意味着捆绑的技能。

对于非捆绑插件，请使用允许列表和明确的安装/加载路径。将工作区插件视为开发时代码，而非生产环境默认设置。

对于捆绑的工作区包名称，请保持插件 id 锚定在 npm 名称中：默认为 `@openclaw/<id>`，或者当包有意公开更窄的插件角色时，使用批准的类型化后缀，如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

<Note>**信任说明：** `plugins.allow` 信任的是**插件 ID**，而不是源出处。当启用/允许列出与捆绑插件具有相同 ID 的工作区插件时，该工作区插件会有意覆盖捆绑副本。这对于本地开发、补丁测试和热修复来说是正常且有用的。捆绑插件的信任是从源快照解析的——即加载时的清单和磁盘上的代码——而不是从安装元数据解析的。损坏或被替换的安装记录无法在静默情况下将捆绑插件的信任范围扩大到实际源代码所声明的范围之外。</Note>

## 导出边界

OpenClaw 导出的是能力，而非实现的便捷性。

保持能力注册的公开性。删减非契约辅助导出：

- 特定于捆绑插件的辅助子路径
- 不作为公共 API 意图的运行时管道子路径
- 特定于供应商的便捷辅助工具
- 属于实现细节的设置/新手引导辅助工具

保留的捆绑插件辅助子路径已从生成的 SDK 导出映射中移除。将特定于所有者的辅助工具保留在所属插件包内；仅将可重用的主机行为提升到通用 SDK 合约，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

## 内部参考

有关加载管道、注册表模型、提供商运行时挂钩、Gateway(网关) HTTP 路由、消息工具架构、渠道目标解析、提供商目录、上下文引擎插件以及添加新功能的指南，请参阅[插件架构内部机制](/zh/plugins/architecture-internals)。

## 相关

- [构建插件](/zh/plugins/building-plugins)
- [插件清单](/zh/plugins/manifest)
- [插件 SDK 设置](/zh/plugins/sdk-setup)
