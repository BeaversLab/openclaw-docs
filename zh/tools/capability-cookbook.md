---
summary: "向 OpenClaw 添加新共享能力的指南"
read_when:
  - Adding a new core capability and plugin registration surface
  - Deciding whether code belongs in core, a vendor plugin, or a feature plugin
  - Wiring a new runtime helper for channels or tools
title: "能力指南"
---

# 能力指南

当 OpenClaw 需要一个新的领域（如图像生成、视频生成或某些未来的提供商支持的功能领域）时，请使用本指南。

规则如下：

- plugin = 所有权边界
- capability = 共享核心合约

这意味着你不应首先将提供商直接连接到渠道或工具中。首先应定义能力。

## 何时创建能力

当满足以下所有条件时，请创建新能力：

1. 多个提供商可能实现它
2. 渠道、工具或功能插件应在不关心提供商的情况下使用它
3. 核心需要拥有回退、策略、配置或交付行为

如果该工作仅针对提供商且尚不存在共享合约，请停止并先定义合约。

## 标准流程

1. 定义类型化的核心合约。
2. 为该合约添加插件注册。
3. 添加共享的运行时助手。
4. 连接一个真实的提供商插件作为验证。
5. 将功能/渠道使用者迁移到运行时助手上。
6. 添加合约测试。
7. 记录面向运维人员的配置和所有权模型。

## 代码位置

核心：

- 请求/响应类型
- 提供商注册表 + 解析
- 回退行为
- 配置架构以及标签/帮助信息
- 运行时助手接口

提供商插件：

- 提供商 API 调用
- 提供商身份验证处理
- 特定于提供商的请求规范化
- 能力实现的注册

功能/渠道插件：

- 调用 `api.runtime.*` 或匹配的 `plugin-sdk/*-runtime` 助手
- 从不直接调用提供商实现

## 文件清单

对于一项新能力，预期会涉及以下区域：

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
- 一个或多个 `extensions/<vendor>/...`
- config/docs/tests

## 示例：图像生成

图像生成遵循标准结构：

1. core 定义了 `ImageGenerationProvider`
2. core 暴露了 `registerImageGenerationProvider(...)`
3. core 暴露了 `runtime.imageGeneration.generate(...)`
4. `openai` 和 `google` 插件注册了供应商支持实现
5. 未来的供应商可以注册相同的合约而无需更改渠道/工具

配置键与视觉分析路由是分开的：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

保持这些分离，以便回退策略和策略保持明确。

## 审查清单

在发布新功能之前，请验证：

- 没有渠道/工具直接导入供应商代码
- 运行时辅助工具是共享路径
- 至少有一个合约测试断言了捆绑所有权
- 配置文档命名了新模型/配置键
- 插件文档解释了所有权边界

如果 PR 跳过功能层并将供应商行为硬编码到渠道/工具中，请将其退回并先定义合约。

import zh from "/components/footer/zh.mdx";

<zh />
