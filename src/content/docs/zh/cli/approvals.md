---
summary: "CLI 参考，适用于 `openclaw approvals` 和 `openclaw exec-policy`"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "批准"
---

# `openclaw approvals`

管理 **本地主机**、**网关主机** 或 **节点主机** 的 exec 批准。
默认情况下，命令针对磁盘上的本地批准文件。使用 `--gateway` 针对网关，或使用 `--node` 针对特定节点。

别名：`openclaw exec-approvals`

相关内容：

- Exec 批准：[Exec 批准](/en/tools/exec-approvals)
- 节点：[节点](/en/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` 是一个本地便捷命令，用于一步保持请求的
`tools.exec.*` 配置与本地主机批准文件的同步。

当您想要以下操作时使用它：

- 检查本地请求的策略、主机批准文件和有效合并结果
- 应用本地预设（如 YOLO 或 deny-all）
- 同步本地 `tools.exec.*` 和本地 `~/.openclaw/exec-approvals.json`

示例：

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

输出模式：

- 无 `--json`：打印人类可读的表格视图
- `--json`：打印机器可读的结构化输出

当前作用域：

- `exec-policy` 为 **仅限本地**
- 它会同时更新本地配置文件和本地批准文件
- 它 **不会** 将策略推送到网关主机或节点主机
- 此命令中拒绝使用 `--host node`，因为节点 exec 批准是在运行时从节点获取的，必须通过针对节点的批准命令来管理
- `openclaw exec-policy show` 在运行时将 `host=node` 作用域标记为由节点管理，而不是从本地批准文件派生有效策略

如果您需要直接编辑远程主机批准，请继续使用 `openclaw approvals set --gateway`
或 `openclaw approvals set --node <id|name|ip>`。

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在显示本地、网关和节点目标的有效 exec 策略：

- 请求的 `tools.exec` 策略
- 主机批准文件策略
- 应用优先级规则后的有效结果

优先级是有意设置的：

- 主机批准文件是可执行的唯一事实来源
- 请求的 `tools.exec` 策略可以缩小或扩大意图，但有效结果仍源自主机规则
- `--node` 结合了节点主机批准文件与网关 `tools.exec` 策略，因为两者在运行时仍然适用
- 如果网关配置不可用，CLI 将回退到节点批准快照，并指出无法计算最终运行时策略

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

## "永不提示" / YOLO 示例

对于不应在执行批准时停止的主机，请将主机批准默认值设置为 `full` + `off`：

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

这仅更改 **主机批准文件**。为了保持请求的 OpenClaw 策略一致，还需要设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

在此示例中为什么使用 `tools.exec.host=gateway`：

- `host=auto` 仍然意味着“如果有沙箱则使用沙箱，否则使用网关”。
- YOLO 指的是批准，而不是路由。
- 如果您希望执行主机操作（即使配置了沙箱），请使用 `gateway` 或 `/exec host=gateway` 明确选择主机。

这符合当前的主机默认 YOLO 行为。如果您需要批准，请收紧设置。

本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式会同时更新请求的本地 `tools.exec.*` 配置和
本地批准默认值。其意图与上述手动两步设置相同，但仅适用于本地计算机。

## Allowlist 辅助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 均支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享节点 RPC 选项：`--url`、`--token`、`--timeout`、`--json`

定位说明：

- 无目标标志意味着使用磁盘上的本地批准文件
- `--gateway` 针对网关主机审批文件
- `--node` 在解析 id、名称、IP 或 id 前缀后，针对一个节点主机

`allowlist add|remove` 还支持：

- `--agent <id>`（默认为 `*`）

## 注意事项

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、名称、ip 或 id 前缀）。
- `--agent` 默认为 `"*"`，这适用于所有代理。
- 节点主机必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
- 审批文件按主机存储在 `~/.openclaw/exec-approvals.json` 处。
