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

查看[完整参考](/zh/gateway/configuration-reference)以了解所有可用字段。

<Tip>
  **配置新手？** 从 `openclaw onboard`
  开始进行交互式设置，或查看[配置示例](/zh/gateway/configuration-examples)指南以获取完整的复制粘贴配置。
</Tip>

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
  <Tab title="Interactive wizard">
    ```bash openclaw onboard # full setup wizard openclaw configure # config wizard ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash openclaw config get agents.defaults.workspace openclaw config set
    agents.defaults.heartbeat.every "2h" openclaw config unset tools.web.search.apiKey ```
  </Tab>
  <Tab title="控制 UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config**（配置）选项卡。 控制 UI
    会根据配置 schema 渲染一个表单，并提供 **Raw JSON** 编辑器作为应急手段。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json`。Gateway(网关) 网关会监视该文件并自动应用更改（参见
    [热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格验证

<Warning>
  OpenClaw 仅接受完全匹配架构的配置。未知的键、格式错误的类型或无效的值会导致 Gateway
  **拒绝启动**。唯一的根级例外是 `$schema`（字符串），以便编辑器可以附加 JSON 架构元数据。
</Warning>

验证失败时：

- Gateway 无法启动
- 仅诊断命令可用 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix` (或 `--yes`) 应用修复

## 常见任务

<AccordionGroup>
  <Accordion title="设置渠道 (WhatsApp、Telegram、Discord 等)">
    每个渠道在 `channels.<provider>` 下都有自己的配置部分。请参阅专门的渠道页面了解设置步骤：

    - [WhatsApp](/zh/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh/channels/telegram) — `channels.telegram`
    - [Discord](/zh/channels/discord) — `channels.discord`
    - [Slack](/zh/channels/slack) — `channels.slack`
    - [Signal](/zh/channels/signal) — `channels.signal`
    - [iMessage](/zh/channels/imessage) — `channels.imessage`
    - [Google Chat](/zh/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/zh/channels/mattermost) — `channels.mattermost`
    - [MS Teams](/zh/channels/msteams) — `channels.msteams`

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
    设置主模型和可选的回退模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录并充当 `/model` 的允许列表。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图像的缩放（默认为 `1200`）；较低的值通常会减少截图密集型运行中的视觉令牌使用量。
    - 请参阅 [模型 CLI](/zh/concepts/models) 以在聊天中切换模型，并参阅 [模型故障转移](/zh/concepts/model-failover) 以了解身份验证轮换和回退行为。
    - 对于自定义/自托管提供商，请参阅参考中的 [自定义提供商](/zh/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以向机器人发送消息">
    私信访问是通过 `dmPolicy` 按渠道控制的：

    - `"pairing"`（默认）：未知发送者会收到一次性配对码以供批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或已配对的允许存储）
    - `"open"`：允许所有传入私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或特定于渠道的允许列表。

    请参阅 [完整参考资料](/zh/gateway/configuration-reference#dm-and-group-access) 了解按渠道的详细信息。

  </Accordion>

  <Accordion title="设置群聊提及门控">
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

    - **元数据提及**：原生的 @-提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的正则模式
    - 有关按渠道覆盖和自聊模式，请参阅 [完整参考](/zh/gateway/configuration-reference#group-chat-mention-gating)。

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
    - `threadBindings`: 线程绑定会话路由的全局默认设置（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 参阅 [会话管理](/zh/concepts/session) 了解作用域、身份链接和发送策略。
    - 参阅 [完整参考](/zh/gateway/configuration-reference#session) 了解所有字段。

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

    请参阅 [沙箱隔离](/zh/gateway/sandboxing) 以获取完整指南，并参阅 [完整参考](/zh/gateway/configuration-reference#sandbox) 以了解所有选项。

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

    CLI 等效项：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此项功能的作用：

    - 允许网关通过外部中继发送 `push.test`、唤醒提示和重连唤醒。
    - 使用由配对的 iOS 应用转发的注册范围发送授权。网关不需要部署范围的中继令牌。
    - 将每个基于中继的注册绑定到 iOS 应用配对的网关身份，因此另一个网关无法重用存储的注册。
    - 保持本地/手动 iOS 构建使用直接 APNs。基于中继的发送仅适用于通过中继注册的官方分发构建。
    - 必须与内置于官方/TestFlight iOS 构建中的中继基础 URL 匹配，以便注册和发送流量到达同一个中继部署。

    端到端流程：

    1. 安装使用相同中继基础 URL 编译的官方/TestFlight iOS 构建。
    2. 在网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用配对到网关，并让节点和操作员会话都连接。
    4. iOS 应用获取网关身份，使用 App Attest 和应用收据向中继注册，然后将基于中继的 `push.apns.register` 负载发布到配对的网关。
    5. 网关存储中继句柄和发送授权，然后将它们用于 `push.test`、唤醒提示和重连唤醒。

    操作说明：

    - 如果将 iOS 应用切换到不同的网关，请重新连接应用，以便它可以发布绑定到该网关的新中继注册。
    - 如果发布指向不同中继部署的新 iOS 构建，应用将刷新其缓存的中继注册，而不是重用旧的中继源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然可以作为临时环境变量覆盖。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是仅限环回的开发逃生舱；不要在配置中持久化 HTTP 中继 URL。

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

    - `every`: 持续时间字符串 (`30m`, `2h`)。设置为 `0m` 以禁用。
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (默认) 或针对私信风格的心跳目标使用 `block`
    - 参见 [Heartbeat](/zh/gateway/heartbeat) 获取完整指南。

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

    - `sessionRetention`: 从 `sessions.json` 中清理已完成的隔离运行会话 (默认 `24h`; 设置 `false` 以禁用)。
    - `runLog`: 根据大小和保留行数清理 `cron/runs/<jobId>.jsonl`。
    - 参见 [Cron jobs](/zh/automation/cron-jobs) 获取功能概述和 CLI 示例。

  </Accordion>

  <Accordion title="设置 Webhooks (hooks)">
    在 Gateway(网关) 网关上启用 HTTP webhook 端点：

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
    - 保持不安全内容绕过标志处于禁用状态（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非正在进行范围严格的调试。
    - 对于由 hook 驱动的代理，建议使用强大的现代模型层级和严格的工具策略（例如，仅限消息传递，并在可能的情况下进行沙箱隔离）。

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

    有关绑定规则和每个代理访问配置文件，请参阅 [Multi-Agent](/zh/concepts/multi-agent) 和 [完整参考](/zh/gateway/configuration-reference#multi-agent-routing)。

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
    - **文件数组**：按顺序深度合并（后者覆盖前者）
    - **同级键**：在引入之后合并（覆盖引入的值）
    - **嵌套引入**：最多支持 10 层深度
    - **相对路径**：相对于引入文件进行解析
    - **错误处理**：针对缺失文件、解析错误和循环引入提供清晰的错误信息

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway(网关) 会监视 `~/.openclaw/openclaw.json` 并自动应用更改 —— 对于大多数设置，无需手动重启。

### 重载模式

| 模式                 | 行为                                                 |
| -------------------- | ---------------------------------------------------- |
| **`hybrid`**（默认） | 即时热应用安全更改。对于关键更改自动重启。           |
| **`hot`**            | 仅热应用安全更改。当需要重启时记录警告——由您来处理。 |
| **`restart`**        | 在任何配置更改时重启 Gateway(网关)，无论是否安全。   |
| **`off`**            | 禁用文件监视。更改将在下一次手动重启时生效。         |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 热应用与需要重启的内容对比

大多数字段无需停机即可热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别                 | 字段                                                  | 需要重启？ |
| -------------------- | ----------------------------------------------------- | ---------- |
| 通道                 | `channels.*`、`web`（WhatsApp）——所有内置和扩展渠道   | 否         |
| 代理和模型           | `agent`, `agents`, `models`, `routing`                | 否         |
| 自动化               | `hooks`, `cron`, `agent.heartbeat`                    | 否         |
| 会话与消息           | `session`, `messages`                                 | 否         |
| 工具与媒体           | `tools`, `browser`, `skills`, `audio`, `talk`         | 否         |
| UI 与杂项            | `ui`, `logging`, `identity`, `bindings`               | 否         |
| Gateway(网关) 服务器 | `gateway.*`（端口、绑定、认证、Tailscale、TLS、HTTP） | **是**     |
| 基础设施             | `discovery`, `canvasHost`, `plugins`                  | **是**     |

<Note>`gateway.reload` 和 `gateway.remote` 是例外——更改它们**不会**触发重启。</Note>

## 配置 RPC（编程更新）

<Note>
  控制平面写入 RPC（`config.apply`、`config.patch`、`update.run`）的速率限制为每个
  `deviceId+clientIp` **60 秒内 3 个请求**。受限时，该 RPC 将返回 `UNAVAILABLE` 并带有
  `retryAfterMs`。
</Note>

<AccordionGroup>
  <Accordion title="config.apply (完全替换)">
    验证并写入完整配置，并在一步内重启 Gateway 网关。

    <Warning>
    `config.apply` 会替换**整个配置**。请使用 `config.patch` 进行部分更新，或使用 `openclaw config set` 更新单个键。
    </Warning>

    参数：

    - `raw` (string) — 整个配置的 JSON5 载荷
    - `baseHash` (可选) — 来自 `config.get` 的配置哈希（配置存在时必需）
    - `sessionKey` (可选) — 用于重启后唤醒 ping 的会话密钥
    - `note` (可选) — 重启哨兵的备注
    - `restartDelayMs` (可选) — 重启前的延迟（默认 2000）

    当一个重启请求已经在处理中或正在传输时，后续请求会被合并，并且在重启周期之间应用 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:dm:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (部分更新)">
    将部分更新合并到现有配置中（采用 JSON 合并补丁语义）：

    - 对象递归合并
    - `null` 删除键
    - 数组替换

    参数：

    - `raw` (string) — 仅包含待更改键的 JSON5
    - `baseHash` (required) — 来自 `config.get` 的配置哈希值
    - `sessionKey`, `note`, `restartDelayMs` — 与 `config.apply` 相同

    重启行为与 `config.apply` 一致：合并待处理的重启，且重启周期之间有 30 秒的冷却时间。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

OpenClaw 从父进程以及以下来源读取环境变量：

- `.env` 从当前工作目录（如果存在）
- `~/.openclaw/.env`（全局回退）

这两个文件都不会覆盖现有的环境变量。您也可以在配置中设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境变量导入 (可选)">
  如果启用且未设置预期键名，OpenClaw 将运行您的登录 shell 并仅导入缺失的键：

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
- 缺失/空变量在加载时抛出错误
- 使用 `$${VAR}` 进行转义以输出字面量
- 在 `$include` 文件中有效
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
      "nano-banana-pro": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/nano-banana-pro/apiKey",
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

SecretRef 详细信息（包括用于 `env`/`file`/`exec` 的 `secrets.providers`）位于 [Secrets Management](/zh/gateway/secrets) 中。
支持的凭证路径列于 [SecretRef Credential Surface](/zh/reference/secretref-credential-surface) 中。

</Accordion>

有关完整的优先级和来源，请参阅 [Environment](/zh/help/environment)。

## 完整参考

有关完整的逐字段参考，请参阅 **[Configuration Reference](/zh/gateway/configuration-reference)**。

---

_相关：[Configuration Examples](/zh/gateway/configuration-examples) · [Configuration Reference](/zh/gateway/configuration-reference) · [Doctor](/zh/gateway/doctor)_

import zh from '/components/footer/zh.mdx';

<zh />
