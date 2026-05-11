---
summary: "针对场景目录和测试工具整合的QA重构计划"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "QA 重构"
---

状态：基础迁移已完成。

## 目标

将 OpenClaw QA 从分割定义模型转变为单一事实来源：

- 场景元数据
- 发送给模型的提示词
- 设置和清理
- 测试线束逻辑
- 断言和成功标准
- 工件和报告提示

期望的最终状态是一个通用的 QA 测试线束，它加载强大的场景定义文件，而不是在 TypeScript 中硬编码大多数行为。

## 当前状态

主要的事实来源现在位于 `qa/scenarios/index.md` 中，外加 `qa/scenarios/<theme>/*.md` 下的每个场景对应一个文件。

已实现：

- `qa/scenarios/index.md`
  - 规范的 QA 包元数据
  - 操作员身份
  - 启动任务
- `qa/scenarios/<theme>/*.md`
  - 每个场景一个 markdown 文件
  - 场景元数据
  - 处理程序绑定
  - 特定场景的执行配置
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 包解析器 + zod 验证
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 从 markdown 包渲染计划
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - seeds 生成的兼容性文件加上 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 通过 markdown 定义的 handler 绑定来选择可执行的场景
- QA 总线协议 + UI
  - 通用的内联附件用于图像/视频/音频/文件渲染

剩余的分割部分：

- `extensions/qa-lab/src/suite.ts`
  - 仍然拥有大多数可执行的自定义 handler 逻辑
- `extensions/qa-lab/src/report.ts`
  - 仍然从运行时输出派生报告结构

因此事实来源的分割是固定的，但执行仍然主要由 handler 支持，而不是完全声明式的。

## 真实场景表面看起来像什么

查看当前的套件显示了几种不同的场景类别。

### 简单交互

- 渠道基线
- 私信基线
- 线程化跟进
- 模型切换
- 批准后续操作
- 反应/编辑/删除

### 配置和运行时变更

- 配置补丁技能禁用
- 配置应用重启唤醒
- 配置重启能力翻转
- 运行时清单漂移检查

### 文件系统和仓库断言

- 源/docs 发现报告
- 构建 Lobster 入侵者
- 生成的图像工件查找

### 内存编排

- 内存回忆
- 渠道上下文中的内存工具
- 内存失败回退
- 会话记忆排序
- 线程记忆隔离
- 记忆梦境扫描

### 工具和插件集成

- MCP 插件工具调用
- 技能可见性
- 技能热安装
- 原生图像生成
- 图像往返
- 从附件理解图像

### 多轮次和多参与者

- 子代理交接
- 子代理分发综合
- 重启恢复风格流

这些类别很重要，因为它们驱动了 DSL 的需求。一个简单的提示词 + 预期文本列表是不够的。

## 方向

### 单一真实来源

使用 `qa/scenarios/index.md` 加上 `qa/scenarios/<theme>/*.md` 作为编写的单一真实来源。

该包应保持：

- 在审查中人类可读
- 机器可解析
- 足够丰富以驱动：
  - 套件执行
  - QA 工作区引导
  - QA Lab UI 元数据
  - 文档/发现提示词
  - 报告生成

### 首选编写格式

使用 Markdown 作为顶层格式，并在其中包含结构化的 YAML。

推荐的形状：

- YAML 前置内容
  - id
  - title
  - surface
  - tags
  - 文档引用
  - 代码引用
  - 模型/提供商覆盖
  - 先决条件
- 散文部分
  - 目标
  - 备注
  - 调试提示
- 围栏 YAML 块
  - setup
  - steps
  - 断言
  - 清理

这提供了：

- 比巨大的 JSON 更好的 PR 可读性
- 比纯 YAML 更丰富的上下文
- 严格解析和 zod 验证

原始 JSON 仅作为中间生成的形式是可以接受的。

## 建议的场景文件形状

示例：

````md
---
id: image-generation-roundtrip
title: Image generation roundtrip
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# Objective

Verify generated media is reattached on the follow-up turn.

# Setup

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: 会话.create
  key: agent:qa:image-roundtrip
```

# Steps

```yaml scenario.steps
- action: agent.send
  会话: agent:qa:image-roundtrip
  message: |
    Image generation check: generate a QA lighthouse image and summarize it in one short sentence.
- action: artifact.capture
  kind: generated-image
  promptSnippet: Image generation check
  saveAs: lighthouseImage
- action: agent.send
  会话: agent:qa:image-roundtrip
  message: |
    Roundtrip image inspection check: describe the generated lighthouse attachment in one short sentence.
  attachments:
    - fromArtifact: lighthouseImage
```

# Expect

```yaml scenario.expect
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: 往返式图像检查
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```
````

## 运行器（Runner）必须覆盖的 DSL 功能

基于当前的测试套件，通用运行器需要的不仅仅是执行 Prompt。

### 环境和设置操作

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Agent 轮次操作

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### 配置和运行时操作

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### 文件和制品（Artifact）操作

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### 内存和定时（Cron）操作

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP 操作

- `mcp.callTool`

### 断言

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## 变量和制品引用

DSL 必须支持保存输出并在后续引用。

当前套件中的示例：

- 创建一个线程，然后复用 `threadId`
- 创建一个会话，然后重用 `sessionKey`
- 生成一张图片，然后在下一轮中附加该文件
- 生成一个唤醒标记字符串，然后断言它稍后会出现

所需能力：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 针对路径、会话密钥、线程 ID、标记、工具输出的类型化引用

如果没有变量支持，测试框架将不断把场景逻辑泄露回 TypeScript。

## 应该保留什么作为逃生舱

在第 1 阶段，完全纯粹的声明式运行器是不现实的。

某些场景本质上是重度编排的：

- 记忆 dreaming sweep
- 配置应用重启唤醒
- 配置重启功能切换
- 通过时间戳/路径解析生成的图像工件
- discovery-report 评估

这些目前应该使用显式的自定义处理程序。

建议规则：

- 85-90% 声明式
- 针对剩余困难部分的显式 `customHandler` 步骤
- 仅限已命名且有文档记录的自定义处理程序
- 场景文件中没有匿名内联代码

这既保持了通用引擎的整洁，同时又允许取得进展。

## 架构变更

### 当前

场景 Markdown 已经是以下内容的单一事实来源：

- 套件执行
- 工作区引导文件
- QA Lab UI 场景目录
- 报告元数据
- 发现提示

生成兼容性：

- 已植入的工作区仍然包含 `QA_KICKOFF_TASK.md`
- 已植入的工作区仍然包含 `QA_SCENARIO_PLAN.md`
- 已植入的工作区现在还包括 `QA_SCENARIOS.md`

## 重构计划

### 第 1 阶段：加载器和架构

完成。

- 添加了 `qa/scenarios/index.md`
- 将场景拆分为 `qa/scenarios/<theme>/*.md`
- 添加了命名 Markdown YAML 包内容的解析器
- 使用 zod 进行验证
- 将使用者切换到解析后的包
- 移除了仓库级别的 `qa/seed-scenarios.json` 和 `qa/QA_KICKOFF_TASK.md`

### 第 2 阶段：通用引擎

- 将 `extensions/qa-lab/src/suite.ts` 拆分为：
  - 加载器
  - 引擎
  - 动作注册表
  - 断言注册表
  - 自定义处理程序
- 将现有的辅助函数保留为引擎操作

交付成果：

- 引擎执行简单的声明式场景

从主要包含 prompt + wait + assert 的场景开始：

- 线程化跟进
- 基于附件的图像理解
- 技能可见性和调用
- 渠道基线

交付成果：

- 首批通过通用引擎交付的真实 markdown 定义场景

### 阶段 4：迁移中等场景

- 图像生成往返
- 渠道上下文中的内存工具
- 会话内存排序
- 子代理交接
- 子代理分发合成

交付成果：

- 变量、制品、工具断言、请求日志断言已得到验证

### 阶段 5：将困难场景保留在自定义处理程序上

- 内存回忆扫描
- 配置应用重启唤醒
- 配置重启能力翻转
- 运行时清单漂移

交付成果：

- 相同的编写格式，但在需要的地方使用显式的自定义步骤块

### 阶段 6：删除硬编码的场景映射

一旦打包覆盖范围足够好：

- 从 `extensions/qa-lab/src/suite.ts` 中移除大多数特定于场景的 TypeScript 分支

## 模拟 Slack / 富媒体支持

当前的 QA 总线是以文本为主的。

相关文件：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

今天 QA 总线支持：

- 文本
- 表情回应
- 线程

它尚未对内联媒体附件进行建模。

### 所需的传输协议

添加一个通用的 QA 总线附件模型：

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
```

然后将 `attachments?: QaBusAttachment[]` 添加到：

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### 为何先通用化

不要构建仅限 Slack 的媒体模型。

而是：

- 一个通用的 QA 传输模型
- 基于该模型的多个渲染器
  - 当前的 QA 实验室聊天
  - 未来的模拟 Slack Web
  - 任何其他模拟传输视图

这可以防止重复逻辑，并使媒体场景保持与传输无关。

### 需要的 UI 工作

更新 QA UI 以渲染：

- 内联图像预览
- 内联音频播放器
- 内联视频播放器
- 文件附件芯片

当前的 UI 已经可以渲染线程和表情回应，因此附件渲染应该分层到相同的消息卡模型上。

### 由媒体传输启用的场景工作

一旦附件通过 QA 总线流动，我们就可以添加更丰富的模拟聊天场景：

- 模拟 Slack 中的内联图像回复
- 音频附件理解
- 视频附件理解
- 混合附件排序
- 保留媒体的线程回复

## 建议

下一个实现块应该是：

1. 添加 markdown 场景加载器 + zod 模式
2. 从 markdown 生成当前目录
3. 首先迁移几个简单场景
4. 添加通用 QA 总线连接支持
5. 在 QA UI 中渲染内联图像
6. 然后扩展到音频和视频

这是验证两个目标的最小路径：

- 通用 markdown 定义的 QA
- 更丰富的模拟消息传递界面

## 未决问题

- 场景文件是否应允许嵌入带有变量插值的 markdown 提示模板
- 设置/清理应该是命名部分还是仅是有序的操作列表
- 工件引用在模式中应该是强类型还是基于字符串
- 自定义处理程序应该位于一个注册表中还是每个界面一个注册表
- 生成的 JSON 兼容性文件在迁移期间是否应保持签入状态

## 相关内容

- [QA E2E automation](/zh/concepts/qa-e2e-automation)
