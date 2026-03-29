---
summary: "CLI 參考資料：`openclaw uninstall`（移除閘道服務 + 本機資料）"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `openclaw uninstall`

解除安裝閘道服務 + 本機資料（CLI 保留）。

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果您希望在移除狀態或工作區之前取得可還原的快照，請先執行 `openclaw backup create`。
