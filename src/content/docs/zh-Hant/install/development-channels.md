---
summary: "穩定版、測試版和開發頻道：語意、切換、固定版本與標記"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "發布頻道"
sidebarTitle: "發布頻道"
---

# 開發頻道

OpenClaw 提供三種更新頻道：

- **stable**：npm dist-tag `latest`。建議大多數使用者使用。
- **beta**：npm dist-tag `beta`（測試中的版本）。
- **dev**：`main` (git) 的移動頭部。npm dist-tag：`dev`（發布時）。
  `main` 分支用於實驗和主動開發。它可能包含未完成的功能或重大變更。請勿在生產環境的閘道中使用它。

我們將版本發布到 **beta**，進行測試，然後在不變更版本號的情況下**將審核過的版本推廣至 `latest`**——dist-tags 是 npm 安裝的事實來源。

## 切換頻道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 會將您的選擇儲存在設定中 (`update.channel`) 並調整安裝方法：

- **`stable`/`beta`**（套件安裝）：透過對應的 npm dist-tag 更新。
- **`stable`/`beta`**（git 安裝）：簽出最新的對應 git 標籤。
- **`dev`**：確保進行 git 簽出（預設 `~/openclaw`，可透過 `OPENCLAW_GIT_DIR` 覆寫），切換至 `main`，對上游進行變基，建構，並從該簽出版本安裝全域 CLI。

提示：如果您想要同時使用 stable 和 dev，請保留兩個副本，並將您的閘道指向 stable 的那一個。

## 一次性版本或標記指定

使用 `--tag` 針對單次更新指定特定的 dist-tag、版本或套件規格，**而不**變更您儲存的頻道：

```bash
# Install a specific version
openclaw update --tag 2026.3.28-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.3.28-beta.1
```

備註：

- `--tag` 僅適用於 **套件 (npm) 安裝**。Git 安裝會忽略它。
- 該標籤不會被儲存。您的下一次 `openclaw update` 會照常使用您設定的頻道。
- 降級保護：如果目標版本比您目前的版本舊，OpenClaw 會提示確認（使用 `--yes` 跳過）。

## 試運行

預覽 `openclaw update` 將執行的操作而不進行變更：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.3.28-beta.1 --dry-run
openclaw update --dry-run --json
```

試運行會顯示有效頻道、目標版本、計劃的操作，以及是否需要降級確認。

## 外掛程式與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛程式來源：

- `dev` 偏好來自 git 檢出的配套外掛程式。
- `stable` 和 `beta` 會還原透過 npm 安裝的外掛程式套件。
- 透過 npm 安裝的外掛程式會在核心更新完成後更新。

## 檢查目前狀態

```bash
openclaw update status
```

顯示使用中的頻道、安裝類型（git 或套件）、目前版本以及來源（設定、git 標籤、git 分支或預設值）。

## 標記最佳實踐

- 為您希望 git 檢出指向的版本加上標記（穩定版用 `vYYYY.M.D`，Beta 版用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 也會為了相容性而被識別，但建議優先使用 `-beta.N`。
- 舊式的 `vYYYY.M.D-<patch>` 標籤仍會被識別為穩定版本（非 Beta 版）。
- 保持標記不可變：絕不要移動或重複使用標記。
- npm dist-tags 仍是 npm 安裝的事實來源：
  - `latest` -> stable
  - `beta` -> candidate build
  - `dev` -> main snapshot (optional)

## macOS 應用程式可用性

Beta 和開發版本可能**不會**包含 macOS 應用程式版本。這是沒有問題的：

- git 標籤和 npm dist-tag 仍然可以發布。
- 在發布說明或變更日誌中註明「此 beta 版本沒有 macOS 建置版本」。
