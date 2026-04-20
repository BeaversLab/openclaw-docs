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
- Every OpenClaw release ships the npm package and macOS app together

## Release cadence

- Releases move beta-first
- Stable follows only after the latest beta is validated
- Detailed release procedure, approvals, credentials, and recovery notes are
  maintainer-only

## Release preflight

- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的
  `dist/*` 发布工件和 Control UI 包可用于打包
  验证步骤
- 在每次带标签的发布之前运行 `pnpm release:check`
- Release checks now run in a separate manual workflow:
  `OpenClaw Release Checks`
- Cross-OS install and upgrade runtime validation is dispatched from the
  private caller workflow
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`,
  which invokes the reusable public workflow
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- This split is intentional: keep the real npm release path short,
  deterministic, and artifact-focused, while slower live checks stay in their
  own lane so they do not stall or block publish
- Release checks must be dispatched from the `main` workflow ref so the
  workflow logic and secrets stay canonical
- That workflow accepts either an existing release tag or the current full
  40-character `main` commit SHA
- In commit-SHA mode it only accepts the current `origin/main` HEAD; use a
  release tag for older release commits
- `OpenClaw NPM Release` validation-only preflight also accepts the current
  full 40-character `main` commit SHA without requiring a pushed tag
- That SHA path is validation-only and cannot be promoted into a real publish
- In SHA mode the workflow synthesizes `v<package.json version>` only for the
  package metadata check; real publish still requires a real release tag
- Both workflows keep the real publish and promotion path on GitHub-hosted
  runners, while the non-mutating validation path can use the larger
  Blacksmith Linux runners
- That workflow runs
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  using both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` workflow secrets
- npm release preflight no longer waits on the separate release checks lane
- Run `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (or the matching beta/correction tag) before approval
- After npm publish, run
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (or the matching beta/correction version) to verify the published registry
  install path in a fresh temp prefix
- Maintainer release automation now uses preflight-then-promote:
  - real npm publish must pass a successful npm `preflight_run_id`
  - stable npm releases default to `beta`
  - stable npm publish can target `latest` explicitly via workflow input
  - 基于令牌的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公共仓库则保持仅 OIDC 发布
  - 公共 `macOS Release` 仅用于验证
  - 真正的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 实际的发布路径会提升准备好的构件，而不是重新
    构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证程序
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  以免发布修正版本后静默遗留旧的全局安装包
  在基础稳定负载上
- npm 发布前检查默认失败，除非压缩包同时包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，
  这样我们就不会再次发布空的浏览器仪表板
- `pnpm test:install:smoke` 还会对候选更新压缩包强制执行 npm pack `unpackedSize` 预算，
  以便安装程序 e2e 能在发布发布路径之前
  捕获意外的包膨胀
- 如果发布工作涉及 CI 规划、扩展计时清单或
  扩展测试矩阵，请在批准前重新生成并审查规划者拥有的
  来自 `.github/workflows/ci.yml` 的 `checks-node-extensions` 工作流矩阵输出，
  以免发布说明描述过时的 CI 布局
- 稳定 macOS 发布准备情况还包括更新程序界面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 包
  - 打包的应用必须保持非调试 bundle id、非空的 Sparkle feed
    URL，以及一个 `CFBundleVersion`，该版本需等于或高于
    该发布版本的规范 Sparkle 构建下限

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符 `main` 提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示
  真实的发布路径
- `preflight_run_id`：在真实发布路径上是必需的，以便工作流重用
  成功预检运行中准备好的 tarball
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`：现有的发布标签或当前的完整 40 字符 `main` 提交
  SHA 以进行验证

规则：

- 稳定版和修正版标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 仅当 `preflight_only=true` 时才允许输入完整的提交 SHA
- 发布检查的提交 SHA 模式还需要当前的 `origin/main` HEAD
- 真实的发布路径必须使用与预检期间使用的相同 `npm_dist_tag`；
  工作流会在发布继续之前验证该元数据

## 稳定 npm 发布流程

当创建稳定 npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的 `main` 提交 SHA 进行
     预检工作流的仅验证试运行
2. 选择 `npm_dist_tag=beta` 用于正常的 Beta 优先流程，或者仅当
   您有意想要直接发布稳定版时选择 `latest`
3. 当您需要实时的提示缓存覆盖时，请使用相同的标签或
   完整的当前 `main` 提交 SHA 单独运行 `OpenClaw Release Checks`
   - 这样设计是为了保持实时覆盖可用，而无需
     将长时间运行或不稳定的检查重新耦合到发布工作流中
4. 保存成功的 `preflight_run_id`
5. 再次运行 `OpenClaw NPM Release`，使用相同的 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 以及保存的 `preflight_run_id`
6. 如果发布落在 `beta` 上，请使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流程将该稳定版本从 `beta` 提升到 `latest`
7. 如果发布有意直接发布到 `latest` 且 `beta`
   应立即紧随同一稳定版本，请使用该相同的私有
   工作流程将两个 dist-tags 指向该稳定版本，或者让其预定
   的自愈同步稍后移动 `beta`

出于安全考虑，dist-tag 的变更位于私有仓库中，因为它仍然
需要 `NPM_TOKEN`，而公共仓库则保留仅限 OIDC 的发布权限。

这样可以保持直接发布路径和 beta-first 提升路径都有
文档记录并让操作员可见。

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护人员使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档作为实际的运行手册。
