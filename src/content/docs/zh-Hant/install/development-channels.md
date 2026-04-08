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
- **beta**：當其為當前版本時，使用 npm dist-tag `beta`；如果 beta 缺失或比最新的穩定版更舊，更新流程將回退到 `latest`。
- **dev**：`main` (git) 的移動分支頭。npm dist-tag：`dev` (發佈時)。`main` 分支用於實驗和主動開發。它可能包含未完成的功能或重大變更。請勿將其用於生產環境的閘道。

我們通常先將穩定版本發佈到 **beta**，在那裡測試，然後執行顯式的提升步驟，將經過驗證的版本移動到 `latest` 而不改變版本號。維護者也可以在需要時直接將穩定版本發佈到 `latest`。Dist-tags 是 npm 安裝的依據。

## 切換頻道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 會將您的選擇保存在配置中 (`update.channel`) 並協調安裝方法：

- **`stable`** (套件安裝)：透過 npm dist-tag `latest` 進行更新。
- **`beta`** (套件安裝)：優先使用 npm dist-tag `beta`，但當 `beta` 缺失或比當前穩定版標籤舊時，會回退到 `latest`。
- **`stable`** (git 安裝)：檢出最新的穩定 git 標籤。
- **`beta`** (git 安裝)：優先使用最新的 beta git 標籤，但當 beta 缺失或較舊時，會回退到最新的穩定 git 標籤。
- **`dev`**：確保進行 git 檢出 (預設 `~/openclaw`，可用 `OPENCLAW_GIT_DIR` 覆蓋)，切換到 `main`，在上游進行 rebase，構建，並從該檢出中安裝全域 CLI。

提示：如果您想同時使用 stable 和 dev，請保留兩個副本並將您的閘道指向穩定版的那個。

## 一次性版本或標籤定位

使用 `--tag` 為單次更新指定特定的 dist-tag、版本或套件規範，而**不**更改您保存的通道：

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1
```

備註：

- `--tag` 僅適用於**套件 安裝**。Git 安裝會忽略它。
- 該標籤不會被保存。您的下一次 `openclaw update` 將照常使用您配置的
  頻道。
- 降級保護：如果目標版本比您的當前版本舊，
  OpenClaw 會提示確認（可使用 `--yes` 跳過）。
- `--channel beta` 與 `--tag beta` 不同：頻道流程可以在 beta 缺失或較舊時回退
  到 stable/latest，而 `--tag beta` 則針對該次執行的原始
  `beta` dist-tag。

## 試運行

預覽 `openclaw update` 將會執行的操作而不進行變更：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

試運行會顯示有效頻道、目標版本、計劃操作以及
是否需要降級確認。

## 外掛與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛
來源：

- `dev` 偏好來自 git checkout 的捆綁外掛。
- `stable` 和 `beta` 會還原透過 npm 安裝的外掛套件。
- npm 安裝的外掛會在核心更新完成後更新。

## 檢查當前狀態

```bash
openclaw update status
```

顯示活躍頻道、安裝類型（git 或 package）、當前版本以及
來源（config、git tag、git branch 或 default）。

## 標籤最佳實踐

- 為您希望 git checkout 落地的版本打上標籤（stable 使用 `vYYYY.M.D`，
  beta 使用 `vYYYY.M.D-beta.N`）。
- 為了相容性，`vYYYY.M.D.beta.N` 也會被識別，但請優先使用 `-beta.N`。
- 舊版的 `vYYYY.M.D-<patch>` 標籤仍會被識別為 stable（非 beta）。
- 保持標籤不可變：永遠不要移動或重複使用標籤。
- npm dist-tags 仍然是 npm 安裝的事實來源：
  - `latest` -> stable
  - `beta` -> 候選建置或 beta 優先的 stable 建置
  - `dev` -> main 快照（可選）

## macOS 應用程式可用性

Beta 和 dev 版本可能**不**包含 macOS 應用程式發布。這沒問題：

- git tag 和 npm dist-tag 仍然可以發布。
- 在發布說明或變更日誌中說明「此 beta 版本沒有 macOS 建置」。
