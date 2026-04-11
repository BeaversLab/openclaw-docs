---
summary: "通过 Coding Plan 搜索 API 进行 MiniMax 搜索"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Coding Plan key
  - You want MiniMax CN/global search host guidance
title: "MiniMax 搜索"
---

# MiniMax 搜索

OpenClaw 通过 MiniMax
Coding Plan search API 支持 MiniMax 作为 `web_search` 提供商。它返回带有标题、URL、
摘要和相关查询的结构化搜索结果。

## 获取 Coding Plan 密钥

<Steps>
  <Step title="Create a key">
    从 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制
    MiniMax Coding Plan 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 还接受 `MINIMAX_CODING_API_KEY` 作为环境变量别名。当 `MINIMAX_API_KEY`
已指向 coding-plan 令牌时，仍会将其作为兼容性后备读取。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if MINIMAX_CODE_PLAN_KEY is set
            region: "global", // or "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway(网关) 环境中设置 `MINIMAX_CODE_PLAN_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

## 区域选择

MiniMax 搜索使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中国：`https://api.minimaxi.com/v1/coding_plan/search`

如果未设置 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 将按
以下顺序解析区域：

1. `tools.web.search.minimax.region` / 插件拥有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着中国新手引导或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`
会自动将 MiniMax 搜索保持在 CN 主机上。

即使您通过 OAuth `minimax-portal` 路径验证了 MiniMax，
Web 搜索仍注册为提供商 ID `minimax`；OAuth 提供商基础 URL
仅用作 CN/全球主机选择的区域提示。

## 支持的参数

MiniMax 搜索支持：

- `query`
- `count`（OpenClaw 会将返回的结果列表修剪为请求的数量）

目前不支持特定于提供商的过滤器。

## 相关

- [Web Search overview](/en/tools/web) -- 所有提供商和自动检测
- [MiniMax](/en/providers/minimax) -- 模型、图像、语音和身份验证设置
