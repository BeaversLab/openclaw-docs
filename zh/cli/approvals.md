---
summary: "`openclaw approvals` 的 CLI 参考（gateway 或节点主机的 exec 审批）"
read_when:
  - 你要通过 CLI 编辑 exec 审批
  - 你需要管理 gateway 或 node 主机的 allowlist
---

# `openclaw approvals`

管理 **本地主机**、**gateway 主机**或**node 主机**的 exec 审批。
默认操作磁盘上的本地审批文件。使用 `--gateway` 操作 gateway，或用 `--node` 指定某个 node。

相关：
- Exec approvals：[Exec approvals](/zh/tools/exec-approvals)
- Nodes：[Nodes](/zh/nodes)

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## 从文件替换审批

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## Allowlist 辅助

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 说明

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前缀）。
- `--agent` 默认 `"*"`，表示对所有 agent 生效。
- node 主机必须声明 `system.execApprovals.get/set`（macOS app 或 headless node 主机）。
- 审批文件按主机存储在 `~/.openclaw/exec-approvals.json`。
