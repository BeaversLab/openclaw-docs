---
title: "发布策略"
summary: "公共发布渠道、版本命名和发布节奏"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 发布策略

OpenClaw 拥有三个公共发布渠道：

- stable：发布到 npm `latest` 的带标签版本，并将相同的版本镜像到 `beta`，除非 `beta` 已经指向了一个更新的预发布版本
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的动态头部

## 版本命名

- Stable 版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Stable 修正版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- Do not zero-pad month or day
- `latest` 表示当前的 stable npm 版本
- `beta` 表示当前的 beta 安装目标，它可能指向活动的预发布版本或最新提升的 stable 构建
- Stable 和 stable 修正版本发布到 npm `latest`，并且在提升后也将 npm `beta` 重新标记到相同的非 beta 版本，除非 `beta` 已经指向了一个更新的预发布版本
- Every OpenClaw release ships the npm package and macOS app together

## Release cadence

- Releases move beta-first
- Stable follows only after the latest beta is validated
- Detailed release procedure, approvals, credentials, and recovery notes are
  maintainer-only

## Release preflight

- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便为包验证步骤准备好预期的 `dist/*` 发布产物和控制 UI 包
- 在每个带标签的版本发布之前运行 `pnpm release:check`
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`（或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行 `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`（或匹配的 beta/correction 版本）以在全新的临时前缀中验证已发布的注册表安装路径
- 维护者工作流可以为实际的发布重用成功的预发布运行，以便发布步骤提升准备好的发布产物，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的 stable 修正版本，发布后验证程序还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以确保版本修正不会在基础的 stable 负载上悄悄遗留较旧的全局安装
- npm 发布预检将严格失败关闭，除非压缩包包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，
  这样我们就不会再发布一个空的浏览器仪表板
- 如果发布工作涉及了 CI 规划、扩展时间清单或快速
  测试矩阵，请在批准前通过 `node scripts/ci-write-manifest-outputs.mjs --workflow ci`
  重新生成并审查规划者拥有的 `checks-fast-extensions`
  分片计划，以免发布说明描述过时的 CI 布局
- 稳定的 macOS 发布准备还包括更新程序界面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 包
  - 打包的应用必须保留非调试的 bundle id、非空的 Sparkle feed
    URL，以及一个 `CFBundleVersion`，该版本必须等于或高于
    该发布版本的规范 Sparkle 构建底线

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档来获取实际的运行手册。
