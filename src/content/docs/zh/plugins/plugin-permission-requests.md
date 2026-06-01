---
summary: "请求用户批准插件工具调用和插件拥有的权限提示"
title: "插件权限请求"
sidebarTitle: "权限请求"
read_when:
  - You need a plugin hook or tool to ask before a side effect runs
  - You need to configure where plugin approval prompts are delivered
  - You are deciding between optional tools, exec approvals, and plugin approvals
---

插件权限请求允许插件代码暂停工具调用或插件拥有的操作，直到用户批准或拒绝它。它们使用 Gateway(网关) `plugin.approval.*` 流程以及处理聊天批准按钮和 `/approve` 命令的相同批准 UI 界面。

将插件权限请求用于插件/应用权限。它们不替代主机执行批准、可选工具允许列表或 Codex 的原生权限审查。

## 选择正确的关口

选择与您所需的决策点相匹配的关口：

| 关口               | 使用场景                                                     | 控制对象                                                                           |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 可选工具           | 在用户选择加入之前，工具不应对模型可见。                     | 通过 `tools.allow` 暴露工具。                                                      |
| 插件权限请求       | 插件挂钩或插件拥有的操作必须在某个操作运行之前进行询问。     | 通过 `plugin.approval.*` 进行运行时批准。                                          |
| 执行批准           | 主机命令或类似 shell 的工具需要操作员批准。                  | 主机执行策略和持久执行允许列表。                                                   |
| Codex 原生权限请求 | Codex 在原生 shell、文件、MCP 或应用服务器操作之前进行询问。 | Codex 应用服务器或原生挂钩批准处理，当 OpenClaw 拥有提示时，通过插件批准进行路由。 |
| MCP 批准征询       | Codex MCP 服务器请求批准工具调用。                           | 通过 OpenClaw 插件批准桥接的 MCP 批准响应。                                        |

可选工具是发现时的关口。插件权限请求是每次调用的关口。当敏感工具在模型可见之前需要明确选择加入，以及在操作运行之前需要批准时，请同时使用两者。

## 在工具调用之前请求批准

大多数插件编写的提示应在 `before_tool_call` 挂钩中开始。该挂钩在模型选择工具之后、OpenClaw 执行它之前运行：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "deploy-policy",
  name: "Deploy Policy",
  register(api) {
    api.on("before_tool_call", async (event) => {
      if (event.toolName !== "deploy_service") {
        return;
      }

      const environment = typeof event.params.environment === "string" ? event.params.environment : "unknown";

      return {
        requireApproval: {
          title: "Deploy service",
          description: `Deploy service to ${environment}.`,
          severity: environment === "production" ? "critical" : "warning",
          allowedDecisions: environment === "production" ? ["allow-once", "deny"] : ["allow-once", "allow-always", "deny"],
          timeoutMs: 120_000,
          timeoutBehavior: "deny",
          onResolution(decision) {
            console.log(`deploy approval resolved: ${decision}`);
          },
        },
      };
    });
  },
});
```

为将要批准该操作的人员编写提示文本：

- 保持 `title`Gateway(网关) 简短且以行动为导向。Gateway(网关) 最多接受 80 个字符。
- 保持 `description`Gateway(网关) 明确且具体。Gateway(网关) 最多接受 256 个字符。
- 包含操作、目标和风险。不要包含不应出现在聊天审批界面中的机密、令牌或私有载荷。
- 仅当错误决策可能导致生产环境损坏或数据丢失时，才对操作使用 `severity: "critical"`。
- 当对该操作进行持久化信任不安全时，使用 `allowedDecisions: ["allow-once", "deny"]`。

## 决策行为

OpenClaw 创建一个带有 OpenClaw`plugin:` ID 的待审批请求，将其传递到可用的审批界面，并等待决策。

| 决策           | 结果                                                    |
| -------------- | ------------------------------------------------------- |
| `allow-once`   | 当前调用继续。                                          |
| `allow-always` | 当前调用继续，并且决策被传递给插件。                    |
| `deny`         | 调用被阻止，并返回被拒绝的工具结果。                    |
| 超时           | 除非 `timeoutBehavior` 为 `"allow"`，否则调用将被阻止。 |
| 取消           | 当运行中止时，调用被阻止。                              |
| 无审批路由     | 调用被阻止，因为没有已连接的审批界面可以解决它。        |

`allow-always` 仅在请求的插件或运行时实现了该持久化时才有效。对于普通的 `before_tool_call.requireApproval`OpenClaw 钩子，OpenClaw 将 `allow-once` 和 `allow-always` 视为当前调用的审批决策，并将解析后的值传递给 `onResolution`。如果您的插件提供 `allow-always`，请准确记录并实现其信任的未来调用。

如果钩子还返回 `params`OpenClaw，OpenClaw 将仅在审批成功后应用这些参数更改。优先级较低的钩子仍可以在优先级较高的钩子请求审批后阻止操作。

`allowedDecisions`Gateway(网关) 限制了向用户显示的按钮和命令。Gateway(网关) 会拒绝针对请求未提供的任何决策的解析尝试。

## 路由审批提示

审批提示可以在本地 UI 界面或支持审批处理的聊天渠道中解析。要将插件审批提示转发到明确的聊天目标，请配置 `approvals.plugin`：

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

`approvals.plugin` 独立于 `approvals.exec`。启用审批转发不会路由插件审批提示，而启用插件审批转发也不会更改主机执行策略。

当提示包含手动审批文本时，请使用提供的决策之一进行解析：

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

有关完整的转发模型、同聊审批行为、原生渠道交付以及特定渠道审批人规则，请参阅 [高级执行审批](/zh/tools/exec-approvals-advanced#plugin-approval-forwarding)。

## Codex 原生权限

Codex 原生权限提示也可以通过插件审批进行传递，但它们与插件创建的钩子具有不同的所有权。

- Codex 应用服务器审批请求在 Codex 审查后通过 OpenClaw 路由。
- 当启用原生钩子 `permission_request` 中继时，该中继可以通过 `plugin.approval.request` 进行询问。
- 当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，MCP 工具审批请求将通过插件审批路由。

有关 Codex 特定的行为和回退规则，请参阅 [Codex harness 运行时](/zh/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)。

## 故障排除

**工具提示插件审批不可用。** 没有审批 UI 或配置的审批路由接受该请求。连接一个支持审批的客户端，使用支持同聊 `/approve` 的渠道，或配置 `approvals.plugin`。

**出现了 `allow-always` 但下一次调用再次提示。** 通用插件审批流不会自动为任意钩子持久化信任。在 `onResolution("allow-always")` 之后，在您的插件中持久化插件拥有的信任，或者仅提供 `allow-once` 和 `deny`。

**`/approve` 拒绝该决策。** 该请求限制了 `allowedDecisions`。请使用提示中打印的决策之一。

**Slack、Discord、Telegram 或 Matrix 提示的路由与执行审批不同。** 插件审批和执行审批使用单独的配置，并且可能使用不同的授权检查。请验证 `approvals.plugin` 和渠道的插件审批支持，而不是仅检查 `approvals.exec`。

## 相关

- [插件钩子](/zh/plugins/hooks#tool-call-policy)
- [构建插件](/zh/plugins/building-plugins#registering-agent-tools)
- [高级执行审批](/zh/tools/exec-approvals-advanced#plugin-approval-forwarding)
- [Gateway(网关) 协议](/zh/gateway/protocol)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime#native-permissions-and-mcp-elicitations)
