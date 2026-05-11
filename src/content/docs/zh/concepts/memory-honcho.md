---
summary: "通过 Honcho 插件实现 AI 原生跨会话记忆"
title: "Honcho 记忆"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

[Honcho](https://honcho.dev) 为 OpenClaw 添加了 AI 原生记忆。它将对话持久化到专用服务，并随时间构建用户和代理模型，为您的代理提供超越工作区 Markdown 文件的跨会话上下文。

## 提供功能

- **跨会话记忆** -- 每一轮对话后都会持久化，因此上下文可以跨越会话重置、压缩和渠道切换保持传递。
- **用户建模** -- Honcho 为每个用户（偏好、事实、沟通风格）和代理（个性、习得行为）维护档案。
- **语义搜索** -- 搜索过去对话中的观察结果，而不仅仅是当前会话。
- **多代理感知** -- 父代理会自动跟踪生成的子代理，并将父代理添加为子会话中的观察者。

## 可用工具

Honcho 注册了代理可以在对话中使用的工具：

**数据检索（快速，无需 LLM 调用）：**

| 工具                        | 功能说明                             |
| --------------------------- | ------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示                 |
| `honcho_search_conclusions` | 对存储的结论进行语义搜索             |
| `honcho_search_messages`    | 跨会话查找消息（按发件人、日期筛选） |
| `honcho_session`            | 当前会话历史和摘要                   |

**问答（由 LLM 驱动）：**

| 工具         | 功能说明                                                                    |
| ------------ | --------------------------------------------------------------------------- |
| `honcho_ask` | 询问关于用户的信息。`depth='quick'` 用于查询事实，`'thorough'` 用于综合分析 |

## 入门指南

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示您输入 API 凭据，写入配置，并可选择迁移现有的工作区记忆文件。

<Info>Honcho 可以完全在本地运行（自托管）或通过 `api.honcho.dev` 的托管 API 运行。自托管选项不需要任何外部依赖。</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，将 `baseUrl` 指向您的本地服务器（例如 `http://localhost:8000`）并省略 API 密钥。

## 迁移现有记忆

如果您有现有的工作区记忆文件 (`USER.md`, `MEMORY.md`,
`IDENTITY.md`, `memory/`, `canvas/`)，`openclaw honcho setup` 会检测它们
并建议进行迁移。

<Info>迁移是非破坏性的 —— 文件会上传到 Honcho。原始文件 永远不会被删除或移动。</Info>

## 工作原理

在每轮 AI 回复之后，对话会持久化到 Honcho。用户和
代理的消息都会被观测，从而允许 Honcho 随着时间的推移构建和完善其模型。

在对话过程中，Honcho 工具会在 `before_prompt_build`
阶段查询服务，在模型看到提示词之前注入相关的上下文。这确保了
准确的轮次边界和相关的召回。

## Honcho 与内置记忆

|              | 内置 / QMD                  | Honcho                 |
| ------------ | --------------------------- | ---------------------- |
| **存储**     | 工作区 Markdown 文件        | 专用服务（本地或托管） |
| **跨会话**   | 通过记忆文件                | 自动，内置             |
| **用户建模** | 手动（写入 MEMORY.md）      | 自动配置文件           |
| **搜索**     | 向量 + 关键词（混合）       | 基于观测的语义搜索     |
| **多代理**   | 未跟踪                      | 父/子感知              |
| **依赖项**   | 无（内置）或 QMD 二进制文件 | 插件安装               |

Honcho 和内置记忆系统可以协同工作。当配置了 QMD 时，
除了 Honcho 的跨会话记忆外，还可以使用额外的工具搜索本地 Markdown 文件。

## CLI 命令

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## 延伸阅读

- [插件源代码](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文档](https://docs.honcho.dev)
- [Honcho OpenClaw 集成指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [记忆](/zh/concepts/memory) -- OpenClaw 记忆概述
- [上下文引擎](/zh/concepts/context-engine) -- 插件上下文引擎的工作原理

## 相关

- [记忆概述](/zh/concepts/memory)
- [内置记忆引擎](/zh/concepts/memory-builtin)
- [QMD 记忆引擎](/zh/concepts/memory-qmd)
