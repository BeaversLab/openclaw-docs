---
summary: "`openclaw approvals` 的 CLI 參考資料（適用於 gateway 或 node hosts 的 exec approvals）"
read_when:
  - 您想要從 CLI 編輯 exec approvals
  - 您需要在 gateway 或 node hosts 上管理 allowlists
title: "approvals"
---

# `openclaw approvals`

管理 **local host**、**gateway host** 或 **node host** 的 exec approvals。
預設情況下，指令會針對磁碟上的本機 approvals 檔案。使用 `--gateway` 來指定 gateway，或使用 `--node` 來指定特定的 node。

相關連結：

- Exec approvals: [Exec approvals](/zh-Hant/tools/exec-approvals)
- Nodes: [Nodes](/zh-Hant/nodes)

## 常用指令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## 從檔案取代 approvals

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## Allowlist 輔助工具

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 備註

- `--node` 使用與 `openclaw nodes` 相同的解析器（id、name、ip 或 id 前綴）。
- `--agent` 預設為 `"*"`，這適用於所有 agents。
- Node host 必須通告 `system.execApprovals.get/set`（macOS 應用程式或 headless node host）。
- Approvals 檔案依照 host 儲存在 `~/.openclaw/exec-approvals.json`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
