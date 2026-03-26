---
summary: " `openclaw reset` 的 CLI 參考（重設本地狀態/設定）"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "重設"
---

# `openclaw reset`

重設本地設定/狀態（保留已安裝的 CLI）。

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```

如果您想在移除本地狀態之前取得可還原的快照，請先執行 `openclaw backup create`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
