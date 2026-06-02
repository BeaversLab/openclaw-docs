---
summary: "配置概述：常见任务、快速设置以及完整参考的链接"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "配置"
---

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <TooltipOpenClaw tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 配置。
活动的配置路径必须是常规文件。OpenClaw 不支持符号链接 `openclaw.json`OpenClaw
布局的写入；原子写入可能会替换
路径而不是保留符号链接。如果您将配置保留在
默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向实际文件。

如果文件丢失，OpenClaw 将使用安全的默认值。添加配置的常见原因：

- 连接频道并控制谁可以向机器人发送消息
- 设置模型、工具、沙箱隔离或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

有关所有可用字段，请参阅[完整参考](/zh/gateway/configuration-reference)。

代理和自动化工具在编辑配置之前应使用 `config.schema.lookup` 获取准确的字段级文档。请使用本页面获取面向任务的指导，并参阅[配置参考](/zh/gateway/configuration-reference)了解更广泛的字段映射和默认值。

<Tip>**配置新手？** 从 `openclaw onboard` 开始进行交互式设置，或查看[配置示例](/zh/gateway/configuration-examples)指南以获取完整的可复制配置。</Tip>

## 最小配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 编辑配置

<Tabs>
  <Tab title="交互式向导">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLICLI（单行命令）">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。 Control UI 根据实时配置架构渲染一个表单，包括字段 `title` / `description` 文档元数据，以及在可用时的插件和渠道架构， 并提供一个 **Raw JSON** 编辑器作为应急手段。对于深入钻取的 UI 和其他工具，Gateway 还公开了 `config.schema.lookup` 以 获取单个路径范围的架构节点及其直接子级摘要。</Tab>
  <Tab title="Direct edit">直接编辑 `~/.openclaw/openclaw.json`。Gateway(网关) 会监视该文件并自动应用更改（请参阅[热重载](#config-hot-reload)）。</Tab>
</Tabs>

## 严格验证

<Warning>OpenClaw 仅接受与架构完全匹配的配置。未知的键、格式错误的类型或无效的值会导致 Gateway(网关)**拒绝启动**。唯一的根级例外是 OpenClawGateway(网关)`$schema`（字符串），以便编辑器可以附加 JSON 架构元数据。</Warning>

`openclaw config schema` 打印由控制 UI 和验证使用的规范 JSON 架构。
`config.schema.lookup` 获取单个路径范围的节点以及
用于下钻工具的子摘要。字段 `title`/`description` 文档元数据
通过嵌套对象、通配符 (`*`)、数组项 (`[]`) 和 `anyOf`/
`oneOf`/`allOf` 分支传递。当加载清单注册表时，运行时插件和渠道架构会合并进来。

验证失败时：

- Gateway(网关) 无法启动
- 只有诊断命令有效 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 运行 `openclaw doctor` 查看确切问题
- 运行 `openclaw doctor --fix` (或 `--yes`) 以应用修复

Gateway(网关) 在每次成功启动后会保留一个可信的“最后已知良好”副本，
但启动和热重载不会自动恢复它。如果 Gateway(网关)`openclaw.json`Gateway(网关)
验证失败（包括插件本地验证），Gateway(网关) 启动失败或
重载被跳过，并且当前运行时保留最后接受的配置。
运行 `openclaw doctor --fix` (或 `--yes`) 以修复前缀/覆盖的配置或
恢复最后已知的良好副本。当候选配置包含已编辑的秘密占位符（例如 `***`）时，将跳过提升为最后已知良好的操作。

## 常见任务

<AccordionGroup>
  <Accordion title="设置一个渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道在 `channels.<provider>` 下都有自己的配置部分。请参阅专门的渠道页面以了解设置步骤：

    - [WhatsApp](/zh/channels/whatsapp) - `channels.whatsapp`
    - [Telegram](/zh/channels/telegram) - `channels.telegram`
    - [Discord](/zh/channels/discord) - `channels.discord`
    - [Feishu](/zh/channels/feishu) - `channels.feishu`
    - [Google Chat](/zh/channels/googlechat) - `channels.googlechat`
    - [Microsoft Teams](/zh/channels/msteams) - `channels.msteams`
    - [Slack](/zh/channels/slack) - `channels.slack`
    - [Signal](/zh/channels/signal) - `channels.signal`
    - [iMessage](/zh/channels/imessage) - `channels.imessage`
    - [Mattermost](/zh/channels/mattermost) - `channels.mattermost`

    所有渠道共享相同的私信政策模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="选择并配置模型">
    设置主要模型和可选的备用模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录并充当 `/model` 的允许列表；`provider/*` 条目将 `/model`、`/models` 和模型选择器筛选为选定的提供商，同时仍使用动态模型发现。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加允许列表条目而不移除现有模型。除非传递 `--replace`，否则会拒绝移除条目的简单替换。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制脚本/工具图像的下采样（默认 `1200`）；较低的值通常会减少截图密集型运行中的视觉令牌 使用量。
    - 请参阅 [Models CLI](/zh/concepts/models) 以在聊天中切换模型，并参阅 [Model Failover](/zh/concepts/model-failover) 了解身份轮换和备用行为。
    - 对于自定义/自托管提供商，请参阅参考文档中的 [Custom providers](/zh/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发送消息">
    私信 访问通过 `dmPolicy` 按渠道控制：

    - `"pairing"`（默认）：未知发送者会获得一次性配对代码以供批准
    - `"allowlist"`：仅允许 `allowFrom`（或已配对的允许存储）中的发送者
    - `"open"`：允许所有入站私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或特定于渠道的允许列表。

    请参阅 [完整参考文档](/zh/gateway/config-channels#dm-and-group-access) 了解每个渠道的详细信息。

  </Accordion>

  <Accordion title="设置群组聊天提及控制">
    群组消息默认为**需要提及**。为每个代理配置触发模式。普通的群组/渠道回复会自动发布；对于代理应决定何时发言的共享房间，可选择加入消息工具路径：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // set "message_tool" to require message-tool sends everywhere
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **元数据提及**：原生的 @-提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则表达式模式
    - **可见回复**：`messages.visibleReplies` 可以全局要求通过消息工具发送；`messages.groupChat.visibleReplies` 会覆盖群组/渠道的此设置。
    - 有关可见回复模式、每个渠道的覆盖和自聊模式，请参阅[完整参考](/zh/gateway/config-channels#group-chat-mention-gating)。

  </Accordion>

  <Accordion title="限制每个代理的 Skills">
    使用 `agents.defaults.skills` 作为共享基线，然后使用 `agents.list[].skills` 为特定代理进行覆盖：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - 省略 `agents.defaults.skills` 以默认允许不受限制的 Skills。
    - 省略 `agents.list[].skills` 以继承默认设置。
    - 设置 `agents.list[].skills: []` 以禁用所有 Skills。
    - 请参阅 [Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config) 和 [配置参考](/zh/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关重启看似停滞的渠道的积极程度：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - 设置 `gateway.channelHealthCheckMinutes: 0` 以全局禁用健康监控重启。
    - `channelStaleEventThresholdMinutes` 应大于或等于检查间隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 以禁用单个渠道或帐户的自动重启，而不禁用全局监控器。
    - 有关操作调试，请参阅 [健康检查](/zh/gateway/health)；有关所有字段，请参阅 [完整参考](/zh/gateway/configuration-reference#gateway)。

  </Accordion>

  <Accordion title="调整网关 WebSocket 握手超时">
    为负载较高或性能较低的主机上的本地客户端预留更多时间来完成认证前的 WebSocket 握手：

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - 默认值为 `15000` 毫秒。
    - 针对一次性服务或 shell 覆盖，`OPENCLAW_HANDSHAKE_TIMEOUT_MS` 仍然优先。
    - 优先解决启动/事件循环阻塞问题；此选项适用于健康但在预热期间速度较慢的主机。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话连续性和隔离性：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`: `main` (共享) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 请参阅[会话管理](/zh/concepts/session)了解作用域、身份链接和发送策略。
    - 请参阅[完整参考](/zh/gateway/config-agents#session)了解所有字段。

  </Accordion>

  <Accordion title="启用沙箱隔离">
    在隔离的沙箱运行时中运行代理会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    首先构建镜像 - 从源码检出运行 `scripts/sandbox-setup.sh`，或者从 npm 安装请参阅[沙箱隔离 § 镜像和设置](/zh/gateway/sandboxing#images-and-setup)中的内联 `docker build` 命令。

    请参阅[沙箱隔离](/zh/gateway/sandboxing)获取完整指南，并参阅[完整参考](/zh/gateway/config-agents#agentsdefaultssandbox)了解所有选项。

  </Accordion>

  <Accordion title="iOS为官方 iOS 构建启用基于中继的推送"OpenClaw>
    基于中继的推送默认使用托管的 OpenClaw 中继：`https://ios-push-relay.openclaw.ai`。

    要使用自定义中继，请在网关配置中进行设置：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```CLI

    CLI 等效命令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    其作用如下：

    - 允许网关通过外部中继发送 `push.test`iOSiOSiOSiOSiOS、唤醒提示（wake nudges）和重连唤醒。
    - 使用由配对的 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用配对的网关身份，因此其他网关无法重用存储的注册。
    - 将本地/手动 iOS 构建保留在直接 APNs 上。基于中继的发送仅适用于通过中继注册的官方分发构建。
    - 必须与烘焙到官方/TestFlight iOS 构建中的中继基础 URL 匹配，以便注册和发送流量到达同一中继部署。

    端到端流程：

    1. 安装官方/TestFlight iOS 构建。
    2. 可选：仅在使用自定义中继部署时，在网关上配置 `gateway.push.apns.relay.baseUrl`iOSiOS。
    3. 将 iOS 应用与网关配对，并允许节点和操作员会话连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 负载发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后将其用于 `push.test`iOSiOS、唤醒提示和重连唤醒。

    操作说明：

    - 如果将 iOS 应用切换到不同的网关，请重新连接应用，以便其发布绑定到该网关的新中继注册。
    - 如果发布指向不同中继部署的新 iOS 构建，应用将刷新其缓存的中继注册，而不是重用旧的中继源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS`iOS 仍可用作临时环境变量覆盖。
    - 自定义网关中继 URL 必须与烘焙到官方/TestFlight iOS 构建中的中继基础 URL 匹配。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`iOS 仍然是一个仅限环回开发的应急手段；不要在配置中持久化 HTTP 中继 URL。

    有关端到端流程，请参阅 [iOS App](/zh/platforms/ios#relay-backed-push-for-official-builds)；有关中继安全模型，请参阅 [Authentication and trust flow](/zh/platforms/ios#authentication-and-trust-flow)。

  </Accordion>

  <Accordion title="设置心跳（定期检查）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`: 时长字符串（`30m`、`2h`）。设置为 `0m` 以禁用。
    - `target`: `last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`: `allow`（默认）或 `block` 用于私信风格的心跳目标
    - 有关完整指南，请参阅 [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="配置定时任务">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：从 `sessions.json` 中清理已完成的独立运行会话（默认 `24h`；设置 `false` 以禁用）。
    - `runLog`：按作业清理保留的定时任务运行历史记录行。`maxBytes` 仍然被接受，用于较旧的基于文件的运行日志。
    - 请参阅 [定时任务](/zh/automation/cron-jobsCLI) 了解功能概述和 CLI 示例。

  </Accordion>

  <Accordion title="Set up webhooks (hooks)"Gateway(网关)>
    在 Gateway(网关) 上启用 HTTP webhook 端点：

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    安全提示：
    - 将所有 hook/webhook 负载内容视为不受信任的输入。
    - 使用专用的 `hooks.token`Gateway(网关)；请勿复用活动的 Gateway(网关) 身份验证密钥（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）。
    - Hook 身份验证仅限标头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串令牌将被拒绝。
    - `hooks.path` 无法被 `/`；请将 webhook 入口保留在专用子路径上，例如 `/hooks`。
    - 除非进行范围有限的调试，否则请禁用不安全内容绕过标志（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果启用 `hooks.allowRequestSessionKey`，同时设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方选择的会话密钥。
    - 对于由 hook 驱动的代理，建议使用强大的现代模型层级和严格的工具策略（例如，尽可能仅限消息传递加上沙箱隔离）。

    有关所有映射选项和 Gmail 集成，请参阅[完整参考](/zh/gateway/configuration-reference#hooks)。

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    运行多个具有独立工作空间和会话的隔离代理：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    有关绑定规则和每个代理的访问配置文件，请参阅[多代理](/zh/concepts/multi-agent)和[完整参考](/zh/gateway/config-agents#multi-agent-routing)。

  </Accordion>

  <Accordion title="将配置拆分为多个文件 ($include)">
    使用 `$include` 来组织大型配置：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **单个文件**：替换包含的对象
    - **文件数组**：按顺序深度合并（后面的覆盖前面的）
    - **兄弟键**：在包含之后合并（覆盖包含的值）
    - **嵌套包含**：最多支持 10 层深度
    - **相对路径**：相对于包含文件解析
    - **路径格式**：包含路径不得包含空字节，并且在解析前后必须严格短于 4096 个字符
    - **OpenClaw拥有的写入**：当写入仅更改由单个文件包含支持的一个顶级部分（例如 `plugins: { $include: "./plugins.json5" }`）时，
      OpenClaw 会更新该包含的文件并保持 `openclaw.json` 不变
    - **不支持的透传写入**：根包含、包含数组以及带有兄弟覆盖的包含，对于 OpenClaw 拥有的写入，会以失败封闭（fail closed）的方式处理，而不是扁平化配置
    - **限制**：`$include` 路径必须在持有 `openclaw.json` 的目录下解析。要在机器或用户之间共享树结构，请将 `OPENCLAW_INCLUDE_ROOTS` 设置为附加目录的路径列表（POSIX 上为 `:`，Windows 上为 `;`），这些目录可能是包含所引用的。符号链接会被解析并重新检查，因此，如果一个路径词法上位于配置目录中，但其真实目标转义了每个允许的根，则仍会被拒绝。
    - **错误处理**：针对文件丢失、解析错误、循环包含、无效路径格式和过长长度提供明确的错误

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway(网关) 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 - 对于大多数设置，无需手动重启。

在验证之前，直接编辑的文件被视为不受信任。监视器会等待编辑器临时写入/重命名的动荡平息，读取最终文件，并在不重写 `openclaw.json`OpenClaw 的情况下拒绝无效的外部编辑。OpenClaw 拥有的配置写入在写入前使用相同的模式门；诸如删除 `gateway.mode` 或将文件大小缩小一半以上等破坏性覆盖会被拒绝，并保存为 `.rejected.*` 以供检查。

如果您看到 `config reload skipped (invalid config)` 或启动报告 `Invalid
config`, inspect the config, run `openclaw config validate`, then run `Gateway(网关)openclaw
doctor --fix` 进行修复。请参阅 [Gateway 故障排除](/zh/gateway/troubleshooting#gateway-rejected-invalid-config)
查看检查清单。

### 重载模式

| 模式                  | 行为                                                 |
| --------------------- | ---------------------------------------------------- |
| **`hybrid`** （默认） | 即时热应用安全更改。对于关键更改自动重启。           |
| **`hot`**             | 仅热应用安全更改。当需要重启时记录警告 - 由您处理。  |
| **`restart`**         | 在任何配置更改（无论是否安全）时重启 Gateway(网关)。 |
| **`off`**             | 禁用文件监视。更改在下次手动重启时生效。             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 热应用内容与需要重启的内容对比

大多数字段无需停机即可热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                 | 字段                                                        | 需要重启？ |
| -------------------- | ----------------------------------------------------------- | ---------- |
| 通道                 | `channels.*`, `web`WhatsApp (WhatsApp) - 所有内置和插件频道 | 否         |
| Agent 与模型         | `agent`, `agents`, `models`, `routing`                      | 否         |
| 自动化               | `hooks`, `cron`, `agent.heartbeat`                          | 否         |
| 会话与消息           | `session`, `messages`                                       | 否         |
| 工具与媒体           | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk`        | 否         |
| UI 与杂项            | `ui`, `logging`, `identity`, `bindings`                     | 否         |
| Gateway(网关) 服务器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)        | **是**     |
| 基础设施             | `discovery`, `plugins`                                      | **是**     |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 - 更改它们**不会**触发重启。</Note>

### 重新加载计划

当您编辑通过 `$include` 引用的源文件时，OpenClaw 从
源创作布局规划重新加载，而不是扁平化的内存视图。
这使得热重载决策（热应用与重启）即使在单个顶层部分
位于其自己的包含文件（如 `plugins: { $include: "./plugins.json5" }`）中时
也保持可预测。如果源布局不明确，重载规划将以失败告终。

## 配置 RPC（程序化更新）

对于通过网关 API 写入配置的工具，请首选此流程：

- `config.schema.lookup` 用于检查一个子树（浅层架构节点 + 子摘要）
- `config.get` 用于获取当前快照加上 `hash`
- `config.patch` 用于部分更新（JSON 合并补丁：对象合并，`null`
  删除，数组替换）
- `config.apply` 仅在您打算替换整个配置时使用
- `update.run` 用于显式自我更新并重启；如果重启后会话应运行一次后续轮次，请包含 `continuationMessage`
- `update.status` 用于检查最新的更新重启标记并在重启后验证运行版本

代理应将 `config.schema.lookup` 视为精确字段级文档
和约束的首选查阅点。当它们需要更广泛的配置映射、默认值
或指向专用子系统参考的链接时，请使用 [Configuration reference](/zh/gateway/configuration-reference)。

<Note>控制平面写入（`config.apply`、`config.patch`、`update.run`）被 限制为每个 `deviceId+clientIp` 每 60 秒 3 个请求。 重启请求会合并，然后在重启周期之间强制执行 30 秒的冷却时间。 `update.status` 是只读的，但是管理员范围的，因为重启标记可以 包含更新步骤摘要和命令输出尾部。</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 均接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。当配置已存在时，这两种方法均需要 `baseHash`。

## 环境变量

OpenClaw 从父进程以及以下位置读取环境变量：

- 当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局回退）

这两个文件都不会覆盖现有的环境变量。您还可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）"OpenClaw>
  如果启用且未设置预期键名，OpenClaw 将运行您的登录 shell 并仅导入缺失的键名：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="配置值中的环境变量替换">
  使用 `${VAR_NAME}` 在任何配置字符串值中引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺失/空的变量将在加载时引发错误
- 使用 `$${VAR}` 进行转义以获得字面输出
- 适用于 `$include` 文件内部
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret 引用（env、file、exec）">
  对于支持 SecretRef 对象的字段，您可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 详情（包括 `env`/`file`/`exec` 的 `secrets.providers`）请参阅 [密钥管理](/zh/gateway/secrets)。
支持的凭证路径列于 [SecretRef 凭证覆盖面](/zh/reference/secretref-credential-surface)。

</Accordion>

有关完整的优先级和来源，请参阅 [环境](/zh/help/environment)。

## 完整参考

有关逐字段的完整参考，请参阅 **[配置参考](/zh/gateway/configuration-reference)**。

---

_相关：[配置示例](/zh/gateway/configuration-examples) · [配置参考](/zh/gateway/configuration-reference) · [诊断工具](/zh/gateway/doctor)_

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [配置示例](/zh/gateway/configuration-examples)
- [Gateway(网关) 运维手册](<Gateway(网关)/en/gateway>)
