---
summary: "向 OpenClaw 插件系统添加新共享功能的贡献者指南"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "添加功能（贡献者指南）"
sidebarTitle: "添加功能"
---

<Info>这是针对 OpenClaw 核心开发者的**贡献者指南**。如果您正在 构建外部插件，请参阅[构建插件](/zh/plugins/building-plugins)。 如需深入了解架构参考（能力模型、所有权、加载管道、运行时辅助工具），请参阅[插件内部机制](/zh/plugins/architecture)。</Info>

当 OpenClaw 需要一个新的共享领域（例如嵌入、图像
生成、视频生成或某些未来的供应商支持的功能区域）时，请使用本文档。

规则：

- **plugin** = 所有权边界
- **capability** = 共享核心契约

不要开始将供应商直接连接到渠道或工具。首先从定义功能开始。

## 何时创建功能

当**所有**以下条件都为真时，创建一个新功能：

1. 可能有多个供应商可以实现它。
2. 渠道、工具或功能插件应该消费它，而无需关心供应商。
3. 核心需要拥有回退、策略、配置或交付行为。

如果工作仅针对特定供应商且尚不存在共享契约，请停止并先定义契约。

## 标准流程

1. 定义类型化的核心契约。
2. 为该契约添加插件注册。
3. 添加共享的运行时助手。
4. 连接一个真实的供应商插件作为证明。
5. 将功能/渠道使用者迁移到运行时助手上。
6. 添加契约测试。
7. 记录面向操作员的配置和所有权模型。

## 内容归属

**核心：**

- 请求/响应类型。
- 提供者注册表 + 解析。
- 回退行为。
- 在嵌套对象、通配符、数组项和组合节点上具有传播 `title` / `description` 文档元数据的配置架构。
- 运行时助手接口。

**供应商插件：**

- 供应商 API 调用。
- 供应商身份验证处理。
- 供应商特定的请求规范化。
- 功能实现的注册。

**功能/渠道插件：**

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 辅助函数。
- 绝不直接调用供应商实现。

## 提供商和工具接缝

当行为属于模型提供商契约而非通用代理循环时，请使用 **提供商 hooks**。示例包括传输选择后的提供商特定请求参数、身份验证配置文件首选项、提示覆盖，以及模型/配置文件故障转移后的后续回退路由。

当行为属于正在执行轮次的运行时时，请使用 **agent harness hooks**。工具可以将成功但无法使用的尝试结果（例如空响应、仅推理响应或仅规划响应）进行分类，以便外部模型回退策略可以做出重试决定。

保持两个接缝狭窄：

- 核心拥有重试/回退策略。
- 提供商插件拥有提供商特定的请求/身份验证/路由提示。
- 工具插件拥有运行时特定的尝试分类。
- 第三方插件返回提示，而不是直接改变核心状态。

## 文件清单

对于新功能，预计需要涉及以下领域：

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- 一个或多个捆绑的插件包。
- 配置、文档、测试。

## 实战示例：图像生成

图像生成遵循标准形态：

1. 核心定义 `ImageGenerationProvider`。
2. 核心暴露 `registerImageGenerationProvider(...)`。
3. 核心暴露 `runtime.imageGeneration.generate(...)`。
4. `openai`、`google`、`fal` 和 `minimax` 插件注册供应商支持的实现。
5. 未来的供应商注册相同的契约，而无需更改 channels/tools。

配置键故意与视觉分析路由分开：

- `agents.defaults.imageModel` 分析图像。
- `agents.defaults.imageGenerationModel` 生成图像。

将它们分开，以便回退和策略保持明确。

## 嵌入提供商

对可重用的向量嵌入提供商使用 `embeddingProviders`。此契约
的设计范围故意比内存更广：工具、搜索、检索、导入程序或
未来的功能插件可以在不依赖内存
引擎的情况下使用嵌入。

内存搜索可以使用通用的 `embeddingProviders`。旧的
`memoryEmbeddingProviders` 合约已弃用，仅作为现有的
特定于内存的提供商迁移时的兼容性支持；新的可重用嵌入提供商应使用
`embeddingProviders`。

## 审查清单

在发布新功能之前，请验证：

- 没有渠道/工具直接导入供应商代码。
- 运行时助手是共享路径。
- 至少有一个契约测试断言了打包的所有权。
- 配置文档命名了新的模型/配置键。
- 插件文档解释了所有权边界。

如果某个 PR 跳过了能力层并将供应商行为硬编码到渠道/工具中，请将其退回并首先定义契约。

## 相关

- [插件内部机制](/zh/plugins/architecture) — 能力模型、所有权、加载管道、运行时辅助工具。
- [构建插件](/zh/plugins/building-plugins) — 第一个插件教程。
- [SDK 概述](/zh/plugins/sdk-overview) — 导入映射和注册 API 参考。
- [创建技能](/zh/tools/creating-skills) — 伴随的贡献者界面。
