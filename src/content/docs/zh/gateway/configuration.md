---
summary: "配置概述：常见任务、快速设置以及完整参考的链接"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "配置"
---

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 配置。
活动的配置路径必须是常规文件。不支持符号链接的 `openclaw.json`
布局用于 OpenClaw 拥有的写入；原子写入可能会替换
路径而不是保留符号链接。如果您将配置保留在
默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。

如果文件丢失，OpenClaw 将使用安全的默认值。添加配置的常见原因：

- 连接频道并控制谁可以向机器人发送消息
- 设置模型、工具、沙箱隔离或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

请参阅 [完整参考](/zh/gateway/configuration-reference) 以了解每个可用字段。

代理和自动化应在编辑配置之前使用 `config.schema.lookup` 查看精确的字段级
文档。使用此页面获取面向任务的指导，并使用
[配置参考](/zh/gateway/configuration-reference) 了解更广泛的
字段映射和默认值。

<Tip>**配置新手？** 从 `openclaw onboard` 开始进行交互式设置，或查看 [配置示例](/zh/gateway/configuration-examples) 指南以获取完整的复制粘贴配置。</Tip>

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
  <Tab title="CLI（单行命令）">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="控制界面">打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。 控制界面根据实时配置架构呈现一个表单，包括字段 `title` / `description` 文档元数据，以及可用时的插件和渠道架构， 并提供一个 **Raw JSON** 编辑器作为备用方案。对于下钻 界面和其他工具，Gateway(网关) 还公开 `config.schema.lookup` 以 获取单个路径范围架构节点及其直接子级摘要。</Tab>
  <Tab title="直接编辑">直接编辑 `~/.openclaw/openclaw.json`。Gateway(网关) 会监视该文件并自动应用更改（请参阅 [热重载](#config-hot-reload)）。</Tab>
</Tabs>

## 严格验证

<Warning>OpenClaw 仅接受完全匹配架构的配置。未知键、类型错误或无效值会导致 Gateway(网关) **拒绝启动**。唯一的根级例外是 `$schema` (字符串)，以便编辑器可以附加 JSON 架构元数据。</Warning>

`openclaw config schema` 打印控制界面和验证所使用的规范 JSON 架构。
`config.schema.lookup` 获取单个路径范围节点及
子级摘要，用于下钻工具。字段 `title`/`description` 文档元数据
会传递到嵌套对象、通配符 (`*`)、数组项 (`[]`) 以及 `anyOf`/
`oneOf`/`allOf` 分支。当加载清单注册表时，运行时插件和渠道架构会合并进来。

验证失败时：

- Gateway(网关) 无法启动
- 仅诊断命令有效 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix` (或 `--yes`) 以应用修复

Gateway(网关) 在每次成功启动后会保留一个可信的最新已知良好配置副本。如果 `openclaw.json` 随后验证失败（或丢失 `gateway.mode`、急剧缩减或在开头添加了无关的日志行），OpenClaw 会将损坏的文件另存为 `.clobbered.*`，恢复最新已知良好副本，并记录恢复原因。下一次 Agent 轮次也会收到系统事件警告，以免主 Agent 盲目重写已恢复的配置。当候选项包含被编辑的秘密占位符（例如 `***`）时，将跳过升级为最新已知副本的操作。当所有验证问题都局限于 `plugins.entries.<id>...` 时，OpenClaw 不会执行全文件恢复。它会保持当前配置生效，并暴露插件本地的故障，这样插件架构或主机版本的不匹配就不会回滚不相关的用户设置。

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道 (WhatsApp, Telegram, Discord 等)">
    每个渠道在 `channels.<provider>` 下都有自己的配置部分。有关设置步骤，请参阅专门的渠道页面：

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

    所有渠道共享相同的私信策略模式：

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

  <Accordion title="选择和配置模型">
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

    - `agents.defaults.models` 定义模型目录并充当 `/model` 的允许列表。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加允许列表条目而不删除现有模型。会删除条目的纯替换将被拒绝，除非您传递 `--replace`。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图像的下采样（默认 `1200`）；较低的值通常会在截图密集的运行中减少视觉令牌的使用。
    - 请参阅 [模型 CLI](/zh/concepts/models) 以在聊天中切换模型，并参阅 [模型故障转移](/zh/concepts/model-failover) 了解身份验证轮换和回退行为。
    - 对于自定义/自托管提供商，请参阅参考中的 [自定义提供商](/zh/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发送消息">
    私信访问通过 `dmPolicy` 按渠道进行控制：

    - `"pairing"`（默认）：未知发送者会获得一次性配对代码以供批准
    - `"allowlist"`：仅 `allowFrom` 中的发送者（或配对的允许存储）
    - `"open"`：允许所有入站私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或特定于渠道的允许列表。

    请参阅 [完整参考](/zh/gateway/config-channels#dm-and-group-access) 了解按渠道的详细信息。

  </Accordion>

  <Accordion title="设置群聊提及限制">
    群消息默认**需要提及**。按代理配置模式：

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

    - **元数据提及**：原生 @提及（WhatsApp 点击提及，Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则模式
    - 有关每个渠道覆盖和自聊天模式的更多信息，请参阅[完整参考](/zh/gateway/config-channels#group-chat-mention-gating)。

  </Accordion>

  <Accordion title="按代理限制 Skills">
    使用 `agents.defaults.skills` 作为共享基线，然后使用 `agents.list[].skills` 覆盖特定
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

    - 省略 `agents.defaults.skills` 以默认允许无限制的 Skills。
    - 省略 `agents.list[].skills` 以继承默认值。
    - 设置 `agents.list[].skills: []` 以禁用所有 Skills。
    - 请参阅 [Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config) 和
      [配置参考](/zh/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关在渠道看起来陈旧时重启它们的积极程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 在不禁用全局监控的情况下，为单个渠道或账户禁用自动重启。
    - 有关操作调试，请参阅 [健康检查](/zh/gateway/health)，有关所有字段，请参阅[完整参考](/zh/gateway/configuration-reference#gateway)。

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
    - `threadBindings`: 绑定线程的会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 请参阅 [会话管理](/zh/concepts/session) 了解作用域、身份链接和发送策略。
    - 请参阅 [完整参考](/zh/gateway/config-agents#session) 了解所有字段。

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

    请参阅 [沙箱隔离](/zh/gateway/sandboxing) 获取完整指南，并参阅 [完整参考](/zh/gateway/config-agents#agentsdefaultssandbox) 了解所有选项。

  </Accordion>

  <Accordion title="为官方 iOS 版本启用基于中继的推送">
    基于中继的推送在 `openclaw.json` 中配置。

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

    CLI 等效命令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    其作用如下：

    - 允许网关通过外部中继发送 `push.test`、唤醒提示和重连唤醒。
    - 使用由配对的 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用配对的网关身份，因此其他网关无法重复使用存储的注册。
    - 将本地/手动 iOS 版本保留在直接 APNs 上。基于中继的发送仅适用于通过中继注册的官方分发版本。
    - 必须与官方/TestFlight iOS 版本中内置的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装使用相同中继基础 URL 编译的官方/TestFlight iOS 版本。
    2. 在网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与网关配对，并让节点和操作员会话都连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 有效负载发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒提示和重连唤醒。

    操作说明：

    - 如果您将 iOS 应用切换到不同的网关，请重新连接应用，以便它可以发布绑定到该网关的新中继注册。
    - 如果您发布了指向不同中继部署的新 iOS 版本，应用将刷新其缓存的中继注册，而不是重用旧的中继源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然可以作为临时的环境变量覆盖。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是一个仅限环回的开发逃生舱；不要在配置中持久化 HTTP 中继 URL。

    请参阅 [iOS App](/zh/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，并参阅 [Authentication and trust flow](/zh/platforms/ios#authentication-and-trust-flow) 了解中继安全模型。

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

    - `every`: duration string (`30m`, `2h`)。将 `0m` 设置为禁用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (默认) 或 `block` 用于私信风格的心跳目标
    - 查看 [Heartbeat](/zh/gateway/heartbeat) 获取完整指南。

  </Accordion>

  <Accordion title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: 从 `sessions.json` 中清理已完成的隔离运行会话 (默认 `24h`; 设置 `false` 以禁用)。
    - `runLog`: 根据大小和保留行数清理 `cron/runs/<jobId>.jsonl`。
    - 查看 [Cron jobs](/zh/automation/cron-jobs) 获取功能概述和 CLI 示例。

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
    - 将所有 hook/webhook 载荷内容视为不受信任的输入。
    - 使用专用的 `hooks.token`；不要重用共享的 Gateway(网关) 令牌。
    - Hook 身份验证仅限 Header（`Authorization: Bearer ...` 或 `x-openclaw-token`）；拒绝查询字符串令牌。
    - `hooks.path` 无法 `/`；将 webhook 入口保持在专用子路径上，例如 `/hooks`。
    - 保持不安全内容绕过标志处于禁用状态（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非进行严格范围的调试。
    - 如果启用 `hooks.allowRequestSessionKey`，请同时设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方选择的会话密钥。
    - 对于 hook 驱动的代理，首选强效的现代 模型 层级和严格的 工具 策略（例如，仅限消息传递以及在可能的情况下使用沙箱隔离）。

    查看完整参考文档[完整参考](/zh/gateway/configuration-reference#hooks)以了解所有映射选项和 Gmail 集成。

  </Accordion>

  <Accordion title="配置多代理路由">
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

    查看[多代理](/zh/concepts/multi-agent)和[完整参考](/zh/gateway/config-agents#multi-agent-routing)以了解绑定规则和每个代理的访问配置文件。

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
    - **同级键**：在包含后合并（覆盖包含的值）
    - **嵌套包含**：最多支持 10 层深度
    - **相对路径**：相对于包含的文件解析
    - **OpenClaw 拥有的写入**：当写入仅更改由单文件包含支持的一个顶级部分（例如 `plugins: { $include: "./plugins.json5" }`）时，
      OpenClaw 会更新该包含的文件并保持 `openclaw.json` 不变
    - **不支持的透传写入**：对于 OpenClaw 拥有的写入，根包含、包含数组和具有同级覆盖的包含将以失败告终，而不是扁平化配置
    - **错误处理**：针对文件丢失、解析错误和循环包含提供清晰的错误信息

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway(网关) 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 — 对于大多数设置，无需手动重启。

直接文件编辑在验证之前被视为不受信任。监视器会等待编辑器的临时写入/重命名动荡平息，读取最终文件，并通过恢复最后已知的有效配置来拒绝无效的外部编辑。OpenClaw 拥有的配置写入在写入前使用相同的模式检查；诸如丢弃 `gateway.mode` 或将文件大小缩减一半以上的破坏性覆盖将被拒绝，并保存为 `.rejected.*` 以供检查。

插件本地验证失败是例外情况：如果所有问题都在 `plugins.entries.<id>...` 下，重载将保留当前配置并报告插件问题，而不是恢复 `.last-good`。

如果在日志中看到 `Config auto-restored from last-known-good` 或
`config reload restored last-known-good config`，请检查 `openclaw.json` 旁边匹配的
`.clobbered.*` 文件，修复被拒绝的有效负载，然后运行
`openclaw config validate`。有关恢复检查清单，请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-restored-last-known-good-config)。

### 重载模式

| 模式                 | 行为                                                 |
| -------------------- | ---------------------------------------------------- |
| **`hybrid`**（默认） | 即时热应用安全更改。对于关键更改自动重启。           |
| **`hot`**            | 仅热应用安全更改。当需要重启时记录警告——由您处理。   |
| **`restart`**        | 在任何配置更改（无论是否安全）时重启 Gateway(网关)。 |
| **`off`**            | 禁用文件监视。更改在下次手动重启时生效。             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 热应用内容与需要重启的内容对比

大多数字段可以无停机热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                 | 字段                                                  | 需要重启？ |
| -------------------- | ----------------------------------------------------- | ---------- |
| 通道                 | `channels.*`, `web` (WhatsApp) — 所有内置和插件通道   | 否         |
| Agent 与模型         | `agent`, `agents`, `models`, `routing`                | 否         |
| 自动化               | `hooks`, `cron`, `agent.heartbeat`                    | 否         |
| 会话与消息           | `session`, `messages`                                 | 否         |
| 工具与媒体           | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk`  | 否         |
| UI 与杂项            | `ui`, `logging`, `identity`, `bindings`               | 否         |
| Gateway(网关) 服务器 | `gateway.*`（端口、绑定、认证、tailscale、TLS、HTTP） | **是**     |
| 基础设施             | `discovery`, `canvasHost`, `plugins`                  | **是**     |

<Note>`gateway.reload` 和 `gateway.remote` 是例外——更改它们**不会**触发重启。</Note>

### 重新加载计划

当您编辑通过 `$include` 引用的源文件时，OpenClaw 会根据源文件编写的布局计划重新加载，而不是扁平化的内存视图。即使当单个顶级部分位于其自己的包含文件（例如 `plugins: { $include: "./plugins.json5" }`）中时，这也能保持热重载决策（热应用与重启）的可预测性。如果源布局有歧义，重新加载规划将以失败告终。

## 配置 RPC（程序化更新）

对于通过网关 API 写入配置的工具，请首选此流程：

- `config.schema.lookup` 检查一个子树（浅层模式节点 + 子摘要）
- `config.get` 获取当前快照以及 `hash`
- `config.patch` 用于部分更新（JSON 合并补丁：对象合并，`null` 删除，数组替换）
- 仅当您打算替换整个配置时才使用 `config.apply`
- `update.run` 用于显式自更新并重启
- `update.status` 以检查最新的更新重启标记，并在重启后验证正在运行的版本

Agent 应将 `config.schema.lookup` 视为获取精确字段级文档和约束的首要途径。当它们需要更广泛的配置映射、默认值或指向专用子系统参考的链接时，请使用[配置参考](/zh/gateway/configuration-reference)。

<Note>控制平面写入操作（`config.apply`、`config.patch`、`update.run`）受到速率限制，每个 `deviceId+clientIp` 每 60 秒最多 3 个请求。重启请求会合并，然后在重启周期之间强制执行 30 秒的冷却时间。`update.status` 是只读的，但是是管理员作用域的，因为重启标记可能包含更新步骤摘要和命令输出尾部。</Note>

部分补丁示例：

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。当配置已存在时，这两种方法都需要 `baseHash`。

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

<Accordion title="Shell 环境导入（可选）">
  如果启用且未设置预期键名，OpenClaw 将运行您的登录 Shell 并仅导入缺失的键名：

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
- 缺失/空的变量在加载时抛出错误
- 使用 `$${VAR}` 进行转义以获取字面输出
- 适用于 `$include` 文件内部
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="密钥引用（env, file, exec）">
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

SecretRef 详情（包括用于 `env`/`file`/`exec` 的 `secrets.providers`）请参阅 [密钥管理](/zh/gateway/secrets)。
支持的凭据路径列于 [SecretRef 凭据范围](/zh/reference/secretref-credential-surface)。

</Accordion>

有关完整的优先级和来源，请参阅 [环境](/zh/help/environment)。

## 完整参考

有关完整的逐字段参考，请参阅 **[配置参考](/zh/gateway/configuration-reference)**。

---

_相关：[配置示例](/zh/gateway/configuration-examples) · [配置参考](/zh/gateway/configuration-reference) · [诊断工具](/zh/gateway/doctor)_

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [配置示例](/zh/gateway/configuration-examples)
- [Gateway(网关) 运维手册](/zh/gateway)
