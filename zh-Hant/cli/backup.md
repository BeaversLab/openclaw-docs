---
summary: "建立本機備份封存的 `openclaw backup` CLI 參考資料"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `openclaw backup`

建立 OpenClaw 狀態、設定、認證資訊、工作階段以及選擇性工作區的本地備份封存。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 備註

- 封存包含一個 `manifest.json` 檔案，其中含有已解析的來源路徑和封存佈局。
- 預設輸出是目前工作目錄中加上時間戳記的 `.tar.gz` 封存檔。
- 如果目前工作目錄位於備份的來源樹狀結構內，OpenClaw 會退回到您的家目錄作為預設封存位置。
- 既有的封存檔永遠不會被覆寫。
- 來源狀態/工作區樹狀結構內的輸出路徑將會被拒絕，以避免自我包含。
- `openclaw backup verify <archive>` 會驗證封存檔剛好包含一個根清單、拒絕遍歷式封存路徑，並檢查每個清單宣告的載荷都存在於 tarball 中。
- `openclaw backup create --verify` 會在寫入封存檔後立即執行該驗證。
- `openclaw backup create --only-config` 僅備份使用中的 JSON 設定檔。

## 什麼會被備份

`openclaw backup create` 會從您的本機 OpenClaw 安裝規劃備份來源：

- 由 OpenClaw 的本機狀態解析器傳回的狀態目錄，通常是 `~/.openclaw`
- 使用中的設定檔路徑
- OAuth / 憑證目錄
- 從目前設定探索到的工作區目錄，除非您傳遞了 `--no-include-workspace`

如果您使用 `--only-config`，OpenClaw 將會跳過狀態、憑證和工作區發現，並僅封存現用的組態檔路徑。

OpenClaw 會在建置封存之前將路徑正規化。如果組態、憑證或工作區已經位於狀態目錄中，它們不會被複製為單獨的頂層備份來源。遺失的路徑將會被跳過。

封存內容會儲存來自這些來源樹的檔案內容，而內嵌的 `manifest.json` 則會記錄已解析的絕對來源路徑，以及每個資產所使用的封存佈局。

## 無效組態的行為

`openclaw backup` 故意繞過正常的組態預檢，以便在恢復期間仍能提供協助。由於工作區發現依賴於有效的組態，當組態檔存在但無效且仍啟用工作區備份時，`openclaw backup create` 現在會快速失敗。

如果您在這種情況下仍然需要部分備份，請重新執行：

```bash
openclaw backup create --no-include-workspace
```

這會將狀態、設定和憑證保持在範圍內，同時完全跳過工作區探索。

如果您只需要設定檔本身的副本，`--only-config` 在設定格式錯誤時也能運作，因為它不依賴解析設定來進行工作區探索。

## 大小與效能

OpenClaw 不會強制執行內建的備份大小上限或單一檔案大小限制。

實際的限制來自本地機器和目的地檔案系統：

- 用於暫存歸檔寫入加上最終歸檔的可用空間
- 走訪大型工作區樹狀結構並將其壓縮為 `.tar.gz` 所需的時間
- 如果您使用 `openclaw backup create --verify` 或執行 `openclaw backup verify`，重新掃描歸檔所需的時間
- 目的地路徑的檔案系統行為。OpenClaw 偏好不覆蓋的硬連結發佈步驟，當不支援硬連結時則回退為獨佔複製

大型工作區通常是封存大小的主要驅動因素。如果您想要更小或更快的備份，請使用 `--no-include-workspace`。

若要獲得最小的封存，請使用 `--only-config`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
