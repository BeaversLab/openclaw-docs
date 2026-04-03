---
summary: "插件内部：能力模型、所有权、合约、加载管道和运行时辅助工具"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "插件内部"
sidebarTitle: "内部"
---

# 插件内部

<Info>这是**深度架构参考**。如需实用指南，请参阅： - [安装和使用插件](/en/tools/plugin) — 用户指南 - [入门指南](/en/plugins/building-plugins) — 第一个插件教程 - [渠道插件](/en/plugins/sdk-channel-plugins) — 构建消息渠道 - [提供商插件](/en/plugins/sdk-provider-plugins) — 构建模型提供商 - [SDK 概述](/en/plugins/sdk-overview) — 导入映射和注册 API</Info>

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

- **plain-capability** -- 仅注册一种能力类型（例如仅提供商的插件，如 `mistral`）
- **hybrid-capability** -- 注册多种能力类型（例如 `openai` 拥有文本推理、语音、媒体理解和图像生成）
- **hook-only** -- 仅注册钩子（类型化或自定义），不注册能力、工具、命令或服务
- **non-capability** -- 注册工具、命令、服务或路由，但不注册能力

使用 `openclaw plugins inspect <id>` 查看插件的形状和能力细分。详情请参阅 [CLI 参考](/en/cli/plugins#inspect)。

### 传统钩子

`before_agent_start` 钩子仍作为仅钩子插件的兼容路径得到支持。现有的遗留插件仍依赖它。

方向：

- 保持其正常工作
- 将其记录为传统内容
- 对于模型/提供商覆盖工作，请优先使用 `before_model_resolve`
- 对于提示词变更工作，优先使用 `before_prompt_build`
- 仅在真实使用量下降且装置覆盖证明迁移安全后才将其移除

### 兼容性信号

当您运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，您可能会看到以下标签之一：

| Signal                     | 含义                                               |
| -------------------------- | -------------------------------------------------- |
| **config valid**           | 配置解析正常且插件已解析                           |
| **compatibility advisory** | 插件使用了受支持但已过时的模式（例如 `hook-only`） |
| **legacy warning**         | 插件使用了已弃用的 `before_agent_start`            |
| **hard error**             | 配置无效或插件加载失败                             |

`hook-only` 和 `before_agent_start` 目前都不会破坏您的插件 —— `hook-only` 仅是建议性的，而 `before_agent_start` 只会触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四层：

1. **清单 + 设备发现**
   OpenClaw 从配置的路径、工作区根目录、全局扩展根目录和打包的扩展中查找候选插件。设备发现首先读取原生 `openclaw.plugin.json` 清单以及支持的包清单。
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

具体对于插件 CLI，根命令发现分为两个阶段：

- 解析时的元数据来自 `registerCli(..., { descriptors: [...] })`
- 真正的插件 CLI 模块可以保持懒加载，并在首次调用时注册

这使得插件拥有的 CLI 代码保留在插件内部，同时允许 OpenClaw 在解析之前保留根命令名称。

重要的设计边界：

- 设备发现 + 配置验证应基于 **清单/架构元数据** 运作，而无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种分离使得 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件，并构建 UI/架构提示。

### 渠道插件和共享消息工具

渠道插件不需要为正常的聊天操作注册单独的发送/编辑/反应工具。OpenClaw 在核心中保留一个共享的 `message` 工具，而渠道插件拥有其背后的特定于渠道的设备发现和执行。

当前的边界是：

- 核心拥有共享 `message` 工具宿主、提示词连接、会话/线程记账以及执行分发
- 渠道插件拥有作用域操作发现、功能发现以及任何特定于渠道的架构片段
- 渠道插件拥有特定于提供商的会话对话语法，例如
  对话 ID 如何编码主题 ID 或从父对话继承
- 渠道插件通过其操作适配器执行最终操作

对于渠道插件，SDK 表面是
`ChannelMessageActionAdapter.describeMessageTool(...)`。这个统一的发现
调用允许插件同时返回其可见操作、功能和架构
贡献，从而使这些部分不会分离。

核心将运行时作用域传入该发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 可信的入站 `requesterSenderId`

这对于上下文相关的插件很重要。渠道可以根据活动帐户、当前房间/主题/消息或
可信的请求者身份来隐藏或暴露
消息操作，而无需在核心 `message` 工具中硬编码特定于渠道的分支。

这就是为什么嵌入式运行程序路由更改仍然是插件工作的原因：运行程序负责
将当前聊天/会话身份转发到插件
发现边界，以便共享的 `message` 工具为当前轮次暴露正确的渠道拥有的
表面。

对于渠道拥有的执行助手，捆绑插件应将执行
运行时保留在其自己的扩展模块内。核心不再拥有 Discord、
Slack、Telegram 或 WhatsApp 消息操作运行时，位于 `src/agents/tools` 下。
我们不发布单独的 `plugin-sdk/*-action-runtime` 子路径，捆绑
插件应直接从其
扩展拥有的模块导入自己的本地运行时代码。

具体对于投票，有两条执行路径：

- `outbound.sendPoll` 是适合通用
  投票模型的渠道的共享基线
- `actions.handleAction("poll")` 是特定于渠道的
  投票语义或额外投票参数的首选路径

Core 现在推迟共享轮询解析，直到插件轮询分发拒绝该操作，这样插件拥有的轮询处理程序就可以接受特定于渠道的轮询字段，而不会先被通用轮询解析程序阻塞。

有关完整的启动序列，请参阅 [Load pipeline](#load-pipeline)。

## 功能所有权模型

OpenClaw 将原生插件视为 **公司** 或 **功能** 的所有权边界，而不是无关集成的兜袋。

这意味着：

- 公司插件通常应该拥有该公司面向 OpenClaw 的所有表面
- 功能插件通常应该拥有其引入的完整功能表面
- 渠道应该使用共享核心功能，而不是临时重新实现提供商行为

示例：

- 捆绑的 `openai` 插件拥有 OpenAI 模型提供商行为和 OpenAI 语音 + 媒体理解 + 图像生成行为
- 捆绑的 `elevenlabs` 插件拥有 ElevenLabs 语音行为
- 捆绑的 `microsoft` 插件拥有 Microsoft 语音行为
- 捆绑的 `google` 插件拥有 Google 模型提供商行为以及 Google 媒体理解 + 图像生成 + 网络搜索行为
- 捆绑的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件拥有其各自的媒体理解后端
- `voice-call` 插件是一个功能插件：它拥有调用传输、工具、CLI、路由和运行时，但它使用核心 TTS/STT 功能，而不是发明第二个语音堆栈

预期的最终状态是：

- 即使 OpenAI 跨越文本模型、语音、图像和未来的视频，它也只存在于一个插件中
- 其他供应商也可以为其自己的表面区域做同样的事情
- 渠道不在乎哪个供应商插件拥有提供商；它们使用核心公开的共享功能契约

这是关键区别：

- **插件** = 所有权边界
- **功能** = 多个插件可以实现或使用的核心契约

因此，如果 OpenClaw 添加了一个新领域（例如视频），第一个问题不是
“哪个提供商应该硬编码视频处理？”。第一个问题是“核心视频能力合约是什么？”。
一旦该合约存在，供应商插件就可以针对它进行注册，而渠道/功能插件就可以使用它。

如果该能力尚不存在，通常正确的做法是：

1. 在核心中定义缺失的能力
2. 通过插件 API/运行时以类型化的方式将其公开
3. 针对该能力连接渠道/功能
4. 让供应商插件注册实现

这保持了所有权的明确性，同时避免了依赖单个供应商或一次性插件特定代码路径的核心行为。

### 能力分层

在决定代码所属位置时，请使用这个心智模型：

- **核心能力层**：共享编排、策略、回退、配置
  合并规则、交付语义和类型化合约
- **供应商插件层**：特定于供应商的 API、身份验证、模型目录、语音
  合成、图像生成、未来的视频后端、使用端点
- **渠道/功能插件层**：Slack/Discord/语音通话等集成
  消费核心能力并将其呈现在界面上

例如，TTS 遵循这种形状：

- 核心拥有回复时 TTS 策略、回退顺序、首选项和渠道交付
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话 TTS 运行时助手

对于未来的能力，应优先采用相同的模式。

### 多能力公司插件示例

公司插件从外部看应该是内聚的。如果 OpenClaw 对模型、语音、媒体理解和网络搜索有共享合约，供应商可以在一个地方拥有其所有界面：

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

重要的不是确切的助手名称。形状才重要：

- 一个插件拥有供应商界面
- 核心仍然拥有能力合约
- 渠道和功能插件消费 `api.runtime.*` 助手，而不是供应商代码
- 合约测试可以断言插件已注册其
  声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像/音频/视频理解视为一个共享能力。同样的所有权模型适用于此处：

1. core 定义了媒体理解协议
2. 供应商插件视情况注册 `describeImage`、`transcribeAudio` 和
   `describeVideo`
3. 通道和功能插件使用共享的核心行为，而不是
   直接连接到供应商代码

这避免了将一个提供商的视频假设硬编码到 core 中。插件拥有
供应商接口；core 拥有能力协议和回退行为。

如果 OpenClaw 稍后添加新领域（例如视频生成），请再次使用
相同序列：首先定义核心能力，然后让供应商插件
针对其注册实现。

需要具体的发布检查清单？请参阅
[能力指南](/en/tools/capability-cookbook)。

## 协议与执行

插件 API 接口是有意进行类型化并集中管理的，位于
`OpenClawPluginApi` 中。该协议定义了支持的注册点和
插件可能依赖的运行时辅助函数。

这为何重要：

- 插件作者获得一个稳定的内部标准
- core 可以拒绝重复的所有权，例如两个插件注册相同的
  提供商 id
- 启动时可以针对格式错误的注册提供可操作的诊断信息
- 协议测试可以执行捆绑插件的所有权并防止静默偏移

有两个执行层：

1. **运行时注册执行**
   插件注册表在插件加载时验证注册。例如：
   重复的 提供商 id、重复的语音 提供商 id 和格式错误的
   注册会产生插件诊断信息，而不是未定义的行为。
2. **协议测试**
   捆绑插件在测试运行期间被捕获在协议注册表中，以便
   OpenClaw 可以显式断言所有权。目前这用于模型
   提供商、语音提供商、网络搜索提供商以及捆绑注册
   所有权。

实际效果是，OpenClaw 能够预先知道哪个插件拥有哪个
接口。这使得 core 和通道能够无缝组合，因为所有权是
声明的、有类型的且可测试的，而不是隐式的。

### 协议中应包含哪些内容

良好的插件协议具备以下特点：

- 有类型
- 小
- 特定于能力
- 由 core 拥有
- 可被多个插件复用
- 可被通道/功能使用而无需了解供应商

糟糕的插件协议具备以下特点：

- 隐藏在 core 中的供应商特定策略
- 绕过注册表的一次性插件应急机制
- 直接深入到供应商实现的渠道代码
- 不属于 `OpenClawPluginApi` 或
  `api.runtime` 的临时运行时对象

如有疑问，请提高抽象级别：先定义能力，然后
让插件插入其中。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) **进程内**运行。它们并非
沙箱隔离。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、钩子和服务
- 原生插件中的 Bug 可能会导致网关崩溃或不稳定
- 恶意的原生插件等同于在 OpenClaw 进程内执行任意代码

兼容的捆绑包默认更安全，因为 OpenClaw 目前将其视为元数据/内容包。在当前版本中，这主要意味着捆绑的技能。

对非捆绑插件使用允许列表和显式的安装/加载路径。将工作区插件视为开发时代码，而非生产环境默认值。

对于捆绑的工作区包名称，请保持插件 id 锚定在 npm
名称中：默认为 `@openclaw/<id>`，或者当包有意暴露更窄的插件角色时，使用批准的类型后缀，例如
`-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`。

重要的信任提示：

- `plugins.allow` 信任的是 **插件 id**，而非来源出处。
- 当启用/允许工作区插件时，与捆绑插件具有相同 id 的工作区插件会有意覆盖
  捆绑的副本。
- 这是正常且有用的，适用于本地开发、补丁测试和热修复。

## 导出边界

OpenClaw 导出的是能力，而非实现便利性。

保持能力注册公开。精简非契约辅助导出：

- 特定于捆绑插件的辅助子路径
- 不打算作为公共 API 的运行时管道子路径
- 特定于供应商的便利辅助工具
- 属于实现细节的设置/新手引导辅助工具

## 加载管道

启动时，OpenClaw 大致会执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的 bundle 清单和包元数据
3. 拒绝不安全的候选者
4. 规范化插件配置 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 决定每个候选者的启用状态
6. 通过 jiti 加载已启用的原生模块
7. 调用原生 `register(api)` （或 `activate(api)` —— 一个遗留别名）钩子，并将注册信息收集到插件注册表中
8. 向命令/运行时表面公开注册表

<Note>`activate` 是 `register` 的遗留别名 —— 加载器会解析存在的那个 (`def.register ?? def.activate`) 并在同一时刻调用它。所有 bundle 插件都使用 `register`；对于新插件，请优先使用 `register`。</Note>

安全检查发生在运行时执行**之前**。当入口点超出插件根目录、路径可被全局写入，或者对于非 bundle 插件路径所有权看起来可疑时，候选者将被阻止。

### 清单优先行为

清单是控制平面的唯一真实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的通道/技能/配置架构或 bundle 能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

对于原生插件，运行时模块是数据平面部分。它注册实际行为，如钩子、工具、命令或提供商流程。

### 加载器缓存的内容

OpenClaw 为以下内容保持简短的进程内缓存：

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

已加载的插件不会直接修改随机的核心全局变量。它们注册到中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、来源地、状态、诊断）
- 工具
- 遗留钩子和类型化钩子
- 通道
- 提供商
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

然后，核心功能从该注册表读取，而不是直接与插件模块通信。这使加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对于可维护性很重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“为每个插件模块做特殊处理”。

## 对话绑定回调

绑定对话的插件可以在审批解析时做出反应。

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

回调载荷字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准请求的解析绑定
- `request`：原始请求摘要、分离提示、发送者 ID 和对话元数据

此回调仅用于通知。它不会改变谁被允许绑定对话，并且它在核心审批处理完成后运行。

## 提供商运行时钩子

提供商插件现在有两层：

- 清单元数据：`providerAuthEnvVars` 用于在运行时加载之前进行廉价的环境身份验证查找，加上 `providerAuthChoices` 用于在运行时加载之前进行廉价的新手引导/身份验证选择标签和 CLI 标志元数据
- 配置时钩子：`catalog` / 遗留 `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然拥有通用代理循环、故障转移、记录处理和工具策略。这些钩子是针对提供商特定行为的扩展表面，而无需完整的自定义推理传输。

当提供商拥有基于环境的凭据，且通用身份验证/状态/模型选择器路径应看到这些凭据而无需加载插件运行时时，请使用清单 `providerAuthEnvVars`。当新手引导/身份验证选择 CLI 界面应了解提供商的选择 ID、分组标签以及简单的单标志身份验证连线，而无需加载提供商运行时时，请使用清单 `providerAuthChoices`。请将提供商运行时 `envVars` 保留用于面向操作员的提示，例如新手引导标签或 OAuth client-id/client-secret 设置变量。

### 钩子顺序和用法

对于模型/提供商插件，OpenClaw 按大致顺序调用钩子。“何时使用”一栏是快速决策指南。

| #   | 钩子                          | 作用                                                                 | 何时使用                                                   |
| --- | ----------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `catalog`                     | 在 `models.json` 生成期间将提供商配置发布到 `models.providers`       | 提供商拥有目录或基础 URL 默认值                            |
| --  | _(内置模型查找)_              | OpenClaw 首先尝试正常的注册表/目录路径                               | _(不是插件钩子)_                                           |
| 2   | `resolveDynamicModel`         | 针对本地注册表中尚未包含的提供商拥有的模型 ID 的同步回退             | 提供商接受任意上游模型 ID                                  |
| 3   | `prepareDynamicModel`         | 异步预热，然后 `resolveDynamicModel` 再次运行                        | 提供商在解析未知 ID 之前需要网络元数据                     |
| 4   | `normalizeResolvedModel`      | 嵌入式运行器使用解析出的模型之前的最终重写                           | 提供商需要传输重写但仍使用核心传输                         |
| 5   | `capabilities`                | 共享核心逻辑使用的提供商拥有的转录/工具元数据                        | 提供商需要转录/提供商系列的特殊处理                        |
| 6   | `prepareExtraParams`          | 通用流选项包装器之前的请求参数规范化                                 | 提供商需要默认请求参数或按提供商的参数清理                 |
| 7   | `wrapStreamFn`                | 应用通用包装器后的流包装器                                           | 提供商需要请求头/正文/模型兼容包装器，而不使用自定义传输   |
| 8   | `formatApiKey`                | 身份验证配置文件格式化程序：存储的配置文件变为运行时 `apiKey` 字符串 | 提供商存储额外的身份验证元数据并且需要自定义运行时令牌形状 |
| 9   | `refreshOAuth`                | OAuth 刷新覆盖，用于自定义刷新端点或刷新失败策略                     | 提供商不适合共享的 `pi-ai` 刷新器                          |
| 10  | `buildAuthDoctorHint`         | OAuth 刷新失败时附加的修复提示                                       | 提供商在刷新失败后需要提供商拥有的身份验证修复指导         |
| 11  | `isCacheTtlEligible`          | 代理/回传提供商的提示缓存策略                                        | 提供商需要特定于代理的缓存 TTL 门控                        |
| 12  | `buildMissingAuthMessage`     | 通用缺少身份验证恢复消息的替代                                       | 提供商需要特定于提供商的缺少身份验证恢复提示               |
| 13  | `suppressBuiltInModel`        | 陈旧的上游模型抑制以及可选的用户可见错误提示                         | 提供商需要隐藏陈旧的上游行或将其替换为供应商提示           |
| 14  | `augmentModelCatalog`         | 发现后附加的合成/最终目录行                                          | 提供商需要在 `models list` 和选择器中使用合成向前兼容行    |
| 15  | `isBinaryThinking`            | 二元思维提供商的推理开关                                             | 提供商仅公开二元思维开/关                                  |
| 16  | `supportsXHighThinking`       | 所选模型的 `xhigh` 推理支持                                          | 提供商希望仅对模型的一个子集使用 `xhigh`                   |
| 17  | `resolveDefaultThinkingLevel` | 特定模型系列的默认 `/think` 级别                                     | 提供商拥有模型系列的默认 `/think` 策略                     |
| 18  | `isModernModelRef`            | 用于实时配置文件过滤和冒烟选择的现代模型匹配器                       | 提供商拥有实时/冒烟首选模型匹配                            |
| 19  | `prepareRuntimeAuth`          | 在推理之前立即将配置的凭据交换为实际的运行时令牌/密钥                | 提供商需要令牌交换或短期请求凭据                           |
| 20  | `resolveUsageAuth`            | 解析 `/usage` 的使用/计费凭据以及相关状态表面                        | 提供商需要自定义使用/配额令牌解析或不同的使用凭据          |
| 21  | `fetchUsageSnapshot`          | 在解析身份验证后获取并规范化提供商特定的使用/配额快照                | 提供商需要提供商特定的使用端点或负载解析器                 |

如果提供商需要完全自定义的线路协议或自定义请求执行器，
那属于不同类别的扩展。这些挂钩用于仍运行在
OpenClaw 正常推理循环上的提供商行为。

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
  4.6 前向兼容性、提供商系列提示、身份验证修复指导、使用
  端点集成、提示缓存资格以及 Claude 默认/自适应
  思维策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因为它拥有 GPT-5.4 前向兼容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 标准化、Codex 感知的身份验证
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思考 /
  实时模型策略。
- OpenRouter 使用 `catalog`，加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为该提供商是透传的，可能会在 OpenClaw 的静态目录更新之前
  暴露新的模型 ID；它还使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`，以便将
  提供商特定的请求头、路由元数据、推理补丁和
  提示缓存策略排除在核心之外。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它
  需要提供商拥有的设备登录、模型回退行为、Claude 转录
  怪癖、GitHub 令牌 -> Copilot 令牌交换，以及提供商拥有的使用
  端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  仍在核心 OpenAI 传输上运行，但拥有其传输/基本 URL
  标准化、OAuth 刷新回退策略、默认传输选择、
  合成 Codex 目录行以及 ChatGPT 使用端点集成。
- Google AI Studio 和 Gemini CLI CLI 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因为它们拥有 Gemini 3.1 向前兼容回退和
  现代模型匹配；Gemini CLI OAuth CLI 还使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 进行令牌格式化、令牌
  解析和配额端点连接。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因为它仍然使用共享的
  OpenAI 传输，但需要提供商拥有的思维负载标准化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、
  推理负载标准化、Gemini 脚本提示和 Anthropic
  缓存 TTL 控制。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、
  `tool_stream` 默认值、二进制思维 UX、现代模型匹配，以及
  使用授权和配额获取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以便将
  脚本/工具怪癖排除在核心之外。
- 仅目录的捆绑提供商（如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）仅
  使用 `catalog`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用挂钩，因为它们的 `/usage`
  行为由插件拥有，尽管推理仍通过共享
  传输运行。

## Runtime helpers

插件可以通过 `api.runtime` 访问选定的核心助手。对于 TTS：

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

注意事项：

- `textToSpeech` 返回用于文件/语音留言界面的正常核心 TTS 输出负载。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- `listVoices` 对于每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和个性标签，供提供商感知的选择器使用。
- OpenAI 和 ElevenLabs 目前支持电话功能。Microsoft 则不支持。

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

注：

- 将 TTS 策略、回退和回复传递保留在核心中。
- 将语音提供商用于供应商拥有的合成行为。
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

注：

- 将编排、回退、配置和渠道连接保留在核心中。
- 将供应商行为保留在提供商插件中。
- 增量扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选能力。
- 如果 OpenClaw 稍后添加新功能（例如视频生成），请先定义核心能力契约，然后让供应商插件对其进行注册。

对于媒体理解运行时助手，插件可以调用：

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

注：

- `api.runtime.mediaUnderstanding.*` 是图像/音频/视频理解的首选共享界面。
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

注意：

- `provider` 和 `model` 是可选的每次运行覆盖项，而非持久的会话更改。
- OpenClaw 仅在调用者受信任时遵守这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任的插件限制为特定的规范 `provider/model` 目标，或者使用 `"*"` 明确允许任何目标。
- 不受信任的插件子代理运行仍然有效，但覆盖请求将被拒绝，而不是静默回退。

对于网络搜索，插件可以使用共享的运行时助手，而无需深入连接到代理工具的连线：

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

注意：

- 将提供商选择、凭据解析和共享请求语义保留在核心中。
- 使用网络搜索提供商进行特定于供应商的搜索传输。
- `api.runtime.webSearch.*` 是需要搜索行为但不依赖代理工具包装器的功能/渠道插件的首选共享界面。

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
- `auth`：必需。使用 `"gateway"` 要求正常的网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其现有的路由注册。
- `handler`：当路由处理请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已被移除，并将导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非 `replaceExisting: true`，否则将拒绝完全相同的 `path + match` 冲突，且一个插件不能替换另一个插件的路由。
- 将拒绝具有不同 `auth` 级别的重叠路由。请仅在相同的身份验证级别上保留 `exact`/`prefix` 透传链。

## 插件 SDK 导入路径

在编写插件时，请使用 SDK 子路径而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/plugin-entry` 用于插件注册原语。
- `openclaw/plugin-sdk/core` 用于面向插件的通用共享契约。
- 稳定的渠道原语，如 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input` 和
  `openclaw/plugin-sdk/webhook-ingress` 用于共享设置/身份验证/回复/Webhook
  线路。`channel-inbound` 是防抖、提及匹配、
  信封格式化和入站信封上下文辅助工具的共享中心。
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
  `openclaw/plugin-sdk/directory-runtime` 用于共享运行时/配置辅助工具。
- `openclaw/plugin-sdk/channel-runtime` 仅作为兼容性填充层保留。
  新代码应改为导入更具体的原语。
- 捆绑扩展的内部实现保持私有。外部插件应仅使用
  `openclaw/plugin-sdk/*` 子路径。OpenClaw 核心/测试代码可以使用位于插件包根目录下的仓库公共入口点，例如 `index.js`、`api.js`、
  `runtime-api.js`、`setup-entry.js`，以及范围狭窄的文件，例如
  `login-qr-api.js`。切勿从核心或其他扩展导入插件包的 `src/*`。
- 仓库入口点划分：
  `<plugin-package-root>/api.js` 是辅助工具/类型桶，
  `<plugin-package-root>/runtime-api.js` 是仅运行时桶，
  `<plugin-package-root>/index.js` 是捆绑插件入口，
  而 `<plugin-package-root>/setup-entry.js` 是设置插件入口。
- 不再保留捆绑的特定于渠道的公共子路径。特定于渠道的辅助工具和
  运行时接缝位于 `<plugin-package-root>/api.js` 和 `<plugin-package-root>/runtime-api.js` 之下；
  公共 SDK 契约改为通用的共享基元。

兼容性说明：

- 对于新代码，请避免使用根 `openclaw/plugin-sdk` 桶。
- 优先使用范围狭窄的稳定基元。较新的 setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-工具 子路径是新的捆绑和外部插件工作的预期契约。
  目标解析/匹配属于 `openclaw/plugin-sdk/channel-targets`。
  消息操作门控和反应消息 ID 辅助工具属于
  `openclaw/plugin-sdk/channel-actions`。
- 捆绑扩展特定的辅助工具桶默认情况下不稳定。如果
  辅助工具仅由捆绑扩展需要，请将其保留在扩展的本地
  `api.js` 或 `runtime-api.js` 接缝之后，而不是将其提升到
  `openclaw/plugin-sdk/<extension>` 中。
- 新的共享辅助工具接缝应该是通用的，而不是特定于渠道的。共享目标
  解析属于 `openclaw/plugin-sdk/channel-targets`；特定于渠道的
  内部实现保留在所属插件的本地 `api.js` 或 `runtime-api.js`
  接缝之后。
- 诸如 `image-generation`、`media-understanding` 和 `speech` 等特定功能的子路径之所以存在，是因为打包/原生插件目前正在使用它们。它们的存在本身并不意味着每个导出的辅助函数都是长期冻结的外部契约。

## 消息工具架构

插件应拥有特定渠道的 `describeMessageTool(...)` 架构贡献。请将特定于提供商的字段保留在插件中，而不是共享核心中。

对于共享的可移植架构片段，请复用通过 `openclaw/plugin-sdk/channel-actions` 导出的通用辅助函数：

- 用于按钮网格样式载荷的 `createMessageToolButtonsSchema()`
- 用于结构化卡片载荷的 `createMessageToolCardSchema()`

如果某种架构形状仅对某一个提供商有意义，请在该插件的源代码中定义它，而不是将其提升到共享 SDK 中。

## 渠道目标解析

渠道插件应拥有特定渠道的目标语义。保持共享出站主机的通用性，并使用消息适配器接口来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，是否应将标准化目标视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉核心，输入是否应跳过目录搜索而直接进行类似 ID 的解析。
- 当核心在标准化后或目录未命中后需要最终的提供商拥有的解析结果时，`messaging.targetResolver.resolveTarget(...)` 是插件的后备选项。
- 一旦目标被解析，`messaging.resolveOutboundSessionRoute(...)` 负责特定于提供商的会话路由构建。

建议的划分：

- 使用 `inferTargetChatType` 进行应在搜索对等方/组之前发生的类别决策。
- 使用 `looksLikeId` 进行“将其视为显式/原生目标 ID”的检查。
- 将 `resolveTarget` 用于特定于提供商的标准化后备，而不是用于广泛的目录搜索。
- 请将提供商原生的 ID（如聊天 ID、线程 ID、JID、句柄和房间 ID）保留在 `target` 值或特定于提供商的参数中，而不是通用 SDK 字段中。

## 基于配置的目录

从配置派生目录条目的插件应将该逻辑保留在插件内，并复用来自
`openclaw/plugin-sdk/directory-runtime` 的共享辅助函数。

当渠道需要基于配置的对等体/组时，请使用此功能，例如：

- 由允许列表驱动的私信对等体
- 配置的渠道/组映射
- 账户范围的静态目录回退

`directory-runtime` 中的共享辅助函数仅处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化辅助函数
- 构建 `ChannelDirectoryEntry[]`

特定于渠道的账户检查和 ID 规范化应保留在插件实现中。

## 提供商目录

提供商插件可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定义推理模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 相同的形状：

- 用于单个提供商条目的 `{ provider }`
- 用于多个提供商条目的 `{ providers }`

当插件拥有特定于提供商的模型 ID、基础 URL 默认值或身份验证受限的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw 内置隐式提供商的合并时机：

- `simple`：纯 API 密钥或环境驱动的提供商
- `profile`：当身份验证配置文件存在时出现的提供商
- `paired`：综合多个相关提供商条目的提供商
- `late`：最后一遍，在其他隐式提供商之后

在键冲突时，靠后的提供商获胜，因此插件可以使用相同的提供商 ID 有意覆盖内置提供商条目。

兼容性：

- `discovery` 仍作为传统别名工作
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

## 只读渠道检查

如果您的插件注册了一个渠道，建议与 `resolveAccount(...)` 一起实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。允许假定凭证
  已完全具体化，并在缺少所需机密时快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 和 doctor/config
  修复流程）不应仅为了描述配置而具体化运行时凭证。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性帐户状态。
- 保留 `enabled` 和 `configured`。
- 在适当时包含凭证源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 你不需要返回原始令牌值来报告只读可用性。
  返回 `tokenStatus: "available"`（以及匹配的源字段）对于状态式命令已足够。
- 当凭证通过 SecretRef 配置但在当前命令路径中不可用时，
  使用 `configured_unavailable`。

这允许只读命令报告“已配置但在当前命令路径中不可用”，
而不是崩溃或错误地将帐户报告为未配置。

## 包打包

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

每个条目成为一个插件。如果包列出了多个扩展，插件 ID
变为 `name/<fileBase>`。

如果您的插件导入 npm 依赖项，请将其安装在该目录中，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防护：每个 `openclaw.extensions` 条目在解析符号链接后必须保留在插件
目录内。转义包目录的条目将被拒绝。

安全提示：`openclaw plugins install` 使用 `npm install --omit=dev --ignore-scripts` 安装插件依赖项（无生命周期脚本，运行时无开发依赖项）。请保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个仅用于设置的轻量级模块。当 OpenClaw 需要为已禁用的渠道插件提供设置界面，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。当您的主插件入口还连接了工具、钩子或其他仅运行时代码时，这可以使启动和设置更加轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以让渠道插件在网关的预侦听启动阶段选择加入相同的 `setupEntry` 路径，即使该渠道已经配置过也是如此。

仅当 `setupEntry` 完全覆盖了网关开始侦听之前必须存在的启动界面时，才使用此选项。实际上，这意味着设置入口必须注册启动所依赖的每个渠道拥有的功能，例如：

- 渠道注册本身
- 在网关开始侦听之前必须可用的任何 HTTP 路由
- 在同一期间必须存在的任何网关方法、工具或服务

如果您的完整入口仍然拥有任何所需的启动功能，请不要启用此标志。请保持插件处于默认行为，并让 OpenClaw 在启动期间加载完整入口。

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

渠道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 宣传安装提示。这使核心目录保持数据独立。

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

OpenClaw 还可以合并**外部渠道目录**（例如，MPM 注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧式别名。

## Context engine 插件

Context engine 插件拥有用于摄取、组装和压缩的会话上下文编排能力。通过 `api.registerContextEngine(id, factory)` 从您的插件中注册它们，然后使用 `plugins.slots.contextEngine` 选择活动的引擎。

当您的插件需要替换或扩展默认的上下文管道，而不仅仅是添加内存搜索或钩子时，请使用此方法。

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

如果您的引擎**不**拥有压缩算法，请保留 `compact()` 的实现并显式地委托它：

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

当插件需要的行为不符合当前的 API 时，不要通过私有接入绕过插件系统。添加缺失的功能。

推荐顺序：

1. 定义核心契约
   决定核心应拥有哪些共享行为：策略、回退、配置合并、生命周期、面向渠道的语义和运行时辅助形状。
2. 添加类型化的插件注册/运行时表面
   使用最小有用的类型化功能表面扩展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 渠道/功能消费者
   渠道和功能插件应该通过核心使用新功能，而不是直接导入供应商的实现。
4. 注册供应商实现
   然后供应商插件针对该功能注册其后端。
5. 添加契约覆盖
   添加测试，以便所有权和注册形状随时间保持明确。

这就是 OpenClaw 在不针对某个提供商的世界观进行硬编码的情况下保持固执己见的方式。有关具体的文件清单和实际示例，请参阅 [功能手册](/en/tools/capability-cookbook)。

### 功能清单

添加新功能时，实现通常应同时触及这些表面：

- `src/<capability>/types.ts` 中的核心契约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时辅助程序
- 在 `src/plugins/types.ts` 中的插件 API 注册表面
- 在 `src/plugins/registry.ts` 中的插件注册表连线
- 在 `src/plugins/runtime/*` 中的插件运行时暴露，当功能/渠道插件需要使用它时
- 在 `src/test-utils/plugin-registration.ts` 中的捕获/测试辅助工具
- 在 `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- 在 `docs/` 中的操作员/插件文档

如果缺少其中一个表面，通常表明该功能尚未完全集成。

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

这使得规则保持简单：

- 核心拥有功能契约 + 编排
- 供应商插件拥有供应商实现
- 功能/渠道插件使用运行时辅助工具
- 契约测试明确所有权
