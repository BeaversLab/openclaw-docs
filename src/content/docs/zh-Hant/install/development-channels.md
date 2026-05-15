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
- **`dev`**：確保有 git checkout（預設 `~/openclaw`，可使用
  `OPENCLAW_GIT_DIR` 覆寫），切換到 `main`，在 upstream 上進行 rebase，建置，並
  從該 checkout 安裝全域 CLI。

<Tip>如果您想要同時使用 stable 和 dev，請保留兩個副本並將您的閘道指向 stable 的那一個。</Tip>

## 單次版本或標籤指定

使用 `--tag` 針對單次更新指定特定的 dist-tag、版本或套件規格，
而**不**會變更您持續儲存的頻道：

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

- `--tag` 僅適用於 **套件 (npm) 安裝**。Git 安裝會忽略它。
- 標籤不會被持續儲存。您的下一次 `openclaw update` 將照常使用您設定的
  頻道。
- 降級保護：如果目標版本比您目前的版本舊，
  OpenClaw 會提示確認（使用 `--yes` 跳過）。
- `--channel beta` 與 `--tag beta` 不同：頻道流程可以在 beta 缺失或較舊時
  回退至 stable/latest，而 `--tag beta` 則是針對該次執行
  直接指定 `beta` dist-tag。

## 試執行

預覽 `openclaw update` 將執行的操作而不實際變更：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

試執行會顯示有效頻道、目標版本、計劃的操作，
以及是否需要降級確認。

## 外掛程式與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛程式
來源：

- `dev` 偏好來自 git checkout 的隨附外掛程式。
- `stable` 和 `beta` 會還原以 npm 安裝的外掛程式套件。
- 以 npm 安裝的外掛程式會在核心更新完成後進行更新。

## 檢查目前狀態

```bash
openclaw update status
```

顯示使用中的頻道、安裝類型（git 或套件）、目前版本，
以及來源（設定、git 標籤、git 分支或預設值）。

## 標籤最佳實務

- 為您希望 git checkout 停留的發布版本加上標籤（穩定版用 `vYYYY.M.D`，
  beta 版用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 為了相容性也會被識別，但建議優先使用 `-beta.N`。
- 舊式的 `vYYYY.M.D-<patch>` 標籤仍會被識別為穩定版（非 beta）。
- 保持標籤不可變：切勿移動或重複使用標籤。
- 對於 npm 安裝，npm dist-tags 依然是主要依據：
  - `latest` -> stable
  - `beta` -> 候選組建或 beta 優先的穩定組建
  - `dev` -> main 快照（選用）

## macOS app 可用性

Beta 和 dev 版本可能**不**包含 macOS 應用程式版本。這沒關係：

- git 標籤和 npm dist-tag 仍然可以發佈。
- 在發布說明或變更日誌中註明「此 beta 版本沒有 macOS 構建版本」。

## 相關

- [更新](/zh-Hant/install/updating)
- [安裝程式內部機制](/zh-Hant/install/installer)
