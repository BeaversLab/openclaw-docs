---
summary: "用于 web_fetch 的 Firecrawl 兜底（反机器人 + 缓存抽取）"
read_when:
  - 你想使用 Firecrawl 支持的网页抽取
  - 你需要 Firecrawl API key
  - 你想为 web_fetch 启用反机器人抽取
---

# Firecrawl

OpenClaw 可以将 **Firecrawl** 作为 `web_fetch` 的兜底抽取器。它是托管的内容抽取服务，支持绕过机器人检测与缓存，有助于处理 JS 重站点或阻挡普通 HTTP 抓取的页面。

## 获取 API key

1) 创建 Firecrawl 账号并生成 API key。
2) 将其写入配置或在 gateway 环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

说明：
- 当存在 API key 时，`firecrawl.enabled` 默认 true。
- `maxAgeMs` 控制可接受的缓存结果最大年龄（毫秒）。默认 2 天。

## Stealth / 反机器人绕过

Firecrawl 提供 **代理模式** 参数用于绕过机器人检测（`basic`、`stealth` 或 `auto`）。
OpenClaw 对 Firecrawl 请求总是使用 `proxy: "auto"` 并设置 `storeInCache: true`。
如果省略 proxy，Firecrawl 默认为 `auto`。`auto` 会在 basic 尝试失败时改用 stealth 代理，这可能比仅 basic 抓取消耗更多额度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 抽取顺序：
1) Readability（本地）
2) Firecrawl（若配置）
3) 基础 HTML 清理（最后兜底）

完整的 web 工具设置见 [Web 工具](/zh/tools/web)。
