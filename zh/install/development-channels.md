> [!NOTE]
> 本页正在翻译中。

---
summary: "Stable、beta 与 dev 渠道：语义、切换与打标签"
read_when:
  - 你想在 stable/beta/dev 间切换
  - 你在打标签或发布预发布版本
---

# Development channels

Last updated: 2026-01-21

OpenClaw 提供三条更新渠道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（测试中的构建）。
- **dev**：`main` 的滚动头（git）。npm dist-tag：`dev`（发布时）。

我们会先把构建发布到 **beta**、测试，通过后**提升到 `latest`**，而**不改变版本号** —— 对 npm 安装来说，dist-tags 是唯一权威。

## Switching channels

Git checkout：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` 会检出最新匹配的 tag（通常是同一个 tag）。
- `dev` 切换到 `main` 并基于上游 rebase。

npm/pnpm 全局安装：

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

它会根据对应的 npm dist-tag（`latest`、`beta`、`dev`）更新。

当你**显式**用 `--channel` 切换时，OpenClaw 也会同步安装方式：

- `dev` 确保使用 git checkout（默认 `~/openclaw`，可用 `OPENCLAW_GIT_DIR` 覆盖），
  然后更新并从该 checkout 安装全局 CLI。
- `stable`/`beta` 通过 npm 安装对应 dist-tag。

提示：若你想稳定版和 dev 并行，保留两个 clone，并让 gateway 指向稳定版。

## Plugins and channels

使用 `openclaw update` 切换渠道时，OpenClaw 也会同步插件来源：

- `dev` 优先使用 git checkout 中的内置插件。
- `stable` 和 `beta` 会恢复 npm 安装的插件包。

## Tagging best practices

- 给希望 git checkout 落地的版本打 tag（`vYYYY.M.D` 或 `vYYYY.M.D-<patch>`）。
- tag 必须不可变：不要移动或复用 tag。
- npm dist-tags 仍是 npm 安装的权威：
  - `latest` → stable
  - `beta` → 候选构建
  - `dev` → main 快照（可选）

## macOS app availability

beta 和 dev 构建可能**不包含 macOS app**。这是可接受的：

- git tag 与 npm dist-tag 仍可发布。
- 在 release notes 或 changelog 中注明“此 beta 无 macOS 构建”。
