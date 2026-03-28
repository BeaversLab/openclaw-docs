---
title: "Perplexity (提供商)"
summary: "Perplexity 网络搜索提供商设置（API 密钥、搜索模式、筛选）"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity（网络搜索提供商）

Perplexity 插件通过 Perplexity Search API 或经由 OpenRouter 的 Perplexity Sonar 提供网络搜索功能。

<Note>本页面介绍 Perplexity **提供商** 的设置。关于 Perplexity **工具**（代理如何使用它），请参阅 [Perplexity 工具](/zh/tools/perplexity-search)。</Note>

- 类型：网络搜索提供商（而非模型提供商）
- 认证：`PERPLEXITY_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter）
- 配置路径：`plugins.entries.perplexity.config.webSearch.apiKey`

## 快速开始

1. 设置 API 密钥：

```bash
openclaw configure --section web
```

或直接设置：

```bash
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. 配置完成后，代理将自动使用 Perplexity 进行网络搜索。

## 搜索模式

插件根据 API 密钥前缀自动选择传输方式：

| 密钥前缀 | 传输方式                   | 功能                           |
| -------- | -------------------------- | ------------------------------ |
| `pplx-`  | 原生 Perplexity Search API | 结构化结果、域名/语言/日期筛选 |
| `sk-or-` | OpenRouter (Sonar)         | 带有引用的 AI 综合答案         |

## 原生 API 筛选

使用原生 Perplexity API（`pplx-` 密钥）时，搜索支持：

- **Country**：2字母国家代码
- **Language**：ISO 639-1 语言代码
- **Date range**：天、周、月、年
- **Domain filters**：允许列表/拒绝列表（最多 20 个域名）
- **Content budget**：`max_tokens`、`max_tokens_per_page`

## 环境说明

如果 Gateway 作为守护进程（launchd/systemd）运行，请确保
`PERPLEXITY_API_KEY` 对该进程可用（例如，位于
`~/.openclaw/.env` 中或通过 `env.shellEnv`）。
