---
summary: "插件内部：功能模型、所有权、契约、加载管道和运行时助手"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "插件内部"
sidebarTitle: "内部"
---

# 插件内部

<Info>这是**深度架构参考**。有关实用指南，请参阅： - [安装和使用插件](/en/tools/plugin) — 用户指南 - [入门指南](/en/plugins/building-plugins) — 第一个插件教程 - [渠道插件](/en/plugins/sdk-channel-plugins) — 构建消息渠道 - [提供商插件](/en/plugins/sdk-provider-plugins) — 构建模型提供商 - [SDK 概述](/en/plugins/sdk-overview) — 导入映射和注册 API</Info>

本页面涵盖 OpenClaw 插件系统的内部架构。

## 公共功能模型

功能是 OpenClaw 内部的公共**原生插件**模型。每个
原生 OpenClaw 插件针对一个或多个功能类型进行注册：

| 功能            | 注册方法                                      | 示例插件                  |
| --------------- | --------------------------------------------- | ------------------------- |
| 文本推理        | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| CLI 推理后端    | `api.registerCliBackend(...)`                 | `openai`, `anthropic`     |
| 语音            | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| 图像生成        | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Web 搜索        | `api.registerWebSearchProvider(...)`          | `google`                  |
| 渠道 / 消息传递 | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

注册了零个能力但提供了钩子、工具或服务的插件是**仅传统钩子**（legacy hook-only）插件。该模式仍得到完全支持。

### 外部兼容性立场

能力模型已落地于核心并被当前捆绑/原生插件使用，但外部插件兼容性仍需比“已导出即已冻结”更严格的标准。

当前指导原则：

- **现有的外部插件：** 保持基于钩子的集成正常工作；将此视为兼容性基线
- **新的捆绑/原生插件：** 相比于特定供应商的内部访问或仅限钩子的新设计，优先使用显式能力注册
- **采用能力注册的外部插件：** 允许使用，但除非文档明确标记合约稳定，否则将特定于能力的辅助接口视为在不断演进中

实践原则：

- 能力注册 API 是预期的方向
- 在过渡期间，遗留钩子仍然是外部插件最安全的不中断路径
- 导出的辅助子路径并非同等重要；优先使用狭窄的已文档化合约，而非附带的辅助导出

### 插件形态

OpenClaw 根据每个已加载插件的实际注册行为（而不仅仅是静态元数据）将其归类为一种形态：

- **plain-capability** -- 仅注册一种能力类型（例如像 `mistral` 这样的纯提供商插件）
- **hybrid-capability** -- 注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成能力）
- **hook-only** -- 仅注册钩子（类型化或自定义），不注册能力、工具、命令或服务
- **non-capability** -- 注册工具、命令、服务或路由，但不注册能力

使用 `openclaw plugins inspect <id>` 查看插件的形态和能力细分。详情请参阅 [CLI 参考](/en/cli/plugins#inspect)。

### 传统钩子

`before_agent_start` 钩子作为纯钩子插件的兼容路径仍然受到支持。现实世界中的传统插件仍然依赖它。

方向：

- 保持其正常工作
- 将其记录为传统内容
- 对于模型/提供商覆盖工作，首选 `before_model_resolve`
- 对于提示词修改工作，首选 `before_prompt_build`
- 仅在真实使用量下降且装置覆盖证明迁移安全后才将其移除

### 兼容性信号

当您运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，您可能会看到以下标签之一：

| Signal                     | 含义                                             |
| -------------------------- | ------------------------------------------------ |
| **config valid**           | 配置解析正常且插件已解析                         |
| **compatibility advisory** | 插件使用了受支持但较旧的模式（例如 `hook-only`） |
| **legacy warning**         | 插件使用了 `before_agent_start`，该功能已被弃用  |
| **hard error**             | 配置无效或插件加载失败                           |

目前 `hook-only` 和 `before_agent_start` 都不会破坏您的插件 --
`hook-only` 只是建议性的，而 `before_agent_start` 仅会触发警告。这些
信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四层：

1. **清单 + 设备发现**
   OpenClaw 从配置的路径、工作区根目录、全局扩展根目录和捆绑扩展中查找候选插件。设备发现首先读取原生 `openclaw.plugin.json` 清单以及支持的捆绑清单。
2. **启用 + 验证**
   核心决定发现的插件是启用、禁用、阻止，还是
   被选中用于独占槽位（如内存）。
3. **运行时加载**
   原生 OpenClaw 插件通过 jiti 在进程内加载，并将
   能力注册到中央注册表。兼容的捆绑包被规范化为
   注册表记录，而无需导入运行时代码。
4. **表面消费**
   OpenClaw 的其余部分读取注册表以暴露工具、渠道、提供商
   设置、钩子、HTTP 路由、CLI 命令和服务。

重要的设计边界：

- 设备发现 + 配置验证应仅根据 **清单/架构元数据** 工作，
  而无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种分离让 OpenClaw 能够验证配置、解释缺失/禁用的插件，并
在完整运行时激活之前构建 UI/架构提示。

### 渠道插件和共享消息工具

渠道插件不需要为
普通聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，
渠道插件拥有其背后的特定于渠道的发现和执行。

当前的边界是：

- 核心拥有共享的 `message` 工具主机、提示连接、会话/线程
  记账和执行分发
- 渠道插件拥有作用域操作发现、能力发现以及任何
  特定于渠道的架构片段
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。这个统一的发现
调用允许插件一起返回其可见操作、能力和架构
贡献，以便这些部分不会分离。

核心将运行时作用域传递到该发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

这对于上下文相关的插件很重要。渠道可以根据活动账户、当前房间/线程/消息或受信任的请求者身份来隐藏或公开消息操作，而无需在核心 `message` 工具中对特定于渠道的分支进行硬编码。

这就是为什么嵌入式运行程序路由更改仍然是插件工作的原因：运行程序负责将当前聊天/会话身份转发到插件发现边界，以便共享 `message` 工具为当前轮次公开正确的渠道拥有的表面。

对于渠道拥有的执行助手，捆绑插件应将执行运行时保留在其自己的扩展模块中。核心在 `src/agents/tools` 下不再拥有 Discord、Slack、Telegram 或 WhatsApp 消息操作运行时。
我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑插件应直接从其扩展拥有的模块导入其自己的本地运行时代码。

具体对于投票，有两种执行路径：

- `outbound.sendPoll` 是适合通用投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是特定于渠道的投票语义或额外投票参数的首选路径

核心现在将共享投票解析推迟到插件投票调度拒绝该操作之后，因此插件拥有的投票处理程序可以接受特定于渠道的投票字段，而不会被通用投票解析程序阻止。

有关完整的启动序列，请参阅[加载管道](#load-pipeline)。

## 功能所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是无关集成的杂物袋。

这意味着：

- 公司插件通常应该拥有该公司所有面向 OpenClaw 的表面
- 功能插件通常应该拥有其引入的完整功能表面
- 渠道应该使用共享的核心能力，而不是临时重新实现提供商行为

示例：

- 捆绑的 `openai` 插件拥有 OpenAI 模型提供商行为和 OpenAI
  语音 + 媒体理解 + 图像生成行为
- 捆绑的 `elevenlabs` 插件拥有 ElevenLabs 语音行为
- 捆绑的 `microsoft` 插件拥有 Microsoft 语音行为
- 捆绑的 `google` 插件拥有 Google 模型提供商行为以及 Google
  媒体理解 + 图像生成 + 网络搜索行为
- 捆绑的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件各自拥有其
  媒体理解后端
- `voice-call` 插件是一个功能插件：它拥有呼叫传输、工具、
  CLI、路由和运行时，但它使用核心 TTS/STT 功能，而不是
  发明第二个语音栈

预期的最终状态是：

- OpenAI 位于一个插件中，即使它跨越文本模型、语音、图像和
  未来的视频
- 其他供应商可以为其自己的领域范围做同样的事情
- 渠道不关心哪个供应商插件拥有提供商；它们使用核心公开的
  共享功能合约

这是关键区别：

- **插件** = 所有权边界
- **功能** = 多个插件可以实现或使用的核心合约

因此，如果 OpenClaw 添加一个新领域（例如视频），第一个问题不是
“哪个提供商应该硬编码视频处理？”。第一个问题是“核心视频功能合约是什么？”。
一旦该合约存在，供应商插件就可以对其进行注册，渠道/功能插件就可以使用它。

如果该功能尚不存在，正确的做法通常是：

1. 在核心中定义缺失的功能
2. 通过插件 API/运行时以类型化方式公开它
3. 针对该功能连接渠道/功能
4. 让供应商插件注册实现

这使得所有权明确，同时避免依赖于单一供应商或一次性插件特定代码路径的核心行为。

### 功能分层

在决定代码归属时使用此思维模型：

- **核心功能层**：共享编排、策略、回退、配置
  合并规则、交付语义和类型化合约
- **供应商插件层**：供应商特定的 API、身份验证、模型目录、语音
  合成、图像生成、未来的视频后端、使用端点
- **渠道/feature plugin layer**：Slack/Discord/voice-call/etc. 集成，
  它消耗核心能力并将其呈现在表面上

例如，TTS 遵循此形式：

- core 拥有回复时 TTS 策略、回退顺序、首选项和渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消耗电话 TTS 运行时辅助程序

对于未来的能力，应优先考虑相同的模式。

### 多能力公司插件示例

公司插件从外部看应该是连贯的。如果 OpenClaw 有关于模型、语音、媒体理解和网络搜索的共享合约，供应商可以
在一个地方拥有其所有表面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import { buildOpenAISpeechProvider, createPluginBackedWebSearchProvider, describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk";

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

重要的是确切的辅助程序名称。形式才是重要的：

- 一个插件拥有供应商表面
- core 仍然拥有能力合约
- 渠道和功能插件消耗 `api.runtime.*` 辅助程序，而不是供应商代码
- 合约测试可以断言插件注册了其
  声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一个共享
能力。相同的所有权模型也适用于此：

1. core 定义媒体理解合约
2. 供应商插件注册 `describeImage`、`transcribeAudio` 和
   `describeVideo`（如适用）
3. 渠道和功能插件消耗共享的 core 行为，而不是
   直接连接到供应商代码

这避免了将一个提供商的视频假设固化到 core 中。插件拥有
供应商表面；core 拥有能力合约和回退行为。

如果 OpenClaw 稍后添加新域（例如视频生成），请再次使用相同的
序列：首先定义核心能力，然后让供应商插件
针对其注册实现。

需要具体的发布检查清单？请参阅
[Capability Cookbook](/en/tools/capability-cookbook)。

## 合约与执行

插件 API 表面经过有意类型设计并集中在
`OpenClawPluginApi` 中。该合约定义了支持的注册点和
插件可能依赖的运行时辅助程序。

为什么这很重要：

- 插件作者获得一个稳定的内部标准
- 核心可以拒绝重复的所有权，例如两个插件注册相同的
  提供商 id
- 启动时可以为格式错误的注册提供可操作的诊断信息
- 契约测试可以强制执行捆绑插件的所有权，并防止静默漂移

有两个执行层级：

1. **运行时注册执行**
   插件注册表在插件加载时验证注册。例如：
   重复的 提供商 id、重复的语音 提供商 id 以及格式错误的
   注册会产生插件诊断信息，而不是未定义的行为。
2. **契约测试**
   捆绑插件在测试运行期间会被捕获到契约注册表中，以便
   OpenClaw 可以明确断言所有权。目前这用于模型
   提供商、语音提供商、网络搜索提供商以及捆绑注册
   所有权。

实际效果是，OpenClaw 能够预先知道哪个插件拥有哪个
表面（surface）。这使得核心和渠道能够无缝组合，因为所有权是
声明式的、有类型的且可测试的，而不是隐式的。

### 契约中应包含的内容

良好的插件契约：

- 有类型的
- 小型的
- 特定于能力的
- 归核心所有
- 可被多个插件重用
- 可被渠道/功能消费，无需供应商知识

糟糕的插件契约：

- 隐藏在核心中的特定供应商策略
- 绕过注册表的一次性插件逃生舱
- 渠道代码直接访问供应商实现
- 不属于 `OpenClawPluginApi` 或
  `api.runtime` 一部分的临时运行时对象

如果有疑问，请提高抽象级别：先定义能力，然后
让插件接入其中。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) **在同一进程** 中运行。它们不是
沙箱隔离的。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、钩子和服务
- 原生插件错误可能会导致网关崩溃或不稳定
- 恶意的原生插件等同于在 OpenClaw 进程内执行任意代码

兼容捆绑包默认情况下更安全，因为 OpenClaw 目前将它们
视为元数据/内容包。在当前版本中，这主要意味着捆绑
技能。

对于非打包插件，使用允许列表和显式的安装/加载路径。将工作区插件视为开发时代码，而不是生产环境默认值。

对于打包的工作区包名称，默认情况下将插件 ID 锚定在 npm 名称中：`@openclaw/<id>`，或者当包有意暴露更窄的插件角色时，使用批准的类型后缀，如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要的信任说明：

- `plugins.allow` 信任的是**插件 ID**，而非来源出处。
- 当启用/列入允许列表时，与打包插件具有相同 ID 的工作区插件会有意遮蔽打包副本。
- 这是正常的，并且对本地开发、补丁测试和热修复很有用。

## 导出边界

OpenClaw 导出的是能力，而不是实现便利性。

保持能力注册公开。删减非契约的辅助导出：

- 特定于打包插件的辅助子路径
- 不打算作为公共 API 的运行时管道子路径
- 特定于供应商的便利辅助工具
- 作为实现细节的设置/新手引导辅助工具

## 加载流水线

启动时，OpenClaw 大致会执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的包清单和包元数据
3. 拒绝不安全的候选者
4. 规范化插件配置 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 决定每个候选者的启用状态
6. 通过 jiti 加载启用的原生模块
7. 调用原生 `register(api)` 钩子并将注册信息收集到插件注册表中
8. 将注册表暴露给命令/运行时表面

安全检查发生在运行时执行**之前**。当入口点逃离插件根目录、路径可被全局写入，或者非打包插件的路径所有权看起来可疑时，候选者将被阻止。

### 清单优先行为

清单是控制平面的单一事实来源。OpenClaw 使用它来：

- 识别插件
- 发现已声明的通道/技能/配置模式或捆绑功能
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

对于原生插件，运行时模块是数据平面部分。它注册实际行为，例如钩子、工具、命令或提供商流程。

### 加载器缓存的内容

OpenClaw 保留以下简短的进程内缓存：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存减少了突发启动和重复命令的开销。可以安全地将它们视为短期性能缓存，而不是持久化存储。

性能说明：

- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 注册表模型

已加载的插件不会直接修改随机的核心全局变量。它们注册到一个中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起源、状态、诊断）
- 工具
- 遗留钩子和类型化钩子
- 通道
- 提供商
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块通信。这使得加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表使用

这种分离对于可维护性至关重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“对每个插件模块进行特殊处理”。

## 对话绑定回调

绑定对话的插件可以在审批解决时做出反应。

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

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准请求的解析绑定
- `request`：原始请求摘要、分离提示、发送者 ID 和
  对话元数据

此回调仅用于通知。它不会更改允许绑定对话的人员，并且它在核心批准处理完成后运行。

## 提供商运行时钩子

提供商插件现在具有两层：

- 清单元数据：用于在运行时加载前进行廉价的 env-auth 查找的 `providerAuthEnvVars`，以及用于在运行时加载前进行廉价的新手引导/身份验证选择标签和 CLI 标志元数据的 `providerAuthChoices`
- 配置时钩子：`catalog` / 旧版 `discovery`
- 运行时钩子：`resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、`capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、`refreshOAuth`、`buildAuthDoctorHint`、`isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、`resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot`

OpenClaw 仍然拥有通用代理循环、故障转移、转录处理和工具策略。这些钩子是特定于提供商的行为的扩展表面，而无需整个自定义推理传输。

当提供商具有基于环境的凭据时，使用清单 `providerAuthEnvVars`，以便通用的身份验证/状态/模型选择器路径可以在不加载插件运行时的情况下看到它们。当新手引导/身份验证选择 CLI 界面应该知道提供商的选择 ID、组标签和简单的单标志身份验证连线而不加载提供商运行时时，请使用清单 `providerAuthChoices`。请保留提供商运行时 `envVars` 以用于面向操作员的提示，例如新手引导标签或 OAuth client-id/client-secret 设置变量。

### 钩子顺序和用法

对于模型/提供商插件，OpenClaw 大致按此顺序调用钩子。“何时使用”列是快速决策指南。

| #   | 钩子                          | 作用                                                                 | 何时使用                                                     |
| --- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `catalog`                     | 在 `models.json` 生成期间，将提供商配置发布到 `models.providers`     | 提供商拥有目录或基础 URL 默认值                              |
| --  | （内置模型查找）              | OpenClaw 首先尝试常规注册表/目录路径                                 | （非插件钩子）                                               |
| 2   | `resolveDynamicModel`         | 针对本地注册表中尚未存在的提供商拥有的模型 ID 进行同步回退           | 提供商接受任意上游模型 ID                                    |
| 3   | `prepareDynamicModel`         | 异步预热，然后 `resolveDynamicModel` 再次运行                        | 提供商在解析未知 ID 之前需要网络元数据                       |
| 4   | `normalizeResolvedModel`      | 嵌入式运行器使用解析后的模型之前的最终重写                           | 提供商需要传输重写，但仍使用核心传输                         |
| 5   | `capabilities`                | 共享核心逻辑使用的提供商拥有的转录/工具元数据                        | 提供商需要转录/提供商系列的特性处理                          |
| 6   | `prepareExtraParams`          | 通用流选项包装器之前的请求参数规范化                                 | 提供商需要默认请求参数或每个提供商的参数清理                 |
| 7   | `wrapStreamFn`                | 应用通用包装器后的流包装器                                           | 提供商需要请求头/请求体/模型兼容性包装器，而无需自定义传输   |
| 8   | `formatApiKey`                | 身份验证配置文件格式化程序：存储的配置文件变为运行时 `apiKey` 字符串 | 提供商存储额外的身份验证元数据，并且需要自定义运行时令牌形状 |
| 9   | `refreshOAuth`                | OAuth 刷新覆盖，用于自定义刷新端点或刷新失败策略                     | 提供商不符合共享的 `pi-ai` 刷新器                            |
| 10  | `buildAuthDoctorHint`         | 当 OAuth 刷新失败时附加的修复提示                                    | 提供商在刷新失败后需要提供商拥有的身份验证修复指导           |
| 11  | `isCacheTtlEligible`          | 代理/回传提供商的提示缓存策略                                        | 提供商需要特定于代理的缓存 TTL 限制                          |
| 12  | `buildMissingAuthMessage`     | 通用缺少身份验证恢复消息的替代                                       | 提供商需要特定于提供商的缺少身份验证恢复提示                 |
| 13  | `suppressBuiltInModel`        | 过时的上游模型抑制以及可选的用户面向错误提示                         | 提供商需要隐藏过时的上游行或将其替换为供应商提示             |
| 14  | `augmentModelCatalog`         | 发现后附加的合成/最终目录行                                          | 提供商需要在 `models list` 和选择器中使用合成向前兼容行      |
| 15  | `isBinaryThinking`            | 针对二元思维提供商的推理开关                                         | 提供商仅暴露二元思维的开启/关闭                              |
| 16  | `supportsXHighThinking`       | `xhigh` 所选模型的推理支持                                           | 提供商希望仅在其模型的一个子集上使用 `xhigh`                 |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的默认 `/think` 级别                                     | 提供商拥有模型系列的默认 `/think` 策略                       |
| 18  | `isModernModelRef`            | 用于实时配置文件过滤和模型选择的现代模型匹配器                       | 提供商拥有实时/测试的首选模型匹配                            |
| 19  | `prepareRuntimeAuth`          | 在推理之前，将配置的凭据交换为实际的运行时令牌/密钥                  | 提供商需要令牌交换或短期请求凭据                             |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用/计费凭据及相关状态表面                          | 提供商需要自定义使用/配额令牌解析或不同的使用凭据            |
| 21  | `fetchUsageSnapshot`          | 在解决身份验证后获取并规范化提供商特定的使用/配额快照                | 提供商需要提供商特定的使用端点或负载解析器                   |

如果提供商需要完全自定义的线路协议或自定义请求执行器，那是不同类别的扩展。这些钩子适用于仍在 OpenClaw 正常推理循环上运行的提供商行为。

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
  4.6 前向兼容性、提供商家族提示、身份验证修复指导、使用
  端点集成、提示缓存资格，以及 Claude 默认/自适应
  思考策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因为它拥有 GPT-5.4 前向兼容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 规范化、Codex 感知身份验证
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  实时模型策略。
- OpenRouter 使用 `catalog` 以及 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为该提供商是透传的，并且可能会在 OpenClaw 的静态目录更新之前公开新的
  模型 ID；它还使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`，以便将
  特定于提供商的请求头、路由元数据、推理补丁和
  提示缓存策略保留在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，以及 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它
  需要提供商拥有的设备登录、模型回退行为、Claude 转录
  奇癖、GitHub 令牌 -> Copilot 令牌交换，以及提供商拥有的使用
  端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog` 以及
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  仍在核心 OpenAI 传输上运行，但拥有其传输/基础 URL
  标准化、OpenAI 刷新回退策略、默认传输选择、
  合成 Codex 目录行以及 ChatGPT 使用端点集成。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因为它们拥有 Gemini 3.1 前向兼容回退和
  现代模型匹配；Gemini CLI OAuth 还使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 进行令牌格式化、令牌
  解析和配额端点连接。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因为它仍使用共享的
  OpenAI 传输，但需要提供商拥有的思考负载标准化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、
  推理负载标准化、Gemini 脚本提示和 Anthropic
  缓存 TTL 限制。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、
  `tool_stream` 默认值、二元思考 UX、现代模型匹配以及
  使用身份验证和配额获取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以便将
  脚本/工具怪癖排除在核心之外。
- 仅限目录捆绑的提供商，例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`，
  仅使用 `catalog`。
- Qwen 门户使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用钩子，因为尽管推理仍通过共享传输运行，但其 `/usage` 行为是由插件拥有的。

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

说明：

- `textToSpeech` 返回用于文件/语音笔记表面的正常核心 TTS 输出载荷。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- `listVoices` 对于每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和个性标签，以供具有提供商感知能力的选择器使用。
- OpenAI 和 ElevenLabs 目前支持电话功能。Microsoft 不支持。

插件也可以通过 `api.registerSpeechProvider(...)` 注册语音提供商。

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

说明：

- 将 TTS 策略、回退和回复交付保留在核心中。
- 使用语音提供商处理供应商拥有的合成行为。
- 旧版 Microsoft `edge` 输入被标准化为 `microsoft` 提供商 ID。
- 首选的所有权模型是以公司为导向的：一个供应商插件可以拥有文本、语音、图像和未来的媒体提供商，随着 OpenClaw 添加这些能力合约。

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

说明：

- 将编排、回退、配置和渠道连接保留在核心中。
- 将供应商行为保留在提供商插件中。
- 增量扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 如果 OpenClaw 稍后添加了新能力（例如视频生成），请先定义核心能力契约，然后让供应商插件针对其进行注册。

对于媒体理解运行时辅助工具，插件可以调用：

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

对于音频转录，插件可以使用媒体理解运行时或较旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意事项：

- `api.runtime.mediaUnderstanding.*` 是用于图像/音频/视频理解的首选共享表面。
- 使用核心媒体理解音频配置（`tools.media.audio`）和提供商回退顺序。
- 当未产生转录输出（例如跳过/不支持的输入）时，返回 `{ text: undefined }`。
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

注意：

- `provider` 和 `model` 是每次运行的可选覆盖，而不是持久的会话更改。
- OpenClaw 仅对受信任的调用者遵守这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须通过 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 显式允许任何目标。
- 不受信任的插件子代理运行仍然有效，但覆盖请求将被拒绝，而不是静默回退。

对于网络搜索，插件可以使用共享的运行时辅助工具，而不是深入到代理工具连接中：

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
- 使用网络搜索提供商进行供应商特定的搜索传输。
- 对于需要搜索行为但不依赖代理工具包装器的功能/渠道插件，`api.runtime.webSearch.*` 是首选的共享表面。

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
- `auth`：必填。使用 `"gateway"` 要求常规网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其现有的路由注册。
- `handler`：当路由处理了请求时，返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已过时。请使用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非设置了 `replaceExisting: true`，否则会拒绝完全相同的 `path + match` 冲突，且一个插件不能替换另一个插件的路由。
- 会拒绝具有不同 `auth` 级别的重叠路由。请保持 `exact`/`prefix` 透传链仅处于相同的身份验证级别。

## 插件 SDK 导入路径

在编写插件时，请使用 SDK 子路径，而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/plugin-entry` 用于插件注册基元。
- `openclaw/plugin-sdk/core` 用于通用共享插件端契约。
- 稳定的渠道基元，如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress`，用于共享设置/身份验证/回复/Webhook
  连接。`channel-inbound` 是防抖、提及匹配、
  信封格式化和入站信封上下文助手的共享归宿。
- 域子路径，如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/infra-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/status-helpers`、
  `openclaw/plugin-sdk/runtime-store` 和
  `openclaw/plugin-sdk/directory-runtime`，用于共享运行时/配置辅助工具。
- `openclaw/plugin-sdk/channel-runtime` 仅作为兼容性填充层存在。
  新代码应改为导入更窄的基元。
- 捆绑扩展的内部细节保持私有。外部插件应仅使用
  `openclaw/plugin-sdk/*` 子路径。OpenClaw 核心/测试代码可以使用位于 `extensions/<id>/index.js`、`api.js`、`runtime-api.js`、
  `setup-entry.js` 下的代码仓库公共入口点，以及范围狭窄的文件，如 `login-qr-api.js`。切勿
  从核心或其他扩展导入 `extensions/<id>/src/*`。
- 代码仓库入口点拆分：
  `extensions/<id>/api.js` 是辅助/类型聚合桶，
  `extensions/<id>/runtime-api.js` 是仅运行时聚合桶，
  `extensions/<id>/index.js` 是捆绑插件入口，
  而 `extensions/<id>/setup-entry.js` 是设置插件入口。
- 不再保留捆绑的渠道品牌公共子路径。特定于渠道的辅助和
  运行时接缝位于 `extensions/<id>/api.js` 和 `extensions/<id>/runtime-api.js` 之下；
  公共 SDK 契约改为通用的共享基元。

兼容性说明：

- 避免在新代码中使用根 `openclaw/plugin-sdk` 聚合桶。
- 首选较窄的稳定基元。较新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-工具 子路径是新
  捆绑和外部插件工作的预期契约。
  目标解析/匹配属于 `openclaw/plugin-sdk/channel-targets`。
  消息操作门控和反应消息 ID 辅助属于
  `openclaw/plugin-sdk/channel-actions`。
- 默认情况下，捆绑的特定于扩展的辅助模块桶是不稳定的。如果一个辅助函数仅被捆绑的扩展所需要，请将其保留在扩展的本地 `api.js` 或 `runtime-api.js` 接缝之后，而不是将其提升到 `openclaw/plugin-sdk/<extension>` 中。
- 带有渠道品牌的捆绑桶保持私有状态，除非它们被显式添加回公共合约。
- 存在特定于功能的子路径，如 `image-generation`、`media-understanding` 和 `speech`，是因为捆绑/原生插件当前正在使用它们。它们的存在本身并不意味着每个导出的辅助函数都是长期冻结的外部合约。

## 消息工具架构

插件应该拥有特定于渠道的 `describeMessageTool(...)` 架构贡献。请将特定于提供商的字段保留在插件中，而不是在共享核心中。

对于共享的可移植架构片段，请重用通过 `openclaw/plugin-sdk/channel-actions` 导出的通用辅助函数：

- `createMessageToolButtonsSchema()` 用于按钮网格风格的载荷
- `createMessageToolCardSchema()` 用于结构化卡片载荷

如果架构形状仅对某一个提供商有意义，请在该插件自己的源代码中定义它，而不是将其提升到共享 SDK 中。

## 渠道目标解析

渠道插件应该拥有特定于渠道的目标语义。保持共享的出站主机通用性，并使用消息适配器接口来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，归一化目标是否应被视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉核心，输入是否应该跳过直接进行类似 ID 的解析，而不是目录搜索。
- `messaging.targetResolver.resolveTarget(...)` 是当核心在归一化或目录未命中后需要最终的提供商拥有的解析时的插件回退方案。
- `messaging.resolveOutboundSessionRoute(...)` 负责在解析目标后构建特定于提供商的会话路由。

建议的拆分：

- 使用 `inferTargetChatType` 进行应该在搜索对等体/组之前发生的类别决策。
- 使用 `looksLikeId` 进行“将其视为显式/原生目标 ID”的检查。
- 使用 `resolveTarget` 进行特定于提供商的规范化回退，而非用于
  广泛的目录搜索。
- 将提供商原生 ID（如聊天 ID、线程 ID、JID、句柄和房间
  ID）保留在 `target` 值或特定于提供商的参数中，而不是通用 SDK
  字段中。

## 基于配置的目录

从配置派生目录条目的插件应将该逻辑保留在
插件内部，并复用
`openclaw/plugin-sdk/directory-runtime` 中的共享辅助函数。

当渠道需要基于配置的对等方/组时（例如），请使用此选项：

- 基于允许列表的私信对等方
- 已配置的渠道/组映射
- 账户范围的静态目录回退

`directory-runtime` 中的共享辅助函数仅处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化辅助函数
- 构建 `ChannelDirectoryEntry[]`

特定于渠道的账户检查和 ID 规范化应保留在
插件实现中。

## 提供商目录

提供商插件可以使用
`registerProvider({ catalog: { run(...) { ... } } })` 定义用于推理的模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 相同的形状：

- 用于一个提供商条目的 `{ provider }`
- 用于多个提供商条目的 `{ providers }`

当插件拥有特定于提供商的模型 ID、基础 URL
默认值或受身份验证保护的模型元数据时，使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw
内置隐式提供商的合并时机：

- `simple`：普通的 API 密钥或环境驱动的提供商
- `profile`：当存在身份验证配置文件时出现的提供商
- `paired`：合成多个相关提供商条目的提供商
- `late`：最后一轮，在其他隐式提供商之后

后出现的提供商在键冲突时胜出，因此插件可以有意覆盖
具有相同提供商 ID 的内置提供商条目。

兼容性：

- `discovery` 仍可用作旧版别名
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

## 只读渠道检查

如果您的插件注册了渠道，建议同时实现
`plugin.config.inspectAccount(cfg, accountId)` 和 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是运行时路径。它被允许假设凭证
  已完全具体化，并且在缺少所需密钥时可以快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修复流程）不应仅为了描述配置而具体化运行时凭证。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性的账户状态。
- 保留 `enabled` 和 `configured`。
- 在适当时包含凭证来源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要仅为了报告只读可用性而返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的 source
  字段）对于状态类命令来说已经足够。
- 当凭证通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这使得只读命令可以报告“已配置但在此命令路径中不可用”，而不是崩溃或将账户错误地报告为未配置。

## 包集合

插件目录可能包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都成为一个插件。如果该集合列出了多个扩展，插件 ID
将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请将其安装在该目录中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防护：解析符号链接后，每个 `openclaw.extensions` 条目必须保留在插件目录内。转义出包目录的条目将被拒绝。

安全说明：`openclaw plugins install` 使用 `npm install --ignore-scripts`（无生命周期脚本）安装插件依赖。请保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置模块。当 OpenClaw 需要为已禁用的渠道插件提供设置界面，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。如果你的主插件入口还连接了工具、钩子或其他仅运行时代码，这可以使启动和设置更轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以使渠道插件在网关的预监听启动阶段选择进入相同的 `setupEntry` 路径，即使该渠道已经配置。

仅当 `setupEntry` 完全覆盖网关开始监听之前必须存在的启动界面时，才使用此选项。实际上，这意味着设置入口必须注册启动依赖的每个渠道拥有的功能，例如：

- 渠道注册本身
- 网关开始监听之前必须可用的任何 HTTP 路由
- 在同一窗口期间必须存在的任何网关方法、工具或服务

如果你的完整入口仍然拥有任何必需的启动功能，请不要启用此标志。保持插件处于默认行为，并让 OpenClaw 在启动期间加载完整入口。

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

渠道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 宣传安装提示。这使核心目录保持无数据。

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

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 上下文引擎插件

上下文引擎插件拥有用于摄取、组装
和压缩的会话上下文编排。通过
`api.registerContextEngine(id, factory)` 从插件中注册它们，然后使用
`plugins.slots.contextEngine` 选择活动引擎。

当您的插件需要替换或扩展现有的上下文
管道而不仅仅是添加内存搜索或钩子时，请使用此功能。

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

如果您的引擎**不**拥有压缩算法，请保持 `compact()`
的实现并显式地委派它：

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

## 添加新功能

当插件需要的行为不符合当前的 API 时，不要通过私有访问绕过
插件系统。添加缺失的功能。

建议的顺序：

1. 定义核心契约
   决定核心应拥有哪些共享行为：策略、回退、配置合并、
   生命周期、面向渠道的语义和运行时助手形状。
2. 添加类型化插件注册/运行时表面
   使用最小有用的类型化功能表面扩展
   `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 渠道/功能消费者
   渠道和功能插件应通过核心使用新功能，
   而不是直接导入供应商实现。
4. 注册供应商实现
   然后供应商插件针对该功能注册其后端。
5. 添加契约覆盖
   添加测试，以确保所有权和注册形状随时间推移保持明确。

这就是 OpenClaw 如何在保持主见的同时，不硬编码于某个
提供商的世界观。请参阅 [功能手册](/en/tools/capability-cookbook)
以获取具体的文件清单和实际示例。

### 功能清单

当您添加新功能时，实现通常应该同时涉及这些
表面：

- `src/<capability>/types.ts` 中的核心契约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时助手
- `src/plugins/types.ts` 中的插件 API 注册表面
- `src/plugins/registry.ts` 中的插件注册表连接
- 在 `src/plugins/runtime/*` 中公开插件运行时，当功能/渠道插件需要使用它时
- 在 `src/test-utils/plugin-registration.ts` 中捕获/测试辅助工具
- 在 `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- 在 `docs/` 中的操作员/插件文档

如果缺少这些表面（surfaces）中的任何一个，通常表明该功能尚未完全集成。

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

契约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这使规则保持简单：

- 核心拥有功能契约和编排
- 供应商插件拥有供应商实现
- 功能/渠道插件使用运行时辅助工具
- 契约测试明确所有权
