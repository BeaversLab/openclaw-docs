---
summary: " CLI 參考手冊，適用於 `openclaw reset`（重設本地狀態/配置）"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `openclaw reset`

重設本地配置/狀態（保留已安裝的 CLI）。

選項：

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳過確認提示
- `--non-interactive`：停用提示；需要 `--scope` 和 `--yes`
- `--dry-run`：列印動作而不移除檔案

範例：

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

備註：

- 如果您在移除本機狀態之前需要可還原的快照，請先執行 `openclaw backup create`。
- 如果您省略 `--scope`，`openclaw reset` 會使用互動式提示來選擇要移除的內容。
- `--non-interactive` 僅在 `--scope` 和 `--yes` 同時設定時有效。
