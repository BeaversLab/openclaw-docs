---
summary: "Elevated exec mode: run commands outside the sandbox from a 沙箱隔离 agent"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "提升模式"
---

当代理在沙箱内运行时，其 `exec` 命令被限制在
沙箱环境中。**提升模式** 允许代理突破限制，在
沙箱外部运行命令，并配有可配置的审批门槛。

<Info>提升模式仅在代理处于**沙箱隔离**状态时改变行为。对于 非沙箱隔离的代理，exec 本身已在主机上运行。</Info>

## 指令

使用斜杠命令按会话控制提升模式：

| 指令             | 作用                                     |
| ---------------- | ---------------------------------------- |
| `/elevated on`   | 在配置的主机路径上于沙箱外运行，保留审批 |
| `/elevated ask`  | 与 `on` 相同（别名）                     |
| `/elevated full` | 在配置的主机路径上于沙箱外运行并跳过审批 |
| `/elevated off`  | 返回沙箱受限执行                         |

也可用作 `/elev on|off|ask|full`。

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

  <Step title="命令在沙箱外运行">
    启用提升后，`exec` 调用将离开沙箱。有效主机默认为
    `gateway`，或当配置的/会话 exec 目标为
    `node` 时为 `node`。在 `full` 模式下，将跳过 exec 审批。在 `on`/`ask` 模式下，
    配置的审批规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. 消息上的**内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局闸门**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：带有按渠道列表的 `tools.elevated.allowFrom`
- **按代理闸门**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **按代理允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局和按代理列表）
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

- **工具策略**：如果 `exec` 被工具策略拒绝，提升模式无法覆盖它
- **主机选择策略**：提升模式不会将 `auto` 变为免费的跨主机覆盖。它使用配置的/会话 exec 目标规则，仅当目标已经是 `node` 时才选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令为经过授权的发送者调整按会话 exec 默认值，并且不需要提升模式

## 相关内容

- [Exec 工具](/zh/tools/exec) — Shell 命令执行
- [Exec 批准](/zh/tools/exec-approvals) — 批准和允许列表系统
- [沙箱隔离](/zh/gateway/sandboxing) — 沙箱配置
- [沙箱 vs 工具策略 vs 提升模式](/zh/gateway/sandbox-vs-tool-policy-vs-elevated)
