---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供商默认为 **MiniMax M2.7**。

MiniMax 还提供：

- 通过 T2A v2 捆绑的语音合成
- 通过 `MiniMax-VL-01` 捆绑的图像理解
- 通过 `music-2.5+` 捆绑的音乐生成
- 通过 MiniMax Coding Plan 搜索 API 捆绑的 `web_search`

提供商分类：

- `minimax`：API 密钥文本提供商，外加捆绑的图像生成、图像理解、语音和网络搜索
- `minimax-portal`：OAuth 文本提供商，外加捆绑的图像生成和图像理解

## 模型系列

- `MiniMax-M2.7`：默认的托管推理模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 推理层级。
- `image-01`：图像生成模型（生成和图生图编辑）。

## 图像生成

MiniMax 插件为 `image_generate` 工具注册了 `image-01` 模型。它支持：

- **文生图生成**，具有宽高比控制。
- **图生图编辑**（主体参考），具有宽高比控制。
- 每个请求最多 **9 张输出图像**。
- 每个编辑请求最多 **1 张参考图像**。
- 支持的宽高比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`。

要使用 MiniMax 进行图像生成，请将其设置为图像生成提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

该插件使用与文本模型相同的 `MINIMAX_API_KEY` 或 OAuth 身份验证。如果 MiniMax 已设置，则无需额外配置。

`minimax` 和 `minimax-portal` 都为 `image-01` 模型注册了 `image_generate`。API 密钥设置使用 `MINIMAX_API_KEY`；OAuth 设置可以使用
捆绑的 `minimax-portal` 身份验证路径。

当新手引导或 API 密钥设置写入显式的 `models.providers.minimax` 条目时，OpenClaw 会使用 `input: ["text", "image"]` 具体化 `MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed`。

内置的捆绑 MiniMax 文本目录本身在存在该显式提供商配置之前，保持为仅限文本的元数据。图像理解通过插件拥有的 `MiniMax-VL-01` 媒体提供商单独公开。

有关共享工具参数、提供商选择和故障转移行为，请参阅 [图像生成](/en/tools/image-generation)。

## 音乐生成

捆绑的 `minimax` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`minimax/music-2.5+`
- 还支持 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示词控件：`lyrics`、`instrumental`、`durationSeconds`
- 输出格式：`mp3`
- 支持会话的运行通过共享任务/状态流分离，包括 `action: "status"`

要将 MiniMax 用作默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅 [音乐生成](/en/tools/music-generation)。

## 视频生成

捆绑的 `minimax` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`minimax/MiniMax-Hailuo-2.3`
- 模式：文本生成视频和单图像参考流
- 支持 `aspectRatio` 和 `resolution`

要将 MiniMax 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅 [视频生成](/en/tools/video-generation)。

## 图像理解

MiniMax 插件单独注册图像理解，与文本目录分开：

- `minimax`：默认图像模型 `MiniMax-VL-01`
- `minimax-portal`：默认图像模型 `MiniMax-VL-01`

这就是为什么即使捆绑的文本提供商目录中仍显示仅支持文本的 M2.7 聊天引用，自动媒体路由仍可以使用 MiniMax 图像理解功能。

## 网页搜索

MiniMax 插件还通过 MiniMax Coding Plan 搜索 API 注册了 `web_search`。

- 提供商 ID：`minimax`
- 结构化结果：标题、URL、摘要、相关查询
- 首选环境变量：`MINIMAX_CODE_PLAN_KEY`
- 接受的环境变量别名：`MINIMAX_CODING_API_KEY`
- 兼容性回退：当 `MINIMAX_API_KEY` 已经指向 coding-plan 令牌时
- 区域重用：先使用 `plugins.entries.minimax.config.webSearch.region`，然后是 `MINIMAX_API_HOST`，最后是 MiniMax 提供商基础 URL
- 搜索保持提供商 ID 为 `minimax`；OAuth CN/全局设置仍可通过 `models.providers.minimax-portal.baseUrl` 间接引导区域

配置位于 `plugins.entries.minimax.config.webSearch.*` 下。
请参阅 [MiniMax 搜索](/en/tools/minimax-search)。

## 选择设置

### MiniMax OAuth (Coding Plan) - 推荐

**最适用于：** 通过 MiniMax 使用 OAuth Coding Plan 进行快速设置，无需 API 密钥。

通过明确的区域 OAuth 选择进行身份验证：

```bash
openclaw onboard --auth-choice minimax-global-oauth
# or
openclaw onboard --auth-choice minimax-cn-oauth
```

选项映射：

- `minimax-global-oauth`：国际用户 (`api.minimax.io`)
- `minimax-cn-oauth`：中国用户 (`api.minimaxi.com`)

详细信息请参阅 MiniMax 仓库中的 OpenClaw 插件包 README。

### MiniMax M2.7 (API 密钥)

**最适用于：** 使用兼容 MiniMax Anthropic 的托管 API。

通过 CLI 配置：

- 交互式新手引导：

```bash
openclaw onboard --auth-choice minimax-global-api
# or
openclaw onboard --auth-choice minimax-cn-api
```

- `minimax-global-api`：国际用户 (`api.minimax.io`)
- `minimax-cn-api`：中国用户 (`api.minimaxi.com`)

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

在兼容 Anthropic 的流式传输路径上，除非您显式设置 `thinking`，否则 OpenClaw 现在默认禁用 MiniMax 思维。MiniMax 的流式端点在 OpenAI 风格的增量块中发出 `reasoning_content`，而不是原生的 Anthropic 思维块，如果在隐式启用的情况下保留该功能，可能会导致内部推理泄漏到可见输出中。

### MiniMax M2.7 作为回退（示例）

**最适合：** 将您最强大的最新一代模型设为主要模型，故障转移到 MiniMax M2.7。
下面的示例使用 Opus 作为具体的主要模型；请替换为您首选的最新一代主要模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

## 通过 `openclaw configure` 进行配置

使用交互式配置向导来设置 MiniMax，而无需编辑 JSON：

1. 运行 `openclaw configure`。
2. 选择 **Model/auth**。
3. 选择一个 **MiniMax** 认证选项。
4. 出现提示时，选择您的默认模型。

向导/CLI 中当前的 MiniMax 认证选项：

- `minimax-global-oauth`
- `minimax-cn-oauth`
- `minimax-global-api`
- `minimax-cn-api`

## 配置选项

- `models.providers.minimax.baseUrl`：首选 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 对于 OpenAI 兼容的负载是可选的。
- `models.providers.minimax.api`：首选 `anthropic-messages`；`openai-completions` 对于 OpenAI 兼容的负载是可选的。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为您希望加入允许列表的模型设置别名。
- `models.mode`：如果您想将 MiniMax 与内置模型一起添加，请保留 `merge`。

## 注意

- 模型引用遵循认证路径：
  - API 密钥设置：`minimax/<model>`
  - OAuth 设置：`minimax-portal/<model>`
- 默认聊天模型：`MiniMax-M2.7`
- 备用聊天模型：`MiniMax-M2.7-highspeed`
- 在 `api: "anthropic-messages"` 上，除非在参数/配置中已明确设置了 thinking，否则 OpenClaw 会注入
  `thinking: { type: "disabled" }`。
- `/fast on` 或 `params.fastMode: true` 在 Anthropic 兼容的流式路径上将 `MiniMax-M2.7` 重写为
  `MiniMax-M2.7-highspeed`。
- 新手引导和直接 API 密钥设置需使用 `input: ["text", "image"]` 为两种 M2.7 变体编写显式的模型定义
- 捆绑的提供商目录目前将聊天引用公开为纯文本元数据，直到存在显式的 MiniMax 提供商配置
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 密钥）。
- OpenClaw 将 MiniMax coding-plan 的使用情况标准化为与其他提供商相同的 `% left` 显示方式。MiniMax 的原始 `usage_percent` / `usagePercent` 字段是剩余配额，而非已用配额，因此 OpenClaw 对其进行了反转。当存在基于计数的字段时，优先使用它们。当 API 返回 `model_remains` 时，OpenClaw 优先使用聊天模型条目，并在需要时从 `start_time` / `end_time` 推导窗口标签，并在计划标签中包含所选模型名称，以便更容易区分 coding-plan 窗口。
- 使用快照将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额表面，并优先使用存储的 MiniMax OAuth，然后再回退到 Coding Plan 密钥环境变量。
- 如果需要精确的成本跟踪，请更新 `models.json` 中的定价值。
- MiniMax Coding Plan 的推荐链接（九折优惠）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 请参阅 [/concepts/模型-providers](/en/concepts/model-providers) 了解提供商规则。
- 使用 `openclaw models list` 确认当前的提供商 ID，然后使用 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 进行切换。

## 故障排除

### "Unknown 模型: minimax/MiniMax-M2.7"

这通常意味着 **MiniMax 提供商未配置**（未找到匹配的提供商条目，也未找到 MiniMax 身份验证配置文件/环境密钥）。针对此检测的修复包含在 **2026.1.12** 中。修复方法：

- 升级到 **2026.1.12**（或从源 `main` 运行），然后重启网关。
- 运行 `openclaw configure` 并选择 **MiniMax** 身份验证选项，或
- 手动添加匹配的 `models.providers.minimax` 或 `models.providers.minimax-portal` 块，或
- 设置 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 身份验证配置文件
  以便注入匹配的提供商。

请确保模型 ID 区分大小写：

- API 密钥路径：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
- OAuth 路径：`minimax-portal/MiniMax-M2.7` 或
  `minimax-portal/MiniMax-M2.7-highspeed`

然后使用以下命令重新检查：

```bash
openclaw models list
```
