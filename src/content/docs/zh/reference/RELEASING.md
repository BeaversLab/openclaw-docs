---
title: "发布策略"
summary: "公共发布渠道、版本命名和发布节奏"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 发布策略

OpenClaw 拥有三个公共发布渠道：

- stable：默认发布到 npm `beta` 的带标签版本，或者在明确要求时发布到 npm `latest`
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的移动指针

## 版本命名

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- 稳定修正发布版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- Do not zero-pad month or day
- `latest` 表示当前提升的稳定 npm 发布
- `beta` 表示当前的 beta 安装目标
- 稳定和稳定修正版本默认发布到 npm `beta`；发布操作员可以明确指定 `latest`，或者稍后提升已审查的 beta 版本
- 每个稳定的 OpenClaw 版本都会同时发布 npm 包和 macOS 应用；
  beta 版本通常先验证并发布 npm/package 路径，
  mac 应用的构建/签名/公证保留给稳定版，除非明确要求

## Release cadence

- Releases move beta-first
- Stable follows only after the latest beta is validated
- 维护者通常从基于当前 `main` 创建的 `release/YYYY.M.D` 分支进行发布，
  因此发布验证和修复不会阻碍 `main` 上的新开发
- 如果 beta 标签已被推送或发布但需要修复，维护者会
  切出下一个 `-beta.N` 标签，而不是删除或重新创建旧的 beta 标签
- 详细的发布流程、批准、凭据和恢复说明仅供维护者使用

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以便在更快的本地 `pnpm check` 门禁之外保持对测试 TypeScript 的覆盖
- 在发布预检之前运行 `pnpm check:architecture`，以便在更快的本地门禁之外确保更广泛的导入循环和架构边界检查通过
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的
  `dist/*` 发布工件和 Control UI 捆绑包存在，用于包
  验证步骤
- 在每个带标签的发布之前运行 `pnpm release:check`
- 发布检查现在在单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还在发布审批前运行 QA Lab 模拟奇偶校验门控以及实时的 Matrix 和 Telegram QA 通道。实时通道使用 `qa-live-shared` 环境；Telegram 也使用 Convex CI 凭证租约。
- 跨操作系统安装和升级运行时验证是从私有调用方工作流 `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml` 调度的，后者调用可重用的公共工作流 `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意的：保持真实的 npm 发布路径简短、确定性且专注于产物，而较慢的实时检查则留在自己的通道中，以免延迟或阻塞发布
- 发布检查必须从 `main` 工作流引用或 `release/YYYY.M.D` 工作流引用进行调度，以确保工作流逻辑和机密保持受控
- 该工作流程接受现有的发布标签或当前的完整 40 字符工作流分支提交 SHA
- 在提交 SHA 模式下，它仅接受当前的工作流分支 HEAD；对于较旧的发布提交，请使用发布标签
- `OpenClaw NPM Release` 仅验证预检也接受当前的完整 40 字符工作流分支提交 SHA，而无需推送标签
- 该 SHA 路径仅供验证使用，不能提升为真正的发布
- 在 SHA 模式下，工作流程仅针对包元数据检查合成 `v<package.json version>`；真正的发布仍然需要真正的发布标签
- 这两个工作流程都将真正的发布和提升路径保留在 GitHub 托管的运行器上，而非变更的验证路径可以使用更大的 Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  并同时使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布前检查不再等待单独的发布检查通道
- 在批准之前，运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的临时前缀中验证已发布的注册表
  安装路径
- 维护者发布自动化现在使用 preflight-then-promote：
  - 真实的 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真实的 npm publish 必须从成功的预检运行所在的同一 `main` 或
    `release/YYYY.M.D` 分支进行调度
  - stable npm 版本默认使用 `beta`
  - 稳定的 npm publish 可以通过 workflow 输入显式定位到 `latest`
  - 基于令牌的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中，出于安全原因，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公共仓库仅保留 OIDC 发布
  - 公共 `macOS Release` 仅用于验证
  - 真正的私有 mac publish 必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会提升准备好的构件，而不是重新
    构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证器
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  这样发布修正就不会在基础稳定负载上悄悄保留较旧的全局安装
- npm 发布预检默认失败，除非压缩包同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 载荷，这样我们就不会再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的注册表安装程序在根 `dist/*` 布局下是否包含非空的捆绑插件运行时依赖项。如果发布的版本缺少或具有空的捆绑插件依赖载荷，则无法通过发布后验证，并且不能提升到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新压缩包强制执行 npm 打包 `unpackedSize` 预算，以便安装程序 e2e 能在发布路径之前捕获意外的打包膨胀
- 如果发布工作涉及 CI 规划、扩展时机清单或扩展测试矩阵，请在批准之前重新生成并审查 `checks-node-extensions` 工作流中由规划器拥有的 `.github/workflows/ci.yml` 矩阵输出，以确保发行说明不会描述过时的 CI 布局。
- 稳定的 macOS 发布准备还包括更新程序界面：
  - GitHub 版本发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `appcast.xml` 上的 `main` 必须在发布后指向新的 stable zip 文件
  - 打包的应用程序必须保留非调试的 bundle id、非空的 Sparkle feed URL，以及一个 `CFBundleVersion`，该值必须等于或高于该发布版本的规范 Sparkle 构建底线

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示
  真实的发布路径
- `preflight_run_id`：在真实发布路径上必需，以便工作流程重用
  来自成功预检运行的准备好的压缩包
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`：现有的发布标签或当前的完整 40 字符 `main` 提交
  SHA，当从 `main` 分发时进行验证；从发布分支时，使用
  现有的发布标签或当前的完整 40 字符发布分支提交
  SHA

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅在
  `preflight_only=true` 时才允许输入完整提交 SHA
- `OpenClaw Release Checks` 始终仅用于验证，并且也接受
  当前工作流分支的提交 SHA
- 发布检查 commit-SHA 模式还需要当前工作流分支的 HEAD
- 实际的发布路径必须使用与预检期间相同的 `npm_dist_tag`；工作流会在发布继续前验证该元数据

## Stable npm 发布序列

当创建 stable npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前的完整工作流分支提交 SHA 进行仅验证的预检工作流程空运行
2. 选择 `npm_dist_tag=beta` 以进行常规的 beta 优先流程，或者仅当您有意进行直接 stable 发布时选择 `latest`
3. 当您需要实时提示缓存、QA Lab 对等性、Matrix 和 Telegram 覆盖范围时，请使用相同的标签或当前的完整工作流分支提交 SHA 单独运行 `OpenClaw Release Checks`
   - 这样做是有意分开的，以便实时覆盖范围保持可用，而无需将长时间运行或不稳定的检查重新耦合到发布工作流程中
4. 保存成功的 `preflight_run_id`
5. 使用 `preflight_only=false`、相同的 `tag`、相同的 `npm_dist_tag` 以及保存的 `preflight_run_id` 再次运行 `OpenClaw NPM Release`
6. 如果发布版本落在 `beta` 上，请使用私有 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 工作流将该稳定版本从 `beta` 升级到 `latest`
7. 如果发布版本有意直接发布到 `latest` 并且 `beta` 应紧随相同的稳定版本，请使用相同的私有工作流将两个 dist-tags 指向该稳定版本，或者让其定时的自愈同步稍后移动 `beta`

出于安全考虑，dist-tag 的变更位于私有仓库中，因为它仍然需要 `NPM_TOKEN`，而公共仓库则保持仅使用 OIDC 发布。

这使得直接发布路径和 beta 优先的提升路径都有文档记录，并且对操作员可见。

## 公共参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护人员使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档来获取实际的运行手册。
