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
- **beta**：当它是最新版本时为 npm dist-tag `beta`；如果 beta 缺失或比
  最新的稳定版本旧，更新流程将回退到 `latest`。
- **dev**：`main` (git) 的移动头。npm dist-tag：`dev`（发布时）。
  `main` 分支用于实验和积极开发。它可能包含
  未完成的功能或重大变更。请勿将其用于生产环境网关。

我们通常先将稳定版本发布到 **beta**，在那里进行测试，然后运行
显式的提升步骤，将经过审查的构建移动到 `latest` 而
不更改版本号。维护者也可以在需要时将稳定版本
直接发布到 `latest`。Dist-tags 是 npm
安装的真实来源。

## 切换频道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 将您的选择保留在配置 (`update.channel`) 中并对齐
安装方法：

- **`stable`**（软件包安装）：通过 npm dist-tag `latest` 更新。
- **`beta`**（软件包安装）：首选 npm dist-tag `beta`，但当 `beta` 缺失或比当前的稳定标签旧时，会回退到
  `latest`。
- **`stable`**（git 安装）：检出最新的稳定 git 标签。
- **`beta`**（git 安装）：首选最新的 beta git 标签，但当 beta 缺失或较旧时，会回退到
  最新的稳定 git 标签。
- **`dev`**：确保有 git 检出（默认为 `~/openclaw`，可通过
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，在上游上变基，构建，并
  从该检出安装全局 CLI。

提示：如果您想同时使用 stable 和 dev，请保留两个克隆副本，并将您的
网关指向 stable 那个。

## 一次性版本或标签定位

使用 `--tag` 可以针对特定的 dist-tag、版本或软件包规范进行单次更新，而**不**更改您保留的渠道：

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

注：

- `--tag` **仅适用于软件包 (npm) 安装**。Git 安装会忽略它。
- 该标签不会被持久化。您的下一次 `openclaw update` 将照常使用您配置的渠道。
- 降级保护：如果目标版本低于您的当前版本，OpenClaw 会提示确认（使用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：当 beta 版本缺失或较旧时，渠道流程可以回退到 stable/latest，而 `--tag beta` 针对该次运行定位原始的 `beta` dist-tag。

## 试运行

预览 `openclaw update` 将执行的操作而不进行实际更改：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行会显示有效渠道、目标版本、计划操作以及是否需要降级确认。

## 插件和渠道

当您使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件源：

- `dev` 优先使用 git 检出中捆绑的插件。
- `stable` 和 `beta` 会恢复 npm 安装的插件包。
- 核心更新完成后，npm 安装的插件会被更新。

## 检查当前状态

```bash
openclaw update status
```

显示活动渠道、安装类型（git 或 package）、当前版本以及来源（配置、git tag、git 分支或默认值）。

## 标记最佳实践

- 为您希望 git 检出定位到的版本打上标签（stable 用 `vYYYY.M.D`，beta 用 `vYYYY.M.D-beta.N`）。
- 为了兼容性也会识别 `vYYYY.M.D.beta.N`，但建议使用 `-beta.N`。
- 传统的 `vYYYY.M.D-<patch>` 标签仍会被识别为 stable（非 beta）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` -> stable
  - `beta` -> 候选构建或 beta 优先的稳定构建
  - `dev` -> main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不**包含 macOS 应用版本。这是正常的：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发布说明或更新日志中指出“此 beta 版没有 macOS 构建”。
