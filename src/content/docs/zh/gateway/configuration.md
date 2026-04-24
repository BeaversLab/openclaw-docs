---
summary: "配置概述：常见任务、快速设置以及完整参考的链接"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "配置"
---

# 配置

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 配置。
活动配置路径必须是常规文件。不支持 OpenClaw 拥有写入权限的符号链接 `openclaw.json` 布局；原子写入可能会替换该路径而不是保留符号链接。如果您将配置保留在默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。

如果文件缺失，OpenClaw 会使用安全的默认值。添加配置的常见原因：

- 连接频道并控制谁可以向机器人发送消息
- 设置模型、工具、沙箱隔离 或自动化 (cron, hooks)
- 调整会话、媒体、网络或 UI

有关所有可用字段，请参阅[完整参考](/zh/gateway/configuration-reference)。

<Tip>**配置新手？** 从 `openclaw onboard` 开始进行交互式设置，或查看[配置示例](/zh/gateway/configuration-examples)指南以获取完整的复制粘贴配置。</Tip>

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
  <Tab title="CLI (单行命令)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。 Control UI 根据实时配置 schema 渲染一个表单，包括字段 `title` / `description` 文档元数据，以及在可用时的插件和渠道 schema，并附带一个 **Raw JSON** 编辑器作为应急手段。对于下钻式 UI 和其他工具，Gateway 还提供了 `config.schema.lookup` 用于 获取单个路径范围的 schema 节点及其直接子级摘要。</Tab>
  <Tab title="Direct edit">直接编辑 `~/.openclaw/openclaw.json`。Gateway(网关) 会监视该文件并自动应用更改（参见 [热重载](#config-hot-reload)）。</Tab>
</Tabs>

## 严格验证

<Warning>OpenClaw 仅接受完全匹配架构的配置。未知的键、格式错误的类型或无效的值会导致 Gateway(网关) **拒绝启动**。唯一的根级例外是 `$schema`（字符串），以便编辑器可以附加 JSON Schema 元数据。</Warning>

架构工具说明：

- `openclaw config schema` 打印与 Control UI 和配置验证所使用的相同的 JSON Schema 系列。
- 将该架构输出视为 `openclaw.json` 的规范机器可读契约；本概述和配置参考对其进行了总结。
- 字段 `title` 和 `description` 值会被带入架构输出中，用于编辑器和表单工具。
- 嵌套对象、通配符 (`*`) 和数组项 (`[]`) 条目会继承相同的文档元数据，只要存在匹配的字段文档。
- `anyOf` / `oneOf` / `allOf` 组合分支也会继承相同的文档元数据，因此联合/交集变体保持相同的字段帮助。
- `config.schema.lookup` 返回一个标准化的配置路径，其中包含一个浅层模式节点（`title`、`description`、`type`、`enum`、`const`、通用边界以及类似的验证字段）、匹配的 UI 提示元数据，以及用于深入挖掘工具的直接子级摘要。
- 当 Gateway 可以加载当前清单注册表时，运行时插件/渠道架构会被合并进来。
- `pnpm config:docs:check` 会检测面向文档的配置基线工件与当前架构表面之间的偏差。

验证失败时：

- Gateway(网关) 无法启动
- 仅诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix`（或 `--yes`）以应用修复

Gateway(网关) 还会在成功启动后保留一份受信任的“上次已知正常”副本。如果 `openclaw.json` 随后在 OpenClaw 外部被更改且不再通过验证，启动和热重载会将损坏的文件保存为带有时间戳的 `.clobbered.*` 快照，恢复上次已知正常的副本，并记录一条包含恢复原因的显眼警告。当上次已知正常的副本包含这些字段时，启动读取恢复还会将大幅的文件大小下降、缺失的配置元数据以及缺失的 `gateway.mode` 视为关键的覆盖签名。如果在原本有效的 JSON 配置前意外添加了状态/日志行，gateway(网关) 启动和 `openclaw doctor --fix` 可以去除该前缀，将受污染的文件保存为 `.clobbered.*`，并使用恢复的 JSON 继续运行。下一次主代理轮次也会收到系统事件警告，指示配置已恢复，不得盲目重写。在验证启动和接受的热重载之后，包括 OpenClaw 拥有的且持久化文件哈希仍与接受的写入相匹配的配置写入，会更新上次已知正常的升级。当候选配置包含被编辑的秘密占位符（例如 `***`）或缩短的令牌值时，将跳过升级。

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道在 `channels.<provider>` 下都有自己的配置部分。请参阅相应的渠道页面以获取设置步骤：

    - [WhatsApp](/zh/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh/channels/telegram) — `channels.telegram`
    - [Discord](/zh/channels/discord) — `channels.discord`
    - [Feishu](/zh/channels/feishu) — `channels.feishu`
    - [Google Chat](/zh/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/zh/channels/msteams) — `channels.msteams`
    - [Slack](/zh/channels/slack) — `channels.slack`
    - [Signal](/zh/channels/signal) — `channels.signal`
    - [iMessage](/zh/channels/imessage) — `channels.imessage`
    - [Mattermost](/zh/channels/mattermost) — `channels.mattermost`

    所有渠道共享相同的私信（私信）策略模式：

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
    设置主模型和可选的备用模型：

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

    - `agents.defaults.models` 定义了模型目录，并作为 `/model` 的允许列表。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加允许列表条目而不删除现有模型。除非传递 `--replace`，否则拒绝删除条目的普通替换操作。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制抄本/工具图像的下采样（默认为 `1200`）；较低的值通常可以减少在大量截图运行时的视觉令牌使用量。
    - 请参阅 [Models CLI](/zh/concepts/models) 以在聊天中切换模型，并参阅 [Model Failover](/zh/concepts/model-failover) 了解身份验证轮换和备用行为。
    - 对于自定义/自托管提供商，请参阅参考中的 [Custom providers](/zh/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发送消息">
    私信访问通过 `dmPolicy` 按渠道进行控制：

    - `"pairing"`（默认）：未知发送者会获得一次性配对代码以供批准
    - `"allowlist"`：仅 `allowFrom` 中的发送者（或已配对的允许存储）
    - `"open"`：允许所有入站私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或特定于渠道的允许列表。

    有关每个渠道的详细信息，请参阅 [完整参考](/zh/gateway/configuration-reference#dm-and-group-access)。

  </Accordion>

  <Accordion title="设置群组聊天提及门控">
    群组消息默认为 **需要提及**。按代理配置模式：

    ```json5
    {
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

    - **元数据提及**：原生的 @-提及（WhatsApp 点击提及，Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则表达式模式
    - 参见 [完整参考](/zh/gateway/configuration-reference#group-chat-mention-gating) 了解每个渠道的覆盖和自聊模式。

  </Accordion>

  <Accordion title="限制每个代理的技能">
    使用 `agents.defaults.skills` 作为共享基准，然后使用 `agents.list[].skills` 覆盖特定
    代理：

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

    - 省略 `agents.defaults.skills` 以默认允许不受限的技能。
    - 省略 `agents.list[].skills` 以继承默认值。
    - 设置 `agents.list[].skills: []` 以禁用所有技能。
    - 请参阅 [Skills](/zh/tools/skills)、[Skills config](/zh/tools/skills-config) 和
      [Configuration Reference](/zh/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关重启看起来已过时的渠道的积极程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 可在不禁用全局监控的情况下，为单个渠道或账户禁用自动重启。
    - 参见 [Health Checks](/zh/gateway/health) 了解操作调试，以及 [full reference](/zh/gateway/configuration-reference#gateway) 了解所有字段。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话的连续性和隔离性：

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
    - `threadBindings`: 线程绑定会话路由的全局默认值 (Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 请参阅 [会话管理](/zh/concepts/session) 了解作用域、身份链接和发送策略。
    - 请参阅 [完整参考](/zh/gateway/configuration-reference#session) 了解所有字段。

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

    首先构建镜像：`scripts/sandbox-setup.sh`

    有关完整指南，请参阅[沙箱隔离](/zh/gateway/sandboxing)；有关所有选项，请参阅[完整参考](/zh/gateway/configuration-reference#agentsdefaultssandbox)。

  </Accordion>

  <Accordion title="为官方 iOS 版本启用基于中继的推送">
    基于 Relay 的推送在 `openclaw.json` 中配置。

    在网关配置中进行设置：

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
    ```

    CLI 等效项：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    作用：

    - 允许网关通过外部中继发送 `push.test`、唤醒轻推和重连唤醒。
    - 使用由配对的 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用配对的网关身份，因此另一个网关无法重用存储的注册。
    - 将本地/手动 iOS 版本保留在直接 APNs 上。基于中继的发送仅适用于通过中继注册的官方分发版本。
    - 必须与官方 / TestFlight iOS 版本中内置的中继基础 URL 匹配，以便注册和发送流量到达相同的中继部署。

    端到端流程：

    1. 安装使用相同中继基础 URL 编译的官方 / TestFlight iOS 版本。
    2. 在网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与网关配对，并让节点和操作员会话连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 负载发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒轻推和重连唤醒。

    操作说明：

    - 如果将 iOS 应用切换到不同的网关，请重新连接应用，以便它可以发布绑定到该网关的新中继注册。
    - 如果发布指向不同中继部署的新 iOS 版本，应用将刷新其缓存的中继注册，而不是重用旧的中继源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时的环境变量覆盖使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是一个仅限回环的开发逃生舱；请勿在配置中持久化 HTTP 中继 URL。

    请参阅 [iOS App](/zh/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，并参阅 [身份验证和信任流程](/zh/platforms/ios#authentication-and-trust-flow) 了解中继安全模型。

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

    - `every`: 持续时间字符串（`30m`，`2h`）。设置为 `0m` 以禁用。
    - `target`: `last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`: `allow`（默认）或 `block`，用于私信风格的心跳目标
    - 有关完整指南，请参阅 [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="配置定时任务">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：从 `sessions.json` 中清理已完成的独立运行会话（默认 `24h`；设置 `false` 以禁用）。
    - `runLog`：根据大小和保留行数清理 `cron/runs/<jobId>.jsonl`。
    - 请参阅 [Cron jobs](/zh/automation/cron-jobs) 了解功能概述和 CLI 示例。

  </Accordion>

  <Accordion title="设置 Webhook (hooks)">
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
    - 使用专用的 `hooks.token`；不要重用共享的 Gateway(网关) 令牌。
    - Hook 认证仅通过标头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串令牌将被拒绝。
    - `hooks.path` 不能 `/`；请将 webhook 入口保持在专用子路径上，例如 `/hooks`。
    - 保持不安全内容绕过标志为禁用状态（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非进行严格范围的调试。
    - 如果启用 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方选择的会话密钥。
    - 对于由 hook 驱动的代理，首选强大的现代模型层级和严格的工具策略（例如，仅限消息传递以及在可能的情况下进行沙箱隔离）。

    有关所有映射选项和 Gmail 集成，请参阅 [完整参考](/zh/gateway/configuration-reference#hooks)。

  </Accordion>

  <Accordion title="配置多代理路由">
    运行多个具有独立工作区和会话的隔离代理：

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

    查阅 [多代理](/zh/concepts/multi-agent) 和 [完整参考](/zh/gateway/configuration-reference#multi-agent-routing) 了解绑定规则和每个代理的访问配置文件。

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
    - **同级键**：在 include 之后合并（覆盖包含的值）
    - **嵌套 include**：最多支持 10 层深度
    - **相对路径**：相对于包含文件解析
    - **OpenClaw 拥有的写入**：当写入操作仅更改由单文件 include（如 `plugins: { $include: "./plugins.json5" }`）支持的一个顶级部分时，
      OpenClaw 会更新该包含的文件并保持 `openclaw.json` 不变
    - **不支持的透传写入**：根 includes、include 数组以及带有同级覆盖的 includes 会针对 OpenClaw 拥有的写入执行失败关闭（fail closed），而不是展平配置
    - **错误处理**：针对文件缺失、解析错误和循环 includes 提供清晰的错误提示

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway(网关) 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 —— 大多数设置无需手动重启。

直接的文件编辑在通过验证之前被视为不受信任。监视器会等待编辑器的临时写入/重命名平息，读取最终文件，并通过恢复上次已知的有效配置来拒绝无效的外部编辑。OpenClaw 的配置写入在写入前使用相同的模式闸；诸如丢弃 `gateway.mode` 或将文件缩小超过一半的破坏性覆盖操作将被拒绝，并保存为 `.rejected.*` 以供检查。

如果在日志中看到 `Config auto-restored from last-known-good` 或
`config reload restored last-known-good config`，请检查 `openclaw.json` 旁边匹配的
`.clobbered.*` 文件，修复被拒绝的有效载荷，然后运行
`openclaw config validate`。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-restored-last-known-good-config)
了解恢复清单。

### 重载模式

| 模式                 | 行为                                                 |
| -------------------- | ---------------------------------------------------- |
| **`hybrid`**（默认） | 即时热应用安全更改。对于关键更改，自动重启。         |
| **`hot`**            | 仅热应用安全更改。需要重启时记录警告——由您处理。     |
| **`restart`**        | 在任何配置更改（无论是否安全）时重启 Gateway(网关)。 |
| **`off`**            | 禁用文件监视。更改在下次手动重启时生效。             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 什么热应用 vs 什么需要重启

大多数字段可以在不停机的情况下热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                 | 字段                                                  | 需要重启？ |
| -------------------- | ----------------------------------------------------- | ---------- |
| 渠道                 | `channels.*`，`web` (WhatsApp) — 所有内置和插件渠道   | 否         |
| 代理与模型           | `agent`, `agents`, `models`, `routing`                | 否         |
| 自动化               | `hooks`, `cron`, `agent.heartbeat`                    | 否         |
| 会话与消息           | `session`, `messages`                                 | 否         |
| 工具与媒体           | `tools`, `browser`, `skills`, `audio`, `talk`         | 否         |
| UI 与杂项            | `ui`, `logging`, `identity`, `bindings`               | 否         |
| Gateway(网关) 服务器 | `gateway.*`（端口、绑定、认证、tailscale、TLS、HTTP） | **是**     |
| 基础设施             | `discovery`, `canvasHost`, `plugins`                  | **是**     |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 —— 更改它们**不会**触发重启。</Note>

### 重新加载规划

当您编辑通过 `$include` 引用的源文件时，OpenClaw 会根据源文件编写的布局来规划重新加载，而不是扁平化的内存视图。
这使得热重新加载决策（热应用还是重启）即使在一个顶层部分位于其自己的包含文件（如
`plugins: { $include: "./plugins.json5" }`）中时也是可预测的。

如果无法安全规划重新加载 —— 例如，因为源布局将根包含与同级覆盖结合在一起 —— OpenClaw 将以失败封闭（fail-closed）方式处理，记录原因，并保留当前运行的配置，以便您可以修复源形状，而不是静默回退到扁平化重新加载。

## 配置 RPC（编程更新）

<Note>控制平面写入 RPC（`config.apply`、`config.patch`、`update.run`）的速率限制为每个 `deviceId+clientIp` **60 秒内 3 个请求**。受限时，RPC 返回 `UNAVAILABLE` 并带有 `retryAfterMs`。</Note>

安全/默认流程：

- `config.schema.lookup`：使用浅层模式节点、匹配的提示元数据和直接子摘要检查一个作用于路径的配置子树
- `config.get`：获取当前快照 + 哈希
- `config.patch`：首选的部分更新路径
- `config.apply`：仅限完整配置替换
- `update.run`：显式自我更新 + 重启

当您不替换整个配置时，请优先使用 `config.schema.lookup`
然后 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    验证 + 写入完整配置并在一步内重启 Gateway(网关)。

    <Warning>
    `config.apply` 会替换**整个配置**。请使用 `config.patch` 进行部分更新，或使用 `openclaw config set` 更新单个键。
    </Warning>

    参数:

    - `raw` (string) — 整个配置的 JSON5 载荷
    - `baseHash` (optional) — 来自 `config.get` 的配置哈希（配置存在时必须）
    - `sessionKey` (optional) — 用于重启后唤醒 ping 的会话密钥
    - `note` (optional) — 重启标记的备注
    - `restartDelayMs` (optional) — 重启前的延迟（默认 2000）

    当一个重启请求已经挂起/正在处理时，后续请求会被合并，并且在重启周期之间应用 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (部分更新)">
    将部分更新合并到现有配置中（JSON 合并补丁语义）：

    - 对象递归合并
    - `null` 删除一个键
    - 数组替换

    参数：

    - `raw` (字符串) — 仅包含要更改的键的 JSON5
    - `baseHash` (必需) — 来自 `config.get` 的配置哈希
    - `sessionKey`, `note`, `restartDelayMs` — 同 `config.apply`

    重启行为与 `config.apply` 匹配：合并待处理的重启，且重启周期之间有 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

OpenClaw 从父进程读取环境变量，外加：

- 从当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局后备）

这两个文件都不会覆盖现有的环境变量。您还可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）">
  如果启用此选项且未设置预期键名，OpenClaw 将运行您的登录 shell 并仅导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`

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
- 缺失/空的变量会在加载时抛出错误
- 使用 `$${VAR}` 进行转义以获取字面输出
- 适用于 `$include` 文件内部
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
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

SecretRef 的详细信息（包括 `secrets.providers` 用于 `env`/`file`/`exec`）请参见 [Secrets Management](/zh/gateway/secrets)。
支持的凭证路径列在 [SecretRef Credential Surface](/zh/reference/secretref-credential-surface) 中。

</Accordion>

有关完整的优先级和来源，请参见 [Environment](/zh/help/environment)。

## 完整参考

有关逐字段的完整参考，请参见 **[Configuration Reference](/zh/gateway/configuration-reference)**。

---

_相关：[配置示例](/zh/gateway/configuration-examples) · [配置参考](/zh/gateway/configuration-reference) · [Doctor](/zh/gateway/doctor)_
