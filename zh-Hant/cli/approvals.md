---
summary: "CLI 參考資料：`openclaw approvals`（閘道或節點主機的 exec 核准）"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "核准"
---

# `openclaw approvals`

管理 **local host**（本機主機）、**gateway host**（閘道主機）或 **node host**（節點主機）的 exec 核准。
預設情況下，指令會針對磁碟上的本機核准檔案。使用 `--gateway` 來指定閘道，或使用 `--node` 來指定特定節點。

相關連結：

- Exec 核准：[Exec 核准](/zh-Hant/tools/exec-approvals)
- 節點：[節點](/zh-Hant/nodes)

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

## 備註

- `--node` 使用與 `openclaw nodes` 相同的解析程式（id、name、ip 或 id 前綴）。
- `--agent` 預設為 `"*"`，這適用於所有代理程式。
- 節點主機必須通告 `system.execApprovals.get/set` (macOS 應用程式或無頭節點主機)。
- 核准檔案依主機儲存在 `~/.openclaw/exec-approvals.json`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
