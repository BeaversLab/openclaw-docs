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
Auth 的作用域按 Agent 划分：每个 Agent 在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 都有自己的 `agentDir` auth store。切勿跨 Agent 重用 `agentDir`OAuth。当没有本地配置文件时，Agent 可以读取默认/主 Agent 的 auth 配置文件，但 OAuth 刷新令牌不会克隆到次级 Agent 存储中。如果您手动复制凭据，请仅复制可移植的静态 `api_key` 或 `token` 配置文件。
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
              "allow": ["read", "message"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"],
              "message": {
                "crossContext": {
                  "allowWithinProvider": false,
                  "allowAcrossProviders": false
                }
              }
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

    - `main` 代理：在主机上运行，拥有完整工具访问权限。
    - `family`Docker 代理：在 Docker 中运行（每个代理一个容器），仅 `read` 和当前对话的消息发送。

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
  <Accordion title="优先级规则">
    - 每个层级都可以进一步限制工具，但不能恢复之前层级拒绝的工具。
    - 如果设置了 `agents.list[].tools.sandbox.tools`，它将替换该 Agent 的 `tools.sandbox.tools`。
    - 如果设置了 `agents.list[].tools.profile`，它将覆盖该 Agent 的 `tools.profile`。
    - Provider 工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

  </Accordion>
  <Accordion title="空允许列表行为">
    如果该链中的任何显式允许列表导致运行时没有可调用的工具，OpenClaw 将在向模型提交提示之前停止。这是有意的：配置了缺失工具（例如 `agents.list[].tools.allow: ["query_db"]`）的代理应该明确报错，直到注册 `query_db` 的插件被启用，而不是作为仅文本代理继续运行。
  </Accordion>
</AccordionGroup>

工具策略支持可扩展为多个工具的 `group:*` 简写形式。有关完整列表，请参阅 [工具组](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)。

按 Agent 覆盖的 Elevated 配置 (`agents.list[].tools.elevated`) 可以进一步限制特定 Agent 的 elevated exec。有关详细信息，请参阅 [Elevated 模式](/zh/tools/elevated)。

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
  <Tab title="只读 Agent">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="禁用文件系统工具的 Shell 执行">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```

    <Warning>
    此策略禁用了 OpenClaw 文件系统工具，但 `exec` 仍然是一个 Shell，可以在所选主机或沙箱文件系统允许的任何位置写入文件。对于只读 Agent，请拒绝 `exec` 和 `process`，或者将 Shell 访问与沙箱文件系统控制（例如 `agents.defaults.sandbox.workspaceAccess: "ro"` 或 `"none"`）结合使用。
    </Warning>

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

    此配置文件中的 `sessions_history` 仍然返回有界的、经过清理的召回视图，而不是原始的对话记录转储。助手召回会去除思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`MiniMax 以及被截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制令牌，以及在编辑/截断之前格式错误的 MiniMax 工具调用 XML。

  </Tab>
</Tabs>

---

## 常见误区：“非主”

<Warning>`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`），而非代理 ID。群组/渠道会话总是拥有自己的密钥，因此它们被视为“非主”并将处于沙箱隔离状态。如果您希望代理永远不被沙箱隔离，请设置 `agents.list[].sandbox.mode: "off"`。</Warning>

---

## 测试

配置多代理沙箱和工具后：

<Steps>
  <Step title="Check agent resolution">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="Verify sandbox containers">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="Test 工具 restrictions">
    - 发送一条需要受限工具的消息。
    - 验证代理无法使用被拒绝的工具。

  </Step>
  <Step title="Monitor logs">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## 故障排除

<AccordionGroup>
  <Accordion title="Agent not 沙箱隔离 despite `mode: 'all'`">
    - 检查是否存在覆盖该设置的全局 `agents.defaults.sandbox.mode`。
    - 特定于代理的配置优先级更高，因此请设置 `agents.list[].sandbox.mode: "all"`。

  </Accordion>
  <Accordion title="尽管有拒绝列表，工具仍然可用">
    - 检查工具过滤顺序：全局 → 代理 → 沙箱 → 子代理。
    - 每一层只能进一步限制，不能重新授权。
    - 通过日志验证：`[tools] filtering tools for agent:${agentId}`。

  </Accordion>
  <Accordion title="容器未按代理隔离">
    - 在代理特定的沙箱配置中设置 `scope: "agent"`。
    - 默认值为 `"session"`，即每个会话创建一个容器。

  </Accordion>
</AccordionGroup>

---

## 相关

- [提升模式](/zh/tools/elevated)
- [多代理路由](/zh/concepts/multi-agent)
- [沙箱配置](/zh/gateway/config-agents#agentsdefaultssandbox)
- [沙箱与工具策略及提升模式](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) — 调试“为什么被阻止？”
- [沙箱隔离](/zh/gateway/sandboxing) — 完整的沙箱参考（模式、范围、后端、镜像）
- [会话管理](/zh/concepts/session)
