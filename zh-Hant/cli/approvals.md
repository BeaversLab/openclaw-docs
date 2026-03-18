---
summary: "`openclaw approvals`（閘道或節點主機的 exec 核准）的 CLI 參考"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "核准"
---

# `openclaw approvals`

管理 **local host**、**gateway host** 或 **node host** 的 exec 核准。
預設情況下，指令會以磁碟上的本機核准檔案為目標。使用 `--gateway` 以閘道為目標，或使用 `--node` 以特定節點為目標。

相關：

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

## 注意事項

- `--node` 使用與 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前綴）。
- `--agent` 預設為 `"*"`，這適用於所有代理程式。
- 節點主機必須宣佈 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。
- 核准檔案是依主機儲存在 `~/.openclaw/exec-approvals.json`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
