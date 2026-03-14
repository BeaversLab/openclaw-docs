---
summary: "Stable、beta 和 dev 频道：语义、切换和标记"
read_when:
  - You want to switch between stable/beta/dev
  - You are tagging or publishing prereleases
title: "开发频道"
---

# 开发频道

最后更新：2026-01-21

OpenClaw 提供三个更新频道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（测试中的构建）。
- **dev**：`main` (git) 的移动头。npm dist-tag：`dev`（发布时）。

我们将构建发布到 **beta**，进行测试，然后在不更改版本号的情况下**将经过审查的构建提升到 `latest`** —— dist-tags 是 npm 安装的单一事实来源。

## 切换频道

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 会检出最新的匹配标签（通常是同一个标签）。
- `dev` 会切换到 `main` 并基于上游进行变基。

npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

这会通过相应的 npm dist-tag（`latest`、`beta`、`dev`）进行更新。

当您使用 `--channel` **显式** 切换频道时，OpenClaw 也会对齐安装方法：

- `dev` 确保 git 检出（默认为 `~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`/`beta` 使用匹配的 dist-tag 从 npm 安装。

提示：如果您想同时使用 stable 和 dev，请保留两个克隆并将您的网关指向 stable 那个。

## 插件和渠道

当您使用 `openclaw update` 切换通道时，OpenClaw 也会同步插件源：

- `dev` 优先使用来自 git 检出的捆绑插件。
- `stable` 和 `beta` 会恢复 npm 安装的插件包。

## 标签最佳实践

- 为您希望 git 检出定位到的版本打上标签（stable 版用 `vYYYY.M.D`，beta 版用 `vYYYY.M.D-beta.N`）。
- 出于兼容性考虑，也会识别 `vYYYY.M.D.beta.N`，但建议优先使用 `-beta.N`。
- 遗留的 `vYYYY.M.D-<patch>` 标签仍会被识别为 stable（非 beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` → stable
  - `beta` → 候选版本
  - `dev` → main 快照（可选）

## macOS 应用可用性

Beta 和 dev 版本可能**不**包含 macOS 应用程序发布。这没关系：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发行说明或更新日志中指出“此 beta 版本没有 macOS 构建”。

import zh from '/components/footer/zh.mdx';

<zh />
