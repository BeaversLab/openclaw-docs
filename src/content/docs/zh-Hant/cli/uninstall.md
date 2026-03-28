---
summary: "CLI 參考資料：`openclaw uninstall` (移除閘道服務 + 本機資料)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "解除安裝"
---

# `openclaw uninstall`

解除安裝閘道服務與本機資料 (CLI 會保留)。

```exec
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果您在移除狀態或工作區之前需要可還原的快照，請先執行 `openclaw backup create`。
