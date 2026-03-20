---
summary: "Stable、beta 和 dev 频道：语义、切换和标记"
read_when:
  - 您想要在 stable/beta/dev 之间切换
  - 您正在进行标记或发布预发布版本
title: "开发频道"
---

# 开发频道

最后更新：2026-01-21

OpenClaw 提供三个更新频道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（正在测试的构建）。
- **dev**：`main` 的移动头部（git）。npm dist-tag：`dev`（发布时）。

我们将构建发布到 **beta**，进行测试，然后将经过审核的构建**提升到 `latest`**
而无需更改版本号 — 对于 npm 安装，dist-tags 是真实来源。

## 切换频道

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 检出最新的匹配标签（通常是同一个标签）。
- `dev` 切换到 `main` 并在 upstream 上进行 rebase。

npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

这将通过相应的 npm dist-tag 进行更新（`latest`，`beta`，`dev`）。

当您使用 `--channel` **显式** 切换频道时，OpenClaw 也会对齐
安装方法：

- `dev` 确保进行 git checkout（默认 `~/openclaw`，使用 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`/`beta` 使用匹配的 dist-tag 从 npm 安装。

提示：如果您想要同时使用 stable + dev，请保留两个克隆并将您的网关指向 stable 的那个。

## 插件和频道

当您使用 `openclaw update` 切换频道时，OpenClaw 也会同步插件源：

- `dev` 优先使用来自 git checkout 的捆绑插件。
- `stable` 和 `beta` 恢复 npm-installed 的插件包。

## 标记最佳实践

- 标记您希望 git checkouts 落地的版本（stable 用 `vYYYY.M.D`，beta 用 `vYYYY.M.D-beta.N`）。
- 为了兼容性，`vYYYY.M.D.beta.N` 也会被识别，但建议优先使用 `-beta.N`。
- 传统的 `vYYYY.M.D-<patch>` 标签仍被视为稳定版（非 beta 版）。
- 保持标签不可变：永远不要移动或重用标签。
- npm dist-tags 仍然是 npm 安装的真实来源：
  - `latest` → stable（稳定版）
  - `beta` → candidate build（候选构建）
  - `dev` → main snapshot（可选）

## macOS 应用可用性

Beta 和 dev 版本可能**不**包含 macOS 应用发布。这没关系：

- git 标签和 npm dist-tag 仍然可以发布。
- 在发布说明或更新日志中注明“此 beta 版本没有 macOS 构建”。

import en from "/components/footer/en.mdx";

<en />
