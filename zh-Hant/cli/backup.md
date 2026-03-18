---
summary: "`openclaw backup`（建立本機備份封存）的 CLI 參考"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `openclaw backup`

建立 OpenClaw 狀態、設定、憑證、工作階段以及選用工作區的本機備份封存。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 注意事項

- 封存包含一個 `manifest.json` 檔案，其中記錄了已解析的來源路徑和封存配置。
- 預設輸出是目前工作目錄中加上時間戳記的 `.tar.gz` 封存檔。
- 如果目前工作目錄位於備份來源樹狀結構內，OpenClaw 將退回到您的家目錄作為預設封存位置。
- 現有的封存檔永遠不會被覆寫。
- 位於來源狀態/工作區樹狀結構內的輸出路徑會被拒絕，以避免自我包含。
- `openclaw backup verify <archive>` 會驗證封存僅包含一個根資訊清單，拒絕遍歷式封存路徑，並檢查資訊清單中宣告的每個有效載載是否存在於 tarball 中。
- `openclaw backup create --verify` 會在寫入封存後立即執行該驗證。
- `openclaw backup create --only-config` 僅備份使用中的 JSON 設定檔。

## 備份內容

`openclaw backup create` 從您的本機 OpenClaw 安裝規劃備份來源：

- 由 OpenClaw 本機狀態解析器傳回的狀態目錄，通常是 `~/.openclaw`
- 使用中的設定檔路徑
- OAuth / 憑證目錄
- 從目前設定探索到的工作區目錄，除非您傳遞 `--no-include-workspace`

如果您使用 `--only-config`，OpenClaw 將跳過狀態、憑證和工作區探索，僅封存使用中的設定檔路徑。

OpenClaw 會在建立封存前將路徑正規化。如果設定、憑證或工作區已位於狀態目錄內，它們將不會被複製為獨立的頂層備份來源。遺失的路徑將被跳過。

封存有效載載儲存來自這些來源樹狀結構的檔案內容，而內嵌的 `manifest.json` 則記錄了已解析的絕對來源路徑以及每個資產所使用的封存配置。

## 無效設定行為

`openclaw backup` 故意繞過正常的配置預檢，以便在恢復期間仍能提供幫助。由於工作區發現取決於有效的配置，當配置檔案存在但無效且工作區備份仍處於啟用狀態時，`openclaw backup create` 現在會快速失敗。

如果在這種情況下您仍然需要部分備份，請重新執行：

```bash
openclaw backup create --no-include-workspace
```

這樣會將狀態、配置和憑證保持在範圍內，同時完全跳過工作區發現。

如果您只需要配置檔案本身的副本，即使配置格式錯誤，`--only-config` 也可以運作，因為它不依賴解析配置來進行工作區發現。

## 大小與效能

OpenClaw 不強制執行內建的最大備份大小或每個檔案的大小限制。

實際限制來自本機和目標檔案系統：

- 用於臨時歸檔寫入加上最終歸檔的可用空間
- 遍歷大型工作區樹並將其壓縮為 `.tar.gz` 所需的時間
- 如果您使用 `openclaw backup create --verify` 或執行 `openclaw backup verify`，重新掃描歸檔所需的時間
- 目標路徑的檔案系統行為。OpenClaw 偏好無覆寫的硬連結發布步驟，當不支援硬連結時，會回退到獨佔複製

大型工作區通常是歸檔大小的主要驅動因素。如果您想要更小或更快的備份，請使用 `--no-include-workspace`。

若要獲得最小的歸檔，請使用 `--only-config`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
