---
summary: "使用设备流程从 OpenClaw 登录 GitHub Copilot"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

GitHub Copilot 是 GitHub 的 AI 编程助手。它为您的 GitHub 账户和计划提供对 Copilot 模型的访问。OpenClaw 可以通过两种不同的方式将 Copilot 用作模型提供商。

## 在 OpenClaw 中使用 Copilot 的两种方式

<Tabs>
  <Tab title="内置提供商 (github-copilot)">
    使用原生的设备登录流程获取 GitHub 令牌，然后在 API 运行时将其交换为 Copilot OpenClaw 令牌。这是 **默认** 且最简单的路径，因为它不需要 VS Code。

    <Steps>
      <Step title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        您将收到提示，需要访问一个 URL 并输入一次性代码。在完成之前，请保持终端打开。
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw models set github-copilot/gpt-4o
        ```

        或在配置中：

        ```json5
        {
          agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Copilot Proxy 插件 (copilot-proxy)">
    使用 **Copilot Proxy** VS Code 扩展作为本地桥接器。OpenClaw 与代理的 `/v1` 端点通信，并使用您在那里配置的模型列表。

    <Note>
    当您已经在 VS Code 中运行 Copilot Proxy 或需要通过它进行路由时，请选择此项。您必须启用插件并保持 VS Code 扩展运行。
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

<AccordionGroup>
  <Accordion title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。请直接在终端中运行它，而不是在非交互式脚本或 CI 流水线中运行。
  </Accordion>

<Accordion title="模型可用性取决于您的计划">Copilot 模型的可用性取决于您的 GitHub 计划。如果某个模型被拒绝，请尝试另一个 ID（例如 `github-copilot/gpt-4.1`）。</Accordion>

<Accordion title="传输选择">Claude 模型 ID 会自动使用 Anthropic 消息传输。GPT、o 系列 和 Gemini 模型保持 OpenAI 响应传输。OpenClaw 根据模型引用选择正确的传输方式。</Accordion>

  <Accordion title="环境变量解析顺序">
    OpenClaw 按以下优先级顺序从环境变量解析 Copilot 身份验证：

    | 优先级 | 变量              | 备注                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高优先级，Copilot 专用 |
    | 2        | `GH_TOKEN`            | GitHub CLI 令牌（回退）      |
    | 3        | `GITHUB_TOKEN`        | 标准 GitHub 令牌（最低）   |

    当设置了多个变量时，OpenClaw 将使用优先级最高的那个。
    设备登录流程（`openclaw models auth login-github-copilot`）将其令牌存储在
    身份验证配置文件存储中，并且优先于所有环境变量。

  </Accordion>

  <Accordion title="令牌存储">
    登录会将 GitHub 令牌存储在身份验证配置文件存储中，并在 API
    运行时将其交换为 Copilot OpenClaw 令牌。您无需手动管理该令牌。
  </Accordion>
</AccordionGroup>

<Warning>需要一个交互式 TTY。请直接在终端中运行登录命令，不要 在无头脚本或 CI 作业内部运行。</Warning>

## 记忆搜索嵌入

GitHub Copilot 也可以充当 [记忆搜索](/en/concepts/memory-search) 的嵌入提供商。
如果您拥有 Copilot 订阅并已登录，OpenClaw 可以将其用于嵌入，而无需单独的 API 密钥。

### 自动检测

当 `memorySearch.provider` 为 `"auto"`（默认值）时，GitHub Copilot 将在优先级 15 被尝试 ——
在本地嵌入之后，但在 OpenAI 和其他付费提供商之前。如果存在 GitHub
令牌，OpenClaw 会从 Copilot API 发现可用的嵌入模型并自动选择最佳模型。

### 显式配置

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

### 工作原理

1. OpenClaw 解析您的 GitHub 令牌（来自环境变量或身份验证配置文件）。
2. 将其交换为短期 Copilot API 令牌。
3. 查询 Copilot `/models` 端点以发现可用的嵌入模型。
4. 选择最佳模型（首选 `text-embedding-3-small`）。
5. 将嵌入请求发送到 Copilot `/embeddings` 端点。

模型可用性取决于您的 GitHub 计划。如果没有可用的嵌入模型，OpenClaw 将跳过 Copilot 并尝试下一个提供商。

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth and auth" href="/en/gateway/authentication" icon="key">
    认证详细信息和凭据重用规则。
  </Card>
</CardGroup>
