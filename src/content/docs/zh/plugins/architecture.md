---
summary: "插件内部：能力模型、所有权、契约、加载管道和运行时助手"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "插件内部"
sidebarTitle: "内部"
---

# 插件内部

<Info>这是**深度架构参考**。如需实用指南，请参阅： - [安装和使用插件](/zh/tools/plugin) — 用户指南 - [入门指南](/zh/plugins/building-plugins) — 第一个插件教程 - [渠道插件](/zh/plugins/sdk-channel-plugins) — 构建消息渠道 - [提供商插件](/zh/plugins/sdk-provider-plugins) — 构建模型提供商 - [SDK 概览](/zh/plugins/sdk-overview) — 导入映射和注册 API</Info>

本页介绍 OpenClaw 插件系统的内部架构。

## 公共能力模型

能力是 OpenClaw 内部的公共**原生插件**模型。每个
原生 OpenClaw 插件针对一种或多种能力类型进行注册：

| 能力            | 注册方法                                         | 示例插件                             |
| --------------- | ------------------------------------------------ | ------------------------------------ |
| 文本推理        | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI 推理后端    | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| 语音            | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| 实时转录        | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| 实时语音        | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| 图像生成        | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| 音乐生成        | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| 视频生成        | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web 获取        | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Web 搜索        | `api.registerWebSearchProvider(...)`             | `google`                             |
| 渠道 / 消息传递 | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

注册零个功能但提供挂钩、工具或服务的插件是**仅限旧版挂钩** 的插件。该模式仍受到完全支持。

### 外部兼容性立场

功能模型已在核心中落地，并供当前的捆绑/原生插件使用，但外部插件兼容性仍需比“已导出即冻结”更严格的标准。

当前指导：

- **现有的外部插件：** 保持基于挂钩的集成正常工作；将此作为兼容性基线
- **新的捆绑/原生插件：** 优先使用显式功能注册，而不是特定于供应商的内部调用或新的仅挂钩设计
- **采用功能注册的外部插件：** 允许，但除非文档明确将合同标记为稳定，否则将特定于功能的辅助界面视为不断演变

实用规则：

- 功能注册 API 是预期的发展方向
- 在过渡期间，旧版挂钩仍然是外部插件最安全的无中断路径
- 导出的辅助子路径并不平等；优先选择狭窄的文档化合同，而不是偶然的辅助导出

### 插件形状

OpenClaw 根据每个已加载插件的实际注册行为（而不仅仅是静态元数据）将其分类为某种形状：

- **纯功能** -- 仅注册一种功能类型（例如仅提供商的插件，如 `mistral`）
- **混合功能** -- 注册多种功能类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成）
- **仅挂钩** -- 仅注册挂钩（类型化或自定义），不注册功能、工具、命令或服务
- **非功能** -- 注册工具、命令、服务或路由，但不注册功能

使用 `openclaw plugins inspect <id>` 查看插件的形态和功能
细分。详情请参阅 [CLI 参考](/zh/cli/plugins#inspect)。

### 旧版挂钩

`before_agent_start` 钩子作为仅包含钩子的插件的兼容路径仍受支持。现有的实际遗留插件仍依赖于它。

方向：

- 保持其工作
- 将其记录为遗留
- 对于模型/提供商覆盖工作，首选 `before_model_resolve`
- 对于提示词修改工作，首选 `before_prompt_build`
- 仅在实际使用量下降且装置覆盖证明迁移安全后移除

### 兼容性信号

当您运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，可能会看到
以下标签之一：

| Signal         | 含义                                               |
| -------------- | -------------------------------------------------- |
| **配置有效**   | 配置解析正常且插件已解析                           |
| **兼容性建议** | 插件使用的是受支持但较旧的模式（例如 `hook-only`） |
| **遗留警告**   | 插件使用 `before_agent_start`，该钩子已被弃用      |
| **硬错误**     | 配置无效或插件加载失败                             |

`hook-only` 和 `before_agent_start` 目前都不会破坏您的插件——
`hook-only` 仅是建议性的，而 `before_agent_start` 仅触发警告。这些
信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概述

OpenClaw 的插件系统有四层：

1. **清单 + 发现**
   OpenClaw 从配置的路径、工作区根目录、
   全局插件根目录和捆绑插件中查找候选插件。发现过程首先读取原生
   `openclaw.plugin.json` 清单以及支持的捆绑清单。
2. **启用 + 验证**
   核心决定已发现的插件是启用、禁用、阻止，还是
   被选中用于独占槽位（如内存）。
3. **运行时加载**
   本地 OpenClaw 插件通过 jiti 在进程内加载，并将
   能力注册到中央注册表。兼容的捆绑包被规范化为
   注册表记录，而无需导入运行时代码。
4. **表面消费**
   OpenClaw 的其余部分读取注册表以公开工具、通道、提供商
   设置、钩子、HTTP 路由、CLI 命令和服务。

具体对于插件 CLI，根命令发现分为两个阶段：

- 解析时的元数据来自 `registerCli(..., { descriptors: [...] })`
- 实际的插件 CLI 模块可以保持延迟状态，并在第一次调用时注册

这使得插件拥有的 CLI 代码保留在插件内部，同时仍允许 OpenClaw 在解析之前保留根命令名称。

重要的设计边界：

- 发现 + 配置验证应通过 **清单/模式元数据** 工作，而无需执行插件代码
- 本机运行时行为来自插件模块的 `register(api)` 路径

这种拆分允许 OpenClaw 在完整运行时激活之前验证配置，解释缺失/禁用的插件，并构建 UI/模式提示。

### 渠道插件和共享消息工具

渠道插件不需要为普通的聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，渠道插件拥有其背后特定于渠道的发现和执行功能。

当前的边界是：

- 核心拥有共享的 `message` 工具宿主、提示连接、会话/线程簿记和执行调度
- 渠道插件拥有范围限定的操作发现、能力发现以及任何特定于渠道的模式片段
- 渠道插件拥有特定于提供商的会话对话语法，例如对话 ID 如何编码线程 ID 或从父对话继承
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。这种统一的发现调用允许插件一起返回其可见操作、能力和模式贡献，以免这些部分分离。

当特定于渠道的消息工具参数携带媒体源（如本地路径或远程媒体 URL）时，插件还应从 `describeMessageTool(...)` 返回 `mediaSourceParams`。核心使用该显式列表来应用沙箱路径规范化和出站媒体访问提示，而无需硬编码插件拥有的参数名称。
在此处首选操作范围的映射，而不是一个渠道范围的扁平列表，以便仅配置文件的媒体参数不会在 `send` 等不相关的操作上被规范化。

核心将运行时范围传递到该发现步骤中。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信入站 `requesterSenderId`

这对上下文相关的插件很重要。渠道可以根据当前账户、当前房间/线程/消息或可信请求者身份来隐藏或公开消息操作，而无需在核心 `message` 工具中硬编码特定于渠道的分支。

这就是为什么嵌入式运行程序路由更改仍然是插件工作的原因：运行程序负责将当前聊天/会话身份转发到插件发现边界，以便共享 `message` 工具为当前回合公开正确的渠道拥有的表面。

对于渠道拥有的执行助手，捆绑插件应将执行运行时保留在其自己的扩展模块中。核心在 `src/agents/tools` 下不再拥有 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入自己的本地运行时代码。

同样的边界通常适用于以提供商命名的 SDK 接缝：核心不应导入针对 Slack、Discord、Signal、WhatsApp 或类似扩展的特定于渠道的便利桶。如果核心需要某种行为，要么使用捆绑插件自己的 `api.ts` / `runtime-api.ts` 桶，要么将该需求提升为共享 SDK 中狭窄的通用能力。

具体对于投票，有两种执行路径：

- `outbound.sendPoll` 是适合常见投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是特定于渠道的投票语义或额外投票参数的首选路径

核心现在将共享投票解析推迟到插件投票调度拒绝该操作之后，这样插件拥有的投票处理程序可以接受特定于渠道的投票字段，而不会首先被通用投票解析器阻止。

有关完整的启动序列，请参阅 [加载流水线](#load-pipeline)。

## 能力所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是无关集成的杂物袋。

这意味着：

- 公司插件通常应拥有该公司面向 OpenClaw 的所有界面
- 功能插件通常应拥有其引入的完整功能界面
- 渠道应使用共享的核心能力，而不是临时重新实现提供商行为

示例：

- 捆绑的 `openai` 插件拥有 OpenAI 模型提供商行为和 OpenAI 语音 + 实时语音 + 媒体理解 + 图像生成行为
- 捆绑的 `elevenlabs` 插件拥有 ElevenLabs 语音行为
- 捆绑的 `microsoft` 插件拥有 Microsoft 语音行为
- 捆绑的 `google` 插件拥有 Google 模型提供商行为以及 Google 媒体理解 + 图像生成 + 网络搜索行为
- 捆绑的 `firecrawl` 插件拥有 Firecrawl 网络获取行为
- 捆绑的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件各自拥有其媒体理解后端
- 捆绑的 `qwen` 插件拥有 Qwen 文本提供商行为以及媒体理解和视频生成行为
- `voice-call` 插件是一个功能插件：它拥有呼叫传输、工具、CLI、路由和 Twilio 媒体流桥接，但它使用共享的语音以及实时转录和实时语音能力，而不是直接导入供应商插件

预期的最终状态是：

- 即使 OpenAI 涵盖文本模型、语音、图像和未来的视频，它也位于一个插件中
- 另一个供应商可以对其自身的界面区域执行同样的操作
- 渠道不关心哪个供应商插件拥有该提供商；它们使用核心暴露的共享能力契约

这是关键区别：

- **插件** = 所有权边界
- **能力** = 多个插件可以实现或使用的核心契约

因此，如果 OpenClaw 添加一个新域（例如视频），首要问题不是“哪个提供商应该硬编码视频处理？”。首要问题是“核心视频能力契约是什么？”。一旦该契约存在，供应商插件就可以针对它进行注册，而渠道/功能插件就可以使用它。

如果该能力尚不存在，通常正确的做法是：

1. 在核心中定义缺失的能力
2. 通过插件 API/运行时以类型化的方式将其暴露出来
3. 针对该能力连接渠道/功能
4. 让供应商插件注册实现

这既保持了所有权明确，又避免了核心行为依赖于单个供应商或一次性的特定于插件的代码路径。

### 能力分层

在决定代码归属于何处时，请使用此心智模型：

- **核心能力层**：共享编排、策略、回退、配置合并规则、传递语义和类型化合约
- **供应商插件层**：供应商特定的 API、认证、模型目录、语音合成、图像生成、未来的视频后端、使用端点
- **渠道/功能插件层**：Slack/Discord/语音呼叫/等集成，它们消费核心能力并将其呈现在界面上

例如，TTS 遵循此形态：

- 核心拥有回复时间 TTS 策略、回退顺序、偏好设置和渠道传递
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时辅助程序

对于未来的能力，应优先采用这种模式。

### 多能力公司插件示例

公司插件从外部看应该是内聚的。如果 OpenClaw 对于模型、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网络获取和网络搜索有共享合约，供应商可以在一个地方拥有其所有界面：

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

重要的是确切的辅助程序名称。重要的是形态：

- 一个插件拥有供应商界面
- 核心仍然拥有能力合约
- 渠道和功能插件消费 `api.runtime.*` 辅助程序，而不是供应商代码
- 合约测试可以断言插件注册了它声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一种共享能力。同样的所有权模型也适用于此：

1. 核心定义媒体理解合约
2. 供应商插件视情况注册 `describeImage`、`transcribeAudio` 和 `describeVideo`
3. 渠道和功能插件使用共享的核心行为，而不是直接连接到供应商代码

这避免了将一个提供商的视频假设固化到核心中。插件拥有供应商接口；核心拥有能力合约和回退行为。

视频生成已经使用了相同的序列：核心拥有类型化的能力合约和运行时助手，供应商插件针对它注册 `api.registerVideoGenerationProvider(...)` 实现。

需要具体的发布清单？请参阅
[功能手册](/zh/tools/capability-cookbook)。

## 合约与执行

插件 API 表面是有意类型化并集中在 `OpenClawPluginApi` 中的。该合约定义了支持的注册点以及插件可能依赖的运行时助手。

为什么这很重要：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复的所有权，例如两个插件注册相同的
  提供商 ID
- 启动时可以为格式错误的注册提供可操作的诊断信息
- 合约测试可以强制执行捆绑插件的所有权并防止静默偏差

有两个执行层级：

1. **运行时注册执行**
   插件注册表在插件加载时验证注册。例如：
   重复的提供商 ID、重复的语音提供商 ID 和格式错误的
   注册会生成插件诊断信息，而不是未定义的行为。
2. **合约测试**
   捆绑插件在测试运行期间被捕获到合约注册表中，以便
   OpenClaw 可以明确断言所有权。目前这用于模型
   提供商、语音提供商、网络搜索提供商以及捆绑注册
   所有权。

实际效果是，OpenClaw 预先知道哪个插件拥有哪个
表面。这使得核心和渠道可以无缝组合，因为所有权是
声明的、类型化的和可测试的，而不是隐式的。

### 合约中应包含什么

良好的插件合约是：

- 类型化的
- 小型的
- 特定于能力的
- 由核心拥有
- 可被多个插件重用
- 可被渠道/功能使用而无需了解供应商知识

糟糕的插件合约是：

- 隐藏在核心中的特定于供应商的策略
- 绕过注册表的一次性插件应急手段
- 直接深入供应商实现的渠道代码
- 不属于 `OpenClawPluginApi` 或
  `api.runtime` 的临时运行时对象

如有疑问，请提高抽象层级：先定义能力，然后让插件接入。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) **在同一进程**中运行。它们未
沙箱隔离。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、钩子和服务
- 原生插件的错误可能会导致网关崩溃或不稳定
- 恶意的原生插件相当于在 OpenClaw 进程内执行任意代码

兼容的插件包默认更安全，因为 OpenClaw 当前将它们
视为元数据/内容包。在当前版本中，这主要指打包的技能。

对非打包插件使用允许列表和显式的安装/加载路径。将
工作区插件视为开发时代码，而非生产环境的默认配置。

对于打包的工作区包名称，请将插件 ID 锚定在 npm
名称中：默认使用 `@openclaw/<id>`，或者当包有意
公开更狭窄的插件角色时，使用批准的类型后缀，例如
`-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要信任提示：

- `plugins.allow` 信任 **插件 ID**，而非源代码出处。
- 当具有与打包插件相同 ID 的工作区插件被启用/列入允许列表时，
  它会有意覆盖打包的副本。
- 这对于本地开发、补丁测试和热修复来说是正常且有用的。

## 导出边界

OpenClaw 导出的是能力，而非实现的便利性。

保持能力注册公开。精简非契约的辅助导出：

- 特定于打包插件的辅助子路径
- 不作为公共 API 的运行时管道子路径
- 特定于供应商的便利辅助工具
- 作为实现细节的设置/新手引导辅助工具

为了兼容性和捆绑插件的维护，一些捆绑插件辅助子路径仍然保留在生成的 SDK 导出映射中。当前的示例包括 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 以及几个 `plugin-sdk/matrix*` 接缝。请将这些视为保留的实现细节导出，而不是新第三方插件的推荐 SDK 模式。

## 加载流程

启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的捆绑包清单和包元数据
3. 拒绝不安全的候选插件
4. 标准化插件配置 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 确定每个候选插件的启用状态
6. 通过 jiti 加载已启用的原生模块
7. 调用原生 `register(api)`（或 `activate(api)` —— 一个旧版别名）钩子并将注册信息收集到插件注册表中
8. 将注册表暴露给命令/运行时表面

<Note>`activate` 是 `register` 的旧版别名 —— 加载器会解析存在的那个 (`def.register ?? def.activate`) 并在同一时刻调用它。所有捆绑插件都使用 `register`；对于新插件，首选 `register`。</Note>

安全检查发生在运行时执行 **之前**。当入口点超出插件根目录、路径具有全局写权限，或者对于非捆绑插件路径所有权看起来可疑时，候选插件将被阻止。

### 清单优先行为

清单是控制平面的唯一真实来源。OpenClaw 使用它来：

- 识别插件
- 发现已声明的通道/技能/配置模式或捆绑包能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据
- 保留廉价的激活和设置描述符，而无需加载插件运行时

对于原生插件，运行时模块是数据平面部分。它注册实际行为，例如钩子、工具、命令或提供商流程。

可选的 manifest `activation` 和 `setup` 块保留在控制平面上。
它们是仅用于激活规划和设置发现的元数据描述符；
它们不替代运行时注册、`register(...)` 或 `setupEntry`。
第一批实际的激活使用者现在使用 manifest 命令、渠道和提供商提示
在更广泛的注册表具体化之前缩小插件加载范围：

- CLI 加载范围缩小到拥有请求的主要命令的插件
- 渠道设置/插件解析范围缩小到拥有请求的
  渠道 ID 的插件
- 显式提供商设置/运行时解析范围缩小到拥有请求的
  提供商 ID 的插件

设置发现现在优先使用描述符拥有的 ID（如 `setup.providers` 和
`setup.cliBackends`）在回退到
`setup-api` 之前缩小候选插件范围，针对那些仍需要设置时运行时钩子的插件。如果多个发现的插件声明了同一个规范化设置提供商或 CLI 后端
ID，设置查找将拒绝拥有者不明确的情况，而不是依赖发现
顺序。

### 加载器缓存的内容

OpenClaw 为以下内容保留短期进程内缓存：

- 发现结果
- manifest 注册表数据
- 已加载的插件注册表

这些缓存减少了突发启动和重复命令的开销。可以安全地
将其视为短期性能缓存，而不是持久化存储。

性能说明：

- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 注册表模型

已加载的插件不会直接更改随机的核心全局变量。它们注册到一个
中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起源、状态、诊断信息）
- 工具
- 旧版钩子和类型化钩子
- 渠道
- 提供商
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块
通信。这使加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对于可维护性至关重要。这意味着大多数核心表面只需
要一个集成点：“读取注册表”，而不是“对每个插件
模块进行特殊处理”。

## 对话绑定回调

绑定对话的插件可以在审批解决时做出反应。

使用 `api.onConversationBindingResolved(...)` 在绑定
请求被批准或拒绝后接收回调：

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

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准请求的已解决绑定
- `request`：原始请求摘要、分离提示、发送者 ID 和
  对话元数据

此回调仅用于通知。它不会改变谁被允许绑定
对话，并且在核心审批处理完成后运行。

## 提供商运行时钩子

提供商插件现在有两层：

- 清单元数据：`providerAuthEnvVars` 用于在运行时加载之前进行低成本的提供商环境身份验证查找，
  `providerAuthAliases` 用于共享身份验证的提供商变体，
  `channelEnvVars` 用于在运行时加载之前进行低成本的渠道环境/设置查找，
  以及 `providerAuthChoices` 用于在运行时加载之前进行低成本的新手引导/身份验证选择标签和
  CLI 标志元数据
- 配置时钩子：`catalog` / 遗留 `discovery` 加上 `applyConfigDefaults`
- runtime hooks: `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `resolveExternalAuthProfiles`,
  `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `contributeResolvedModelCompat`, `capabilities`,
  `normalizeToolSchemas`, `inspectToolSchemas`,
  `resolveReasoningOutputMode`, `prepareExtraParams`, `createStreamFn`,
  `wrapStreamFn`, `resolveTransportTurnState`,
  `resolveWebSocketSessionPolicy`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`, `matchesContextOverflowError`,
  `classifyFailoverReason`, `isCacheTtlEligible`,
  `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`,
  `resolveThinkingProfile`, `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw 仍然拥有通用代理循环、故障转移、转录处理和
工具策略。这些钩子是特定于提供商的行为的扩展表面，无需
整个自定义推理传输。

当提供商拥有基于环境的凭据，且通用身份验证/状态/模型选择器路径无需加载插件运行时即可看到时，请使用清单 `providerAuthEnvVars`。当一个提供商 ID 应重用另一个提供商 ID 的环境变量、身份验证配置文件、支持配置的身份验证以及 API 密钥新手引导选择时，请使用清单 `providerAuthAliases`。当新手引导/身份验证选择的 CLI 界面需要了解提供商的选择 ID、组标签以及简单的单标志身份验证连接，而无需加载提供商运行时时，请使用清单 `providerAuthChoices`。请在提供商运行时 `envVars` 中保留面向操作员的提示，例如新手引导标签或 OAuth 客户端 ID/客户端密钥设置变量。

当渠道拥有由环境驱动的身份验证或设置，且通用的 shell-env 回退、配置/状态检查或设置提示需要在加载渠道运行时之前看到这些内容时，请使用清单 `channelEnvVars`。

### Hook 顺序和用法

对于模型/提供商插件，OpenClaw 大致按此顺序调用 hook。“使用时机”一列是快速决策指南。

| #   | Hook                              | 作用                                                                                                | 使用时机                                                                                                   |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在 `models.json` 生成期间，将提供商配置发布到 `models.providers` 中                                 | 提供商拥有目录或基础 URL 默认值                                                                            |
| 2   | `applyConfigDefaults`             | 在配置具体化期间应用提供商拥有的全局配置默认值                                                      | 默认值取决于 auth 模式、环境或提供商模型系列语义                                                           |
| --  | _（内置模型查找）_                | OpenClaw 首先尝试正常的注册表/目录路径                                                              | _（非插件 hook）_                                                                                          |
| 3   | `normalizeModelId`                | 在查找之前规范化旧版或预览版模型 id 别名                                                            | 提供商在规范模型解析之前拥有别名清理权                                                                     |
| 4   | `normalizeTransport`              | 在通用模型组装之前，规范化提供商系列 `api` / `baseUrl`                                              | 提供商负责清理同一传输系列中自定义提供商 id 的传输信息                                                     |
| 5   | `normalizeConfig`                 | 在运行时/提供商解析之前规范化 `models.providers.<id>`                                               | 提供商需要配置清理，这些逻辑应随插件保留；捆绑的 Google 系列辅助程序也为支持的 Google 配置条目提供兜底支持 |
| 6   | `applyNativeStreamingUsageCompat` | 对配置提供商应用原生流式使用兼容性重写                                                              | 提供商需要端点驱动的原生流式使用元数据修复                                                                 |
| 7   | `resolveConfigApiKey`             | 在运行时身份验证加载之前，为配置提供商解析环境标记身份验证                                          | 提供商拥有提供商拥有的 env-marker API 密钥解析；`amazon-bedrock` 在此处也有内置的 AWS env-marker 解析器    |
| 8   | `resolveSyntheticAuth`            | 提供本地/自托管或配置支持的身份验证，而不持久化明文                                                 | 提供商可以使用合成/本地凭据标记运行                                                                        |
| 9   | `resolveExternalAuthProfiles`     | 覆盖提供商拥有的外部身份验证配置文件；默认 `persistence` 为 `runtime-only`，用于 CLI/应用拥有的凭证 | 提供商重复使用外部身份验证凭据而不持久化复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders`     |
| 10  | `shouldDeferSyntheticProfileAuth` | 降低存储的合成配置文件占位符，使其优先级低于环境/配置支持的身份验证                                 | 提供商存储不应具有优先权的合成占位符配置文件                                                               |
| 11  | `resolveDynamicModel`             | 针对本地注册表中尚未包含的提供商拥有的模型 ID 进行同步回退                                          | 提供商接受任意上游模型 ID                                                                                  |
| 12  | `prepareDynamicModel`             | 异步预热，然后 `resolveDynamicModel` 再次运行                                                       | 提供商在解析未知 ID 之前需要网络元数据                                                                     |
| 13  | `normalizeResolvedModel`          | 嵌入式运行器使用解析出的模型之前的最终重写                                                          | 提供商需要传输重写，但仍使用核心传输                                                                       |
| 14  | `contributeResolvedModelCompat`   | 为处于另一个兼容传输后面的供应商模型提供兼容性标志                                                  | 提供商在代理传输上识别自己的模型，而不接管提供商                                                           |
| 15  | `capabilities`                    | 提供商拥有的由共享核心逻辑使用的转录/工具元数据                                                     | 提供商需要转录/提供商系列的怪癖处理                                                                        |
| 16  | `normalizeToolSchemas`            | 在嵌入式运行器看到工具架构之前对其进行规范化                                                        | 提供商需要传输系列的架构清理                                                                               |
| 17  | `inspectToolSchemas`              | 在规范化后展示提供商拥有的架构诊断                                                                  | 提供商希望在不教导核心特定提供商规则的情况下获取关键字警告                                                 |
| 18  | `resolveReasoningOutputMode`      | 选择原生还是标记化的推理输出（reasoning-output）契约                                                | 提供商需要标记化的推理/最终输出，而不是原生字段                                                            |
| 19  | `prepareExtraParams`              | 在通用流选项包装器之前进行请求参数规范化                                                            | 提供商需要默认请求参数或按提供商的参数清理                                                                 |
| 20  | `createStreamFn`                  | 使用自定义传输完全替换正常的流路径                                                                  | 提供商需要自定义的线协议，而不仅仅是一个包装器                                                             |
| 21  | `wrapStreamFn`                    | 应用通用包装器之后的流包装器                                                                        | 提供商需要请求头/主体/模型兼容性包装器，而不需要自定义传输                                                 |
| 22  | `resolveTransportTurnState`       | 附加原生每轮传输头或元数据                                                                          | 提供商希望通用传输发送提供商原生的轮次标识                                                                 |
| 23  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 头或会话冷却策略                                                                 | 提供商希望通用 WS 传输调整会话头或回退策略                                                                 |
| 24  | `formatApiKey`                    | Auth-profile formatter: stored profile becomes the runtime `apiKey` string                          | 提供商存储额外的认证元数据，并且需要自定义运行时令牌形状                                                   |
| 25  | `refreshOAuth`                    | 针对自定义刷新端点或刷新失败策略的 OAuth 刷新覆盖                                                   | 提供商不适合共享的 `pi-ai` 刷新器                                                                          |
| 26  | `buildAuthDoctorHint`             | 当 OAuth 刷新失败时附加的修复提示                                                                   | 提供商在刷新失败后需要提供商拥有的认证修复指导                                                             |
| 27  | `matchesContextOverflowError`     | 提供商拥有的上下文窗口溢出匹配器                                                                    | 提供商拥有通用启发式算法会遗漏的原始溢出错误                                                               |
| 28  | `classifyFailoverReason`          | 提供商拥有的故障转移原因分类                                                                        | 提供商可以将原始 API/传输错误映射到速率限制/过载等                                                         |
| 29  | `isCacheTtlEligible`              | 针对代理/回传提供商的提示缓存策略                                                                   | 提供商需要特定于代理的缓存 TTL 门控                                                                        |
| 30  | `buildMissingAuthMessage`         | 通用缺少身份验证恢复消息的替换                                                                      | 提供商需要特定于提供商的缺少身份验证恢复提示                                                               |
| 31  | `suppressBuiltInModel`            | 过时的上游模型抑制以及可选的用户可见错误提示                                                        | 提供商需要隐藏过时的上游行或用供应商提示替换它们                                                           |
| 32  | `augmentModelCatalog`             | 发现后附加的合成/最终目录行                                                                         | 提供商需要在 `models list` 和选择器中合成的向前兼容行                                                      |
| 33  | `resolveThinkingProfile`          | 特定于模型的 `/think` 级别设置、显示标签和默认值                                                    | 提供商为选定模型公开自定义思维阶梯或二元标签                                                               |
| 34  | `isBinaryThinking`                | 开/关推理切换兼容性钩子                                                                             | 提供商仅公开二元思维开/关                                                                                  |
| 35  | `supportsXHighThinking`           | `xhigh` 推理支持兼容性挂钩                                                                          | 提供商希望仅对模型的一个子集启用 `xhigh`                                                                   |
| 36  | `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性挂钩                                                                        | 提供商拥有模型系列的默认 `/think` 策略                                                                     |
| 37  | `isModernModelRef`                | 用于实时配置文件过滤和烟雾选择的现代模型匹配器                                                      | 提供商拥有实时/烟雾首选模型匹配权                                                                          |
| 38  | `prepareRuntimeAuth`              | 在推理之前将配置的凭据交换为实际的运行时令牌/密钥                                                   | 提供商需要令牌交换或短期请求凭据                                                                           |
| 39  | `resolveUsageAuth`                | 解析 `/usage` 及相关状态表面的使用/计费凭据                                                         | 提供商需要自定义使用/配额令牌解析或不同的使用凭据                                                          |
| 40  | `fetchUsageSnapshot`              | 在身份验证解决后，获取并规范化特定于提供商的使用/配额快照                                           | 提供商需要特定于提供商的使用端点或负载解析器                                                               |
| 41  | `createEmbeddingProvider`         | 为内存/搜索构建提供商拥有的嵌入适配器                                                               | 内存嵌入行为属于提供商插件                                                                                 |
| 42  | `buildReplayPolicy`               | 返回控制提供商对话记录处理的重放策略                                                                | 提供商需要自定义的对话记录策略（例如，去除思考块）                                                         |
| 43  | `sanitizeReplayHistory`           | 在通用对话记录清理之后重写重放历史记录                                                              | 提供商需要超出共享压缩助手之外的特定于提供商的重放重写                                                     |
| 44  | `validateReplayTurns`             | 在嵌入式运行程序之前进行最终的重放回合验证或重塑                                                    | 提供商传输在通用清理后需要更严格的轮次验证                                                                 |
| 45  | `onModelSelected`                 | 运行提供商拥有的选择后副作用                                                                        | 提供商需要遥测或提供商拥有的状态，当模型变为活动状态时                                                     |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先检查匹配的提供商插件，然后回退到其他具有挂钩功能的提供商插件，直到有一个实际更改了模型 ID 或传输/配置。这使别名/兼容提供商垫片能够正常工作，而无需调用方知道哪个捆绑插件拥有该重写。如果提供商挂钩未重写支持的 Google 系列配置条目，则捆绑的 Google 配置规范化程序仍将应用该兼容性清理。

如果提供商需要完全自定义的线路协议或自定义请求执行程序，那是另一类扩展。这些钩子针对的是仍然在 OpenClaw 正常推理循环中运行的提供商行为。

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
  `resolveThinkingProfile`、`applyConfigDefaults`、`isModernModelRef`
  和 `wrapStreamFn`，因为它拥有 Claude 4.6 向前兼容、
  提供商系列提示、认证修复指南、使用端点集成、
  提示缓存资格、感知认证的配置默认值、Claude
  默认/自适应思维策略，以及针对
  beta 标头、`/fast` / `serviceTier` 和 `context1m` 的 Anthropic 特定流式整形。
- Anthropic 专用的 Claude 流助手目前保留在打包插件自己的 public `api.ts` / `contract-api.ts` 缝隙中。该包表面导出了 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、`resolveAnthropicFastMode`、`resolveAnthropicServiceTier` 以及底层的 Anthropic 包装构建器，而不是围绕一个提供商的 beta-header 规则来扩展通用 SDK。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`resolveThinkingProfile` 和 `isModernModelRef`
  因为它拥有 GPT-5.4 前向兼容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 标准化、Codex 感知身份验证
  提示、Spark 抑制、合成 OpenAI 列表行以及 GPT-5 思考 /
  实时模型策略；`openai-responses-defaults` 流族拥有
  用于归属标头的共享原生 OpenAI Responses 包装器、
  `/fast`/`serviceTier`、文本冗长度、原生 Codex 网页搜索、
  推理兼容负载整形以及 Responses 上下文管理。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为提供商是透传的，并且可能会在 OpenClaw 的静态目录更新之前暴露新的
  模型 ID；它还使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 将
  提供商特定的请求标头、路由元数据、推理补丁和
  提示缓存策略排除在核心之外。其重放策略来自
  `passthrough-gemini` 系列，而 `openrouter-thinking` 流系列
  拥有代理推理注入，不支持模型 / `auto` 跳过。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 以及 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它
  需要提供商拥有的设备登录、模型回退行为、Claude 转录
  怪癖、GitHub 令牌 -> Copilot 令牌交换，以及提供商拥有的使用
  端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、`normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，以及 `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它仍在核心 OpenAI 传输上运行，但拥有其传输/基础 URL 标准化、OAuth 刷新回退策略、默认传输选择、合成 Codex 目录行和 ChatGPT 使用端点集成；它与直接 OpenAI 共享相同的 `openai-responses-defaults` 流系列。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` 和 `isModernModelRef`，因为
  `google-gemini` 回放族负责 Gemini 3.1 向前兼容回退、
  原生 Gemini 回放验证、启动回放清理、标记
  推理输出模式和现代模型匹配，而
  `google-thinking` 流族负责 Gemini 思维负载规范化；
  Gemini CLI OAuth 也使用 `formatApiKey`, `resolveUsageAuth` 和
  `fetchUsageSnapshot` 进行令牌格式化、令牌解析和配额端点
  连接。
- Anthropic Vertex 使用 `buildReplayPolicy` 到
  `anthropic-by-model` 重放系列，以便针对 Claude 的重放清理仅限于
  Claude id，而不是每个 `anthropic-messages` 传输。
- Amazon Bedrock 使用 `buildReplayPolicy`、`matchesContextOverflowError`、
  `classifyFailoverReason` 和 `resolveThinkingProfile`，因为它拥有
  针对 Bedrock 上 Anthropic 流量的 Bedrock 特定限流/未就绪/上下文溢出错误分类；
  其重放策略仍然共享相同的仅限 Claude 的 `anthropic-by-model` 保护。
- OpenRouter、Kilocode、Opencode 和 Opencode Go 使用 `buildReplayPolicy` 通过 `passthrough-gemini` 重放系列，因为它们通过 OpenAI 兼容传输代理 Gemini 模型，并且需要在没有原生 Gemini 重放验证或引导重写的情况下进行 Gemini 思维签名清理。
- MiniMax 使用 `buildReplayPolicy` 通过 `hybrid-anthropic-openai` 重放系列，因为一个提供商同时拥有 Anthropic 消息和 OpenAI 兼容语义；它在 Anthropic 端保持仅限 Claude 的思维块丢弃，同时将推理输出模式覆盖回原生，并且 `minimax-fast-mode` 流系列拥有共享流路径上的快速模式模型重写。
- Moonshot 使用 `catalog`、`resolveThinkingProfile` 和 `wrapStreamFn`，因为它仍使用共享的 OpenAI 传输，但需要提供商拥有的思维负载标准化；`moonshot-thinking` 流系列将配置加上 `/think` 状态映射到其原生二进制思维负载。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、
  推理负载规范化、Gemini 转录提示和 Anthropic 缓存 TTL 限制；
  `kilocode-thinking` 流系列在共享代理流路径上保持 Kilo 思维注入，
  同时跳过 `kilo/auto` 和其他不支持显式推理负载的代理模型 ID。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`resolveThinkingProfile`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 后备、
  `tool_stream` 默认值、二元思维 UX、现代模型匹配以及
  使用权限和配额获取；`tool-stream-default-on` 流家族
  将默认开启的 `tool_stream` 封装排除在每个提供商手写胶水代码之外。
- xAI 使用 `normalizeResolvedModel`、`normalizeTransport`、
  `contributeResolvedModelCompat`、`prepareExtraParams`、`wrapStreamFn`、
  `resolveSyntheticAuth`、`resolveDynamicModel` 和 `isModernModelRef`
  因为它拥有原生 xAI Responses 传输规范化、Grok 快速模式别名重写、默认 `tool_stream`、严格工具/推理负载清理、插件自有工具的回退身份验证重用、Grok 模型的前向兼容解析，以及提供商拥有的兼容性补丁，例如 xAI 工具模式配置文件、不支持的架构关键字、原生 `web_search` 和 HTML 实体工具调用参数解码。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以将记录/工具的怪异行为排除在核心之外。
- 仅限目录的捆绑提供商（如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）仅
  使用 `catalog`。
- Qwen 针对其文本提供商使用 `catalog`，此外还针对其多模态功能使用了共享的媒体理解和视频生成注册。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用钩子，因为即使推理仍通过共享传输运行，它们的 `/usage`
  行为由插件拥有。

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

注：

- `textToSpeech` 返回用于文件/语音留言界面的标准核心 TTS 输出负载。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- `listVoices` 对于每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和性格标签，供感知提供商的选择器使用。
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

注：

- 将 TTS 策略、回退和回复交付保留在核心中。
- 使用语音提供商处理供应商拥有的合成行为。
- 旧版 Microsoft `edge` 输入会被标准化为 `microsoft` 提供商 ID。
- 首选的所有权模型是以公司为导向的：随着 OpenClaw 添加这些能力合约，一个供应商插件可以拥有文本、语音、图像和未来的媒体提供商。

对于图像/音频/视频理解，插件注册一个类型化的媒体理解提供商，而不是一个通用的键/值包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

注意事项：

- 将编排、回退、配置和渠道连接保留在核心中。
- 将供应商行为保留在提供商插件中。
- 增量扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 视频生成已经遵循相同的模式：
  - 核心拥有能力合约和运行时助手
  - 供应商插件注册 `api.registerVideoGenerationProvider(...)`
  - 功能/渠道插件消费 `api.runtime.videoGeneration.*`

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

对于音频转录，插件可以使用媒体理解运行时
或较旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意事项：

- `api.runtime.mediaUnderstanding.*` 是用于
  图像/音频/视频理解的首选共享接口。
- 使用核心媒体理解音频配置 (`tools.media.audio`) 和提供商回退顺序。
- 当未产生转录输出时（例如跳过/不支持的输入），返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 作为兼容性别名保留。

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

注意事项：

- `provider` 和 `model` 是可选的每次运行覆盖项，而非持久的会话更改。
- OpenClaw 仅对受信任的调用者遵守这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 进行选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 以明确允许任何目标。
- 不受信任的插件子代理运行仍然有效，但覆盖请求将被拒绝，而不是静默回退。

对于网络搜索，插件可以使用共享的运行时助手，而不是深入到代理工具连结中：

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

插件还可以通过
`api.registerWebSearchProvider(...)` 注册网络搜索提供商。

注意事项：

- 将提供商选择、凭据解析和共享请求语义保留在核心中。
- 使用网络搜索提供商进行特定供应商的搜索传输。
- `api.runtime.webSearch.*` 是首选的共享接口，适用于需要搜索行为但不依赖 agent 工具 wrapper 的功能/渠道插件。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用配置的图像生成提供商链生成图像。
- `listProviders(...)`：列出可用的图像生成提供商及其功能。

## Gateway(网关) HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 公开 HTTP 端点。

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

- `path`：网关 HTTP 服务器下的路由路径。
- `auth`：必填。使用 `"gateway"` 要求正常的网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其现有的路由注册。
- `handler`：当路由处理了请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已被移除，并将导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非 `replaceExisting: true`，否则完全 `path + match` 冲突将被拒绝，且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由会被拒绝。请将 `exact`/`prefix` 直通链路保持在相同的身份验证级别上。
- `auth: "plugin"` 路由**不会**自动接收操作员运行时作用域。它们用于插件管理的 Webhook/签名验证，而非特权 Gateway(网关) 辅助调用。
- `auth: "gateway"` 路由在 Gateway(网关) 请求运行时作用域内运行，但该作用域是故意保守的：
  - 共享密钥承载身份验证（`gateway.auth.mode = "token"` / `"password"`）将插件路由运行时作用域固定为 `operator.write`，即使调用方发送 `x-openclaw-scopes`
  - 受信任的承载身份的 HTTP 模式（例如私有入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）仅在标头明确存在时才会遵守 `x-openclaw-scopes`
  - 如果在那些承载身份的插件路由请求中缺少 `x-openclaw-scopes`，运行时作用域将回退到 `operator.write`
- 实用规则：不要假设网关身份验证（gateway-auth）的插件路由是隐式的管理界面。如果您的路由需要仅限管理员的行为，请要求使用承载身份的身份验证模式，并记录明确的 `x-openclaw-scopes` 标头约定。

## Plugin SDK 导入路径

在编写插件时，使用 SDK 子路径而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/plugin-entry` 用于插件注册基元。
- `openclaw/plugin-sdk/core` 用于通用共享插件面向接口的契约。
- `openclaw/plugin-sdk/config-schema` 用于根 `openclaw.json` Zod schema
  导出 (`OpenClawSchema`)。
- 稳定的渠道原语，如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/setup-runtime`、
  `openclaw/plugin-sdk/setup-adapter-runtime`、
  `openclaw/plugin-sdk/setup-tools`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress` 用于共享设置/认证/回复/Webhook
  连接。`channel-inbound` 是防抖、提及匹配、
  入站提及策略辅助程序、信封格式化和入站信封
  上下文辅助程序的共享家园。
  `channel-setup` 是狭窄的可选安装设置接缝。
  `setup-runtime` 是由 `setupEntry` /
  延迟启动使用的运行时安全设置表面，包括导入安全的设置修补适配器。
  `setup-adapter-runtime` 是环境感知的帐户设置适配器接缝。
  `setup-tools` 是小型 CLI/存档/文档辅助程序接缝（`formatCliCommand`、
  `detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、
  `CONFIG_DIR`）。
- 域子路径，如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/telegram-command-config`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/approval-gateway-runtime`、
  `openclaw/plugin-sdk/approval-handler-adapter-runtime`、
  `openclaw/plugin-sdk/approval-handler-runtime`、
  `openclaw/plugin-sdk/approval-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/infra-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/status-helpers`、
  `openclaw/plugin-sdk/text-runtime`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime`，用于共享的运行时/配置辅助工具。
  `telegram-command-config` 是用于 Telegram 自定义命令规范化/验证的狭窄公共接口，即使捆绑的 Telegram 合约表面暂时不可用，它仍然保持可用。
  `text-runtime` 是共享的文本/markdown/日志记录接口，包括助手可见文本剥离、markdown 渲染/分块辅助工具、编辑辅助工具、指令标记辅助工具和安全文本实用程序。
- 特定于审批的渠道连接点应优先选择插件上的一个 `approvalCapability`
  合约。Core 随后通过该单一能力读取审批身份验证、交付、渲染、
  原生路由和惰性原生处理行为，而不是将审批行为混入不相关的插件字段中。
- `openclaw/plugin-sdk/channel-runtime` 已弃用，仅作为旧版插件的
  兼容性垫片保留。新代码应改为导入更窄的通用原语，且仓库代码不应添加对
  该垫片的新导入。
- 打包扩展的内部细节保持私有。外部插件应仅使用
  `openclaw/plugin-sdk/*` 子路径。OpenClaw 核心/测试代码可以使用插件包根目录下的仓库公共入口点，例如 `index.js`、`api.js`、
  `runtime-api.js`、`setup-entry.js` 以及范围狭窄的文件，例如
  `login-qr-api.js`。切勿从核心或其他扩展中导入插件包的 `src/*`。
- 仓库入口点划分：
  `<plugin-package-root>/api.js` 是辅助/类型桶文件（barrel），
  `<plugin-package-root>/runtime-api.js` 是仅运行时桶文件，
  `<plugin-package-root>/index.js` 是打包插件入口，
  而 `<plugin-package-root>/setup-entry.js` 是设置插件入口。
- 当前打包的提供商示例：
  - Anthropic 使用 `api.js` / `contract-api.js` 来实现 Claude 流辅助（如 `wrapAnthropicProviderStream`）、beta-header 辅助和 `service_tier` 解析。
  - OpenAI 使用 `api.js` 用于提供商构建器、默认模型辅助以及实时提供商构建器。
  - OpenRouter 使用 `api.js` 作为其提供商构建器以及新手引导/配置辅助，而 `register.runtime.js` 仍可重新导出通用 `plugin-sdk/provider-stream` 辅助供仓库本地使用。
- 外观加载的公共入口点在存在时优先使用活动运行时配置快照，然后在 OpenClaw 尚未提供运行时快照时回退到磁盘上解析的配置文件。
- 通用共享原语仍然是首选的公共 SDK 契约。一小部分保留的兼容性捆绑渠道品牌辅助接缝仍然存在。应将这些视为捆绑维护/兼容性接缝，而不是新的第三方导入目标；新的跨渠道契约仍应位于通用 `plugin-sdk/*` 子路径或插件本地的 `api.js` / `runtime-api.js` 桶文件中。

兼容性说明：

- 在新代码中避免使用根 `openclaw/plugin-sdk` 桶文件。
- 首先优先使用狭窄的稳定原语。较新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-工具 子路径是新捆绑和外部插件工作的预期合约。
  目标解析/匹配属于 `openclaw/plugin-sdk/channel-targets`。
  消息操作门和反应消息 ID 辅助函数属于
  `openclaw/plugin-sdk/channel-actions`。
- 捆绑的扩展特定的辅助桶默认情况下是不稳定的。如果
  辅助函数仅由捆绑扩展需要，请将其保留在该扩展的
  本地 `api.js` 或 `runtime-api.js` 缝隙之后，而不是将其提升到
  `openclaw/plugin-sdk/<extension>` 中。
- 新的共享辅助程序接缝应当是通用的，而非特定于渠道的。共享目标解析应位于 `openclaw/plugin-sdk/channel-targets` 上；特定于渠道的内部实现应保留在所属插件的本地 `api.js` 或 `runtime-api.js` 接缝之后。
- 诸如 `image-generation`、`media-understanding` 和 `speech` 等特定于功能的子路径之所以存在，是因为打包/原生插件目前在使用它们。它们的存在本身并不意味着每个导出的辅助程序都是长期冻结的外部契约。

## 消息工具架构

插件应拥有特定于渠道的 `describeMessageTool(...)` 模式贡献，用于表情反应、已读回执和投票等非消息原语。共享发送展示应使用通用的 `MessagePresentation` 协约，而不是提供商原生的按钮、组件、块或卡片字段。请参阅[消息展示](/zh/plugins/message-presentation)以了解协议、回退规则、提供商映射和插件作者检查清单。

具备发送能力的插件通过消息能力声明它们可以渲染的内容：

- `presentation` 用于语义展示块 (`text`, `context`, `divider`, `buttons`, `select`)
- `delivery-pin` 用于置顶传递请求

Core 决定是原生渲染演示文稿还是将其降级为文本。
不要从通用消息工具中暴露提供商原生的 UI 逃生舱口。
用于遗留原生模式的已弃用 SDK 助手仍会为现有的第三方插件导出，但新插件不应使用它们。

## 渠道目标解析

渠道插件应拥有特定于渠道的目标语义。保持共享出站主机的通用性，并使用消息适配器表面来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，是否应将标准化目标视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉 core 输入是否应直接跳到类似 ID 的解析而不是目录搜索。
- 当核心在规范化之后或目录查找未命中后需要最终的提供商拥有的解析时，`messaging.targetResolver.resolveTarget(...)` 是插件的后备方案。
- 一旦目标被解析，`messaging.resolveOutboundSessionRoute(...)` 负责提供商特定的会话路由构建。

建议的拆分：

- 使用 `inferTargetChatType` 进行应该在搜索对等方/组之前发生的类别决策。
- 使用 `looksLikeId` 进行“将其视为显式/原生目标 id”的检查。
- 使用 `resolveTarget` 进行提供商特定的规范化后备，而不是用于广泛的目录搜索。
- 将提供商原生 id（如聊天 id、线程 id、JID、句柄和房间 id）保留在 `target` 值或提供商特定的参数中，而不是在通用 SDK 字段中。

## 配置支持的目录

从配置导出目录条目的插件应将该逻辑保留在
插件中，并复用来自
`openclaw/plugin-sdk/directory-runtime` 的共享助手。

当渠道需要基于配置的对等节点/组时使用此选项，例如：

- 由允许列表驱动的私信对等节点
- 已配置的渠道/组映射
- 账户范围的静态目录后备

`directory-runtime` 中的共享助手仅处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化助手
- 构建 `ChannelDirectoryEntry[]`

特定于渠道的账户检查和 ID 规范化应保留在
插件实现中。

## 提供商目录

提供商插件可以使用
`registerProvider({ catalog: { run(...) { ... } } })` 定义用于推理的模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 相同的形状：

- `{ provider }` 用于单个提供商条目
- `{ providers }` 用于多个提供商条目

当插件拥有特定于提供商的模型 ID、基础 URL
默认值或受身份验证保护的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件的目录相对于 OpenClaw
内置隐式提供商的合并时机：

- `simple`：纯 API 密钥或环境驱动的提供商
- `profile`：在存在身份验证配置文件时出现的提供商
- `paired`：综合多个相关提供商条目的提供商
- `late`：最后一遍，在其他隐式提供商之后

在键冲突时，靠后的提供商获胜，因此插件可以有意识地使用相同的
提供商 ID 覆盖内置提供商条目。

兼容性：

- `discovery` 仍作为旧版别名工作
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

## 只读渠道检查

如果你的插件注册了一个渠道，建议连同 `resolveAccount(...)` 一起实现
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它允许假设凭据
  已完全具体化，并在缺少所需机密时快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve`）以及诊断/配置
  修复流程不应为了描述配置而具体化运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭证来源/状态字段，例如：
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要仅为了报告只读可用性而返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的 source 字段）对于状态式命令已足够。
- 当凭证通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这使得只读命令能够报告“已配置但在该命令路径中不可用”，而不是崩溃或错误地将账户报告为未配置。

## 包集合

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

每个条目都会成为一个插件。如果包集合列出了多个扩展，插件 ID 将变成 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请将其安装在该目录中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防护：每个 `openclaw.extensions` 条目在解析符号链接后必须保留在插件目录内。跳出包目录的条目将被拒绝。

安全提示：`openclaw plugins install` 使用 `npm install --omit=dev --ignore-scripts` 安装插件依赖项（不运行生命周期脚本，运行时不包含开发依赖）。请保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置模块。当 OpenClaw 需要为已禁用的渠道插件提供设置界面，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。当你的主插件入口还连接了工具、钩子或其他仅运行时代码时，这可以使启动和设置更轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以使渠道插件在网关的预监听启动阶段也使用相同的 `setupEntry` 路径，即使该渠道已经配置。

仅当 `setupEntry` 完全覆盖了网关开始监听之前必须存在的启动范围时，才使用此选项。实际上，这意味着设置入口必须注册启动所依赖的每个渠道拥有的功能，例如：

- 渠道注册本身
- 任何必须在网关开始监听之前可用的 HTTP 路由
- 任何在同一窗口期间必须存在的网关方法、工具或服务

如果您的完整入口仍然拥有任何必需的启动功能，请勿启用此标志。保持插件的默认行为，并让 OpenClaw 在启动期间加载完整入口。

打包的渠道还可以发布仅限设置的合约表面辅助工具，核心可以在加载完整的渠道运行时之前查阅这些工具。当前的设置提升表面是：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core 在需要将旧的单账号渠道配置提升为 `channels.<id>.accounts.*` 而不加载完整插件条目时使用该表面。Matrix 是当前绑定的示例：当命名账号已存在时，它仅将 auth/bootstrap 键移动到命名的提升账号中，并且它可以保留配置的非规范 default-account 键，而不是总是创建 `accounts.default`。

那些设置修补适配器保持了捆绑契约表面发现的惰性。导入时间保持轻量；提升表面仅在首次使用时加载，而不是在模块导入时重新进入捆绑渠道启动。

当这些启动面包含网关 RPC 方法时，请将其保留在特定于插件的前缀上。核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保留专用，并且即使插件请求了更窄的作用域，也始终解析为 `operator.admin`。

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

### 通道目录元数据

通道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 提供安装提示。这使核心目录保持无数据状态。

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
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

除最小示例外，有用的 `openclaw.channel` 字段：

- `detailLabel`：用于更丰富的目录/状态界面的辅助标签
- `docsLabel`：覆盖文档链接的链接文本
- `preferOver`: 此目录条目应优先于较低优先级的插件/渠道 ID
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: 选择界面复制控件
- `markdownCapable`: 将渠道标记为支持 Markdown，以便进行出站格式决策
- `exposure.configured`: 当设置为 `false` 时，在已配置渠道列表界面中隐藏该渠道
- `exposure.setup`: 当设置为 `false` 时，在交互式设置/配置选择器中隐藏该渠道
- `exposure.docs`: 将渠道标记为内部/私有，用于文档导航界面
- `showConfigured` / `showInSetup`: 为保持兼容性仍接受的旧别名；建议使用 `exposure`
- `quickstartAllowFrom`：选择让该渠道加入标准快速启动 `allowFrom` 流程
- `forceAccountBinding`：即使只存在一个账户，也要求显式绑定账户
- `preferSessionLookupForAnnounceTarget`：在解析公告目标时，优先通过会话进行查找

OpenClaw 也可以合并**外部渠道目录**（例如，MPM 注册表导出）。将 JSON 文件放置于以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器还接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧式别名。

## 上下文引擎插件

上下文引擎插件负责会话上下文的编排，包括摄取、组装
和压缩。在你的插件中使用 `api.registerContextEngine(id, factory)` 注册它们，然后使用 `plugins.slots.contextEngine`
选择活动引擎。

当你的插件需要替换或扩展现有的默认上下文
管道，而不仅仅是添加内存搜索或钩子时，请使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

如果您的引擎不拥有压缩算法，请保持 `compact()`
已实现并显式委托它：

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

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
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 添加新能力

当插件需要不符合当前 API 的行为时，不要绕过
插件系统进行私有调用。添加缺失的能力。

推荐顺序：

1. 定义核心契约
   决定核心应该拥有哪些共享行为：策略、回退、配置合并、
   生命周期、面向渠道的语义和运行时助手形状。
2. 添加类型化插件注册/运行时表面
   使用最小有用的
   类型化能力表面扩展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 渠道/功能消费者
   渠道和功能插件应通过核心使用新能力，
   而不是直接导入供应商实现。
4. 注册供应商实现
   供应商插件随后针对该能力注册其后端。
5. 添加合约覆盖
   添加测试，以便所有权和注册形状随时间保持明确。

这就是 OpenClaw 在不针对某个提供商的世界观进行硬编码的情况下保持主见的方式。有关具体的文件清单和实际示例，请参阅 [能力指南](/zh/tools/capability-cookbook)。

### 能力清单

添加新能力时，实现通常应同时涉及以下方面：

- `src/<capability>/types.ts` 中的核心合约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时助手
- `src/plugins/types.ts` 中的插件 API 注册表面
- `src/plugins/registry.ts` 中的插件注册表连接
- 当功能/渠道插件需要使用该能力时，在 `src/plugins/runtime/*` 中暴露的插件运行时
- `src/test-utils/plugin-registration.ts` 中的捕获/测试助手
- `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- `docs/` 中的操作员/插件文档

如果缺少其中任何一个，通常表明该功能尚未完全集成。

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
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这使得规则保持简单：

- 核心拥有功能契约 + 编排
- 供应商插件拥有供应商实现
- 功能/渠道插件使用运行时助手
- 契约测试明确所有权
