---
summary: "Stable、beta 和 dev 頻道：語意、切換和標記"
read_when:
  - You want to switch between stable/beta/dev
  - You are tagging or publishing prereleases
title: "開發頻道"
---

# 開發頻道

最後更新：2026-01-21

OpenClaw 提供三個更新頻道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（測試中的構建版本）。
- **dev**：`main` (git) 的移動前端。npm dist-tag：`dev`（發布時）。

我們將構建版本發布到 **beta**，進行測試，然後**將驗證過的構建版本推廣到 `latest`**
而不變更版本號碼 — dist-tags 是 npm 安裝的事實來源。

## 切換頻道

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 會 checkout 最新匹配的標籤（通常是同一個標籤）。
- `dev` 會切換到 `main` 並基於上游進行 rebase。

npm/pnpm 全域安裝：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

這會透過對應的 npm dist-tag (`latest`, `beta`, `dev`) 進行更新。

當您使用 `--channel` **明確** 切換頻道時，OpenClaw 也會對齊
安裝方式：

- `dev` 確保進行 git checkout (預設為 `~/openclaw`，可使用 `OPENCLAW_GIT_DIR` 覆蓋)，
  更新它，並從該 checkout 安裝全域 CLI。
- `stable`/`beta` 會使用對應的 dist-tag 從 npm 安裝。

提示：如果您想要同時使用 stable 和 dev，請保留兩個副本並將您的 gateway 指向 stable 的那一個。

## 外掛程式與頻道

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步外掛程式來源：

- `dev` 偏好使用 git checkout 中的套件外掛程式。
- `stable` 和 `beta` 會還原以 npm 安裝的外掛程式套件。

## 標記最佳實踐

- 對您希望 git checkout 停留的版本進行標記（stable 為 `vYYYY.M.D`，beta 為 `vYYYY.M.D-beta.N`）。
- 為了相容性，也會識別 `vYYYY.M.D.beta.N`，但建議優先使用 `-beta.N`。
- 舊版 `vYYYY.M.D-<patch>` 標籤仍會被識別為穩定版（非 beta）。
- 保持標籤不可變：切勿移動或重複使用標籤。
- npm dist-tags 仍然是 npm 安裝的事實來源：
  - `latest` → stable（穩定版）
  - `beta` → candidate build（候選版本）
  - `dev` → main snapshot（main 快照，選用）

## macOS app availability（macOS 應用程式可用性）

Beta 和 dev 版本**可能不會**包含 macOS 應用程式發布。這沒問題：

- git tag 和 npm dist-tag 仍然可以發布。
- 請在發布說明或變更日誌中註明「此 beta 版本沒有 macOS 版本」。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
