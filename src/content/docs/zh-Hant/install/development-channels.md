---
summary: "穩定版、測試版和開發頻道：語意、切換、固定版本與標記"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "發布通道"
sidebarTitle: "發布頻道"
---

OpenClaw 提供三個更新通道：

- **stable**（穩定版）：npm dist-tag `latest`。推薦給大多數使用者。
- **beta**（測試版）：當其為最新版本時為 npm dist-tag `beta`；如果 beta 缺失或比
  最新的穩定版舊，更新流程將會回退到 `latest`。
- **dev**（開發版）：`main` (git) 的移動指標。npm dist-tag：`dev`（發佈時）。
  `main` 分支用於實驗和主動開發。它可能包含
  未完成的功能或破壞性變更。請勿將其用於生產環境閘道。

我們通常先將穩定版本發佈到 **beta**，在那裡進行測試，然後執行
顯式的提升步驟，將審核過的版本移至 `latest` 而
不更改版本號碼。維護者也可以在需要時將穩定版本
直接發佈到 `latest`。Dist-tags 是 npm
安裝的事實來源。

## 切換通道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 會將您的選擇保存在配置中 (`update.channel`) 並對齊
安裝方法：

- **`stable`**（套件安裝）：透過 npm dist-tag `latest` 更新。
- **`beta`**（套件安裝）：優先使用 npm dist-tag `beta`，但當 `beta` 缺失或比目前的穩定版標籤舊時，會回退到
  `latest`。
- **`stable`**（git 安裝）：簽出最新的穩定版 git 標籤。
- **`beta`**（git 安裝）：優先使用最新的 beta git 標籤，但當 beta 缺失或較舊時，會回退到
  最新的穩定版 git 標籤。
- **`dev`**: 確保 git checkout（預設為 `~/openclaw`，或當設定了 `OPENCLAW_HOME` 時為 `$OPENCLAW_HOME/openclaw`；可透過 `OPENCLAW_GIT_DIR` 覆寫），切換至 `main`，在 upstream 上 rebase，建構，並從該 checkout 安裝全域 CLI。

<Tip>如果您想要同時使用 stable 和 dev，請保留兩個副本並將您的閘道指向 stable 的那一個。</Tip>

## 單次版本或標籤指定

使用 `--tag` 以針對單次更新指定特定的 dist-tag、版本或 package 規格，而**不**改變您持續使用的頻道：

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Switch to the moving GitHub main checkout
openclaw update --channel dev

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1

# Install from GitHub main once without persisting the channel
openclaw update --tag main
```

備註：

- `--tag` 僅適用於 **package (npm) 安裝**。Git 安裝會將其忽略。
- 該 tag 不會被持久化。您的下一次 `openclaw update` 將照常使用您設定的頻道。
- 對於 package 安裝，OpenClaw 會在分階段的 npm 安裝之前，將 GitHub/git 來源規格預先打包成暫存 tarball。當您希望將變動的 `main` checkout 作為您的持久安裝時，請使用 `--channel dev` 或 `--install-method git --version main`。
- 降級保護：如果目標版本比您目前的版本舊，OpenClaw 會提示確認（使用 `--yes` 跳過）。
- `--channel beta` 與 `--tag beta` 不同：當 beta 缺失或較舊時，頻道流程可以回退至 stable/latest，而 `--tag beta` 則在該次執行中針對原始的 `beta` dist-tag。

## 試運行

預覽 `openclaw update` 將會做什麼而不進行變更：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

試運行會顯示有效頻道、目標版本、計劃操作，以及是否需要降級確認。

## 外掛程式與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛程式來源：

- `dev` 偏好來自 git checkout 的捆綁外掛程式。
- `stable` 和 `beta` 會還原透過 npm 安裝的外掛程式套件。
- 透過 npm 安裝的外掛程式會在核心更新完成後更新。

## 檢查目前狀態

```bash
openclaw update status
```

顯示使用中的頻道、安裝類型（git 或 package）、目前版本，以及來源（設定、git tag、git branch 或預設值）。

## 標記最佳實踐

- 標記您希望 git 檢出對應的版本（穩定版用 `vYYYY.M.D`，
  測試版用 `vYYYY.M.D-beta.N`）。
- 為了相容性，也能識別 `vYYYY.M.D.beta.N`，但建議優先使用 `-beta.N`。
- 舊版 `vYYYY.M.D-<patch>` 標籤仍會被視為穩定版（非測試版）。
- 保持標籤不可變：切勿移動或重複使用標籤。
- npm dist-tags 仍是 npm 安裝的來源真相：
  - `latest` -> 穩定版
  - `beta` -> 候選構建或優先測試版的穩定構建
  - `dev` -> main 快照（選用）

## macOS 應用程式可用性

測試版和開發版構建可能**不**會包含 macOS 應用程式版本。這沒關係：

- git 標籤和 npm dist-tag 仍然可以發布。
- 在版本說明或變更記錄中註明「此測試版無 macOS 構建」。

## 相關

- [更新](/zh-Hant/install/updating)
- [安裝程式內部運作](/zh-Hant/install/installer)
