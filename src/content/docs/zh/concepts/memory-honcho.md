---
title: "Honcho Memory"
summary: "通过 Honcho 插件实现 AI 原生跨会话记忆"
read_when:
  - You want persistent memory that works across sessions and channels
  - You want AI-powered recall and user modeling
---

# Honcho Memory

[Honcho](https://honcho.dev) 为 OpenClaw 增加了 AI 原生记忆功能。它会将对话持久化到专用服务中，并随时间推移构建用户和代理模型，从而为您的代理提供超越工作区 Markdown 文件的跨会话上下文。

## 提供的功能

- **跨会话记忆** -- 每轮对话后都会持久化，因此上下文可以在会话重置、压缩和渠道切换时保留。
- **用户建模** -- Honcho 为每个用户（偏好、事实、沟通风格）和代理（性格、习得行为）维护个人资料。
- **语义搜索** -- 搜索过去对话中的观察结果，而不仅仅是当前会话。
- **多代理感知** -- 父代理会自动跟踪生成的子代理，并将父代理作为观察者添加到子会话中。

## 可用工具

Honcho 注册了代理可以在对话中使用的工具：

**数据检索（快速，无 LLM 调用）：**

| 工具                        | 功能                                 |
| --------------------------- | ------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示                 |
| `honcho_search_conclusions` | 对存储的结论进行语义搜索             |
| `honcho_search_messages`    | 跨会话查找消息（按发送者、日期筛选） |
| `honcho_session`            | 当前会话历史记录和摘要               |

**问答（由 LLM 驱动）：**

| 工具         | 功能                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `honcho_ask` | 询问有关用户的问题。使用 `depth='quick'` 获取事实，使用 `'thorough'` 进行综合 |

## 入门指南

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示您输入 API 凭据，写入配置，并可选择迁移现有的工作区记忆文件。

<Info>Honcho 可以完全在本地运行（自托管），也可以通过 `api.honcho.dev` 的托管 API 运行。自托管选项不需要外部依赖。</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 之下：

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
并提示进行迁移。

<Info>迁移是非破坏性的——文件会被上传到 Honcho。原始文件 永远不会被删除或移动。</Info>

## 工作原理

在每次 AI 轮次之后，对话会被持久化到 Honcho。用户和
代理的消息都会被观察，允许 Honcho 随着时间的推移构建和优化其模型。

在对话期间，Honcho 工具在 `before_prompt_build`
阶段查询服务，在模型看到提示之前注入相关上下文。这确保了
准确的轮次边界和相关召回。

## Honcho 与内置记忆

|              | 内置 / QMD                  | Honcho                 |
| ------------ | --------------------------- | ---------------------- |
| **存储**     | 工作区 Markdown 文件        | 专用服务（本地或托管） |
| **跨会话**   | 通过记忆文件                | 自动，内置             |
| **用户建模** | 手动（写入 MEMORY.md）      | 自动档案               |
| **搜索**     | 向量 + 关键字（混合）       | 基于观察的语义搜索     |
| **多代理**   | 未跟踪                      | 父子感知               |
| **依赖项**   | 无（内置）或 QMD 二进制文件 | 插件安装               |

Honcho 和内置记忆系统可以协同工作。当配置了 QMD 时，
除了 Honcho 的跨会话记忆外，还会提供额外的工具来搜索本地 Markdown 文件。

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
