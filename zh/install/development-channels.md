---
summary: "稳定、beta 和 dev 频道：语义、切换和标记"
read_when:
  - "您想在 stable/beta/dev 之间切换"
  - "您正在标记或发布预发布版本"
title: "开发频道"
---

# 开发频道

最后更新：2026-01-21

OpenClaw 提供三个更新频道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（测试版本）。
- **dev**：`main` 的移动头部（git）。npm dist-tag：`dev`（发布时）。

我们将构建版本发布到 **beta**，测试它们，然后将**经过审查的构建升级到 `latest`**
而不更改版本号——dist-tags 是 npm 安装的事实来源。

## 切换频道

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 检出最新的匹配标签（通常是同一标签）。
- `dev` 切换到 `main` 并在上游进行 rebase。

npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

这通过相应的 npm dist-tag 更新（`latest`、`beta`、`dev`）。

当您使用 `--channel` **显式**切换频道时，OpenClaw 还会
对齐安装方法：

- `dev` 确保执行 git checkout（默认 `~/openclaw`，使用 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`/`beta` 使用匹配的 dist-tag 从 npm 安装。

提示：如果您想同时使用 stable + dev，请保留两个克隆并将 Gateway 指向 stable 的那个。

## 插件和频道

当您使用 `openclaw update` 切换频道时，OpenClaw 还会同步插件源：

- `dev` 优先使用 git checkout 中的捆绑插件。
- `stable` 和 `beta` 恢复 npm 安装的插件包。

## 标记最佳实践

- 标记您希望 git checkout 停留在的版本（`vYYYY.M.D` 或 `vYYYY.M.D-<patch>`）。
- 保持标签不可变：永远不要移动或重用标签。
- npm dist-tags 仍然是 npm 安装的事实来源：
  - `latest` → stable
  - `beta` → 候选构建
  - `dev` → main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不**包含 macOS 应用发布。这是正常的：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发行说明或更新日志中注明”此 beta 版本没有 macOS 构建”。
