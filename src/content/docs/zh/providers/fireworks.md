---
summary: "Fireworks 设置（身份验证 + 模型选择）"
title: "Fireworks"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
  - You are debugging Kimi thinking-off behavior on Fireworks
---

[Fireworks](https://fireworks.ai) 通过兼容 OpenAI 的 API 提供开源权重和路由模型。OpenClaw 包含一个捆绑的 Fireworks 提供商插件，该插件附带两个预先编目的 Kimi 模型，并在运行时接受任何 Fireworks 模型或路由器 ID。

| 属性             | 值                                                     |
| ---------------- | ------------------------------------------------------ |
| 提供商 ID        | `fireworks` （别名： `fireworks-ai`）                  |
| 插件             | 捆绑， `enabledByDefault: true`                        |
| 身份验证环境变量 | `FIREWORKS_API_KEY`                                    |
| 新手引导标志     | `--auth-choice fireworks-api-key`                      |
| 直接 CLI 标志    | `--fireworks-api-key <key>`                            |
| API              | OpenAI 兼容 (OpenAI`openai-completions`)               |
| 基础 URL         | `https://api.fireworks.ai/inference/v1`                |
| 默认模型         | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |
| 默认别名         | `Kimi K2.5 Turbo`                                      |

## 入门指南

<Steps>
  <Step title="API设置 Fireworks API 密钥">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    新手引导会将密钥存储在您的身份验证配置文件中的 `fireworks` 提供商下，并将 **Fire Pass** Kimi K2.5 Turbo 路由器设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```

    列表应包含 `Kimi K2.6` 和 `Kimi K2.5 Turbo (Fire Pass)`。如果 `FIREWORKS_API_KEY` 未解析，`openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

## 非交互式设置

对于脚本或 CI 安装，请在命令行中传递所有参数：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                                               | 名称                        | 输入        | 上下文  | 最大输出 | 思考             |
| ------------------------------------------------------ | --------------------------- | ----------- | ------- | -------- | ---------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | 文本 + 图像 | 262,144 | 262,144  | 强制关闭         |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | 文本 + 图像 | 256,000 | 256,000  | 强制关闭（默认） |

<Note>由于 Fireworks 在生产环境中拒绝 Kimi 思考参数，OpenClaw 将所有 Fireworks Kimi 模型固定为 `thinking: off`。直接通过 [Moonshot](/zh/providers/moonshot) 路由同一模型可以保留 Kimi 推理输出。请参阅 [thinking modes](/zh/tools/thinking) 以在提供商之间切换。</Note>

## 自定义 Fireworks 模型 ID

OpenClaw 在运行时接受任何 Fireworks 模型或路由器 id。使用 Fireworks 显示的确切 id 并在其前面加上 OpenClaw`fireworks/`OpenAIAPIGLM。动态解析会克隆 Fire Pass 模板（文本 + 图像输入，OpenAI 兼容 API，默认费用为零），并且当 id 匹配 Kimi 模式时自动禁用思考。除非您配置了带有图像输入的自定义模型条目，否则 GLM 动态 id 会被标记为仅文本。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="模型 id 前缀如何工作"OpenClaw>
    OpenClaw 中的每个 Fireworks 模型引用都以 `fireworks/` 开头，后跟 Fireworks 平台中的确切 id 或路由器路径。例如：

    - 路由器模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`OpenClaw

    OpenClaw 在构建 API 请求时会去除 `fireworks/`APIOpenAI 前缀，并将剩余的路径作为 OpenAI 兼容的 `model` 字段发送到 Fireworks 端点。

  </Accordion>

  <Accordion title="Why thinking is forced off for Kimi">
    即使 Kimi 通过 Moonshot 自有的 API 支持思考，但如果请求携带 `reasoning_*` 参数，Fireworks K2.6 仍会返回 400 错误。捆绑策略 (`extensions/fireworks/thinking-policy.ts`) 仅针对 Kimi 模型 ID 宣传 `off` 思考级别，因此手动 `/think` 开关和提供商策略界面与运行时合约保持一致。

    要端到端使用 Kimi 推理，请配置 [Moonshot 提供商](/zh/providers/moonshot) 并通过其路由同一模型。

  </Accordion>

  <Accordion title="守护进程的环境可用性"Gateway(网关)Docker>
    如果 Gateway(网关) 作为托管服务（launchd、systemd、Docker）运行，Fireworks 密钥必须对该进程可见——而不仅仅是对您的交互式 shell 可见。

    <Warning>
      仅在交互式 shell 中导出的密钥对 launchd 或 systemd 守护进程没有帮助，除非该环境也被导入其中。在 `~/.openclaw/.env` 中或通过 `env.shellEnv`macOS 设置密钥，以使其可被 Gateway(网关) 进程读取。
    </Warning>

    在 macOS 上，`openclaw gateway install` 已经将 `~/.openclaw/.env` 连接到 LaunchAgent 环境文件中。轮换密钥后，请重新运行安装（或 `openclaw doctor --fix`）。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Thinking modes" href="/zh/tools/thinking" icon="brain">
    `/think` 级别、提供商策略以及路由具备推理能力的模型。
  </Card>
  <Card title="Moonshot" href="/zh/providers/moonshot" icon="moon">
    通过 Moonshot 自有的 API 运行具备原生思考输出的 Kimi。
  </Card>
  <Card title="故障排除" href="/zh/help/troubleshooting" icon="wrench">
    常规故障排除和常见问题。
  </Card>
</CardGroup>
