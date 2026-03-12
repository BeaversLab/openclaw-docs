---
summary: "稳定版、测试版和开发版频道：语义、切换和标记"
read_when:
  - You want to switch between stable/beta/dev
  - You are tagging or publishing prereleases
title: "开发频道"
---

# 开发频道

最后更新：2026-01-21

OpenClaw 提供三个更新频道：

- **stable**（稳定版）：npm dist-tag `latest`。
- **beta**（测试版）：npm dist-tag `beta`（正在测试的构建）。
- **dev**（开发版）：`main` (git) 的移动头部。npm dist-tag：`dev`（发布时）。

我们将构建版本发布到 **beta** 进行测试，然后将经过审查的构建版本**升级到 `latest`**
而无需更改版本号——对于 npm 安装而言，dist-tags 才是事实来源。

## 切换频道

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 检出最新的匹配标签（通常是同一个标签）。
- `dev` 切换到 `main` 并基于上游进行变基。

npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

这通过相应的 npm dist-tag (`latest`, `beta`, `dev`) 进行更新。

当您使用 `--channel` **显式**切换频道时，OpenClaw 也会
对齐安装方法：

- `dev` 确保进行 git checkout（默认为 `~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出中安装全局 CLI。
- `stable`/`beta` 使用匹配的 dist-tag 从 npm 安装。

提示：如果您想同时使用稳定版和开发版，请保留两个克隆版本，并将您的网关指向稳定版。

## 插件和频道

当您使用 `openclaw update` 切换频道时，OpenClaw 也会同步插件源：

- `dev` 优先使用来自 git checkout 的捆绑插件。
- `stable` 和 `beta` 恢复通过 npm 安装的插件包。

## 标记最佳实践

- 为您希望 git checkout 落地的发布版本打标签（stable 使用 `vYYYY.M.D`，beta 使用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 出于兼容性也会被识别，但建议使用 `-beta.N`。
- 传统的 `vYYYY.M.D-<patch>` 标签仍会被识别为稳定版（非 beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` → 稳定版
  - `beta` → 候选构建
  - `dev` → 主分支快照（可选）

## macOS 应用可用性

Beta 和 dev 版构建**可能**不包含 macOS 应用版本。这没关系：

- 仍然可以发布 git 标签和 npm dist-tag。
- 在发行说明或更新日志中注明“此 beta 版没有 macOS 构建”。
