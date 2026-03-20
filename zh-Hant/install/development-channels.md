---
summary: "Stable、beta 和 dev 頻道：語意、切換與標記"
read_when:
  - 您想要在 stable/beta/dev 之間切換
  - 您正在標記或發布 pre-release 版本
title: "Development Channels"
---

# Development channels

Last updated: 2026-01-21

OpenClaw 提供三個更新頻道：

- **stable**: npm dist-tag `latest`。
- **beta**: npm dist-tag `beta` (測試中的版本)。
- **dev**: `main` (git) 的移動中標頭。npm dist-tag: `dev` (發布時)。

我們將版本發布到 **beta**，進行測試，然後在**不改變版本號碼的情況下將驗證過的版本提升到 `latest`** — dist-tags 是 npm 安裝的來源事實。

## Switching channels

Git checkout:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 會 checkout 最新符合的 tag (通常是同一個 tag)。
- `dev` 會切換到 `main` 並在 upstream 上進行 rebase。

npm/pnpm global install:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

這會透過對應的 npm dist-tag (`latest`, `beta`, `dev`) 進行更新。

當您使用 `--channel` **明確** 切換頻道時，OpenClaw 也會對齊安裝方法：

- `dev` 確保使用 git checkout (預設 `~/openclaw`，可用 `OPENCLAW_GIT_DIR` 覆寫)，
  進行更新，並從該 checkout 安裝 global CLI。
- `stable`/`beta` 會使用符合的 dist-tag 從 npm 安裝。

提示：如果您想要同時使用 stable 和 dev，請保留兩個 clone 並將您的 gateway 指向 stable 的那一個。

## Plugins and channels

當您使用 `openclaw update` 切換頻道時，OpenClaw 也會同步 plugin 來源：

- `dev` 偏好來自 git checkout 的內建 plugins。
- `stable` 和 `beta` 會還原 npm 安裝的 plugin 套件。

## Tagging best practices

- 標記您希望 git checkout 停留的版本 (`vYYYY.M.D` 給 stable，`vYYYY.M.D-beta.N` 給 beta)。
- `vYYYY.M.D.beta.N` 也被識別為相容，但建議使用 `-beta.N`。
- 舊版 `vYYYY.M.D-<patch>` 標籤仍被識別為穩定版（非 beta）。
- 保持標籤不可變：切勿移動或重複使用標籤。
- npm dist-tags 仍然是 npm 安裝的來源真相：
  - `latest` → 穩定版
  - `beta` → 候選版本
  - `dev` → main 快照（選用）

## macOS 應用程式可用性

Beta 和 dev 版本**可能不會**包含 macOS 應用程式發行版。這是正常的：

- git 標籤和 npm dist-tag 仍然可以發佈。
- 在發行說明或變更日誌中標明「此 beta 版本沒有 macOS 建置」。

import en from "/components/footer/en.mdx";

<en />
