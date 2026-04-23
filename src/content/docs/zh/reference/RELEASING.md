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
- 跨操作系统安装和升级运行时验证是从
  私有调用者工作流
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`
  调度的，
  该工作流调用可重用的公共工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意的：保持真实的 npm 发布路径简短、
  确定且专注于工件，而较慢的实时检查则留在
  自己的通道中，以免它们延迟或阻止发布
- 必须从 `main` 工作流引用或
  `release/YYYY.M.D` 工作流引用调度发布检查，以便工作流逻辑和机密保持受控
- 该工作流接受现有的发布标签或当前完整的
  40 字符工作流分支提交 SHA
- 在提交 SHA 模式下，它仅接受当前的工作流分支 HEAD；对于较旧的发布提交，请使用发布标签
- `OpenClaw NPM Release` validation-only preflight 也接受当前的完整 40 字符 workflow-branch 提交 SHA，而无需推送的标签
- 该 SHA 路径仅为验证用途，不能提升为真正的发布
- 在 SHA 模式下，工作流仅为了检查包元数据而合成 `v<package.json version>`；真正的发布仍然需要真正的发布标签
- 这两个工作流都将真正的发布和提升路径保留在 GitHub 托管的运行器上，而非变更的验证路径可以使用更大的 Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流机密
- npm 发布预检不再等待单独的发布检查通道
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的临时前缀中验证已发布的注册表安装路径
- 维护者发布自动化现在使用 preflight-then-promote：
  - 真正的 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真正的 npm publish 必须从与成功的预检运行相同的 `main` 或
    `release/YYYY.M.D` 分支调度
  - stable npm releases 默认为 `beta`
  - stable npm publish 可以通过工作流输入明确指向 `latest`
  - 基于令牌的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN` 而公共仓库仅保留 OIDC 发布
  - public `macOS Release` 仅为验证用途
  - 真正的 private mac publish 必须通过成功的 private mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径提升准备好的工件，而不是再次重新构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证程序
  也会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  以便版本修正不会静默地在基础稳定负载上留下旧的全局安装
- 除非压缩包同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，
  否则 npm 发布预检将失败并关闭，
  这样我们就不会再次发布一个空的浏览器仪表板
- `pnpm test:install:smoke` 还会对候选更新压缩包执行 npm pack `unpackedSize` 预算限制，
  以便安装程序 e2e 能在发布发布路径之前捕获意外的打包膨胀
- 如果发布工作涉及 CI 规划、扩展时间清单或
  扩展测试矩阵，请在批准之前重新生成并审查规划器拥有的
  `checks-node-extensions` 工作流矩阵输出（来自 `.github/workflows/ci.yml`），
  以免发布说明描述过时的 CI 布局
- 稳定 macOS 版本的准备就绪情况还包括更新程序界面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 包
  - 打包的应用程序必须保持非调试 bundle id、非空的 Sparkle feed
    URL，以及一个 `CFBundleVersion`，该版本必须等于或高于该发布版本的
    规范 Sparkle 构建底线

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当为 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示
  实际发布路径
- `preflight_run_id`：在实际发布路径上必需，以便工作流重用
  来自成功预检运行的准备好的压缩包
- `npm_dist_tag`：用于发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受这些操作员控制的输入：

- `ref`：现有的发布标签或当前的完整 40 字符 `main` 提交
  SHA，用于从 `main` 调度时进行验证；对于发布分支，请使用
  现有的发布标签或当前的完整 40 字符 release-branch 提交
  SHA

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅在
  `preflight_only=true` 时才允许输入完整的提交 SHA
- `OpenClaw Release Checks` 始终仅用于验证，并且也接受
  当前工作流分支的提交 SHA
- 发布检查的 commit-SHA 模式也需要当前的工作流分支 HEAD
- 实际的发布路径必须使用与预检查期间相同的 `npm_dist_tag`；
  工作流会在发布继续前验证该元数据

## 稳定版 npm 发布流程

在切分稳定版 npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交
     SHA 对预检查工作流进行仅验证的空运行
2. 对于常规的 beta 优先流程，请选择 `npm_dist_tag=beta`；或者仅当您
   故意想要直接发布稳定版时，选择 `latest`
3. 当您需要实时的提示缓存覆盖时，请使用相同的标签或
   当前完整的工作流分支提交 SHA 单独运行 `OpenClaw Release Checks`
   - 这样设计是故意分开的，以便在不将长时间运行或不稳定的检查
     重新耦合到发布工作流的情况下，保持实时覆盖可用
4. 保存成功的 `preflight_run_id`
5. 使用 `preflight_only=false`、相同的
   `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 再次运行 `OpenClaw NPM Release`
6. 如果版本发布在 `beta` 上，请使用私有的
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
7. 如果该版本有意直接发布到 `latest` 且 `beta`
   应立即紧随同一稳定构建，请使用相同的私有
   工作流将两个 dist-tags 指向该稳定版本，或者让其按计划
   的自我修复同步稍后移动 `beta`

出于安全原因，dist-tag 的变更位于私有仓库中，因为它仍然
需要 `NPM_TOKEN`，而公共仓库仅保留 OIDC 发布。

这使得直接发布路径和 beta 优先的提升路径都被
记录在案并对操作者可见。

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档来获取实际的运行手册。
