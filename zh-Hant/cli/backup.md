---
summary: "`openclaw backup` 的 CLI 參考資料（建立本機備份封存）"
read_when:
  - 您想要一個針對本機 OpenClaw 狀態的一級備份封存
  - 您想要在重設或解除安裝前預覽將包含哪些路徑
title: "backup"
---

# `openclaw backup`

建立 OpenClaw 狀態、設定、認證、工作階段以及選擇性工作區的本機備份封存。

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

- 封存包含一個 `manifest.json` 檔案，其中包含已解析的來源路徑和封存配置。
- 預設輸出是目前工作目錄中帶有時間戳記的 `.tar.gz` 封存檔。
- 如果目前工作目錄位於備份的來源樹狀結構內，OpenClaw 將改用您的家目錄作為預設封存位置。
- 現有的封存檔案永遠不會被覆寫。
- 為了避免自我包含，來源狀態/工作區樹狀結構內的輸出路徑將被拒絕。
- `openclaw backup verify <archive>` 會驗證封存只包含一個根資訊清單，拒絕巡覽樣式的封存路徑，並檢查資訊清單中宣告的每個承載是否存在於 tarball 中。
- `openclaw backup create --verify` 會在寫入封存後立即執行該驗證。
- `openclaw backup create --only-config` 僅備份使用中的 JSON 設定檔。

## 備份內容

`openclaw backup create` 從您的本機 OpenClaw 安裝規劃備份來源：

- 由 OpenClaw 的本機狀態解析器傳回的狀態目錄，通常是 `~/.openclaw`
- 使用中的設定檔路徑
- OAuth / 認證目錄
- 從目前設定探索到的工作區目錄，除非您傳遞 `--no-include-workspace`

如果您使用 `--only-config`，OpenClaw 將會略過狀態、認證和工作區探索，並且只封存使用中的設定檔路徑。

OpenClaw 在建立封存之前會將路徑正規化。如果設定、認證或工作區已經位於狀態目錄內，它們將不會作為單獨的頂層備份來源重複。缺少的路徑會被跳過。

封存承載會儲存來自這些來源樹狀結構的檔案內容，而內嵌的 `manifest.json` 則會記錄已解析的絕對來源路徑以及每個資產所使用的封存配置。

## 無效設定行為

`openclaw backup` 故意繞過正常的設定預檢，以便在復原期間仍能提供協助。由於工作區探索取決於有效的設定，當設定檔存在但無效且工作區備份仍處於啟用狀態時，`openclaw backup create` 現在會快速失敗。

如果在這種情況下您仍然需要部分備份，請重新執行：

```bash
openclaw backup create --no-include-workspace
```

這會將狀態、設定和憑證保留在範圍內，同時完全跳過工作區探索。

如果您只需要設定檔本身的副本，`--only-config` 也能在設定格式錯誤時運作，因為它不依賴解析設定來進行工作區探索。

## 大小與效能

OpenClaw 不會強制執行內建的最大備份大小或單一檔案大小限制。

實際限制來自本機和目的地檔案系統：

- 用於暫存封存寫入以及最終封存的可用空間
- 遍歷大型工作區樹並將其壓縮為 `.tar.gz` 所需的時間
- 如果您使用 `openclaw backup create --verify` 或執行 `openclaw backup verify`，重新掃描存檔所需的時間
- 目的地路徑的檔案系統行為。OpenClaw 偏好無覆蓋的硬連結發布步驟，當不支援硬連結時則回退至獨佔複製

大型工作區通常是影響存檔大小的主要因素。如果您想要更小或更快的備份，請使用 `--no-include-workspace`。

若要獲得最小的存檔，請使用 `--only-config`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
