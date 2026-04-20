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
- 身份验证：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
- API: Google Gemini API
- 替代提供商：`google-gemini-cli` (OAuth)

## 入门指南

选择您首选的身份验证方法并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥">
    **最适合：** 通过 Google AI Studio 进行标准 Gemini API 访问。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice gemini-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --non-interactive \
          --mode local \
          --auth-choice gemini-api-key \
          --gemini-api-key "$GEMINI_API_KEY"
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "google/gemini-3.1-pro-preview" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider google
        ```
      </Step>
    </Steps>

    <Tip>
    环境变量 `GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 均可接受。使用您已配置的任意一个即可。
    </Tip>

  </Tab>

  <Tab title="Gemini CLI (OAuth)">
    **最佳适用场景：** 通过 PKCE CLI 重用现有的 Gemini OAuth 登录信息，而不是使用单独的 API 密钥。

    <Warning>
    `google-gemini-cli` 提供商是一个非官方集成。有用户报告以这种方式使用 OAuth 会遇到账户限制。使用风险自负。
    </Warning>

    <Steps>
      <Step title="安装 Gemini CLI">
        本地 `gemini` 命令必须在 `PATH` 上可用。

        ```bash
        # Homebrew
        brew install gemini-cli

        # or npm
        npm install -g @google/gemini-cli
        ```

        OpenClaw 支持 Homebrew 安装和全局 npm 安装，包括常见的 Windows/npm 布局。
      </Step>
      <Step title="通过 OAuth 登录">
        ```bash
        openclaw models auth login --provider google-gemini-cli --set-default
        ```
      </Step>
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider google-gemini-cli
        ```
      </Step>
    </Steps>

    - 默认模型： `google-gemini-cli/gemini-3-flash-preview`
    - 别名： `gemini-cli`

    **环境变量：**

    - `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
    - `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

    （或 `GEMINI_CLI_*` 变体。）

    <Note>
    如果登录后 Gemini CLI OAuth 请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或
    `GOOGLE_CLOUD_PROJECT_ID` 并重试。
    </Note>

    <Note>
    如果在浏览器流程开始之前登录失败，请确保本地 `gemini`
    命令已安装并且位于 `PATH` 中。
    </Note>

    仅限 OAuth 的 `google-gemini-cli` 提供商是一个独立的文本推理界面。图像生成、媒体理解和 Gemini Grounding 保留在
    `google` 提供商 ID 上。

  </Tab>
</Tabs>

## 功能

| 功能         | 支持             |
| ------------ | ---------------- |
| 聊天补全     | 是               |
| 图像生成     | 是               |
| 音乐生成     | 是               |
| 图像理解     | 是               |
| 音频转录     | 是               |
| 视频理解     | 是               |
| 网络搜索     | 是               |
| 思考/推理    | 是 (Gemini 3.1+) |
| Gemma 4 模型 | 是               |

<Tip>Gemma 4 模型（例如 `gemma-4-26b-a4b-it`）支持思考模式。OpenClaw 会将 `thinkingBudget` 重写为 Gemma 4 支持的 Google `thinkingLevel`。 将 thinking 设置为 `off` 会保持思考功能禁用，而不是映射到 `MINIMAL`。</Tip>

## 图像生成

内置的 `google` 图像生成提供商默认为
`google/gemini-3.1-flash-image-preview`。

- 也支持 `google/gemini-3-pro-image-preview`
- 生成：每个请求最多生成 4 张图像
- 编辑模式：已启用，最多支持 5 张输入图像
- 几何控制：`size`、`aspectRatio` 和 `resolution`

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

<Note>请参阅 [图像生成](/en/tools/image-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 视频生成

内置的 `google` 插件还通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型：`google/veo-3.1-fast-generate-preview`
- 模式：文生视频、图生视频和单视频参考流程
- 支持 `aspectRatio`、`resolution` 和 `audio`
- 当前持续时间限制：**4 至 8 秒**

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

<Note>请参阅 [视频生成](/en/tools/video-generation) 了解共享工具参数、提供商选择和故障转移行为。</Note>

## 音乐生成

内置的 `google` 插件还通过共享的
`music_generate` 工具注册音乐生成。

- 默认音乐模型：`google/lyria-3-clip-preview`
- 也支持 `google/lyria-3-pro-preview`
- 提示控制：`lyrics` 和 `instrumental`
- 输出格式：默认为 `mp3`，加上 `wav` 在 `google/lyria-3-pro-preview` 上
- 参考输入：最多 10 张图像
- 支持会话的运行通过共享任务/状态流程分离，包括 `action: "status"`

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

<Note>请参阅[音乐生成](/en/tools/music-generation)以了解共享工具参数、提供商选择和故障转移行为。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Direct Gemini cache reuse">
    对于直接 Gemini 模型 运行 (`api: "google-generative-ai"`)，OpenClaw
    会将配置的 `cachedContent` 句柄传递给 Gemini 请求。

    - 使用 `cachedContent` 或传统的 `cached_content` 配置每个模型或全局参数
    - 如果两者都存在，`cachedContent` 优先
    - 示例值：`cachedContents/prebuilt-context`
    - Gemini 缓存命中使用量会从上游 `cachedContentTokenCount` 规范化到 OpenClaw `cacheRead`

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

  </Accordion>

  <Accordion title="Gemini CLI JSON usage notes">
    当使用 `google-gemini-cli` OAuth 提供商时，OpenClaw 会按如下方式规范
    CLI JSON 输出：

    - 回复文本来自 CLI JSON 的 `response` 字段。
    - 当 CLI 将 `usage` 留空时，使用量会回退到 `stats`。
    - `stats.cached` 被规范化为 OpenClaw `cacheRead`。
    - 如果缺少 `stats.input`，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入令牌。

  </Accordion>

  <Accordion title="Environment and daemon setup">
    如果 Gateway(网关) 作为守护进程 (launchd/systemd) 运行，请确保 `GEMINI_API_KEY`
    对该进程可用（例如，在 `~/.openclaw/.env` 中或通过
    `env.shellEnv`）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/en/tools/image-generation" icon="image">
    共享图像工具参数和提供商选择。
  </Card>
  <Card title="视频生成" href="/en/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="音乐生成" href="/en/tools/music-generation" icon="music">
    共享音乐工具参数和提供商选择。
  </Card>
</CardGroup>
