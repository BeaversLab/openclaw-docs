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

- `dev` 确保进行 git 检出（默认为 `~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出中安装全局 CLI。
- `stable`/`beta` 使用匹配的 dist-tag 从 npm 安装。

提示：如果您想同时使用稳定版和开发版，请保留两个克隆版本，并将您的网关指向稳定版。

## 插件和频道

当您使用 `openclaw update` 切换频道时，OpenClaw 也会同步插件来源：

- `dev` 优先使用来自 git 检出的捆绑插件。
- `stable` 和 `beta` 会恢复通过 npm 安装的插件包。

## 标记最佳实践

- 为您希望 git 检出定位到的发布版本打标签（stable 版本用 `vYYYY.M.D`，beta 版本用 `vYYYY.M.D-beta.N`）。
- `vYYYY.M.D.beta.N` 也会被识别以确保兼容性，但建议首选 `-beta.N`。
- 旧版 `vYYYY.M.D-<patch>` 标签仍被识别为稳定版（非 Beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` → 稳定版
  - `beta` → 候选构建版
  - `dev` → 主分支快照（可选）

## macOS 应用可用性

Beta 和 dev 版构建**可能**不包含 macOS 应用版本。这没关系：

- 仍然可以发布 git 标签和 npm dist-tag。
- 在发行说明或更新日志中注明“此 beta 版没有 macOS 构建”。

import zh from '/components/footer/zh.mdx';

<zh />
