---
summary: "每个代理的沙箱 + 工具限制、优先级和示例"
title: "多代理沙箱和工具"
sidebarTitle: "多代理沙箱和工具"
read_when: "您希望在每个代理的多代理网关中进行沙箱隔离或每个代理的工具允许/拒绝策略。"
status: active
---

在多代理设置中，每个代理都可以覆盖全局沙箱和工具策略。本页面涵盖每个代理的配置、优先级规则和示例。

<CardGroup cols={3}>
  <Card title="沙箱隔离" href="/zh/gateway/sandboxing">
    后端和模式 — 完整的沙箱参考。
  </Card>
  <Card title="沙箱与工具策略与提升权限模式" href="/zh/gateway/sandbox-vs-tool-policy-vs-elevated">
    调试“为什么被阻止？”
  </Card>
  <Card title="提升权限模式" href="/zh/tools/elevated">
    针对可信发送者的提升执行。
  </Card>
</CardGroup>

<Warning>
认证是按代理进行的：每个代理从 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 处读取自己的 `agentDir` 认证存储。凭证在代理之间**不**共享。切勿跨代理重用 `agentDir`。如果您想共享凭证，请将 `auth-profiles.json` 复制到另一个代理的 `agentDir` 中。
</Warning>

---

## 配置示例

<AccordionGroup>
  <Accordion title="示例 1：个人 + 受限的家庭代理">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "main",
            "default": true,
            "name": "Personal Assistant",
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          },
          {
            "id": "family",
            "name": "Family Bot",
            "workspace": "~/.openclaw/workspace-family",
            "sandbox": {
              "mode": "all",
              "scope": "agent"
            },
            "tools": {
              "allow": ["read"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
            }
          }
        ]
      },
      "bindings": [
        {
          "agentId": "family",
          "match": {
            "provider": "whatsapp",
            "accountId": "*",
            "peer": {
              "kind": "group",
              "id": "120363424282127706@g.us"
            }
          }
        }
      ]
    }
    ```

    **结果：**

    - `main` 代理：在主机上运行，拥有完全的工具访问权限。
    - `family` 代理：在 Docker 中运行（每个代理一个容器），仅有 `read` 工具。

  </Accordion>
  <Accordion title="示例 2：具有共享沙箱的工作代理">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "personal",
            "workspace": "~/.openclaw/workspace-personal",
            "sandbox": { "mode": "off" }
          },
          {
            "id": "work",
            "workspace": "~/.openclaw/workspace-work",
            "sandbox": {
              "mode": "all",
              "scope": "shared",
              "workspaceRoot": "/tmp/work-sandboxes"
            },
            "tools": {
              "allow": ["read", "write", "apply_patch", "exec"],
              "deny": ["browser", "gateway", "discord"]
            }
          }
        ]
      }
    }
    ```
  </Accordion>
  <Accordion title="示例 2b：全局编码配置文件 + 仅消息代理">
    ```json
    {
      "tools": { "profile": "coding" },
      "agents": {
        "list": [
          {
            "id": "support",
            "tools": { "profile": "messaging", "allow": ["slack"] }
          }
        ]
      }
    }
    ```

    **结果：**

    - 默认代理获取编码工具。
    - `support` 代理仅用于消息传递（+ Slack 工具）。

  </Accordion>
  <Accordion title="示例 3：每个代理不同的沙箱模式">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
              "scope": "agent"
            },
            "tools": {
              "allow": ["read"],
              "deny": ["exec", "write", "edit", "apply_patch"]
            }
          }
        ]
      }
    }
    ```
  </Accordion>
</AccordionGroup>

---

## 配置优先级

当同时存在全局 (`agents.defaults.*`) 和特定于代理 (`agents.list[].*`) 的配置时：

### 沙箱配置

特定于代理的设置会覆盖全局设置：

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` 覆盖该代理的 `agents.defaults.sandbox.{docker,browser,prune}.*`（当沙箱范围解析为 `"shared"` 时被忽略）。
</Note>

### 工具限制

过滤顺序为：

<Steps>
  <Step title="工具配置文件">`tools.profile` 或 `agents.list[].tools.profile`。</Step>
  <Step title="提供商工具配置文件">`tools.byProvider[provider].profile` 或 `agents.list[].tools.byProvider[provider].profile`。</Step>
  <Step title="全局工具策略">`tools.allow` / `tools.deny`。</Step>
  <Step title="提供商工具策略">`tools.byProvider[provider].allow/deny`。</Step>
  <Step title="特定于代理的工具策略">`agents.list[].tools.allow/deny`。</Step>
  <Step title="代理提供商策略">`agents.list[].tools.byProvider[provider].allow/deny`。</Step>
  <Step title="沙箱工具策略">`tools.sandbox.tools` 或 `agents.list[].tools.sandbox.tools`。</Step>
  <Step title="子代理工具策略">`tools.subagents.tools`（如果适用）。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="优先级规则">- 每一层级都可以进一步限制工具，但不能恢复之前层级中已拒绝的工具。 - 如果设置了 `agents.list[].tools.sandbox.tools`，它将替换该代理的 `tools.sandbox.tools`。 - 如果设置了 `agents.list[].tools.profile`，它将覆盖该代理的 `tools.profile`。 - 提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。</Accordion>
  <Accordion title="空允许列表行为">如果该链中的任何显式允许列表导致运行时没有可调用的工具，OpenClaw 将在向模型提交提示之前停止。这是有意的：配置了缺失工具（例如 `agents.list[].tools.allow: ["query_db"]`）的代理应该明确报错，直到注册 `query_db` 的插件被启用，而不是作为仅文本代理继续运行。</Accordion>
</AccordionGroup>

工具策略支持扩展为多个工具的 `group:*` 简写。有关完整列表，请参阅[工具组](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

每个代理的提升覆盖（`agents.list[].tools.elevated`）可以进一步限制特定代理的提升执行。有关详细信息，请参阅[提升模式](/zh/tools/elevated)。

---

## 从单一代理迁移

<Tabs>
  <Tab title="之前（单一代理）">
    ```json
    {
      "agents": {
        "defaults": {
          "workspace": "~/.openclaw/workspace",
          "sandbox": {
            "mode": "non-main"
          }
        }
      },
      "tools": {
        "sandbox": {
          "tools": {
            "allow": ["read", "write", "apply_patch", "exec"],
            "deny": []
          }
        }
      }
    }
    ```
  </Tab>
  <Tab title="之后（多代理）">
    ```json
    {
      "agents": {
        "list": [
          {
            "id": "main",
            "default": true,
            "workspace": "~/.openclaw/workspace",
            "sandbox": { "mode": "off" }
          }
        ]
      }
    }
    ```
  </Tab>
</Tabs>

<Note>旧版 `agent.*` 配置由 `openclaw doctor` 迁移；今后请首选 `agents.defaults` + `agents.list`。</Note>

---

## 工具限制示例

<Tabs>
  <Tab title="只读代理">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="安全执行（无文件修改）">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```
  </Tab>
  <Tab title="Communication-only">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    此配置文件中的 `sessions_history` 仍会返回有界的、经过清理的召回视图，而不是原始的对话记录转储。Assistant recall 会移除 thinking 标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制令牌以及格式错误的 MiniMax 工具调用 XML，然后再进行编辑/截断。

  </Tab>
</Tabs>

---

## 常见陷阱：“非主”

<Warning>`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），而非代理 ID。群组/渠道会话始终获取其自己的密钥，因此它们被视为非主会话并将受到沙箱隔离。如果您希望代理永不进行沙箱隔离，请设置 `agents.list[].sandbox.mode: "off"`。</Warning>

---

## 测试

配置多代理沙箱和工具后：

<Steps>
  <Step title="检查代理解析">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="验证沙箱容器">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="测试工具限制">
    - 发送一条需要受限工具的消息。
    - 验证代理无法使用被拒绝的工具。
  </Step>
  <Step title="监控日志">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 故障排除

<AccordionGroup>
  <Accordion title="尽管设置了 `mode: 'all'` 但代理未被沙箱隔离">- 检查是否存在覆盖该设置的全局 `agents.defaults.sandbox.mode`。 - 特定于代理的配置优先级更高，因此请设置 `agents.list[].sandbox.mode: "all"`。</Accordion>
  <Accordion title="尽管有拒绝列表，工具仍然可用">- 检查工具过滤顺序：全局 (global) → 代理 (agent) → 沙箱 (sandbox) → 子代理 (subagent)。 - 每个层级只能进一步限制，不能恢复权限。 - 使用日志验证：`[tools] filtering tools for agent:${agentId}`。</Accordion>
  <Accordion title="容器未按代理隔离">- 在代理特定的沙箱配置中设置 `scope: "agent"`。 - 默认值是 `"session"`，它会为每个会话 (会话) 创建一个容器。</Accordion>
</AccordionGroup>

---

## 相关

- [提升模式 (Elevated mode)](/zh/tools/elevated)
- [多代理路由 (Multi-agent routing)](/zh/concepts/multi-agent)
- [沙箱配置 (沙箱 configuration)](/zh/gateway/config-agents#agentsdefaultssandbox)
- [沙箱 vs 工具策略 vs 提升 (沙箱 vs 工具 policy vs elevated)](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么被阻止？”
- [沙箱隔离 (沙箱隔离)](/zh/gateway/sandboxing) — 完整的沙箱参考（模式、作用域、后端、镜像）
- [会话管理 (Session management)](/zh/concepts/session)
