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
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 註記

- 封存包含一個 `manifest.json` 檔案，其中包含解析的來源路徑和封存配置。
- 預設輸出是當前工作目錄中具有時間戳記的 `.tar.gz` 封存。
- 如果目前工作目錄位於備份的來源樹狀結構內，OpenClaw 將會退回到您的家目錄作為預設封存位置。
- 既有的封存檔案永遠不會被覆寫。
- 為了避免自我包含，來源狀態/工作區樹狀結構內的輸出路徑將會被拒絕。
- `openclaw backup verify <archive>` 會驗證封存僅包含一個根資訊清單、拒絕遍歷式封存路徑，並檢查資訊清單中宣告的每個酬載都存在於 tarball 中。
- `openclaw backup create --verify` 會在寫入封存後立即執行該驗證。
- `openclaw backup create --only-config` 僅備份使用中的 JSON 設定檔。

## 備份內容

`openclaw backup create` 規劃來自您本機 OpenClaw 安裝的備份來源：

- 由 OpenClaw 的本機狀態解析器傳回的狀態目錄，通常是 `~/.openclaw`
- 使用中的設定檔路徑
- 當解析後的 `credentials/` 目錄位於狀態目錄外部時
- 從目前設定探索到的工作區目錄，除非您傳遞 `--no-include-workspace`

模型認證設定檔已經是狀態目錄下 `agents/<agentId>/agent/auth-profiles.json` 的一部分，因此通常會被狀態備份項目所涵蓋。

如果您使用 `--only-config`，OpenClaw 會跳過狀態、憑證目錄和工作區探索，僅封存使用中的設定檔路徑。

OpenClaw 會在建置封存檔前將路徑標準化。如果設定、憑證目錄或工作區已位於狀態目錄內，它們將不會作為單獨的頂層備份來源重複出現。缺失的路徑將被跳過。

封存內容會儲存來自這些來源樹的檔案內容，而嵌入的 `manifest.json` 則會記錄解析後的絕對來源路徑以及每個資產所使用的封存佈局。

在建立歸檔時，OpenClaw 會跳過已知無法還原且經常變動的檔案，包括作用中的代理程式會話紀錄、cron 執行記錄、滾動記錄檔、傳遞佇列、狀態目錄下的 socket/pid/temp 檔案，以及相關的 durable-queue 暫存檔。JSON 結果包含 `skippedVolatileCount`，因此自動化程序可以查看有多少檔案被刻意省略。

狀態目錄下 `extensions/` 樹狀結構中已安裝的外掛程式原始碼和清單檔案會被包含在內，但其巢狀的 `node_modules/` 相依性樹狀結構會被跳過。這些相依性是可重新建構的安裝成品；在還原歸檔後，請使用 `openclaw plugins update <id>` 或當已還原的外掛程式回報遺失相依性時，使用 `openclaw plugins install <spec> --force` 重新安裝該外掛程式。

## 無效設定檔的行為

`openclaw backup` 刻意繞過正常的設定檔預檢，以便在還原期間仍能發揮作用。由於工作區探索取決於有效的設定檔，因此當設定檔存在但無效，且工作區備份仍啟用時，`openclaw backup create` 現在會快速失敗。

如果您在該情況下仍想要部分備份，請重新執行：

```bash
openclaw backup create --no-include-workspace
```

這會將狀態、設定和外部憑證目錄保持在範圍內，同時完全跳過工作區探索。

如果您只需要設定檔本身的副本，由於 `--only-config` 不依賴解析設定檔來進行工作區探索，因此在設定檔格式錯誤時也能正常運作。

## 大小與效能

OpenClaw 不會強制執行內建的備份大小上限或單一檔案大小限制。

實際限制來自本機和目的地檔案系統：

- 用於暫存歸檔寫入加上最終歸檔的可用空間
- 走訪大型工作區樹狀結構並將其壓縮成 `.tar.gz` 所需的時間
- 如果您使用 `openclaw backup create --verify` 或執行 `openclaw backup verify`，重新掃描歸檔所需的時間
- 目的地路徑的檔案系統行為。OpenClaw 偏好使用不覆寫的硬連結發佈步驟，當不支援硬連結時則會回退到專屬複製

大型工作區通常是影響歸檔大小的主要因素。如果您想要更小或更快的備份，請使用 `--no-include-workspace`。

若要建立最小的封存檔，請使用 `--only-config`。

## 相關

- [CLI 參考](/zh-Hant/cli)
