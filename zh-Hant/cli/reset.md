---
summary: "CLI 參考資料：`openclaw reset` (重設本地狀態/配置)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `openclaw reset`

重設本地配置/狀態 (保留已安裝的 CLI)。

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

如果您希望在移除本地狀態之前獲得可還原的快照，請先執行 `openclaw backup create`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
