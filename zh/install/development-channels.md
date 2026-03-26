---
summary: "稳定、Beta 和 Dev 渠道：语义、切换、固定和标记"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "发布渠道"
sidebarTitle: "发布渠道"
---

# 开发渠道

OpenClaw 提供三个更新频道：

- **stable**：npm dist-tag `latest`。推荐大多数用户使用。
- **beta**：npm dist-tag `beta`（正在测试的构建）。
- **dev**：`main` (git) 的移动头。npm dist-tag：`dev`（发布时）。
  `main` 分支用于实验和活跃开发。它可能包含
  不完整的功能或重大更改。请勿将其用于生产网关。

我们将构建发布到 **beta**，对其进行测试，然后**将经过审核的构建提升到 `latest`**
而无需更改版本号 —— dist-tags 是 npm 安装的真值来源。

## 切换频道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 会将您的选择保留在配置中 (`update.channel`) 并统一
安装方法：

- **`stable`/`beta`**（包安装）：通过匹配的 npm dist-tag 更新。
- **`stable`/`beta`**（git 安装）：检出最新匹配的 git 标签。
- **`dev`**：确保 git 检出（默认 `~/openclaw`，可通过
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，在 upstream 上变基，构建，并
  从该检出安装全局 CLI。

提示：如果您想同时使用 stable 和 dev，请保留两个克隆副本，并将您的
网关指向 stable 那个。

## 一次性版本或标记定位

使用 `--tag` 针对特定的 dist-tag、版本或包规范进行单次更新，**而无需**
更改您保留的渠道：

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

- `--tag` 仅适用于**包 (npm) 安装**。Git 安装会忽略它。
- 该标记不会被保留。您的下一次 `openclaw update` 将照常使用您配置的
  渠道。
- 降级保护：如果目标版本低于当前版本，OpenClaw 会提示确认（使用 `--yes` 跳过）。

## 试运行

预览 `openclaw update` 将执行的操作而不进行实际更改：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.3.14 --dry-run
openclaw update --dry-run --json
```

试运行会显示有效的渠道、目标版本、计划操作以及是否需要降级确认。

## 插件和渠道

当您使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件源：

- `dev` 优先使用 git checkout 中的捆绑插件。
- `stable` 和 `beta` 会恢复 npm 安装的插件包。
- npm 安装的插件会在核心更新完成后更新。

## 检查当前状态

```bash
openclaw update status
```

显示当前渠道、安装类型（git 或 package）、当前版本以及来源（配置、git tag、git 分支或默认）。

## 标记最佳实践

- 为您希望 git checkout 使用的版本打上标签（stable 使用 `vYYYY.M.D`，beta 使用 `vYYYY.M.D-beta.N`）。
- 为了兼容性，`vYYYY.M.D.beta.N` 也会被识别，但建议优先使用 `-beta.N`。
- 传统的 `vYYYY.M.D-<patch>` 标签仍被识别为 stable（非 beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的权威来源：
  - `latest` -> stable
  - `beta` -> candidate build
  - `dev` -> main snapshot (可选)

## macOS 应用可用性

Beta 和 dev 版本可能**不**包含 macOS 应用发布。这没问题：

- git tag 和 npm dist-tag 仍然可以发布。
- 在发布说明或更新日志中注明“此 beta 版本没有 macOS 构建”。

import zh from "/components/footer/zh.mdx";

<zh />
