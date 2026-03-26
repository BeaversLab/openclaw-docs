---
summary: "穩定版、Beta 版和開發版通道：語義、切換、釘選和標記"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "發布通道"
sidebarTitle: "發布通道"
---

# 開發通道

OpenClaw 提供了三個更新通道：

- **stable**：npm dist-tag `latest`。推薦給大多數使用者。
- **beta**：npm dist-tag `beta`（正在測試中的版本）。
- **dev**：`main` (git) 的移動最新提交。npm dist-tag：`dev`（發布時）。
  `main` 分支用於實驗和活躍開發。它可能包含
  未完成的功能或重大變更。請勿在生產環境閘道器中使用它。

我們將構建版本發布到 **beta**，進行測試，然後在**不改變版本號碼的情況下將經過驗證的構建版本提升至 `latest`** —— dist-tags 是 npm 安裝的來源事實。

## 切換頻道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 會將您的選擇保存在設定 (`update.channel`) 中，並協調安裝方法：

- **`stable`/`beta`** (套件安裝)：透過對應的 npm dist-tag 更新。
- **`stable`/`beta`** (git 安裝)：檢出最新對應的 git tag。
- **`dev`**：確保 git 檢出 (預設為 `~/openclaw`，可使用 `OPENCLAW_GIT_DIR` 覆寫)，切換至 `main`，對上游進行變基，構建，並從該檢出版本安裝全域 CLI。

提示：如果您想要同時使用穩定版與開發版，請保留兩個副本，並將您的閘道指向穩定版的那一個。

## 一次性指定版本或標籤

使用 `--tag` 針對單次更新指定特定的 dist-tag、版本或套件規格，而**不**變更您持續使用的頻道：

```bash
# Install a specific version
openclaw update --tag 2026.3.14

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.3.12
```

注意：

- `--tag` 僅適用於**套件 安裝**。Git 安裝會將其忽略。
- 此標籤不會被保留。您的下一次 `openclaw update` 將照常使用您設定的頻道。
- 降級保護：如果目標版本比您的目前版本舊，OpenClaw 將提示您確認（可使用 `--yes` 跳過）。

## 試執行 (Dry run)

預覽 `openclaw update` 將執行的操作而不進行變更：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.3.14 --dry-run
openclaw update --dry-run --json
```

試執行會顯示有效頻道、目標版本、計劃執行的動作，以及是否需要降級確認。

## 外掛與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛
來源：

- `dev` 偏好來自 git checkout 的內建外掛。
- `stable` 和 `beta` 會還原 npm 安裝的外掛套件。
- npm 安裝的外掛會在核心更新完成後更新。

## 檢查目前狀態

```bash
openclaw update status
```

顯示使用中的頻道、安裝類型（git 或 package）、目前版本，以及
來源（config、git tag、git branch 或 default）。

## 標記 (Tagging) 最佳實踐

- 標記您希望 git checkouts 停留的發行版本（stable 為 `vYYYY.M.D`，
  beta 為 `vYYYY.M.D-beta.N`）。
- 為了相容性，也會辨識 `vYYYY.M.D.beta.N`，但建議優先使用 `-beta.N`。
- 舊版的 `vYYYY.M.D-<patch>` 標籤仍會被辨識為 stable（非 beta）。
- 保持標籤不可變：絕不要移動或重用標籤。
- npm dist-tags 仍然是 npm 安裝的真理來源：
  - `latest` -> stable
  - `beta` -> 候選版本
  - `dev` -> main 快照（可選）

## macOS 應用程式可用性

Beta 和 dev 版本可能**不**包含 macOS 應用程式版本。這沒關係：

- git 標籤和 npm dist-tag 仍然可以發布。
- 在版本說明或變更日誌中指出「此 beta 版本沒有 macOS 版本」。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
