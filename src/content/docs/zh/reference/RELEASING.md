---
summary: "发布通道、操作员检查清单、验证框、版本命名和节奏"
title: "发布策略"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw 有三个公开发布通道：

- stable：默认发布到 npm `beta` 的带标签的发布版本，或者在明确请求时发布到 npm `latest`
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的动态最新头

## 版本命名

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- 稳定修正发布版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月份或日期不要补零
- `latest` 表示当前提升的稳定 npm 发布版本
- `beta` 表示当前的 beta 安装目标
- 稳定版和稳定修正版默认发布到 npm `beta`；发布操作员可以明确指定 `latest` 目标，或者稍后提升经过审查的 beta 构建
- 每次 OpenClaw 稳定版发布都会同时发布 npm 包和 macOS 应用；
  beta 版发布通常先验证并发布 npm/package 路径，
  Mac 应用的构建/签名/公证保留给稳定版，除非有明确要求

## 发布节奏

- 发布优先从 beta 开始
- 只有在最新的 beta 版本经过验证后才会发布稳定版
- 维护者通常从当前 `main` 创建的 `release/YYYY.M.D` 分支进行发布，
  这样发布验证和修复不会阻塞 `main` 上的新开发
- 如果 beta 标签已被推送或发布但需要修复，维护者应剪切下一个 `-beta.N` 标签，
  而不是删除或重新创建旧的 beta 标签
- 详细的发布流程、审批、凭证和恢复说明仅限维护者查看

## 发布操作员检查清单

此清单是发布流程的公开形态。私有凭据、签名、公证、dist-tag 恢复以及紧急回滚详情保留在仅限维护者访问的发布手册中。

1. 从当前的 `main` 开始：拉取最新代码，确认目标提交已推送，并确认当前 `main` CI 足够通过，以便从中分支。
2. 使用 `/changelog` 根据真实的提交历史重写顶部的 `CHANGELOG.md` 部分，保持条目面向用户，提交它，推送它，并在分支之前再次变基/拉取。
3. 检查 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。仅当升级路径仍被覆盖时才删除过期的兼容性，或者记录为何故意保留它。
4. 从当前的 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上进行正常的发布工作。
5. 为预期标签提升所有必需的版本位置，然后运行本地确定性预检：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在标签存在之前，允许使用完整的 40 个字符的 release-branch SHA 进行仅验证的预检。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 为发布分支、标签或完整提交 SHA 启动所有预发布测试。这是四个主要发布测试箱（Vitest、Docker、QA Lab 和 Package）的唯一手动入口点。
8. 如果验证失败，请在发布分支上修复并重新运行证明修复的最小失败文件、通道、工作流作业、包配置文件、提供商或模型允许列表。仅当更改的表面使先前的证据失效时，才重新运行完整的总体流程。
9. 对于 beta 版本，打上标签 `vYYYY.M.D-beta.N`，使用 npm dist-tag `beta` 发布，然后针对已发布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果已推送或发布的 beta 版本需要修复，请切出下一个 `-beta.N`；不要删除或重写旧的 beta 版本。
10. 对于 stable 版本，只有在经过审查的 beta 或候选版本具备所需的验证证据后才继续。Stable npm 发布通过 `preflight_run_id` 复用成功的预检构件；stable macOS 发布就绪还需要打包好的 `.zip`、`.dmg`、`.dSYM.zip` 以及 `main` 上更新后的 `appcast.xml`。
11. 发布后，运行 npm post-publish 验证程序，在需要发布后渠道证明时运行可选的独立 published-npm Telegram E2E，在需要时提升 dist-tag，根据完整的匹配 `CHANGELOG.md` 部分填写 GitHub release/prerelease 说明，以及执行发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以便测试 TypeScript 覆盖范围保持在更快的本地 `pnpm check` 闸门之外
- 在发布预检之前运行 `pnpm check:architecture`，以便更广泛的导入周期和架构边界检查在更快的本地闸门之外通过
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的 `dist/*` 发布构件和 Control UI 包存在，用于打包验证步骤
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口点启动所有预发布测试盒。它接受分支、标签或完整提交 SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks` 以进行安装冒烟测试、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab 一致性、Matrix 和 Telegram 渠道。仅在包已发布后提供 `npm_telegram_package_spec`，并且发布后 Telegram E2E 也应该运行。示例：`gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当发布工作正在进行，而你需要软件包候选版本的旁道证明时，请运行手动 `Package Acceptance` 工作流。使用 `source=npm` 指定 `openclaw@beta`、`openclaw@latest` 或确切的发布版本；使用 `source=ref` 打包受信任的 `package_ref` 分支/标签/SHA 及当前的 `workflow_ref` 测试工具；使用 `source=url` 指定带有必需 SHA-256 的 HTTPS tarball；或使用 `source=artifact` 指定由另一个 GitHub Actions 运行上传的 tarball。该工作流将候选版本解析为 `package-under-test`，针对该 tarball 重用 Docker E2E 发布调度器，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  常用配置文件：
  - `smoke`：install/渠道/agent、网关网络和配置重载渠道
  - `package`：不包含 OpenWebUI 或实时 ClawHub 的原生 package/update/plugin 渠道
  - `product`：package 配置文件加上 MCP 渠道、cron/subagent 清理、OpenAI 网络搜索和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker 发布路径块
  - `custom`：用于针对性重新运行的精确 `docker_lanes` 选择
- 当你只需要发布候选版本的完整常规 CI 覆盖时，直接运行手动 `CI` 工作流。手动 CI 调度会绕过更改范围界定，并强制运行 Linux Node 分片、bundled-plugin 分片、渠道合约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n 渠道。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器运行 QA-lab，并验证导出的 trace span 名称、有界属性以及内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在每个标记发布之前运行 `pnpm release:check`
- 发布检查现在在一个独立的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布批准之前运行 QA Lab 模拟奇偶校验门控以及快速的实时 Matrix 配置文件和 Telegram QA 车道。实时车道使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭证租约。当你想要完整的 Matrix 传输、媒体和 E2EE 库存并行运行时，请运行手动 `QA-Lab - All Lanes` 工作流，并带上 `matrix_profile=all` 和 `matrix_shards=true`。
- 跨操作系统安装和升级运行时验证是公共 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用
  可重用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种分离是故意的：保持真实的 npm 发布路径简短、确定性且以产物为焦点，而较慢的实时检查则保留在自己的车道中，这样它们就不会拖延或阻止发布
- 带有密钥的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行调度，以便工作流逻辑和密钥保持受控状态
- `OpenClaw Release Checks` 接受分支、标记或完整的提交 SHA，只要解析后的提交可从 OpenClaw 分支或发布标记访问即可
- `OpenClaw NPM Release` 仅验证预检也接受当前的完整 40 个字符的工作流分支提交 SHA，而无需推送标记
- 该 SHA 路径仅用于验证，不能提升为真实的发布
- 在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；真实的发布仍需要真实的发布标记
- 两个工作流都将真实的发布和提升路径保留在 GitHub 托管的运行器上，而非变更的验证路径可以使用更大的 Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  并同时使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布预检不再等待独立的发布检查车道
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标记）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以验证在全新的临时前缀中的已发布注册表
  安装路径
- 在 beta publish 之后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享租用的 Telegram 凭证池，针对已发布的 npm 包验证已安装包的新手引导、Telegram 设置和真实的 Telegram E2E。
  本地维护者的临时操作可以省略 Convex 变量，并直接传递三个
  `OPENCLAW_QA_TELEGRAM_*` 环境凭证。
- 维护者可以通过手动 `NPM Telegram Beta E2E` 工作流，从 GitHub Actions 运行相同的发布后检查。
  该检查被特意设为仅限手动，不会在每次合并时运行。
- 维护者发布自动化现在使用先预检后升级（preflight-then-promote）机制：
  - 真实的 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真实的 npm publish 必须从与成功的预检运行相同的 `main` 或
    `release/YYYY.M.D` 分支进行调度
  - 稳定的 npm 版本默认发布到 `beta`
  - 稳定的 npm publish 可以通过工作流输入显式指定 `latest` 为目标
  - 基于令牌的 npm dist-tag 修改现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以确保安全，因为 `npm dist-tag add` 在
    公共仓库仅保留 OIDC 发布的同时仍需要 `NPM_TOKEN`
  - 公共 `macOS Release` 仅用于验证
  - 真实的私有 mac publish 必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真实的发布路径会提升已准备好的工件，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证程序
  还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  以免发布修正版本在基础稳定负载上静默遗留较旧的全局安装
- 除非压缩包包含
  `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，
  否则 npm 发布预检将直接失败，
  这样我们就不会再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的注册表安装包在根 `dist/*` 布局下是否包含非空的打包插件运行时依赖项。如果发布版本中打包插件的依赖负载缺失或为空，则无法通过发布后验证，也无法提升至 `latest`。
- `pnpm test:install:smoke` 还会强制对候选更新压缩包执行 npm pack `unpackedSize` 预算限制，以便安装程序 e2e 在发布发布路径之前捕获意外增加的包体积
- 如果发布工作涉及 CI 规划、扩展时间清单或扩展测试矩阵，请在批准之前从 `.github/workflows/ci.yml` 重新生成并审查规划器拥有的 `checks-node-extensions` 工作流矩阵输出，以免发布说明描述过时的 CI 布局
- 稳定的 macOS 发布准备就绪还包括更新程序相关的方面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 文件
  - 打包的应用程序必须保留非调试 bundle id、非空的 Sparkle feed URL，以及一个 `CFBundleVersion`，该版本必须等于或高于该发布版本的规范 Sparkle 构建基线

## 发布测试盒

`Full Release Validation` 是操作员从一个入口启动所有预发布测试的方式。请从受信任的 `main` 工作流引用运行它，并将发布分支、标签或完整提交 SHA 作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both
```

该工作流解析目标引用，使用 `target_ref=<release-ref>` 分发手动 `CI`，分发 `OpenClaw Release Checks`，并且当设置了 `npm_telegram_package_spec` 时，可选择性地分发独立的发布后 Telegram E2E。`OpenClaw Release Checks` 随后分发安装冒烟测试、跨操作系统发布检查、实时/E2E Docker 发布路径覆盖、带 Telegram 包 QA 的包验收、QA Lab 一致性、实时 Matrix 和实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功，并且任何可选的 `npm_telegram` 子项成功或被有意跳过时，完整运行才可接受。子工作流从运行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任引用分发，指向
旧的发布分支或标签。没有单独的完整发布验证工作流引用输入；通过选择工作流运行引用来选择受信任的测试工具。

根据发布阶段使用这些变体：

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both

# Validate an exact pushed commit.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# After publishing a beta, add published-package Telegram E2E.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

在进行针对性修复后的首次重新运行时，不要使用完整的总体工作流。如果某个测试框失败，请使用失败的子工作流、作业、Docker 车道、包配置文件、模型提供商或 QA 车道进行下一次验证。只有当修复更改了共享发布编排或使之前所有测试框的证据失效时，才再次运行完整的总体工作流。总体工作流的最终验证器会重新检查记录的子工作流运行 ID，因此在子工作流成功重新运行后，仅重新运行失败的 `Verify full validation` 父作业。

### Vitest

Vitest 测试框是手动 `CI` 子工作流。手动 CI 故意绕过更改范围限制，并为发布候选版本强制执行正常的测试图：Linux Node 分片、bundled-plugin 分片、渠道合同、Node 22
兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python
技能、Windows、macOS、Android 和 Control UI i18n。

使用此测试框来回答“源树是否通过了完整的常规测试套件？”
这与发布路径产品验证不同。需保留的证据：

- `Full Release Validation` 摘要，显示已调度的 `CI` 运行 URL
- `CI` 在确切的目标 SHA 上运行通过（绿色）
- 在调查回归时，来自 CI 作业的失败或缓慢的分片名称
- 当运行需要性能分析时，
  例如 `.artifacts/vitest-shard-timings.json` 等 Vitest 计时产物

仅当发布需要确定性的常规 CI，但
不需要 Docker、QA Lab、live、跨操作系统或 package 测试箱时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 测试箱位于 `OpenClaw Release Checks` 到
`openclaw-live-and-e2e-checks-reusable.yml` 中，此外还有 release-mode
`install-smoke` 工作流。它通过打包的
Docker 环境来验证发布候选版本，而不仅仅是源代码级测试。

发布 Docker 覆盖范围包括：

- 完整安装冒烟测试，并启用缓慢的 Bun 全局安装冒烟测试
- 仓库 E2E 渠道
- release-path Docker 块：`core`、`package-update`、`plugins-runtime` 和
  `bundled-channels`
- 根据请求，在 `plugins-runtime` 块内的 OpenWebUI 覆盖范围
- 将拆分的 bundled-渠道 依赖渠道放在其自己的 `bundled-channels` 块中
  而不是串行的一体化 bundled-渠道 渠道
- 拆分的 bundled 插件安装/卸载渠道
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-7`
- live/E2E 提供商 套件和 Docker 实时模型覆盖范围，当发布检查
  包含 live 套件时

在重新运行之前使用 Docker 产物。release-path 调度器会上传
`.artifacts/docker-tests/`，其中包含渠道日志、`summary.json`、`failures.json`、
阶段计时、调度器计划 JSON 和重新运行命令。为了进行针对性恢复，
请在可重用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是
重新运行所有发布块。生成的重新运行命令在可用时包含先前的
`package_artifact_run_id` 和准备好的 Docker 镜像输入，因此
失败的渠道可以重用同一个 tarball 和 GHCR 镜像。

### QA Lab

QA Lab 测试箱也是 `OpenClaw Release Checks` 的一部分。它是代理
行为和渠道级别的发布关卡，与 Vitest 和 Docker
打包机制分开。

Release QA Lab coverage includes:

- mock parity gate comparing the OpenAI candidate lane against the Opus 4.6
  baseline using the agentic parity pack
- fast live Matrix QA profile using the `qa-live-shared` environment
- live Telegram QA lane using Convex CI credential leases
- `pnpm qa:otel:smoke` when release telemetry needs explicit local proof

Use this box to answer "does the release behave correctly in QA scenarios and
live 渠道 flows?" Keep the artifact URLs for parity, Matrix, and Telegram
lanes when approving the release. Full Matrix coverage remains available as a
manual sharded QA-Lab run rather than the default release-critical lane.

### Package

The Package box is the installable-product gate. It is backed by
`Package Acceptance` and the resolver
`scripts/resolve-openclaw-package-candidate.mjs`. The resolver normalizes a
candidate into the `package-under-test` tarball consumed by Docker E2E, validates
the package inventory, records the package version and SHA-256, and keeps the
workflow harness ref separate from the package source ref.

Supported candidate sources:

- `source=npm`: `openclaw@beta`, `openclaw@latest`, or an exact OpenClaw release
  version
- `source=ref`: pack a trusted `package_ref` branch, tag, or full commit SHA
  with the selected `workflow_ref` harness
- `source=url`: download an HTTPS `.tgz` with required `package_sha256`
- `source=artifact`: reuse a `.tgz` uploaded by another GitHub Actions run

`OpenClaw Release Checks` 使用 `source=ref`、
`package_ref=<release-ref>`、`suite_profile=custom`、
`docker_lanes=bundled-channel-deps-compat plugins-offline` 和
`telegram_mode=mock-openai` 运行包验收。release-path Docker 块覆盖了
重叠的 install、update 和 plugin-update 渠道；Package Acceptance 针对同一
解析的 tarball 保持了 artifact-native bundled-渠道 兼容性、
离线 plugin fixtures 以及 Telegram 包 QA。
它是大多数以前需要 Parallels 的 package/update 覆盖范围的 GitHub 原生替代品。
针对特定操作系统的新手引导、安装程序和平台行为，跨操作系统发布检查
仍然很重要，但 package/update 产品验证应首选 Package Acceptance。

传统的 package-acceptance 宽限期是有意设限的。通过
`2026.4.25` 的包可以使用兼容性路径来处理已发布到
npm 的元数据缺失：tarball 中缺少的私有 QA 清单条目、
缺失的 `gateway install --wrapper`、从 tarball 派生的 git fixture 中
缺失的补丁文件、缺失的持久化 `update.channel`、
传统的 plugin install-record 位置、marketplace install-record
持久化缺失，以及 `plugins update` 期间的配置元数据迁移。
`2026.4.25` 之后的包必须满足现代包契约；
同样的差距会导致发布验证失败。

当发布问题涉及实际的可安装包时，请使用更广泛的 Package Acceptance 配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

常用包配置文件：

- `smoke`：快速包 install/渠道/agent、gateway network
  和 config reload 渠道
- `package`：在没有实时 ClawHub 的情况下执行
  install/update/plugin 包契约；这是 release-check 默认值
- `product`：`package` 加上 MCP 渠道、
  cron/subagent 清理、OpenAI web
  搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker release-path 块
- `custom`：用于 focused reruns 的精确 `docker_lanes` 列表

对于包候选 Telegram 验证，请在 Package Acceptance 上启用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。该工作流将解析后的 `package-under-test` 压缩包传递到 Telegram 通道；独立的
Telegram 工作流仍接受已发布的 npm 规范，用于发布后检查。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，也可以是当前
  完整的 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示
  实际的发布路径
- `preflight_run_id`：在实际发布路径上必需，以便工作流复用
  成功预检运行中准备好的压缩包
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`：要验证的分支、标签或完整提交 SHA。包含机密的检查
  要求解析后的提交可从 OpenClaw 分支或
  发布标签访问。

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当
  `preflight_only=true` 时才允许输入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际发布路径必须使用与预检期间使用的相同的 `npm_dist_tag`；
  工作流会在发布前验证该元数据

## 稳定版 npm 发布序列

在创建稳定版 npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前的完整工作流分支提交
     SHA 对预检工作流进行仅验证的空运行
2. 选择 `npm_dist_tag=beta` 进行常规的 beta 优先流程，或仅在您
   故意想要直接发布 stable 版本时选择 `latest`
3. 在发布分支、发布标签或完整提交 SHA 上运行 `Full Release Validation`，当您需要常规 CI 加上实时提示缓存、Docker、QA Lab、
   Matrix 和 Telegram 覆盖时，通过一个手动工作流完成
4. 如果您故意只需要确定性的常规测试图，请在发布引用上运行
   手动的 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用 `preflight_only=false`、相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 再次运行 `OpenClaw NPM Release`
7. 如果发布落在了 `beta` 上，请使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该 stable 版本从 `beta` 提升到 `latest`
8. 如果发布故意直接发布到了 `latest` 并且 `beta`
   应立即跟随同一个 stable 构建，请使用同一个私有工作流将两个 dist-tags 指向该 stable 版本，或者让其预定的
   自愈同步稍后移动 `beta`

出于安全考虑，dist-tag 变更位于私有仓库中，因为它仍然
需要 `NPM_TOKEN`，而公共仓库保持仅限 OIDC 的发布。

这保持了直接发布路径和 beta 优先提升路径都有文档记录
且对操作员可见。

如果维护人员必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话中运行任何 1Password
CLI (`op`) 命令。不要直接从主代理 shell 调用 `op`；
将其保留在 tmux 中可以使提示、警报和 OTP 处理变得可观察，并防止重复的主机警报。

## 公共参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档作为实际的运行手册。

## 相关

- [发布渠道](/zh/install/development-channels)
