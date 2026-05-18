---
summary: "Perplexity 网络搜索提供商设置（API 密钥、搜索模式、筛选）"
title: "Perplexity"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

Perplexity 插件通过 Perplexity Search API 或通过 OpenRouter 的 Perplexity Sonar 提供网络搜索功能。

<Note>This page is the Perplexity **提供商** setup. For the Perplexity **工具** (how the agent uses it), see [Perplexity 工具](/zh/tools/perplexity-search).</Note>

| 属性     | 值                                                                     |
| -------- | ---------------------------------------------------------------------- |
| 类型     | 网络搜索提供商（不是模型提供商）                                       |
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
    配置密钥后，代理将自动使用 Perplexity 进行网络搜索。无需其他步骤。
  </Step>
</Steps>

## 搜索模式

插件根据 API 密钥前缀自动选择传输方式：

<Tabs>
  <Tab title="原生 Perplexity API (pplx-)">当您的密钥以 `pplx-` 开头时，OpenClaw 使用原生 Perplexity Search API。此传输方式返回结构化结果并支持域名、语言 和日期筛选（请参阅下方的筛选选项）。</Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">当您的密钥以 `sk-or-` 开头时，OpenClaw 通过 OpenRouter 使用 Perplexity Sonar 模型进行路由。此传输方式返回带有 引用的 AI 合成答案。</Tab>
</Tabs>

| 密钥前缀 | 传输方式                   | 功能                           |
| -------- | -------------------------- | ------------------------------ |
| `pplx-`  | 原生 Perplexity Search API | 结构化结果、域名/语言/日期筛选 |
| `sk-or-` | OpenRouter (Sonar)         | 带有引用的 AI 合成答案         |

## 原生 API 筛选

<Note>筛选选项仅在使用原生 Perplexity API (`pplx-` key) 时可用。OpenRouter/Sonar 搜索不支持这些参数。</Note>

当使用原生 Perplexity API 时，搜索支持以下筛选器：

| 筛选器     | 描述                                 | 示例                                |
| ---------- | ------------------------------------ | ----------------------------------- |
| 国家       | 两位字母国家代码                     | `us`, `de`, `jp`                    |
| 语言       | ISO 639-1 语言代码                   | `en`, `fr`, `zh`                    |
| 日期范围   | 时间范围窗口                         | `day`, `week`, `month`, `year`      |
| 域名筛选器 | 允许列表或拒绝列表（最多 20 个域名） | `example.com`                       |
| 内容预算   | 每个响应/每个页面的 Token 限制       | `max_tokens`, `max_tokens_per_page` |

## 高级配置

<AccordionGroup>
  <Accordion title="Environment variable for daemon processes">
    If the OpenClaw Gateway(网关) runs as a daemon (launchd/systemd), make sure
    `PERPLEXITY_API_KEY` is available to that process.

    <Warning>
    A key exported only in an interactive shell will not be visible to a
    launchd/systemd daemon unless that environment is explicitly imported. Set
    the key in `~/.openclaw/.env` or via `env.shellEnv` to ensure the gateway
    process can read it.
    </Warning>

  </Accordion>

  <Accordion title="OpenRouter proxy setup">
    If you prefer to route Perplexity searches through OpenRouter, set an
    `OPENROUTER_API_KEY` (prefix `sk-or-`) instead of a native Perplexity key.
    OpenClaw will detect the prefix and switch to the Sonar transport
    automatically.

    <Tip>
    The OpenRouter transport is useful if you already have an OpenRouter account
    and want consolidated billing across multiple providers.
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Perplexity search 工具" href="/zh/tools/perplexity-search" icon="magnifying-glass">
    代理如何调用 Perplexity 搜索并解读结果。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    包括插件条目在内的完整配置参考。
  </Card>
</CardGroup>
