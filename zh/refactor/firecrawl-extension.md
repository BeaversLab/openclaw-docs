---
summary: "Design for an opt-in Firecrawl extension that adds search/scrape value without hardwiring Firecrawl into core defaults"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl Extension Design"
---

# Firecrawl Extension Design

## Goal

Ship Firecrawl as an **opt-in extension** that adds:

- explicit Firecrawl tools for agents,
- optional Firecrawl-backed `web_search` integration,
- self-hosted support,
- stronger security defaults than the current core fallback path,

without pushing Firecrawl into the default setup/新手引导 path.

## Why this shape

Recent Firecrawl issues/PRs cluster into three buckets:

1. **Release/schema drift**
   - Several releases rejected `tools.web.fetch.firecrawl` even though docs and runtime code supported it.
2. **Security hardening**
   - Current `fetchFirecrawlContent()` still posts to the Firecrawl endpoint with raw `fetch()`, while the main web-fetch path uses the SSRF guard.
3. **Product pressure**
   - Users want Firecrawl-native search/scrape flows, especially for self-hosted/private setups.
   - Maintainers explicitly rejected wiring Firecrawl deeply into core defaults, setup flow, and browser behavior.

That combination argues for an extension, not more Firecrawl-specific logic in the default core path.

## Design principles

- **Opt-in, vendor-scoped**: no auto-enable, no setup hijack, no default 工具-profile widening.
- **Extension owns Firecrawl-specific config**: prefer plugin config over growing `tools.web.*` again.
- **Useful on day one**: works even if core `web_search` / `web_fetch` seams stay unchanged.
- **Security-first**: endpoint fetches use the same guarded networking posture as other web tools.
- **Self-hosted-friendly**: config + env fallback, explicit base URL, no hosted-only assumptions.

## Proposed extension

Plugin id: `firecrawl`

### MVP capabilities

Register explicit tools:

- `firecrawl_search`
- `firecrawl_scrape`

Optional later:

- `firecrawl_crawl`
- `firecrawl_map`

在第一个版本中**不要**添加 Firecrawl 浏览器自动化。这是 PR #32543 中将 Firecrawl 过度拉入核心行为并引起最大维护关注的部分。

## 配置形状

使用插件范围的配置：

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          apiKey: "FIRECRAWL_API_KEY",
          baseUrl: "https://api.firecrawl.dev",
          timeoutSeconds: 60,
          maxAgeMs: 172800000,
          proxy: "auto",
          storeInCache: true,
          onlyMainContent: true,
          search: {
            enabled: true,
            defaultLimit: 5,
            sources: ["web"],
            categories: [],
            scrapeResults: false,
          },
          scrape: {
            formats: ["markdown"],
            fallbackForWebFetchLikeUse: false,
          },
        },
      },
    },
  },
}
```

### 凭证解析

优先级：

1. `plugins.entries.firecrawl.config.apiKey`
2. `FIRECRAWL_API_KEY`

基础 URL 优先级：

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### 兼容性桥接

在第一个版本中，扩展可能还会**读取** `tools.web.fetch.firecrawl.*` 处的现有核心配置作为备用源，以便现有用户无需立即迁移。

写入路径保持插件本地化。不要继续扩展核心 Firecrawl 配置表面。

## 工具设计

### `firecrawl_search`

输入：

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

行为：

- 调用 Firecrawl `v2/search`
- 返回标准化的 OpenClaw 友好的结果对象：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 可选的 `content`
- 将结果内容包装为不受信任的外部内容
- 缓存键包含查询 + 相关提供商参数

为什么首选显式工具：

- 无需更改 `tools.web.search.provider` 即可立即使用
- 避免当前的架构/加载器约束
- 立即为用户提供 Firecrawl 价值

### `firecrawl_scrape`

输入：

- `url`
- `formats`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

行为：

- 调用 Firecrawl `v2/scrape`
- 返回 markdown/文本以及元数据：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以与 `web_fetch` 相同的方式包装提取的内容
- 在可行的情况下，与 Web 工具的预期共享缓存语义

为何使用显式抓取工具：

- 规避核心 `web_fetch` 中未解决的 `Readability -> Firecrawl -> basic HTML cleanup` 排序错误
- 为重度 JS 或受爬虫保护的网站提供一条确定性的“始终使用 Firecrawl”路径

## 扩展不应做的事情

- 不自动将 `browser`、`web_search` 或 `web_fetch` 添加到 `tools.alsoAllow`
- 在 `openclaw setup` 中没有默认的新手引导步骤
- 核心中没有 Firecrawl 特定的浏览器会话生命周期
- 在扩展 MVP 中不更改内置 `web_fetch` 回退语义

## 阶段计划

### 阶段 1：仅限扩展，不做核心架构更改

实现：

- `extensions/firecrawl/`
- 插件配置架构
- `firecrawl_search`
- `firecrawl_scrape`
- 针对配置解析、端点选择、缓存、错误处理和 SSRF 防护使用的测试

此阶段足以交付真实的用户价值。

### 阶段 2：可选的 `web_search` 提供商集成

仅在修复两个核心约束后支持 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必须加载已配置/已安装的 web-search-提供商 插件，而不是硬编码的捆绑列表。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必须停止以阻碍插件注册 ID 的方式硬编码提供商枚举。

推荐形状：

- 保留内置提供商的文档记录，
- 在运行时允许任何已注册的插件提供商 ID，
- 通过提供商插件或通用提供商包来验证特定于提供商的配置。

### 阶段 3：可选的 `web_fetch` 提供商接缝

仅当维护者希望特定于供应商的获取后端参与 `web_fetch` 时才执行此操作。

需要添加的核心功能：

- `registerWebFetchProvider` 或等效的获取后端接缝

如果没有该接缝，扩展应将 `firecrawl_scrape` 保留为显式工具，而不是尝试修补内置的 `web_fetch`。

## 安全要求

扩展必须将 Firecrawl 视为**受信任的操作员配置端点**，但仍需强化传输：

- 对 Firecrawl 端点调用使用受 SSRF 保护的 fetch，而不是原始的 `fetch()`
- 使用与其他地方相同的受信任网络工具端点策略，以保留自托管/专用网络兼容性
- 切勿记录 API 密钥
- 保持端点/基础 URL 解析的显式和可预测性
- 将 Firecrawl 返回的内容视为不受信任的外部内容

这反映了 SSRF 加固 PR 背后的意图，而不假设 Firecrawl 是敌对的多租户表面。

## 为什么不是技能（skill）

该仓库已经关闭了一个 Firecrawl 技能 PR，转而支持 ClawHub 分发。这对于可选的用户安装的提示工作流来说是可以的，但它不能解决：

- 确定性的工具可用性，
- 提供商级别的配置/凭证处理，
- 自托管端点支持，
- 缓存，
- 稳定的类型化输出，
- 对网络行为的安全审查。

这应该属于扩展，而不仅仅是提示技能。

## 成功标准

- 用户可以安装/启用一个扩展并获得可靠的 Firecrawl 搜索/抓取功能，而无需触及核心默认值。
- 自托管的 Firecrawl 可通过配置/环境变量回退工作。
- 扩展端点获取使用受保护的网络。
- 没有新的 Firecrawl 特定的核心新手引导/默认行为。
- 核心以后可以采用原生插件 `web_search` / `web_fetch` 接缝，而无需重新设计扩展。

## 推荐的实现顺序

1. 构建 `firecrawl_scrape`
2. 构建 `firecrawl_search`
3. 添加文档和示例
4. 如果需要，通用化 `web_search` 提供商加载，以便扩展可以支持 `web_search`
5. 只有在那时才考虑真正的 `web_fetch` 提供商接缝

import en from "/components/footer/en.mdx";

<en />
