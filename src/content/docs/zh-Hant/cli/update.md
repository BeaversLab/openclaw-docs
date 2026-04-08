---
summary: "CLI 參考資料：`openclaw update` (安全原始碼更新 + 閘道自動重啟)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `openclaw update`

安全地更新 OpenClaw 並在穩定版/測試版/開發版之間切換。

如果您透過 **npm/pnpm/bun** 安裝（全域安裝，無 git 中繼資料），
更新會透過[更新](/en/install/updating)中的套件管理員流程進行。

## 使用方式

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
openclaw update --yes
openclaw update --json
openclaw --update
```

## 選項

- `--no-restart`：成功更新後跳過重新啟動 Gateway 服務。
- `--channel <stable|beta|dev>`：設定更新頻道 (git + npm；會保留在設定中)。
- `--tag <dist-tag|version|spec>`：僅針對此更新覆寫套件目標。對於套件安裝，`main` 會對應到 `github:openclaw/openclaw#main`。
- `--dry-run`：預覽計劃的更新動作 (頻道/標籤/目標/重啟流程)，而不寫入設定、安裝、同步外掛或重新啟動。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步驟的逾時時間 (預設為 1200s)。
- `--yes`：跳過確認提示（例如降級確認）

注意：降級需要確認，因為舊版本可能會破壞設定。

## `update status`

顯示目前的更新頻道 + git 標籤/分支/SHA（針對原始碼簽出），以及是否有可用更新。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

選項：

- `--json`：列印機器可讀的狀態 JSON。
- `--timeout <seconds>`：檢查的逾時時間（預設為 3s）。

## `update wizard`

互動式流程，用於選擇更新頻道並確認更新後是否重新啟動 Gateway
（預設為重新啟動）。如果您在沒有 git 簽出的情況下選擇 `dev`，它
會提議建立一個。

選項：

- `--timeout <seconds>`：每個更新步驟的逾時時間（預設 `1200`）

## 運作方式

當您明確切換頻道 (`--channel ...`) 時，OpenClaw 也會保持
安裝方法一致：

- `dev` → 確保有 git 簽出（預設：`~/openclaw`，可使用 `OPENCLAW_GIT_DIR` 覆蓋），
  更新它，並從該簽出安裝全域 CLI。
- `stable` → 使用 `latest` 從 npm 安裝。
- `beta` → 優先使用 npm dist-tag `beta`，但在 beta 缺失或
  比目前的穩定版本舊時，會回退到 `latest`。

Gateway 核心自動更新程式（透過設定啟用時）會重複使用此相同的更新路徑。

## Git 簽出流程

頻道：

- `stable`：簽出最新的非 beta 標籤，然後建置 + doctor。
- `beta``-beta` 標籤，但在 beta 缺失或較舊時
  回退到最新的穩定標籤。
- `dev`：簽出 `main`，然後 fetch + rebase。

高層次：

1. 需要乾淨的工作樹（沒有未提交的變更）。
2. 切換到選定的頻道（標籤或分支）。
3. 獲取上游（僅限 dev）。
4. 僅限 dev：在臨時工作樹中進行預檢 lint + TypeScript 構建；如果最新提交失敗，則回溯最多 10 個提交以尋找最新的乾淨構建。
5. 變基到選定的提交（僅限 dev）。
6. 使用倉庫套件管理器安裝依賴項。對於 pnpm 檢出，更新程序會按需引導 `pnpm`（首先通過 `corepack`，然後是臨時的 `npm install pnpm@10` 備用方案），而不是在 pnpm 工作區內運行 `npm run build`。
7. 構建並構建 Control UI。
8. 運行 `openclaw doctor` 作為最終的「安全更新」檢查。
9. 將插件同步到活動頻道（dev 使用捆綁擴展；stable/beta 使用 npm）並更新通過 npm 安裝的插件。

如果 pnpm 引導仍然失敗，更新程序現在會提前停止並顯示特定於套件管理器的錯誤，而不是嘗試在檢出目錄內運行 `npm run build`。

## `--update` 簡寫

`openclaw --update` 會重寫為 `openclaw update`（對於 shell 和啟動器腳本很有用）。

## 參見

- `openclaw doctor`（在 git 檢出上建議先運行 update）
- [開發頻道](/en/install/development-channels)
- [更新](/en/install/updating)
- [CLI 參考](/en/cli)
