---
summary: "`openclaw backup`（建立本機備份封存）的 CLI 參考"
read_when:
  - You want a first-class backup archive for local OpenClaw state
  - You want to preview which paths would be included before reset or uninstall
title: "備份"
---

# `openclaw backup`

建立 OpenClaw 狀態、設定、認證設定檔、通道/提供者憑證、工作階段，以及選擇性工作區的本機備份封存檔。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
```

## 註記

- 封存包含一個 `manifest.json` 檔案，其中包含解析的來源路徑和封存配置。
- 預設輸出是當前工作目錄中具有時間戳記的 `.tar.gz` 封存。
- 加上時間戳記的備份檔案名稱會使用您機器的當地時區，並包含 UTC 偏移量。
- 如果目前工作目錄位於備份來源樹內，OpenClaw 會改用您的家目錄作為預設封存位置。
- 現有的封存檔案絕不會被覆寫。
- 位於來源狀態/工作區樹內的輸出路徑將被拒絕，以避免自我包含。
- `openclaw backup verify <archive>` 會驗證封存剛好包含一個根清單、拒絕遍歷樣式的封存路徑，並檢查清單中宣告的每個內容是否存在於 tarball 中。
- `openclaw backup create --verify` 會在寫入封存後立即執行該驗證。
- `openclaw backup create --only-config` 僅備份使用中的 JSON 設定檔。

## 備份內容

`openclaw backup create` 從您的本機 OpenClaw 安裝規劃備份來源：

- 由 OpenClaw 本機狀態解析器傳回的狀態目錄，通常是 `~/.openclaw`
- 使用中的設定檔路徑
- 解析後的 `credentials/` 目錄，當它位於狀態目錄之外時
- 從目前設定探索到的工作區目錄，除非您傳遞了 `--no-include-workspace`

模型驗證設定檔已經是狀態目錄的一部分，位於
`agents/<agentId>/agent/auth-profiles.json` 之下，因此通常會被狀態備份項目
所涵蓋。

如果您使用 `--only-config`，OpenClaw 將會略過狀態、認證目錄和工作區的探索，並且僅封存使用中的設定檔路徑。

OpenClaw 會在建立封存前將路徑正規化。如果設定、認證目錄或工作區已經位於狀態目錄內，它們將不會被複製為獨立的頂層備份來源。遺失的路徑將被跳過。

封存內容會儲存來自這些來源樹的檔案內容，而嵌入的 `manifest.json` 則會記錄解析後的絕對來源路徑以及每個資產所使用的封存佈局。

在建立封存檔時，OpenClaw 會跳過已知且沒有還原價值的即時變異檔案，包括作用中的代理程式會話紀錄、cron 執行日誌、滾動日誌、傳遞佇列、狀態目錄下的 socket/pid/臨時檔案，以及相關的 durable-queue 臨時檔案。JSON 結果包含 `skippedVolatileCount`，以便自動化工具能查看有多少檔案被刻意略過。

狀態目錄下 `extensions/` 樹狀結構中的外掛程式來源與資訊清單檔案會被包含在內，但其巢狀的 `node_modules/` 相依性樹狀結構則會被跳過。這些相依性屬於可重建的安裝產物；在還原封存檔後，當還原的外掛程式回報缺少相依性時，請使用 `openclaw plugins update <id>` 或使用 `openclaw plugins install <spec> --force` 重新安裝該外掛程式。

## 無效設定行為

`openclaw backup` 刻意繞過正常的設定預檢，以便在還原期間仍能提供協助。由於工作區探索依賴有效的設定，若設定檔存在但無效，且工作區備份仍處於啟用狀態，`openclaw backup create` 現在會快速失敗。

如果您在該情況下仍需要部分備份，請重新執行：

```bash
openclaw backup create --no-include-workspace
```

這會將狀態、設定與外部憑證目錄保持在範圍內，同時完全跳過工作區探索。

如果您只需要設定檔本身的副本，`--only-config` 在設定格式錯誤時也能運作，因為它不依賴解析設定來進行工作區探索。

## 大小與效能

OpenClaw 不會強制執行內建的備份大小上限或個別檔案大小限制。

實際限制來自本機與目的地檔案系統：

- 用於寫入暫存封存檔與最終封存檔的可用空間
- 走訪大型工作區樹狀結構並將其壓縮成 `.tar.gz` 所需的時間
- 如果您使用 `openclaw backup create --verify` 或執行 `openclaw backup verify`，重新掃描封存檔所需的時間
- 目的地路徑的檔案系統行為。OpenClaw 偏好不覆寫的硬連結發布步驟，並在不支援硬連結時退回至獨佔複製

大型工作區通常是封存檔大小的主要來源。如果您想要更小或更快的備份，請使用 `--no-include-workspace`。

若要建立最小的壓縮檔，請使用 `--only-config`。

## 相關

- [CLI 參考](/zh-Hant/cli)
