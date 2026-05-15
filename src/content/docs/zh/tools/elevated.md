---
summary: "Elevated exec mode: run commands outside the sandbox from a 沙箱隔离 agent"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "提升模式"
---

当代理在沙盒内运行时，其 `exec` 命令仅限于沙盒环境。**提升模式** 允许代理突破沙盒并在沙盒之外运行命令，并具有可配置的审批门槛。

<Info>提升模式仅在代理处于**沙箱隔离**状态时改变行为。对于 非沙箱隔离的代理，exec 本身已在主机上运行。</Info>

## 指令

使用斜杠命令按会话控制提升模式：

| 指令             | 作用                                     |
| ---------------- | ---------------------------------------- |
| `/elevated on`   | 在配置的主机路径上于沙箱外运行，保留审批 |
| `/elevated ask`  | 与 `on` 相同（别名）                     |
| `/elevated full` | 在配置的主机路径上于沙箱外运行并跳过审批 |
| `/elevated off`  | 返回沙箱受限执行                         |

也可以作为 `/elev on|off|ask|full` 使用。

发送不带参数的 `/elevated` 以查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    必须在配置中启用 Elevated，且发送者必须在允许列表中：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="设置级别">
    发送仅包含指令的消息以设置会话默认值：

    ```
    /elevated full
    ```

    或内联使用（仅适用于该消息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="Commands run outside the sandbox">
    在激活提升模式时，`exec` 调用会离开沙盒。默认的有效主机是
    `gateway`，当配置/会话执行目标是
    `node` 时，则是 `node`。在 `full` 模式下，将跳过 exec 审批。在 `on`/`ask` 模式下，
    配置的审批规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. 消息上的**内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局门槛**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：带有每个渠道列表的 `tools.elevated.allowFrom`
- **每个代理的门槛**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **每个代理的允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 每个代理的列表）
- **Discord 回退**：如果省略了 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 作为回退
- **所有闸门必须通过**；否则将提升模式视为不可用

允许列表条目格式：

| 前缀                    | 匹配项                        |
| ----------------------- | ----------------------------- |
| （无）                  | 发送者 ID、E.164 或 From 字段 |
| `name:`                 | 发送者显示名称                |
| `username:`             | 发送者用户名                  |
| `tag:`                  | 发送者标签                    |
| `id:`、`from:`、`e164:` | 显式身份定位                  |

## 提升模式不控制的内容

- **工具策略**：如果 `exec` 被工具策略拒绝，提升模式无法覆盖它。
- **主机选择策略**：elevated 不会将 `auto` 变为自由的跨主机覆盖。它使用配置的/会话 exec 目标规则，仅当目标已经是 `node` 时才选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令为授权发送者调整每次会话的 exec 默认值，并不需要 elevated 模式。

<Note>bash 聊天命令（`!` 前缀；`/bash` 别名）是一个独立的关卡，除了其自己的 `tools.bash.enabled` 标志外，还需要启用 `tools.elevated`。禁用 elevated 也会将 `!` shell 命令锁定在外。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    来自 agent 的 Shell 命令执行。
  </Card>
  <Card title="Exec 批准" href="/zh/tools/exec-approvals" icon="shield">
    针对 `exec` 的批准和允许列表系统。
  </Card>
  <Card title="沙箱隔离" href="/zh/gateway/sandboxing" icon="box">
    Gateway(网关) 级别的沙箱配置。
  </Card>
  <Card title="沙箱 vs 工具策略 vs Elevated" href="/zh/gateway/sandbox-vs-tool-policy-vs-elevated" icon="scale-balanced">
    这三个关卡在工具调用期间如何组合。
  </Card>
</CardGroup>
