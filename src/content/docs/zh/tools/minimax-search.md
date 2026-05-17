---
summary: "MiniMaxAPI通过 Token Plan 搜索 API 进行 MiniMax 搜索"
read_when:
  - You want to use MiniMax for web_search
  - You need a MiniMax Token Plan key or OAuth token
  - You want MiniMax CN/global search host guidance
title: "MiniMax 搜索"
---

OpenClaw 通过 MiniMax
Token Plan 搜索 API 支持 MiniMax 作为 OpenClawMiniMax`web_search`MiniMaxAPI 提供商。它返回包含标题、URL、
片段和相关查询的结构化搜索结果。

## 获取 Token Plan 凭证

<Steps>
  <Step title="Create a key">
    从 [MiniMax 平台](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制 MiniMax Token Plan 密钥。
    OAuth 设置可以改为复用 `MINIMAX_OAUTH_TOKEN`。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 还接受 OpenClaw`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 和
`MINIMAX_API_KEY` 作为环境变量别名。`MINIMAX_API_KEY`MiniMaxAPI 应指向一个
启用搜索功能的 Token Plan 凭据；普通的 MiniMax 模型 API 密钥可能不会被
Token Plan 搜索端点接受。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if a MiniMax Token Plan env var is set
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

**环境变量替代方案：** 在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、
`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`Gateway(网关)。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

## 区域选择

MiniMax 搜索使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中国：`https://api.minimaxi.com/v1/coding_plan/search`

如果未设置 `plugins.entries.minimax.config.webSearch.region`OpenClaw，OpenClaw 将按以下顺序解析区域：

1. `tools.web.search.minimax.region` / 插件拥有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着 CN 新手引导或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`MiniMax
会自动将 MiniMax 搜索保留在 CN 主机上。

即使您通过 `minimax-portal` 路径完成了 MiniMax 的 OAuth 认证，网络搜索仍注册为提供商 ID `minimax`；OAuth 提供商的基础 URL 将用作中国/全球主机选择的区域提示，而 `MINIMAX_OAUTH_TOKEN` 可以满足 MiniMax 搜索的 Bearer 凭证要求。

## 支持的参数

| 参数    | 类型   | 约束 | 描述                                                    |
| ------- | ------ | ---- | ------------------------------------------------------- |
| `query` | 字符串 | 必填 | 搜索查询字符串。                                        |
| `count` | 整数   | 1-10 | 要返回的结果数量。OpenClaw 会将返回的列表裁剪为此大小。 |

目前不支持特定于提供商的过滤器。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [MiniMax](/zh/providers/minimax) -- 模型、图像、语音和身份验证设置
