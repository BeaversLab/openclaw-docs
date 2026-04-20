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

如果文件缺失，OpenClaw 会使用安全的默认值。添加配置的常见原因：

- 连接频道并控制谁可以向机器人发送消息
- 设置模型、工具、沙箱隔离 或自动化 (cron, hooks)
- 调整会话、媒体、网络或 UI

有关所有可用字段，请参阅[完整参考](/zh/gateway/configuration-reference)。

<Tip>**不熟悉配置？** 从 `openclaw onboard` 开始进行交互式设置，或查看[配置示例](/zh/gateway/configuration-examples)指南以获取完整的复制粘贴配置。</Tip>

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
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。 Control UI 根据实时配置架构渲染表单，包括字段 `title` / `description` 文档元数据，以及插件和渠道架构（如果 可用），并提供 **Raw JSON** 编辑器作为备选方案。对于深入 UI 和其他工具，网关还公开了 `config.schema.lookup` 用于 获取单个路径范围的架构节点及其直接子级摘要。</Tab>
  <Tab title="Direct edit">直接编辑 `~/.openclaw/openclaw.json`。Gateway(网关) 会监视该文件并自动应用更改（请参阅[热重载](#config-hot-reload)）。</Tab>
</Tabs>

## 严格验证

<Warning>OpenClaw 仅接受完全匹配架构的配置。未知键、格式错误的类型或无效值会导致 Gateway(网关) **拒绝启动**。唯一的根级别例外是 `$schema`（字符串），以便编辑器可以附加 JSON Schema 元数据。</Warning>

架构工具说明：

- `openclaw config schema` 打印与 Control UI 和配置验证所使用的相同的 JSON Schema 系列。
- 将该架构输出视为
  `openclaw.json` 的规范机器可读合约；
  本概述和配置参考对其进行了汇总。
- 字段 `title` 和 `description` 值会被携带到架构输出中，
  用于编辑器和表单工具。
- 嵌套对象、通配符 (`*`) 和数组项 (`[]`) 条目继承相同的
  文档元数据，前提是存在匹配的字段文档。
- `anyOf` / `oneOf` / `allOf` 组合分支也继承相同的文档
  元数据，因此联合/交集变体保持相同的字段帮助。
- `config.schema.lookup` 返回一个标准化配置路径，并附带一个浅层
  架构节点（`title`、`description`、`type`、`enum`、`const`、通用边界
  和类似的验证字段）、匹配的 UI 提示元数据，以及用于深入
  工具的直接子级摘要。
- 当 Gateway 能够加载当前的清单注册表时，运行时插件/渠道架构会被合并进来。
- `pnpm config:docs:check` 检测面向文档的配置基线构件与当前架构表面之间的偏差。

验证失败时：

- Gateway(网关) 无法启动
- 仅诊断命令有效 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix` (或 `--yes`) 以应用修复

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道 (WhatsApp, Telegram, Discord 等)">
    每个渠道在 `channels.<provider>` 下都有自己的配置部分。请参阅专门的渠道页面了解设置步骤：

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

  <Accordion title="选择并配置模型">
    设置主模型和可选的备选模型：

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

    - `agents.defaults.models` 定义模型目录并作为 `/model` 的允许列表。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图片的缩小（默认 `1200`）；较低的值通常可以减少大量截图运行时的视觉 Token 使用量。
    - 请参阅 [模型 CLI](/zh/concepts/models) 以在聊天中切换模型，并参阅 [模型故障转移](/zh/concepts/model-failover) 以了解认证轮换和故障转移行为。
    - 对于自定义/自托管提供商，请参阅参考文档中的 [自定义提供商](/zh/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以给机器人发消息">
    私信访问通过 `dmPolicy` 按渠道进行控制：

    - `"pairing"`（默认）：未知发送者会获得一次性配对码以供批准
    - `"allowlist"`：仅 `allowFrom` 中的发送者（或已配对的允许存储）
    - `"open"`：允许所有入站私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或特定于渠道的允许列表。

    有关每个渠道的详细信息，请参阅 [完整参考](/zh/gateway/configuration-reference#dm-and-group-access)。

  </Accordion>

  <Accordion title="设置群聊提及门槛">
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

    - **元数据提及**：原生 @提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则模式
    - 有关每个渠道的覆盖和自聊模式，请参阅 [完整参考](/zh/gateway/configuration-reference#group-chat-mention-gating)。

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

    - 省略 `agents.defaults.skills` 以默认使用不受限的 Skills。
    - 省略 `agents.list[].skills` 以继承默认值。
    - 将 `agents.list[].skills: []` 设置为无 Skills。
    - 请参阅 [Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config) 和
      [配置参考](/zh/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="调整网关渠道健康监控">
    控制网关重启看起来陈旧的渠道的积极程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 为单个渠道或账户禁用自动重启，而无需禁用全局监控。
    - 参见 [Health Checks](/zh/gateway/health) 了解操作调试和 [full reference](/zh/gateway/configuration-reference#gateway) 了解所有字段。

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
    - `threadBindings`: 线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 参见 [Session Management](/zh/concepts/session) 了解作用域、身份链接和发送策略。
    - 参见 [full reference](/zh/gateway/configuration-reference#session) 了解所有字段。

  </Accordion>

  <Accordion title="启用沙箱隔离">
    在隔离的 Docker 容器中运行代理会话：

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

    查看 [沙箱隔离](/zh/gateway/sandboxing) 获取完整指南，并查看 [full reference](/zh/gateway/configuration-reference#agentsdefaultssandbox) 了解所有选项。

  </Accordion>

  <Accordion title="为官方 iOS 构建启用基于中继的推送">
    基于中继的推送在 `openclaw.json` 中配置。

    在网关配置中设置此项：

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

    CLI 等效方式：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此项的作用：

    - 允许网关通过外部中继发送 `push.test`、唤醒轻推和重连唤醒。
    - 使用配对的 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用配对的网关身份，因此其他网关无法重用存储的注册。
    - 将本地/手动 iOS 构建保留在直接 APNs 上。基于中继的发送仅适用于通过中继注册的官方分发构建。
    - 必须与官方/TestFlight iOS 构建中 baked-in 的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装使用相同中继基础 URL 编译的官方/TestFlight iOS 构建。
    2. 在网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与网关配对，并让节点和操作员会话都连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 载荷发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后将其用于 `push.test`、唤醒轻推和重连唤醒。

    操作说明：

    - 如果将 iOS 应用切换到不同的网关，请重新连接应用，以便其发布绑定到该网关的新中继注册。
    - 如果发布指向不同中继部署的新 iOS 构建，应用将刷新其缓存的中继注册，而不是重用旧的中继源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时环境覆盖使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是一个仅限回环开发的应急方案；不要在配置中持久化 HTTP 中继 URL。

    请参阅 [iOS 应用](/zh/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，并参阅 [身份验证和信任流程](/zh/platforms/ios#authentication-and-trust-flow) 了解中继安全模型。

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

    - `every`: duration string (`30m`, `2h`)。设置为 `0m` 以禁用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (默认) 或 `block` 用于私信风格的心跳目标
    - 参见 [Heartbeat](/zh/gateway/heartbeat) 了解完整指南。

  </Accordion>

  <Accordion title="配置 cron 任务">
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

    - `sessionRetention`: 从 `sessions.json` 中清除已完成的隔离运行会话 (默认 `24h`; 设置 `false` 以禁用)。
    - `runLog`: 根据大小和保留行数清除 `cron/runs/<jobId>.jsonl`。
    - 参见 [Cron jobs](/zh/automation/cron-jobs) 了解功能概述和 CLI 示例。

  </Accordion>

  <Accordion title="设置 webhooks (hooks)">
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

    安全说明：
    - 将所有 hook/webhook 负载内容视为不受信任的输入。
    - 使用专用的 `hooks.token`；请勿重用共享的 Gateway(网关) 令牌。
    - Hook 认证仅限 Header（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串令牌会被拒绝。
    - `hooks.path` 不能被 `/`；将 webhook 入口保留在专用子路径上，例如 `/hooks`。
    - 保持不安全内容绕过标志为禁用状态（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非正在进行严格范围的调试。
    - 如果启用 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方选择的会话密钥。
    - 对于 hook 驱动的代理，首选强大的现代模型层级和严格的工具策略（例如仅限消息传递并在可能的情况下进行沙箱隔离）。

    请参阅[完整参考](/zh/gateway/configuration-reference#hooks)了解所有映射选项和 Gmail 集成。

  </Accordion>

  <Accordion title="配置多代理路由">
    使用独立的工作空间和会话运行多个隔离的代理：

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

    请参阅[多代理](/zh/concepts/multi-agent)和[完整参考](/zh/gateway/configuration-reference#multi-agent-routing)了解绑定规则和每代理访问配置文件。

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

    - **单个文件**：替换包含对象
    - **文件数组**：按顺序深度合并（后者覆盖前者）
    - **同级键**：在包含后合并（覆盖包含的值）
    - **嵌套包含**：支持最多 10 层深度
    - **相对路径**：相对于包含文件解析
    - **错误处理**：针对缺失文件、解析错误和循环包含提供明确的错误提示

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway(网关) 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 —— 对于大多数设置，无需手动重启。

### 重新加载模式

| 模式                 | 行为                                                 |
| -------------------- | ---------------------------------------------------- |
| **`hybrid`**（默认） | 立即热应用安全更改。对于关键更改，自动重启。         |
| **`hot`**            | 仅热应用安全更改。当需要重启时记录警告 —— 由您处理。 |
| **`restart`**        | 在任何配置更改（无论是否安全）时重启 Gateway(网关)。 |
| **`off`**            | 禁用文件监视。更改在下次手动重启时生效。             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 热应用内容与需要重启的内容

大多数字段可以在无停机的情况下热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                 | 字段                                                      | 需要重启？ |
| -------------------- | --------------------------------------------------------- | ---------- |
| 渠道                 | `channels.*`、`web` (WhatsApp) —— 所有内置和扩展渠道      | 否         |
| Agent 和模型         | `agent`、`agents`、`models`、`routing`                    | 否         |
| 自动化               | `hooks`、`cron`、`agent.heartbeat`                        | 否         |
| 会话和消息           | `session`、`messages`                                     | 否         |
| 工具和媒体           | `tools`、`browser`、`skills`、`audio`、`talk`             | 否         |
| UI 和其他            | `ui`、`logging`、`identity`、`bindings`                   | 否         |
| Gateway(网关) 服务器 | `gateway.*`（端口、绑定、身份验证、Tailscale、TLS、HTTP） | **是**     |
| 基础设施             | `discovery`、`canvasHost`、`plugins`                      | **是**     |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 —— 更改它们**不会**触发重启。</Note>

## 配置 RPC（以编程方式更新）

<Note>控制平面写入 RPC（`config.apply`、`config.patch`、`update.run`）受到速率限制，每个 `deviceId+clientIp` 每 60 秒最多 **3 个请求**。受限时，RPC 会返回带有 `retryAfterMs` 的 `UNAVAILABLE`。</Note>

安全/默认流程：

- `config.schema.lookup`：使用浅层模式节点、匹配的提示元数据和直接子级摘要来检查一个路径范围的配置子树
- `config.get`：获取当前快照 + 哈希
- `config.patch`：首选的部分更新路径
- `config.apply`：仅限完整配置替换
- `update.run`：显式自我更新 + 重启

如果不替换整个配置，请首选 `config.schema.lookup`，
然后使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    验证并写入完整配置，然后一步重启 Gateway(网关)。

    <Warning>
    `config.apply` 会替换**整个配置**。请使用 `config.patch` 进行部分更新，或使用 `openclaw config set` 更新单个键。
    </Warning>

    参数：

    - `raw` (string) — 整个配置的 JSON5 载荷
    - `baseHash` (可选) — 来自 `config.get` 的配置哈希（配置存在时必需）
    - `sessionKey` (可选) — 用于重启后唤醒 ping 的 会话 key
    - `note` (可选) — 重启标记的注释
    - `restartDelayMs` (可选) — 重启前的延迟（默认为 2000）

    当一个重启请求已经挂起或正在传输时，后续的重启请求会被合并，并且在重启周期之间应用 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (partial update)">
    将部分更新合并到现有配置中（JSON 合并补丁语义）：

    - 对象递归合并
    - `null` 删除一个键
    - 数组替换

    参数：

    - `raw` (string) — 仅包含要更改的键的 JSON5
    - `baseHash` (required) — 来自 `config.get` 的配置哈希
    - `sessionKey`, `note`, `restartDelayMs` — 与 `config.apply` 相同

    重启行为与 `config.apply` 匹配：合并待处理的重启，并在重启周期之间有 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

OpenClaw 从父进程以及以下位置读取环境变量：

- 当前工作目录中的 `.env`（如果存在）
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

<Accordion title="Shell env import (optional)">
  如果启用且未设置预期键名，OpenClaw 将运行您的登录 shell 并仅导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的环境变量：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  在任何配置字符串值中使用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺失/空的变量会在加载时报错
- 使用 `$${VAR}` 进行转义以获取字面输出
- 适用于 `$include` 文件内部
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  对于支持 SecretRef 对象的字段，你可以使用：

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

SecretRef 的详细信息（包括 `secrets.providers` 用于 `env`/`file`/`exec`）请参见[密钥管理](/zh/gateway/secrets)。
支持的凭据路径列在 [SecretRef 凭据范围](/zh/reference/secretref-credential-surface) 中。

</Accordion>

有关完整的优先级和来源，请参见[环境](/zh/help/environment)。

## 完整参考

有关完整的逐字段参考，请参阅 **[配置参考](/zh/gateway/configuration-reference)**。

---

_相关：[配置示例](/zh/gateway/configuration-examples) · [配置参考](/zh/gateway/configuration-reference) · [诊断工具](/zh/gateway/doctor)_
