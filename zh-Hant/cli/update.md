---
summary: "`openclaw update` 的 CLI 參考（相對安全的來源更新 + 閘道自動重啟）"
read_when:
  - 您想要安全地更新來源檢出
  - 您需要了解 `--update` 簡寫的行為
title: "update"
---

# `openclaw update`

安全地更新 OpenClaw 並在穩定/Beta/開發頻道之間切換。

如果您是透過 **npm/pnpm** 安裝（全域安裝，無 git 中繼資料），更新會透過 [更新](/zh-Hant/install/updating) 中的套件管理員流程進行。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --json
openclaw --update
```

## 選項

- `--no-restart`：在成功更新後略過重啟 Gateway 服務。
- `--channel <stable|beta|dev>`：設定更新頻道（git + npm；保存在設定中）。
- `--tag <dist-tag|version|spec>`：僅針對此更新覆寫套件目標。對於套件安裝，`main` 對應到 `github:openclaw/openclaw#main`。
- `--dry-run`：在不寫入設定、安裝、同步外掛或重啟的情況下，預覽計劃的更新動作（頻道/標籤/目標/重啟流程）。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步驟的逾時時間（預設為 1200 秒）。

注意：降級需要確認，因為較舊的版本可能會破壞設定。

## `update status`

顯示作用中的更新頻道 + git 標籤/分支/SHA（針對來源檢出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

選項：

- `--json`：列印機器可讀取的狀態 JSON。
- `--timeout <seconds>`：檢查的逾時時間（預設為 3 秒）。

## `update wizard`

選取更新頻道並確認更新後是否要重啟 Gateway 的互動式流程
（預設為重啟）。如果您在沒有 git 檢出的情況下選取 `dev`，
它會提議建立一個。

## 運作方式

當您明確切換頻道 (`--channel ...`) 時，OpenClaw 也會讓
安裝方式保持一致：

- `dev` → 確保有 git 檢出（預設：`~/openclaw`，可使用 `OPENCLAW_GIT_DIR` 覆寫），
  更新它，並從該檢出安裝全域 CLI。
- `stable`/`beta` → 使用對應的 dist-tag 從 npm 安裝。

Gateway 核心自動更新程式（透過設定啟用時）會重複使用相同的更新路徑。

## Git checkout 流程

頻道：

- `stable`：checkout 最新的非 beta 標籤，然後建置 + doctor。
- `beta`：checkout 最新的 `-beta` 標籤，然後建置 + doctor。
- `dev`：checkout `main`，然後 fetch + rebase。

高層級：

1. 需要乾淨的工作目錄（沒有未提交的變更）。
2. 切換到選定的頻道（標籤或分支）。
3. 獲取上游（僅限 dev）。
4. 僅限 dev：在暫時工作目錄中進行飛行前檢查 lint + TypeScript 建置；如果失敗，會回溯最多 10 個提交以尋找最新的乾淨建置。
5. Rebase 到選定的提交（僅限 dev）。
6. 安裝依賴項（首選 pnpm；後備 npm）。
7. 建置 + 建置 Control UI。
8. 執行 `openclaw doctor` 作為最終的「安全更新」檢查。
9. 將外掛同步到作用中頻道（dev 使用打包的擴充功能；stable/beta 使用 npm）並更新以 npm 安裝的外掛。

## `--update` 簡寫

`openclaw --update` 會重寫為 `openclaw update`（適用於 shell 和啟動器腳本）。

## 另請參閱

- `openclaw doctor`（提議在 git checkout 時先執行 update）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考](/zh-Hant/cli)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
