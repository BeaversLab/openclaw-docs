---
summary: "用于向 OpenClaw 插件系统添加新共享功能的贡献者指南"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "添加功能（贡献者指南）"
sidebarTitle: "添加功能"
---

<Info>这是供 OpenClaw 核心开发者使用的**贡献者指南**。如果您正在 构建外部插件，请参阅[构建插件](/zh/plugins/building-plugins)。</Info>

当 OpenClaw 需要一个新的领域（例如图像生成、视频
生成或某些未来由供应商支持的功能领域）时，请使用本指南。

规则：

- 插件 = 所有权边界
- 功能 = 共享的核心契约

这意味着您不应首先将供应商直接连接到渠道或
工具。应从定义功能开始。

## 何时创建功能

当满足以下所有条件时，创建一个新功能：

1. 可能有不止一个供应商可以实现它
2. 渠道、工具或功能插件应该消费它，而无需关心
   具体的供应商
3. 核心需要拥有回退、策略、配置或交付行为

如果该工作仅针对供应商且尚不存在共享契约，请停下来并先
定义契约。

## 标准流程

1. 定义类型化的核心契约。
2. 为该契约添加插件注册。
3. 添加一个共享的运行时辅助工具。
4. 连接一个真实的供应商插件作为证明。
5. 将功能/渠道的使用方迁移到运行时辅助工具上。
6. 添加契约测试。
7. 记录面向操作员的配置和所有权模型。

## 各部分归属

核心：

- 请求/响应类型
- 提供商注册表 + 解析
- 回退行为
- 配置架构以及在嵌套对象、通配符、数组项和组合节点上传播的 `title` / `description` 文档元数据
- 运行时辅助工具接口

供应商插件：

- 供应商 API 调用
- 供应商身份验证处理
- 特定于供应商的请求规范化
- 功能实现的注册

功能/渠道插件：

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 辅助工具
- 绝不直接调用供应商实现

## 提供商和适配器接口

当行为属于模型提供商契约而非通用代理循环时，请使用提供商挂钩。示例包括传输选择后的提供商特定请求参数、身份验证配置文件首选项、提示叠加，以及模型/配置文件故障转移后的后续回退路由。

当行为属于正在执行回合的运行时时，请使用 agent harness 钩子。Harness 可以分类成功但不可用的尝试结果，例如空响应、仅推理或仅规划响应，以便外部模型回退策略可以做出重试决定。

保持两个接口均狭窄：

- core 拥有重试/回退策略
- 提供商 插件拥有特定于提供商的请求/身份验证/路由提示
- harness 插件拥有特定于运行时的尝试分类
- 第三方插件返回提示，而不是直接修改 core 状态

## 文件检查清单

对于一项新功能，预计需要涉及以下领域：

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
- 一个或多个捆绑的插件包
- config/docs/tests

## 示例：图像生成

图像生成遵循标准形态：

1. core 定义 `ImageGenerationProvider`
2. core 公开 `registerImageGenerationProvider(...)`
3. core 公开 `runtime.imageGeneration.generate(...)`
4. `openai`、`google`、`fal` 和 `minimax` 插件注册供应商支持的实现
5. 未来的供应商可以注册相同的合约，而无需更改渠道/工具

配置密钥与视觉分析路由是分开的：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

将它们分开，以便回退和策略保持明确。

## 审查检查清单

在发布新功能之前，请验证：

- 没有渠道/工具直接导入供应商代码
- 运行时助手是共享路径
- 至少有一个合约测试断言捆绑所有权
- 配置文档命名了新的模型/配置密钥
- 插件文档解释了所有权边界

如果 PR 跳过功能层并将供应商行为硬编码到渠道/工具中，请将其退回并首先定义合约。

## 相关

- [插件](/zh/tools/plugin)
- [创建技能](/zh/tools/creating-skills)
- [工具和插件](/zh/tools)
