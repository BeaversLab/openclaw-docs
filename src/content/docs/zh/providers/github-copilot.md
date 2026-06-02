---
summary: "使用设备流程或非交互式令牌导入从 GitHub 登录 OpenClaw Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
  - You are choosing between the built-in Copilot provider, Copilot SDK harness, and Copilot Proxy
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 编程助手。它为您的 GitHub 账户和计划提供对 Copilot 模型的访问权限。OpenClaw 可以通过三种不同方式将 Copilot 用作模型提供商或代理运行时。

## 在 OpenClaw 中使用 Copilot 的三种方式

<Tabs>
  <Tab title="内置提供商">
    使用本机设备登录流程获取 GitHub 令牌，然后在 API 运行时将其交换为 Copilot OpenClaw 令牌。这是 **默认** 且最简单的路径，因为它不需要 VS Code。

    <Steps>
      <Step title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系统将提示您访问 URL 并输入一次性代码。在完成之前请保持终端打开。
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        或在配置中：

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.7" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Copilot SDK 插件">
    当您希望 GitHub 的 Copilot CLI 和 SDK 拥有所选 `github-copilot/*` 模型的低级代理循环时，请安装外部 `@openclaw/copilot` 插件。

    ```bash
    openclaw plugins install clawhub:@openclaw/copilot
    ```

    然后选择一个模型或提供商进入该运行时：

    ```json5
    {
      agents: {
        defaults: {
          model: "github-copilot/gpt-5.5",
          models: {
            "github-copilot/gpt-5.5": {
              agentRuntime: { id: "copilot" },
            },
          },
        },
      },
    }
    ```

    当您需要本机 Copilot CLI 会话、SDK 管理的线程状态以及 Copilot 拥有的这些代理轮次的压缩时，请选择此项。有关完整的运行时合同，请参阅 [Copilot SDK 插件](/zh/plugins/copilot)。

  </Tab>

  <Tab title="Copilot Proxy 插件 (copilot-proxy)"OpenClaw>
    将 **Copilot Proxy** VS Code 扩展用作本地桥接。OpenClaw 与
    代理的 `/v1` 端点通信，并使用您在那里配置的模型列表。

    <Note>
    当您已经在 VS Code 中运行 Copilot Proxy 或需要通过其路由时，请选择此项。
    您必须启用该插件并保持 VS Code 扩展运行。
    </Note>

  </Tab>
</Tabs>

## 可选标志

| 标志            | 描述                         |
| --------------- | ---------------------------- |
| `--yes`         | 跳过确认提示                 |
| `--set-default` | 同时应用提供商推荐的默认模型 |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非交互式新手引导

如果您已经拥有用于 Copilot 的 GitHub OAuth 访问令牌，请在
无头设置期间使用 GitHubOAuth`openclaw onboard --non-interactive` 导入它：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

您也可以省略 `--auth-choice`；传递 `--github-copilot-token`GitHub 会推断
GitHub Copilot 提供商的身份验证选择。如果省略该标志，新手引导将
回退到 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然后是 `GITHUB_TOKEN`。使用
`--secret-input-mode ref` 并设置 `COPILOT_GITHUB_TOKEN`，以便将
`tokenRef` 存储为环境变量支持的形式，而不是以明文形式存储在 `auth-profiles.json` 中。

<AccordionGroup>
  <Accordion title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。请直接在终端中运行它，
    而不是在非交互式脚本或 CI 流水线中。
  </Accordion>

<Accordion title="模型可用性取决于您的计划" GitHub>
  Copilot 模型的可用性取决于您的 GitHub 计划。如果模型被拒绝， 请尝试另一个 ID（例如 `github-copilot/gpt-5.5`GitHub）。请参阅 GitHub 的 [每个 Copilot 计划支持的模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) 以获取当前模型列表。
</Accordion>

  <Accordion title="API从 Copilot API 实时刷新目录"GitHubOpenClaw>
    一旦设备登录（或环境变量）身份验证路径解析了 GitHub 令牌，
    OpenClaw 便会按需从 `${baseUrl}/models`OpenClaw 刷新模型目录
    （与 VS Code Copilot 使用的端点相同），以便运行时跟踪
    每个账户的权限和准确的上下文窗口，而无需清单变动。
    新发布的 Copilot 模型在无需升级 OpenClaw 的情况下即可见，
    且上下文窗口反映真实的每模型限制
    （例如 gpt-5.x 系列为 400k，内部
    `claude-opus-*-1m`GitHub 变体为 1M）。

    当发现被禁用、用户没有 GitHub 身份验证配置文件、令牌交换失败，
    或 `/models` HTTPS 调用出错时，捆绑的静态目录将作为可见的回退。
    要选择退出并完全依赖静态清单目录（离线/气隙场景）：

    ```json5
    {
      plugins: {
        entries: {
          "github-copilot": {
            config: { discovery: { enabled: false } },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="传输选择" AnthropicOpenAIOpenClaw>
  Claude 模型 ID 自动使用 Anthropic Messages 传输。GPT、 o 系列和 Gemini 模型保持使用 OpenAI Responses 传输。OpenClaw 根据模型引用选择正确的传输。
</Accordion>

<Accordion title="请求兼容性" OpenClawAPI>
  OpenClaw 在 Copilot 传输上发送 Copilot IDE 风格的请求头， 包括内置的压缩、工具结果和图像后续轮次。它 不会为 Copilot 启用提供商级别的 Responses 继续，除非 该行为已针对 Copilot API 进行了验证。
</Accordion>

  <Accordion title="环境变量解析顺序">
    OpenClaw 按以下优先级顺序从环境变量中解析 Copilot 身份验证：

    | 优先级 | 变量                  | 备注                              |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高优先级，Copilot 特定          |
    | 2        | `GH_TOKEN`            | GitHub CLI 令牌（后备）      |
    | 3        | `GITHUB_TOKEN`        | 标准 GitHub 令牌（最低）   |

    当设置了多个变量时，OpenClaw 将使用优先级最高的那个。
    设备登录流程 (`openclaw models auth login-github-copilot`) 会将其令牌存储在身份配置文件存储中，并且优先于所有环境变量。

  </Accordion>

  <Accordion title="令牌存储">
    登录会将 GitHub 令牌存储在身份配置文件存储中，并在 API 运行时将其交换为 Copilot OpenClaw 令牌。您无需手动管理令牌。
  </Accordion>
</AccordionGroup>

<Warning>设备登录命令需要交互式 TTY。当您需要无头设置时，请使用非交互式新手引导。</Warning>

## Memory search embeddings

GitHub Copilot 也可以充当 [memory search](/zh/concepts/memory-search) 的嵌入提供商。如果您拥有 Copilot 订阅并且已登录，OpenClaw 可以使用它进行嵌入，而无需单独的 API 密钥。

### Config

显式设置 `memorySearch.provider` 以使用 GitHub Copilot 嵌入。如果 GitHub 令牌可用，OpenClaw 会从 Copilot API 发现可用的嵌入模型并自动选择最佳模型。

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // Optional: override the auto-discovered model
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### How it works

1. OpenClaw 解析您的 GitHub 令牌（来自环境变量或身份配置文件）。
2. 将其交换为短期的 Copilot API 令牌。
3. 查询 Copilot `/models` 端点以发现可用的嵌入模型。
4. 选择最佳模型（首选 `text-embedding-3-small`）。
5. 将嵌入请求发送到 Copilot `/embeddings` 端点。

模型的可用性取决于您的 GitHub 计划。如果没有可用的嵌入模型，OpenClaw 将跳过 Copilot 并尝试下一个提供商。

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和 auth" href="/zh/gateway/authentication" icon="key">
    身份验证详细信息和凭据重用规则。
  </Card>
</CardGroup>
