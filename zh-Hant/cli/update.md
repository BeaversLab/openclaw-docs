---
summary: "CLI 參考文件 `openclaw update` (安全原始碼更新 + 閘道自動重新啟動)"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "update"
---

# `openclaw update`

安全地更新 OpenClaw 並在穩定版/Beta/開發版通道之間切換。

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

- `--no-restart`：在成功更新後跳過重新啟動 Gateway 服務。
- `--channel <stable|beta|dev>`：設定更新通道 (git + npm；會保存在設定中)。
- `--tag <dist-tag|version|spec>`：僅針對此次更新覆寫套件目標。對於套件安裝，`main` 會對應到 `github:openclaw/openclaw#main`。
- `--dry-run`：預覽計劃的更新動作（通道/標籤/目標/重新啟動流程），而不寫入設定、安裝、同步外掛或重新啟動。
- `--json`：列印機器可讀取的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步驟的逾時時間（預設為 1200s）。

注意：降級需要確認，因為舊版本可能會破壞設定。

## `update status`

顯示作用中的更新通道 + git 標籤/分支/SHA（針對原始碼副本），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

選項：

- `--json`：列印機器可讀取的狀態 JSON。
- `--timeout <seconds>`：檢查的逾時時間（預設為 3s）。

## `update wizard`

互動式流程，用於選擇更新通道並確認更新後是否重新啟動 Gateway
（預設為重新啟動）。如果您在沒有 git 副本的情況下選擇 `dev`，它
會提議建立一個。

## 運作方式

當您明確切換通道 (`--channel ...`) 時，OpenClaw 也會保持
安裝方法一致：

- `dev` → 確保有 git 副本（預設：`~/openclaw`，可用 `OPENCLAW_GIT_DIR` 覆寫），
  更新它，並從該副本安裝全域 CLI。
- `stable`/`beta` → 使用符合的 dist-tag 從 npm 安裝。

Gateway 核心自動更新程式（當透過設定啟用時）會重複使用此相同的更新路徑。

## Git checkout 流程

頻道：

- `stable`：checkout 最新的非 beta 標籤，然後建置 + 執行 doctor。
- `beta`：checkout 最新的 `-beta` 標籤，然後建置 + 執行 doctor。
- `dev`：checkout `main`，然後 fetch + rebase。

高層次：

1. 需要乾淨的工作樹（無未提交的變更）。
2. 切換至選定的頻道（標籤或分支）。
3. 取得上游（僅限 dev）。
4. 僅限 dev：在暫存工作樹中進行前置 lint + TypeScript 建置；如果提示失敗，則最多回溯 10 個提交以尋找最新的乾淨建置。
5. Rebase 至選定的提交（僅限 dev）。
6. 安裝相依項（偏好 pnpm；後備使用 npm）。
7. 建置 + 建置控制 UI。
8. 執行 `openclaw doctor` 作為最終的「安全更新」檢查。
9. 將插件同步至現用頻道（dev 使用捆綁擴充功能；stable/beta 使用 npm）並更新透過 npm 安裝的插件。

## `--update` 簡寫

`openclaw --update` 會重寫為 `openclaw update`（適用於 Shell 和啟動器腳本）。

## 另請參閱

- `openclaw doctor`（在 git checkout 上提議先執行 update）
- [開發頻道](/zh-Hant/install/development-channels)
- [更新](/zh-Hant/install/updating)
- [CLI 參考資料](/zh-Hant/cli)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
