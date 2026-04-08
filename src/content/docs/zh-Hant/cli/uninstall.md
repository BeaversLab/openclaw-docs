---
summary: "CLI 參考資料：`openclaw uninstall`（移除閘道服務 + 本機資料）"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `openclaw uninstall`

解除安裝閘道服務 + 本機資料（CLI 保留）。

選項：

- `--service`：移除閘道服務
- `--state`：移除狀態和設定
- `--workspace`：移除工作區目錄
- `--app`：移除 macOS 應用程式
- `--all`：移除服務、狀態、工作區和應用程式
- `--yes`：跳過確認提示
- `--non-interactive`：停用提示；需要 `--yes`
- `--dry-run`：列印動作而不移除檔案

範例：

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

注意事項：

- 如果您在移除狀態或工作區之前需要可還原的快照，請先執行 `openclaw backup create`。
- `--all` 是同時移除服務、狀態、工作區和應用程式的簡寫。
- `--non-interactive` 需要 `--yes`。
