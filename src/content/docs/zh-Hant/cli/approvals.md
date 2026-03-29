---
summary: "CLI 參考資料，用於 `openclaw approvals` （閘道或節點主機的 exec 核准）"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `openclaw approvals`

管理 **local host**（本機主機）、**gateway host**（閘道主機）或 **node host**（節點主機）的 exec 核准。
預設情況下，指令會針對磁碟上的本機核准檔案。請使用 `--gateway` 來指定閘道，或使用 `--node` 來指定特定節點。

相關連結：

- Exec 核准： [Exec approvals](/en/tools/exec-approvals)
- 節點： [Nodes](/en/nodes)

## 常用指令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## 從檔案取代核准

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## 允許清單輔助程式

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 注意事項

- `--node` 使用與 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前綴字串）。
- `--agent` 預設為 `"*"`，這適用於所有代理程式。
- 節點主機必須廣播 `system.execApprovals.get/set`（macOS 應用程式或無介面節點主機）。
- 核准檔案依主機儲存在 `~/.openclaw/exec-approvals.json`。
