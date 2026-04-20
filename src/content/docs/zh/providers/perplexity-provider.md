---
title: "Perplexity"
summary: "Perplexity 网络搜索提供商设置（API 密钥、搜索模式、筛选）"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity（网络搜索提供商）

Perplexity 插件通过 Perplexity Search API 或经由 OpenRouter 的 Perplexity Sonar 提供网络搜索功能。

<Note>本页面介绍 Perplexity **提供商** 的配置。关于 Perplexity **工具**（智能体如何使用它），请参阅 [Perplexity 工具](/zh/tools/perplexity-search)。</Note>

| 属性     | 值                                                                     |
| -------- | ---------------------------------------------------------------------- |
| 类型     | 网络搜索提供商（非模型提供商）                                         |
| 认证     | `PERPLEXITY_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter） |
| 配置路径 | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

## 入门指南

<Steps>
  <Step title="设置 API 密钥">
    运行交互式网络搜索配置流程：

    ```bash
    openclaw configure --section web
    ```

    或直接设置密钥：

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="开始搜索">
    配置密钥后，智能体将自动使用 Perplexity 进行网络搜索。无需额外步骤。
  </Step>
</Steps>

## 搜索模式

该插件会根据 API 密钥前缀自动选择传输方式：

<Tabs>
  <Tab title="原生 Perplexity API (pplx-)">当您的密钥以 `pplx-` 开头时，OpenClaw 将使用原生 Perplexity 搜索 API。此传输方式返回结构化结果，并支持域名、语言 和日期过滤（请参阅下方的过滤选项）。</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">当您的密钥以 `sk-or-` 开头时，OpenClaw 将通过 OpenRouter 进行路由，使用 Perplexity Sonar 模型。此传输方式返回带有 引文的 AI 综合答案。</Tab>
</Tabs>

| 密钥前缀 | 传输方式                 | 功能                           |
| -------- | ------------------------ | ------------------------------ |
| `pplx-`  | 原生 Perplexity 搜索 API | 结构化结果、域名/语言/日期过滤 |
| `sk-or-` | OpenRouter (Sonar)       | 带引文的 AI 综合答案           |

## 原生 API 过滤

<Note>过滤选项仅在使用原生 Perplexity API （`pplx-` 密钥）时可用。OpenRouter/Sonar 搜索不支持这些参数。</Note>

使用原生 Perplexity API 时，搜索支持以下过滤器：

| 过滤器     | 描述                                 | 示例                                |
| ---------- | ------------------------------------ | ----------------------------------- |
| 国家/地区  | 2 个字母的国家/地区代码              | `us`, `de`, `jp`                    |
| 语言       | ISO 639-1 语言代码                   | `en`, `fr`, `zh`                    |
| 日期范围   | 时间窗口                             | `day`, `week`, `month`, `year`      |
| 域名过滤器 | 允许列表或拒绝列表（最多 20 个域名） | `example.com`                       |
| 内容预算   | 每个响应/每个页面的 Token 限制       | `max_tokens`, `max_tokens_per_page` |

## 高级说明

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保
    `PERPLEXITY_API_KEY` 对该进程可用。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对 launchd/systemd
    守护进程不可见，除非显式导入该环境。请在
    `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，以确保网关进程可以
    读取它。
    </Warning>

  </Accordion>

  <Accordion title="OpenRouter 代理设置">
    如果您希望通过 OpenRouter 路由 Perplexity 搜索，请设置
    `OPENROUTER_API_KEY`（前缀 `sk-or-`）而不是原生 Perplexity 密钥。
    OpenClaw 将自动检测前缀并切换到 Sonar 传输。

    <Tip>
    如果您已经拥有 OpenRouter 账户
    并希望跨多个提供商合并计费，OpenRouter 传输会非常有用。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Perplexity 搜索工具" href="/zh/tools/perplexity-search" icon="magnifying-glass">
    代理如何调用 Perplexity 搜索并解释结果。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    完整的配置参考，包括插件条目。
  </Card>
</CardGroup>
