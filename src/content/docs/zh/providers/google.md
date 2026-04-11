---
title: "Google (Gemini)"
summary: "Google Gemini 设置（API 密钥 + OAuth、图像生成、媒体理解、网络搜索）"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Google 插件通过 Google AI Studio 提供对 Gemini 模型的访问，此外还提供图像生成、媒体理解（图像/音频/视频）以及通过 Gemini Grounding 进行的网络搜索。

- 提供商：`google`
- 认证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 替代提供商：`google-gemini-cli` (OAuth)

## 快速开始

1. 设置 API 密钥:

```bash
openclaw onboard --auth-choice gemini-api-key
```

2. 设置默认模型:

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

替代提供商 `google-gemini-cli` 使用 PKCE OAuth 而不是 API
密钥。这是一个非官方集成；部分用户报告账户
受到限制。使用风险自负。

- 默认模型：`google-gemini-cli/gemini-3-flash-preview`
- 别名：`gemini-cli`
- 安装先决条件：本地 Gemini CLI 可作为 `gemini` 使用
  - Homebrew：`brew install gemini-cli`
  - npm：`npm install -g @google/gemini-cli`
- 登录：

```bash
openclaw models auth login --provider google-gemini-cli --set-default
```

环境变量：

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

（或 `GEMINI_CLI_*` 变体。）

如果 Gemini CLI OAuth 请求在登录后失败，请在网关主机上设置
`GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID` 并
重试。

如果在浏览器流程开始前登录失败，请确保本地 `gemini`
命令已安装且位于 `PATH` 上。OpenClaw 支持 Homebrew 安装
和全局 npm 安装，包括常见的 Windows/npm 布局。

Gemini CLI JSON 使用说明：

- 回复文本来自 CLI JSON `response` 字段。
- 当 CLI 将 `usage` 留空时，使用将回退到 `stats`。
- `stats.cached` 被标准化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 将从
  `stats.input_tokens - stats.cached` 推导输入令牌。

## 功能

| 功能      | 支持             |
| --------- | ---------------- |
| 聊天补全  | 是               |
| 图像生成  | 是               |
| 音乐生成  | 是               |
| 图像理解  | 是               |
| 音频转录  | 是               |
| 视频理解  | 是               |
| 网络搜索  | 是               |
| 思考/推理 | 是 (Gemini 3.1+) |

## 直接 Gemini 缓存复用

对于直接的 Gemini API 调用（`api: "google-generative-ai"`），OpenClaw 现在会将配置的 `cachedContent` 句柄传递给 Gemini 请求。

- 使用 `cachedContent` 或旧版的 `cached_content` 配置每个模型或全局参数
- 如果两者都存在，`cachedContent` 优先
- 示例值：`cachedContents/prebuilt-context`
- Gemini 缓存命中使用情况已从上游的 `cachedContentTokenCount` 归一化为 OpenClaw `cacheRead`

示例：

```json5
{
  agents: {
    defaults: {
      models: {
        "google/gemini-2.5-pro": {
          params: {
            cachedContent: "cachedContents/prebuilt-context",
          },
        },
      },
    },
  },
}
```

## 图像生成

捆绑的 `google` 图像生成提供商默认为 `google/gemini-3.1-flash-image-preview`。

- 同时也支持 `google/gemini-3-pro-image-preview`
- 生成：每次请求最多生成 4 张图像
- 编辑模式：已启用，最多支持 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

仅支持 OAuth 的 `google-gemini-cli` 提供商是一个独立的文本推理接口。图像生成、媒体理解和 Gemini Grounding 保留在 `google` 提供商 ID 上。

要将 Google 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

请参阅[图像生成](/en/tools/image-generation)了解共享工具参数、提供商选择和故障转移行为。

## 视频生成

捆绑的 `google` 插件还通过共享的 `video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文本到视频、图像到视频以及单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前持续时间限制：**4 到 8 秒**

要将 Google 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

请参阅[视频生成](/en/tools/video-generation)了解共享工具参数、提供商选择和故障转移行为。

## 音乐生成

捆绑的 `google` 插件还通过共享的 `music_generate` 工具注册音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 同时也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，此外在 `google/lyria-3-pro-preview` 上还支持 `wav`
- 参考输入：最多 10 张图片
- 基于会话的运行通过共享任务/状态流程分离，包括 `action: "status"`

要将 Google 用作默认音乐提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参阅[音乐生成](/en/tools/music-generation)。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保 `GEMINI_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
`env.shellEnv`）。
