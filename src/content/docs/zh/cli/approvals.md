---
summary: "CLI 参考文档，用于 `openclaw approvals`（网关或节点主机的执行审批）"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `openclaw approvals`

管理 **本地主机**、**网关主机** 或 **节点主机** 的 exec 批准。
默认情况下，命令针对磁盘上的本地批准文件。使用 `--gateway` 以针对网关，或使用 `--node` 以针对特定节点。

别名：`openclaw exec-approvals`

相关内容：

- Exec 批准：[Exec 批准](/en/tools/exec-approvals)
- 节点：[节点](/en/nodes)

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在显示针对本地、网关和节点目标的有效 exec 策略：

- 请求的 `tools.exec` 策略
- 主机 批准文件 策略
- 应用优先级规则后的有效结果

优先级是有意为之的：

- 主机批准文件是可执行的事实来源
- 请求的 `tools.exec` 策略可以缩小或放宽意图，但有效结果仍源自主机规则
- `--node` 结合了节点主机批准文件与网关 `tools.exec` 策略，因为两者在运行时仍然适用
- 如果网关配置不可用，CLI 将回退到节点批准快照，并注明无法计算最终的运行时策略

## 从文件替换批准

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不仅仅是严格的 JSON。请使用 `--file` 或 `--stdin` 之一，不要同时使用。

## "从不提示" / YOLO 示例

对于不应因 exec 批准而停止的主机，请将主机批准默认值设置为 `full` + `off`：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

节点变体：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

这仅更改 **主机批准文件**。若要保持请求的 OpenClaw 策略一致，还应设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

为何在此示例中使用 `tools.exec.host=gateway`：

- `host=auto` 仍然表示“如果可用则使用沙盒，否则使用网关”。
- YOLO 关乎批准，而非路由。
- 如果您即使在配置了沙箱的情况下也想在主机上执行，请使用 `gateway` 或 `/exec host=gateway` 明确指定主机选择。

这与当前默认的主机 YOLO 行为相匹配。如果您需要审批，请收紧此设置。

## 允许列表辅助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 通用选项

`get`、`set` 和 `allowlist add|remove` 均支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享的节点 RPC 选项：`--url`、`--token`、`--timeout`、`--json`

定位说明：

- 没有目标标志意味着磁盘上的本地审批文件
- `--gateway` 针对网关主机审批文件
- `--node` 在解析 id、name、IP 或 id 前缀后针对一个节点主机

`allowlist add|remove` 还支持：

- `--agent <id>`（默认为 `*`）

## 说明

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前缀）。
- `--agent` 默认为 `"*"`，这适用于所有代理。
- 节点主机必须通告 `system.execApprovals.get/set`（macOS 应用程序或无头节点主机）。
- 审批文件按主机存储在 `~/.openclaw/exec-approvals.json`。
