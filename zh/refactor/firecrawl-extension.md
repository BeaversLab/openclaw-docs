---
summary: "设计一个可选的 Firecrawl 扩展，用于增加搜索/抓取功能，而无需将 Firecrawl 硬连线到核心默认设置中"
read_when:
  - Designing Firecrawl integration work
  - Evaluating web_search/web_fetch plugin seams
  - Deciding whether Firecrawl belongs in core or as an extension
title: "Firecrawl 扩展设计"
---

# Firecrawl 扩展设计

## 目标

将 Firecrawl 作为一个 **可选扩展** 发布，添加以下功能：

- 供 Agent 使用的明确 Firecrawl 工具，
- 基于 Firecrawl 的可选 `web_search` 集成，
- 自托管支持，
- 比当前核心备用路径更强的安全默认设置，

且不将 Firecrawl 推入默认设置/新手引导路径。

## 为何采用此形态

最近的 Firecrawl 问题/PR 聚集为三类：

1. **发布/架构差异**
   - 尽管文档和运行时代码支持 `tools.web.fetch.firecrawl`，但仍有多个版本拒绝了它。
2. **安全加固**
   - 当前的 `fetchFirecrawlContent()` 仍使用原始 `fetch()` 发布到 Firecrawl 端点，而主要的 web-fetch 路径则使用 SSRF 防护。
3. **产品压力**
   - 用户希望使用 Firecrawl 原生的搜索/抓取流程，特别是对于自托管/私有设置。
   - 维护人员明确拒绝将 Firecrawl 深度连线到核心默认设置、设置流程和浏览器行为中。

这种组合倾向于采用扩展，而不是在默认核心路径中增加更多 Firecrawl 特定的逻辑。

## 设计原则

- **可选、供应商范围限定**：不自动启用，不劫持设置，不扩大默认工具配置文件。
- **扩展拥有 Firecrawl 特定配置**：优先使用插件配置，而不是再次扩大 `tools.web.*`。
- **第一天即有用**：即使核心 `web_search` / `web_fetch` 接缝保持不变也能工作。
- **安全优先**：端点获取使用与其他 Web 工具相同的受保护网络姿态。
- **对自托管友好**：配置 + 环境回退，显式的基础 URL，无仅限托管的假设。

## 建议的扩展

插件 ID：`firecrawl`

### MVP 功能

注册明确的工具：

- `firecrawl_search`
- `firecrawl_scrape`

稍后可选：

- `firecrawl_crawl`
- `firecrawl_map`

在首个版本中**不要**添加 Firecrawl 浏览器自动化功能。这是 PR #32543 中将 Firecrawl 过度拉入核心行为的部分，也引发了最多的维护担忧。

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

在首个版本中，扩展也可以**读取** `tools.web.fetch.firecrawl.*` 处的现有核心配置作为备用源，以便现有用户无需立即迁移。

写入路径保持为插件本地。不要继续扩展核心 Firecrawl 配置面。

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
- 返回标准化的、兼容 OpenClaw 的结果对象：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 可选 `content`
- 将结果内容包装为不受信任的外部内容
- 缓存键包含查询 + 相关提供商参数

为什么先使用显式工具：

- 无需更改 `tools.web.search.provider` 即可立即使用
- 避免当前的 schema/loader 限制
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
- 在切实可行的情况下，与 web 工具的预期共享缓存语义

为什么采用显式的抓取工具：

- 避开核心 `web_fetch` 中未解决的 `Readability -> Firecrawl -> basic HTML cleanup` 排序错误
- 为重度 JS 或受机器人保护的网站提供确定性的“始终使用 Firecrawl”路径

## 该扩展不应做的事情

- 不自动将 `browser`、`web_search` 或 `web_fetch` 添加到 `tools.alsoAllow`
- 在 `openclaw setup` 中没有默认的新手引导步骤
- 核心中没有 Firecrawl 特定的浏览器会话生命周期
- 在扩展 MVP 中不更改内置 `web_fetch` 的后备语义

## 阶段计划

### 阶段 1：仅限扩展，不更改核心架构

实施：

- `extensions/firecrawl/`
- 插件配置架构
- `firecrawl_search`
- `firecrawl_scrape`
- 针对配置解析、端点选择、缓存、错误处理和 SSRF 防护使用的测试

此阶段足以交付真实的用户价值。

### 阶段 2：可选的 `web_search` 提供商集成

仅在修复两个核心约束后才支持 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必须加载已配置/已安装的 web-search-提供商 插件，而不是硬编码的捆绑列表。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必须停止以阻止插件注册 ID 的方式硬编码提供商枚举。

推荐形式：

- 保留内置提供商的文档，
- 在运行时允许任何已注册的插件提供商 ID，
- 通过提供商插件或通用提供商包验证特定于提供商的配置。

### 阶段 3：可选的 `web_fetch` 提供商接口

仅当维护者希望特定于供应商的提取后端参与 `web_fetch` 时才执行此操作。

所需的核心补充：

- `registerWebFetchProvider` 或等效的提取后端接口

如果没有该接口，扩展应将 `firecrawl_scrape` 保留为显式工具，而不是尝试修补内置 `web_fetch`。

## 安全要求

扩展必须将 Firecrawl 视为**受信任的操作员配置端点**，但仍需加强传输安全：

- 对 Firecrawl 端点调用使用受 SSRF 保护的 fetch，而不是原始的 `fetch()`
- 使用与其他地方相同的受信任 Web 工具端点策略，保留自托管/私有网络兼容性
- 绝不记录 API 密钥
- 保持端点/基础 URL 解析的明确性和可预测性
- 将 Firecrawl 返回的内容视为不受信任的外部内容

这反映了 SSRF 加固 PR 背后的意图，而不假设 Firecrawl 是敌对的多租户表面。

## 为什么不是技能

该仓库已经关闭了一个 Firecrawl 技能 PR，转而使用 ClawHub 分发。这对于可选的用户安装提示工作流来说是可以的，但它不能解决：

- 确定性的工具可用性，
- 提供商级别的配置/凭据处理，
- 自托管端点支持，
- 缓存，
- 稳定的类型化输出，
- 对网络行为的安全审查。

这应该作为一个扩展，而不是仅限提示的技能。

## 成功标准

- 用户可以安装/启用一个扩展并获得可靠的 Firecrawl 搜索/抓取，而无需触及核心默认值。
- 自托管的 Firecrawl 可通过配置/环境变量回退工作。
- 扩展端点获取使用受保护的网络连接。
- 没有新的针对 Firecrawl 的核心新手引导/默认行为。
- 核心稍后可以采用原生插件 `web_search` / `web_fetch` 接缝，而无需重新设计扩展。

## 推荐的实施顺序

1. 构建 `firecrawl_scrape`
2. 构建 `firecrawl_search`
3. 添加文档和示例
4. 如果需要，通用化 `web_search` 提供商加载，以便扩展可以支持 `web_search`
5. 只有那时才考虑真正的 `web_fetch` 提供商接缝

import zh from "/components/footer/zh.mdx";

<zh />
