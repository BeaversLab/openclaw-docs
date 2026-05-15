---
summary: "稳定、Beta 和 Dev 渠道：语义、切换、固定和标记"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "发布渠道"
sidebarTitle: "发布渠道"
---

OpenClaw 提供三个更新通道：

- **stable**：npm dist-tag `latest`。推荐大多数用户使用。
- **beta**：当其为当前版本时，使用 npm dist-tag `beta`；如果 beta 缺失或比最新的 stable 版本旧，更新流程将回退到 `latest`。
- **dev**：`main` (git) 的移动头部。npm dist-tag：`dev`（发布时）。
  `main` 分支用于实验和活跃开发。它可能包含未完成的功能或破坏性更改。请勿将其用于生产网关。

我们通常先将 stable 构建发布到 **beta**，在那里进行测试，然后运行显式的提升步骤，将经过审查的构建移动到 `latest` 而不更改版本号。维护者也可以在需要时直接将 stable 版本发布到 `latest`。Dist-tags 是 npm 安装的单一事实来源。

## 切换通道

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` 会将您的选择保存在配置（`update.channel`）中并对齐安装方法：

- **`stable`**（包安装）：通过 npm dist-tag `latest` 更新。
- **`beta`**（包安装）：首选 npm dist-tag `beta`，但当 `beta` 缺失或比当前 stable tag 旧时，回退到
  `latest`。
- **`stable`**（git 安装）：检出最新的 stable git tag。
- **`beta`**（git 安装）：首选最新的 beta git tag，但当 beta 缺失或较旧时，回退到
  最新的 stable git tag。
- **`dev`**：确保存在 git checkout（默认为 `~/openclaw`，可通过
  `OPENCLAW_GIT_DIR` 覆盖），切换到 `main`，在上游上变基，构建，并
  从该检出安装全局 CLI。

<Tip>如果您想同时使用稳定版和开发版，请保留两个克隆并将您的网关指向稳定版。</Tip>

## 一次性指定版本或标签

使用 `--tag` 针对单次更新指定特定的 dist-tag、版本或包规范，而**不**更改您持久化的渠道：

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

注意：

- `--tag` 仅适用于 **包 (npm) 安装**。Git 安装会忽略它。
- 该标签不会被持久化。您的下一次 `openclaw update` 将照常使用您配置的渠道。
- 降级保护：如果目标版本比您当前的版本旧，OpenClaw 将提示确认（使用 `--yes` 跳过）。
- `--channel beta` 与 `--tag beta` 不同：当 beta 版缺失或较旧时，渠道流程可以回退到 stable/latest，而 `--tag beta` 仅针对该次运行定位原始的 `beta` dist-tag。

## 试运行

预览 `openclaw update` 将执行的操作而不进行实际更改：

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

试运行会显示有效渠道、目标版本、计划操作以及是否需要降级确认。

## 插件与渠道

当您使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件源：

- `dev` 优先使用 git 检出中捆绑的插件。
- `stable` 和 `beta` 会恢复通过 npm 安装的插件包。
- 通过 npm 安装的插件会在核心更新完成后进行更新。

## 检查当前状态

```bash
openclaw update status
```

显示活动渠道、安装类型（git 或 package）、当前版本以及来源（config、git tag、git branch 或 default）。

## 标签最佳实践

- 为您希望 git 检出定位到的发布版本打标签（稳定版用 `vYYYY.M.D`，beta 版用 `vYYYY.M.D-beta.N`）。
- 出于兼容性考虑，也会识别 `vYYYY.M.D.beta.N`，但建议优先使用 `-beta.N`。
- 旧版 `vYYYY.M.D-<patch>` 标签仍会被识别为稳定版（非 beta 版）。
- 保持标签不可变：切勿移动或重用标签。
- npm dist-tags 仍然是 npm 安装的唯一真实来源：
  - `latest` -> stable（稳定版）
  - `beta` -> 候选构建或 beta-first 稳定版构建
  - `dev` -> main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不**包含 macOS 应用发布。这没问题：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发行说明或变更日志中注明“此 beta 版本没有 macOS 构建”。

## 相关

- [更新](/zh/install/updating)
- [安装程序内部机制](/zh/install/installer)
