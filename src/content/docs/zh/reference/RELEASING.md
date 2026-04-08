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
- 主分支 npm 预检查也会在打包 tarball 之前运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  ，同时使用 `OPENAI_API_KEY` 和
  `ANTHROPIC_API_KEY` 工作流密钥
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- npm 发布后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的临时前缀中验证已发布注册表
  的安装路径
- 维护者发布自动化现在使用先预检查再提升的方式：
  - 实际的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 稳定 npm 版本默认为 `beta`
  - 稳定 npm 发布可以通过工作流输入明确指定 `latest`
  - 从 `beta` 到 `latest` 的稳定 npm 提升仍然可以作为受信任的 `OpenClaw NPM Release` 工作流上的显式手动模式使用
  - 该提升模式仍需要在 `npm-release` 环境中提供有效的 `NPM_TOKEN`，因为 npm `dist-tag` 管理与可信发布是分离的
  - public `macOS Release` 仅供验证使用
  - 真实的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真实的发布路径会提升已准备好的构建产物，而不是重新
    构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证程序
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  以便发布修正不会在基本稳定负载上静默留下较旧的全局安装
- npm 发布前检查默认失败，除非压缩包同时包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，
  这样我们就不会再次发布空的浏览器仪表板
- 如果发布工作涉及 CI 规划、扩展计时清单或快速
  测试矩阵，请在批准前从 `.github/workflows/ci.yml` 重新生成并审查规划器拥有的 `checks-fast-extensions`
  工作流矩阵输出，以免发行说明描述过时的 CI 布局
- 稳定 macOS 发布准备情况还包括更新程序表面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 包
  - 打包的应用程序必须保留非调试的 bundle ID、非空的 Sparkle 源
    URL，以及一个等于或高于该发布版本的规范 Sparkle 构建基线的 `CFBundleVersion`

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示用于
  真实的发布路径
- `preflight_run_id`：在实际发布路径上是必需的，以便工作流重用
  成功预检运行中准备好的压缩包
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`
- `promote_beta_to_latest`：设为 `true` 以跳过发布，并将已发布的
  稳定版 `beta` 构建转移到 `latest`

规则：

- 稳定版和修正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 实际发布路径必须使用与预检期间相同的 `npm_dist_tag`；
  工作流会在发布继续之前验证该元数据
- 推广模式必须使用稳定版或修正标签、`preflight_only=false`、
  空的 `preflight_run_id` 和 `npm_dist_tag=beta`
- 推广模式还需要 `npm-release` 环境中有效的 `NPM_TOKEN`，
  因为 `npm dist-tag add` 仍然需要常规的 npm 身份验证

## 稳定版 npm 发布流程

当创建稳定版 npm 发布时：

1. 运行 `OpenClaw NPM Release` 并使用 `preflight_only=true`
2. 选择 `npm_dist_tag=beta` 进行正常的优先 Beta 流程，或者仅当您
   故意想要直接进行稳定版发布时选择 `latest`
3. 保存成功的 `preflight_run_id`
4. 再次运行 `OpenClaw NPM Release`，使用 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 以及已保存的 `preflight_run_id`
5. 如果发布落在 `beta` 上，稍后运行 `OpenClaw NPM Release`，使用
   相同的稳定版 `tag`、`promote_beta_to_latest=true`、`preflight_only=false`、
   `preflight_run_id` 为空，并在您想要将
   已发布的构建转移到 `latest` 时使用 `npm_dist_tag=beta`

提升模式仍然需要 `npm-release` 环境的批准以及该环境中有效的 `NPM_TOKEN`。

这保留了直接发布路径和 beta 优先提升路径都已记录且对操作员可见。

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中的私有发布文档作为实际的运行手册。
