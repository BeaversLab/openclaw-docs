---
summary: "`openclaw uninstall` 的 CLI 參考（移除 gateway service + 本地資料）"
read_when:
  - 您想要移除 gateway service 和/或本地狀態
  - 您想要先進行 dry-run
title: "uninstall"
---

# `openclaw uninstall`

解除安裝 gateway service + 本地資料（CLI 會保留）。

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果您在移除狀態或工作區之前想要一個可還原的快照，請先執行 `openclaw backup create`。

import en from "/components/footer/en.mdx";

<en />
