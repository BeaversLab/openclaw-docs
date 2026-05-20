---
summary: "发布通道、操作员清单、验证框、版本命名和节奏"
title: "发布策略"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw 有三个公开发布通道：

- stable：默认发布到 npm npm`beta`npm 的标记版本，或在明确请求时发布到 npm `latest`
- beta：发布到 npm npm`beta` 的预发布标记
- dev：`main` 的移动头部

## 版本命名

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- 稳定修正发布版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月份或日期不要补零
- `latest`npm 意味着当前提升的稳定 npm 版本
- `beta` 意味着当前的 beta 安装目标
- 稳定版和稳定修正版默认发布到 npm npm`beta`；发布操作员可以明确以 `latest` 为目标，或者稍后提升经过审查的 beta 构建
- 每次 OpenClaw 稳定版发布都会同时发布 npm 包和 macOS 应用；
  beta 版发布通常先验证并发布 npm/package 路径，
  Mac 应用的构建/签名/公证保留给稳定版，除非有明确要求

## 发布节奏

- 发布优先从 beta 开始
- 只有在最新的 beta 版本经过验证后才会发布稳定版
- 维护者通常从基于当前 `main` 创建的 `release/YYYY.M.D` 分支进行版本发布，因此发布验证和修复不会阻碍 `main` 上的新开发
- 如果 beta 标签已被推送或发布但需要修复，维护者将创建下一个 `-beta.N` 标签，而不是删除或重新创建旧的 beta 标签
- 详细的发布流程、审批、凭证和恢复说明仅限维护者查看

## 发布操作员检查清单

此清单是发布流程的公开形态。私有凭据、签名、公证、dist-tag 恢复以及紧急回滚详情保留在仅限维护者访问的发布手册中。

1. 从当前 `main` 开始：拉取最新内容，确认目标提交已推送，并确认当前的 `main` CI 足够绿，可以从中创建分支。
2. 使用 `/changelog` 根据真实的提交历史重写顶部的 `CHANGELOG.md` 部分，保持条目面向用户，提交它，推送它，并在创建分支前再次变基/拉取。
3. 查看 `src/plugins/compat/registry.ts` 和
   `src/commands/doctor/shared/deprecation-compat.ts` 中的版本兼容性记录。仅当升级路径仍受覆盖时，才移除过期的
   兼容性，或记录为何有意保留。
4. 从当前的 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上进行正常的版本发布工作。
5. 更新预期标签所需的所有版本位置，然后运行
   `pnpm release:prep`。它会按正确顺序刷新插件版本、插件清单、配置
   架构、捆绑渠道配置元数据、配置文档基线、插件 SDK
   导出以及插件 SDK API 基线。在打标签之前，提交任何生成的
   偏差。然后运行本地确定性预检：
   `pnpm check:test-types`、`pnpm check:architecture`、
   `pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true`npm 运行 `OpenClaw NPM Release`。在标签存在之前，允许使用完整的 40 字符 release-branch SHA 进行仅用于验证的预检。预检会为精确检出的依赖图生成依赖发布证据，并将其存储在 npm 预检产物中。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 针对发布分支、标签或完整提交 SHA 启动所有预发布测试。这是四个大型发布测试箱的唯一手动入口点：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，请在发布分支上修复并重新运行证明修复的最小失败文件、通道、工作流作业、包配置文件、提供商或模型允许列表。仅当更改的表面使先前的证据失效时，才重新运行完整的总体流程。
9. 对于 beta 版，标记 `vYYYY.M.D-beta.N`，然后运行 `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `npmTelegramnpmClawHubrelease/YYYY.M.D` 分支。该辅助工具会
   运行本地生成的发布检查，调度或验证完整的发布
   验证和 npm 预检证据，运行 Parallels 和 Telegram 包
   验证，记录插件 npm 和 ClawHub 计划，并仅在证据包全部通过后
   打印确切的 `OpenClaw Release Publish` 命令。
   `OpenClaw Release Publish`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub 将选定的或所有可发布的插件
   包并行调度到 npm 以及同一批到 ClawHub，然后在插件
   npm 发布成功后，立即使用匹配的 dist-tag 推广
   准备好的 OpenClaw npm 预检产物。
   在 OpenClaw npm 发布子任务成功后，它会根据完整的匹配项
   `CHANGELOG.md`npm 部分创建或更新
   匹配的 GitHub 发布/预发布页面。发布到 npm `latest`GitHubnpm 的
   稳定版发布会成为 GitHub 最新发布；保留在 npm `beta`GitHub 上的
   稳定版维护发布则是
   使用 GitHub `latest=false`GitHub 创建的。该工作流还会将预检
   依赖证据作为 `openclaw-<version>-dependency-evidence.zip`GitHubOpenClawnpmClawHubOpenClawnpm
   上传到 GitHub 发布页面，以便进行
   发布后事件响应。发布工作流会立即打印子运行 ID，自动批准
   该工作流令牌有权批准的发布环境门，汇总
   失败的子作业及其日志尾部，在 OpenClaw npm 发布成功后立即关闭 GitHub 发布和依赖
   证据，在 OpenClaw npm 正在发布时
   等待 ClawHub，然后运行 `pnpm release:verify-beta`GitHubnpmnpmClawHubTelegramClawHubCLI 并
   上传 GitHub 发布、npm 包、选定的
   插件 npm 包、选定的 ClawHub 包、子工作流运行 ID 以及
   可选的 NPM Telegram 运行 ID 的发布后证据。ClawHub 路径会重试瞬态 CLI
   依赖安装失败，即使当某个预检单元出现不稳定时也会发布通过预检的插件，并以每个预期的
   插件版本的注册表验证结束，以便部分发布保持可见和可重试。然后针对已发布的
   `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 包运行发布后
   包验收。如果推送或发布的预发布版本需要修复，
   请截取下一个匹配的预发布编号；不要删除或重写旧的
   预发布版本。
10. 对于 stable 版本，只有在经过审查的 beta 或候选版本具有所需的验证证据后才能继续。stable npm 发布也会通过 npm`OpenClaw Release Publish`，通过 `preflight_run_id`macOS 重用成功的 preflight 构件；stable macOS 发布准备就绪还需要 `main`macOS 上打包好的 `.zip`、`.dmg`、`.dSYM.zip` 和更新的 `appcast.xml`。私有 macOS 发布工作流在发布资源验证通过后，会自动将签名的 appcast 发布到公共 `main`；如果分支保护阻止了直接推送，它将打开或更新一个 appcast PR。
11. 发布后，运行 npm 发布后验证程序，当您需要发布后渠道证明时，运行可选的独立
    已发布 npm Telegram E2E 测试，根据需要进行 dist-tag 提升，验证生成的 GitHub 发布页面，
    并运行发布公告步骤。

## 发布预检

- 在 release preflight 之前运行 `pnpm check:test-types`，以便测试 TypeScript 在更快的本地 `pnpm check` 门禁之外保持覆盖
- 在 release preflight 之前运行 `pnpm check:architecture`，以便更广泛的导入周期和架构边界检查在更快的本地门禁之外显示为绿色
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的 `dist/*` 发布构件和 Control UI 包存在于包验证步骤中
- 在根版本升级之后和打标签之前运行 `pnpm release:prep`APIAPI。它会运行每一个确定性的发布生成器，这些生成器通常在版本/配置/API 更改后会发生变化：插件版本、插件清单、基础配置架构、打包的渠道配置元数据、配置文档基线、插件 SDK 导出和插件 SDK API 基线。`pnpm release:check` 会以检查模式重新运行这些守卫，并在运行包发布检查之前，一次性报告它发现的每个生成漂移故障。
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口启动所有预发布测试箱。它接受一个分支、标签或完整的提交 SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks`MatrixTelegramDocker 以进行安装冒烟测试、包验收、跨操作系统包检查、QA Lab 奇偶校验、Matrix 和 Telegram 通道。稳定/默认运行会将详尽的实时/E2E 和 Docker 发布路径浸泡保留在 `run_release_soak=true` 之后；`release_profile=full` 强制开启浸泡。使用 `release_profile=full` 和 `rerun_group=all`Telegram 时，它还会针对发布检查中的 `release-package-under-test` 构件运行包 Telegram E2E。在发布 beta 版本后提供 `release_package_spec`npmTelegram，以便在发布检查、包验收和包 Telegram E2E 之间重用已发布的 npm 包，而无需重新构建发布压缩包。仅当 Telegram 应使用与发布验证其余部分不同的已发布包时，才提供 `npm_telegram_package_spec`Telegram。当包验收应使用与发布包规范不同的已发布包时，提供 `package_acceptance_package_spec`。当私有证据报告需要证明验证与已发布的 npm 包匹配，而不强制进行 Telegram E2E 时，提供 `evidence_package_spec`npmTelegram。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你在发布工作继续进行时想要获得包候选版本的侧面验证时，请运行手动 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或确切的发布版本使用 `source=npm`；使用 `source=ref` 通过当前的 `workflow_ref` 测试工具打包受信任的 `package_ref` 分支/标签/SHA；使用 `source=url` 处理具有必需 SHA-256 的 HTTPS tarball；或使用 `source=artifact` 处理由另一个 GitHub Actions 运行上传的 tarball。该工作流将候选版本解析为 `package-under-test`，针对该 tarball 重用 Docker E2E 发布调度器，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选的 Docker 通道包含 `published-upgrade-survivor` 时，包产物即为候选版本，而 `published_upgrade_survivor_baseline` 选择已发布的基线。`update-restart-auth` 使用候选包作为已安装的 CLI 和被测包，因此它执行候选更新命令的受管理重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用配置文件：
  - `smoke`：安装/渠道/代理、网关网络和配置重新加载通道
  - `package`：不包含 OpenWebUI 或实时 ClawHub 的基于产物的包/更新/重启/插件通道
  - `product`：包配置文件加上 MCP 渠道、cron/子代理清理、OpenAI 网络搜索和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker 发布路径块
  - `custom`：用于针对性重新运行的确切 `docker_lanes` 选择
- 当您只需要发布候选版本的完整常规 CI 覆盖率时，请直接运行手动 `CI`Linux 工作流。手动 CI 调度会绕过变更范围控制，并强制运行 Linux Node 分片、bundled-plugin 分片、插件和渠道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI 国际化通道。示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器运行 QA-lab，并验证导出的 trace
  span 名称、有界属性以及内容/标识符编辑，而无需
  Opik、Langfuse 或其他外部收集器。
- 在每次标记发布之前运行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 在打包 npm tarball 之前生成依赖项发布证据。npm 公告漏洞门控是
  阻止发布的。传递清单风险、依赖项所有权/安装
  表面以及依赖项变更报告仅作为发布证据。该
  依赖项变更报告将发布候选版本与之前的
  可访问发布标记进行比较。
- Preflight 将依赖项证据上传为
  `openclaw-release-dependency-evidence-<tag>`，并将其嵌入
  `dependency-evidence/` 在准备好的 npm preflight 工件中。实际的
  发布路径会重用该 preflight 工件，然后将相同的证据附加
  到 GitHub 发布作为 `openclaw-<version>-dependency-evidence.zip`。
- 标签存在后，运行 `OpenClaw Release Publish` 以执行变更发布序列。从 `release/YYYY.M.D` 调度它（或者在发布 main 可达标签时从 `main`），传入发布标签和成功的 OpenClaw npm
  `preflight_run_id`，并保留默认插件发布范围
  `all-publishable`，除非您有意进行针对性的修复。该工作流会串行化插件 npm 发布、插件 ClawHub 发布和 OpenClaw
  npm 发布，以确保核心包不会在其外部化插件之前发布。
- 发布检查现在在一个单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布批准前运行 QA Lab 模拟奇偶校验通道以及快速实况 Matrix 配置文件和 Telegram QA 通道。实况通道使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当您需要完整的 Matrix
  传输、媒体和 E2EE 清单并行运行时，请使用 `matrix_profile=all` 和 `matrix_shards=true` 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公共 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用
  可重用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真实的 npm 发布路径简短、
  确定性且以产物为中心，而较慢的实况检查则保留在其自己的通道中，以免延迟或阻塞发布
- 包含密钥的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行调度，以保持工作流逻辑和
  密钥处于受控状态
- 只要解析的提交可从 OpenClaw 分支或发布标签到达，`OpenClaw Release Checks` 就接受分支、标签或完整的提交 SHA
- `OpenClaw NPM Release` validation-only preflight 还接受当前的
  完整 40 字符工作流分支提交 SHA，而无需推送标签
- 该 SHA 路径仅用于验证，无法提升为真正的发布
- 在 SHA 模式下，工作流仅为
  包元数据检查合成 `v<package.json version>`；真正的发布仍需要真实的发布标签
- 这两个工作流将真正的发布和提升路径保留在 GitHub 托管的
  运行器上，而非变异验证路径可以使用更大的
  Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  时同时使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布预检不再等待单独的发布检查通道
- 在本地标记发布候选版本之前，请运行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此辅助程序
  按顺序运行快速发布护栏、插件 npm/ClawHub 发布检查、构建、
  UI 构建和 `release:openclaw:npm:check`，以便在 GitHub 发布工作流开始之前捕获常见的
  阻止审批的错误。
- 在审批之前，运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm 发布后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在全新的临时前缀中验证已发布注册表的
  安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享租用的 Telegram 凭证池
  验证已发布 Telegram 包的已安装包新手引导、npm 设置和真正的 Telegram E2E。
  本地维护者的临时操作可能会省略 Convex 变量，并直接传递三个
  `OPENCLAW_QA_TELEGRAM_*` 环境凭证。
- 若要从维护者机器上运行完整的发布后 Beta 冒烟测试，请使用 `pnpm release:beta-smoke -- --beta betaN`npm。该辅助程序运行 Parallels npm update/fresh-target 验证，调度 `NPM Telegram Beta E2E`Telegram，轮询确切的工作流运行，下载产物，并打印 Telegram 报告。
- 维护者可以通过 GitHub Actions 中的手动 GitHub`NPM Telegram Beta E2E` 工作流运行相同的发布后检查。该工作流特意设计为仅限手动运行，不会在每次合并时运行。
- 维护者发布自动化现在使用先预检后提升（preflight-then-promote）机制：
  - 真实的 npm 发布必须通过成功的 npm npmnpm`preflight_run_id`
  - 真实的 npm 发布必须从与成功预检运行相同的 npm`main` 或 `release/YYYY.M.D` 分支进行调度
  - 稳定版 npm 发布默认为 npm`beta`
  - 稳定版 npm 发布可以通过工作流输入显式指定 npm`latest` 作为目标
  - 基于令牌的 npm dist-tag 变更现在位于 npm`openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 中
    以确保安全，因为 `npm dist-tag add` 在公共仓库仅保留 OIDC 发布的情况下仍需要 `NPM_TOKEN`
  - 公共 `macOS Release` 仅用于验证；当标签仅存在于发布分支上，但工作流是从 `main` 调度的时，请设置 `public_release_branch=release/YYYY.M.D`
  - 真实的私有 mac 发布必须通过成功的私有 mac `preflight_run_id` 和 `validate_run_id`
  - 真实的发布路径会提升已准备的产物，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定版修正发布，发布后验证程序还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以免发布修正版本悄悄地让旧的全局安装停留在基础稳定版负载上
- npm 发布预检默认失败关闭，除非压缩包同时包含
  npm`dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载
  以免我们再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的插件入口点和
  包元数据是否存在于已安装的注册表布局中。如果发布版本
  缺少插件运行时负载，则无法通过发布后验证程序，
  也无法升级到 `latest`。
- `pnpm test:install:smoke`npm 还会对候选更新压缩包强制执行 npm 打包 `unpackedSize` 预算，
  以便安装程序 e2e 在发布发布路径之前捕获意外的打包膨胀
- 如果发布工作涉及 CI 规划、扩展时间清单或
  扩展测试矩阵，请在批准前从
  `.github/workflows/plugin-prerelease.yml` 重新生成并审查计划者拥有的
  `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明
  描述过时的 CI 布局
- 稳定的 macOS 发布准备还包括更新程序界面：
  - GitHub 发布最终必须包含打包好的 GitHub`.zip`、`.dmg` 和 `.dSYM.zip`
  - `main`macOS 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 压缩包；
    私有 macOS 发布工作流会自动提交它，或者在直接推送被阻止时打开一个 appcast
    PR
  - 打包的应用程序必须保留非调试的 bundle id、非空的 Sparkle feed
    URL，以及一个等于或高于该发布版本的规范 Sparkle 构建基线的
    `CFBundleVersion`

## 发布测试箱

`Full Release Validation` 是操作员从一个入口点启动所有预发布测试的方式。
对于快速移动分支上的固定提交证明，请使用
helper，以便每个子工作流都从固定于目标
SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助工具推送 `release-ci/<sha>-...`，从该分支使用 `ref=<sha>` 分派 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，然后删除临时分支。这可以避免意外证明一个更新的 `main` 子运行。

对于发布分支或标签验证，请从受信任的 `main` 工作流引用运行它，并将发布分支或标签作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

该工作流解析目标引用，使用 `target_ref=<release-ref>` 手动调度 `CI`，调度 `OpenClaw Release Checks`，准备用于面向包检查的父级 `release-package-under-test` 构件，并在使用 `rerun_group=all` 进行 `release_profile=full` 或设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，调度独立的包 Telegram E2E。`OpenClaw Release Checks` 随后会在启用 soak 时分发安装冒烟测试、跨操作系统发布检查、实时/E2E Docker 发布路径覆盖、带有 Telegram 包 QA 的包验收、QA Lab 一致性、实时 Matrix 以及实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功时，完整运行才可接受。在 full/all 模式下，`npm_telegram` 子工作流也必须成功；在 full/all 模式之外，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则它将被跳过。最终验证摘要包含每个子运行的最慢作业表，因此发布经理无需下载日志即可查看当前关键路径。有关完整的阶段矩阵、确切的工作流作业名称、stable 与 full profile 的差异、构件以及专注的重新运行句柄，请参阅 [Full release validation](/zh/reference/full-release-validation)。子工作流从运行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任引用调度，该 `, even when the target `ref`指向较旧的发布分支或标签。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行引用来选择受信任框架。不要使用`--ref main -f ref=<sha>`来获取移动`main`时的确切提交证明；原始提交 SHA 不能作为工作流调度引用，因此请使用`pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供商的覆盖范围：

- `minimum`OpenAIDocker：针对发布关键的最快 OpenAI/core 实时和 Docker 路径
- `stable`：最低要求加上稳定的提供商/后端覆盖，以获得发布批准
- `full`：稳定版本加上广泛的顾问式提供商/媒体覆盖

当阻塞发布的流水线状态为绿色，并且您希望在推广前进行详尽的实时/E2E、Docker 发布路径以及有界的已发布升级幸存者扫描时，请配合 `stable`Docker 使用 `run_release_soak=true`。该扫描覆盖最新的四个稳定包以及固定的 `2026.4.23` 和 `2026.5.2` 基线，加上较旧的 `2026.4.15`Docker 覆盖范围，并移除重复的基线，且每个基线被分片到其自己的 Docker 运行器作业中。`full` 隐含 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流引用，将目标引用一次性解析为 `release-package-under-test`Dockernpm，并在 soak 运行期间在跨操作系统、包验收和发布路径 Docker 检查中重用该构件。这使所有面向包的测试箱保持在相同的字节上，并避免重复的包构建。当 beta 版本已经在 npm 上时，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便发布检查下载已发布的包一次，从 `dist/build-info.json`DockerTelegramOpenAI 中提取其构建源 SHA，并在跨操作系统、包验收、发布路径 Docker 和包 Telegram 流水线中重用该构件。当设置了 repo/org 变量时，跨操作系统 OpenAI 安装冒烟测试使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为此流水线旨在验证包安装、新手引导、网关启动和一次实时代理轮次，而不是对最慢的默认模型进行基准测试。更广泛的实时提供商矩阵仍然是特定模型覆盖的场所。

根据发布阶段使用这些变体：

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

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
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.D-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

在针对特定问题的修复后，不要将完整的 umbrella 作为第一次重跑。如果某个 box 失败，请针对下一次验证使用失败的子工作流、作业、Docker 渠道、package 配置文件、模型提供商或 QA 渠道。仅当修复更改了共享的发布编排，或者导致之前的全 box 证据失效时，才再次运行完整的 umbrella。Umbrella 的最终验证器会重新检查记录的子工作流运行 ID，因此子工作流成功重运行后，只需重运行失败的 Docker`Verify full validation` 父作业。

对于有界恢复，请将 `rerun_group` 传递给 umbrella。`all` 是真正的发布候选版本运行，`ci` 仅运行常规 CI 子任务，`plugin-prerelease` 仅运行发布专用插件子任务，`release-checks` 运行每个发布测试箱，更窄的发布组包括 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。聚焦的 `npm-telegram` 重新运行需要 `release_package_spec` 或 `npm_telegram_package_spec`；带有 `release_profile=full` 的完整/全部运行使用 release-checks 包产物。聚焦的跨操作系统重新运行可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或其他操作系统/套件过滤器。QA release-check 失败是建议性的，但标准运行时工具覆盖率守门除外，当所需的 OpenClaw 动态工具从标准层级摘要中漂移或消失时，它会阻止发布验证。

### Vitest

Vitest 盒子是手动 `CI` 子工作流。手动 CI 故意绕过变更范围界定，并强制发布候选版本使用正常的测试图：Linux Node 分片、bundled-plugin 分片、plugin 和渠道合约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n。

使用此框回答“源代码树是否通过了完整的常规测试套件？”
这与发布路径产品验证不同。需保留的证据：

- `Full Release Validation` 摘要，显示已分派的 `CI` 运行 URL
- `CI` 在确切的目标 SHA 上运行成功（green）
- 在调查回归时，来自 CI 作业的失败或缓慢的分片名称
- Vitest 计时产物，例如 `.artifacts/vitest-shard-timings.json`，当
  运行需要性能分析时

仅当发布需要确定性的常规 CI 但不需要
Docker、QA Lab、实时、跨操作系统或打包框时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 框位于 `OpenClaw Release Checks` 到
`openclaw-live-and-e2e-checks-reusable.yml` 中，以及发布模式
`install-smoke` 工作流。它通过打包的
Docker 环境验证发布候选版本，而不仅仅是源代码级测试。

发布 Docker 覆盖范围包括：

- 完整安装冒烟测试，启用缓慢的 Bun 全局安装冒烟测试
- 通过目标 SHA 准备/重用根 Dockerfile 冒烟镜像，并带有 QR、
  root/gateway 和 installer/Bun 冒烟作业作为单独的安装冒烟
  分片运行
- 仓库 E2E 通道
- 发布路径 Docker 块：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 请求时，`plugins-runtime-services` 块内的 OpenWebUI 覆盖范围
- 拆分捆绑的插件安装/卸载通道
  `bundled-plugin-install-uninstall-0` 到
  `bundled-plugin-install-uninstall-23`
- 实时/E2E 提供商套件和 Docker 实时模型覆盖范围，当发布检查
  包括实时套件时

在重新运行之前使用 Docker 构件。release-path 调度器会上传
`.artifacts/docker-tests/`，其中包含渠道日志、`summary.json`、`failures.json`、
阶段计时、调度器计划 JSON 和重新运行命令。为了进行有针对性的恢复，
请在可复用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是
重新运行所有发布块。生成的重新运行命令包含先前的
`package_artifact_run_id` 和准备好的 Docker 镜像输入（如果可用），因此
失败的渠道可以复用同一 tar 包和 GHCR 镜像。

### QA 实验室

QA 实验室框也是 `OpenClaw Release Checks` 的一部分。它是智能行为
和渠道级发布关卡，与 Vitest 和 Docker
打包机制分开。

发布 QA 实验室覆盖范围包括：

- mock parity 渠道，使用智能 parity 包将 OpenAI 候选渠道与 Opus 4.6
  基线进行比较
- 使用 `qa-live-shared` 环境的快速 live Matrix QA 配置文件
- 使用 Convex CI 凭证租约的 live Telegram QA 渠道
- 当发布遥测需要明确的本地证明时，`pnpm qa:otel:smoke`

使用此框来回答“发布在 QA 场景和
实时渠道流中是否表现正确？”在批准发布时，请保留 parity、Matrix 和 Telegram
渠道的构件 URL。完整的 Matrix 覆盖范围仍可作为
手动分片的 QA-Lab 运行使用，而不是默认的发布关键渠道。

### 打包

打包框是可安装产品的关卡。它由
`Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器将
候选者标准化为 Docker E2E 消费的 `package-under-test` tar 包，验证
包清单，记录包版本和 SHA-256，并保持
工作流 harness 引用与包源引用分离。

支持的候选源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布
  版本
- `source=ref`：打包受信任的 `package_ref` 分支、标签或完整的提交 SHA
  并使用选定的 `workflow_ref` 工具
- `source=url`：下载包含必需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`：复用另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact` 运行包验收，
`source=artifact` 是准备好的发布包产物，以及
`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、
`telegram_mode=mock-openai`。包验收针对同一解析后的
tarball 保留迁移、更新、
配置认证更新重启、实时 ClawHub 技能安装、过时插件依赖清理、离线插件
fixture、插件更新和 Telegram 包 QA。阻塞性发布检查使用默认最新发布的包
基线；`run_release_soak=true` 或
`release_profile=full` 会扩展到从
`2026.4.23` 到 `latest` 的每个稳定 npm-发布基线
加上已报告问题的 fixture。使用
`source=npm` 的包验收来测试已发布的候选版本，或使用
`source=ref`/`source=artifact` 来测试发布前基于 SHA 的本地 npm tarball。
它是以前需要 Parallels 的大部分包/更新覆盖范围的
GitHub-原生
替代品。跨操作系统发布检查对于特定于操作系统的 、
安装程序和平台行为仍然很重要，但包/更新产品验证应
首选包验收。

更新和插件验证的规范检查清单是
[Testing updates and plugins](/zh/help/testing-updates-plugins)。在决定哪个本地、Docker、包验收或 release-check 通道能证明
插件安装/更新、doctor 清理或已发布包迁移更改时，请使用它。
从每个稳定 `2026.4.23+` 包进行详尽的已发布更新迁移是
一个单独的手动 `Update Migration` 工作流，不是完整发布 CI 的一部分。

旧版包验收的宽容度是有意设定时限的。直到
`2026.4.25` 的包可以对已发布到 npm 的元数据缺口使用兼容性路径：压缩包中缺失的私有 QA 库存条目、缺失的
`gateway install --wrapper`、从压缩包派生的 git 夹具中缺失的补丁文件、缺失的持久化 `update.channel`、旧版插件安装记录
位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据
迁移。已发布的 `2026.4.26` 包可能会针对
已附带的本地构建元数据戳记文件发出警告。后续的包
必须满足现代包契约；这些相同的缺口将导致发布
验证失败。

当发布问题关于实际的
可安装包时，请使用更广泛的包验收配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常用包配置文件：

- `smoke`：快速包安装/渠道/代理、网关网络和配置
  重新加载通道
- `package`：安装/更新/重启/插件包契约加上实时的 ClawHub
  技能安装证明；这是 release-check 的默认设置
- `product`：`package` 加上 MCP 渠道、cron/subagent 清理、OpenAI 网络搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径块
- `custom`：用于集中重新运行的精确 `docker_lanes` 列表

对于包候选 Telegram 验证，请在包验收上启用 Telegram`telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。该工作流将解析后的 `package-under-test`TelegramTelegramnpm 压缩包传递到 Telegram 通道；独立的
Telegram 工作流仍接受已发布的 npm 规范以进行发布后检查。

## 发布发布自动化

`OpenClaw Release Publish` 是常规的可变发布入口。它
按照发布所需的顺序编排受信任发布者工作流：

1. 检出发布标记并解析其提交 SHA。
2. 验证标记是否可从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 调度 `Plugin ClawHub Release`。
6. 使用发布标记、npm dist-tag 和
   已保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`npm。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

稳定版发布到默认的 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接推广到 `latest` 的稳定版是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅在进行集中修复或重新发布工作时才使用较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。对于选定的插件修复，请将
`plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传递给
`OpenClaw Release Publish`OpenClaw，或者在必须不发布
OpenClaw 包时直接调度子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标记，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 个字符的工作流分支提交 SHA，用于仅验证的预检查
- `preflight_only`: `true` 仅用于验证/构建/打包，`false` 用于
  实际发布路径
- `preflight_run_id`: 在实际发布路径上必须提供，以便工作流重用
  成功预检运行中准备好的压缩包
- `npm_dist_tag`: 发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受以下操作员控制的输入：

- `tag`: 必需的发布标签；必须已存在
- `preflight_run_id`: 成功的 `OpenClaw NPM Release` 预检运行 ID；
  当 `publish_openclaw_npm=true` 时为必需
- `npm_dist_tag`: npm 包的 OpenClaw 目标标签
- `plugin_publish_scope`: 默认为 `all-publishable`；仅对
  针对性修复工作使用 `selected`
- `plugins`: 当 `plugin_publish_scope=selected` 时，
  逗号分隔的 `@openclaw/*` 包名称
- `publish_openclaw_npm`: 默认为 `true`；仅当将
  工作流作为仅插件修复编排器使用时才设置为 `false`
- `wait_for_clawhub`: 默认为 `false`，以便 npm 可用性不被
  ClawHub 侧车阻挡；仅当工作流完成必须包含
  ClawHub 完成时才设置为 `true`

`OpenClaw Release Checks` 接受以下操作员控制的输入：

- `ref`: 要验证的分支、标签或完整提交 SHA。包含密钥的检查
  要求解析的提交必须可从 OpenClaw 分支或
  发布标签访问。
- `run_release_soak`: 选择加入详尽的 live/E2E、Docker 发布路径和
  稳定/默认发布检查上的 all-since 升级存活 soak。此选项由
  `release_profile=full` 强制开启。

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当
  `preflight_only=true` 时才允许输入完整的提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际的发布路径必须使用预检期间使用的相同 `npm_dist_tag`；
  工作流会在继续发布之前验证该元数据

## 稳定版 npm 发布序列

在发布稳定版 npm 时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交
     SHA 对预检工作流进行仅验证的空运行
2. 对于常规的 Beta 优先流程，请选择 `npm_dist_tag=beta`；或者仅
   当您有意进行直接稳定版发布时，选择 `latest`
3. 在发布分支、发布标签或完整
   提交 SHA 上运行 `Full Release Validation`，以便从一个手动工作流中获取常规 CI 以及实时提示缓存、Docker、QA Lab、
   Matrix 和 Telegram 的覆盖范围
4. 如果您有意只需要确定性的常规测试图，请在
   发布引用上改为运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag`
   和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会在提升 npm ClawHub 包之前
   将外部化插件发布到 OpenClaw
   和 npm
7. 如果发布已落地到 `beta`，请使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果该版本有意直接发布到 `latest` 并且 `beta` 应立即跟随相同的稳定版本构建，请使用相同的私有工作流将两个 dist-tags 指向该稳定版本，或者让其定期的自愈同步稍后移动 `beta`

出于安全考虑，dist-tag 的变更位于私有仓库中，因为它仍然需要 `NPM_TOKEN`，而公共仓库仅保留 OIDC 发布。

这使得直接发布路径和 beta-first 晋升路径都有文档记录，并且对操作员可见。

如果维护人员必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话中运行任何 1Password CLI (npmCLI`op`) 命令。不要直接从主 agent shell 调用 `op`；将其保留在 tmux 中可以使提示、警报和 OTP 处理可被观察，并防止重复的主机警报。

## 公开参考

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护人员使用 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中的私有发布文档来获取实际的运行手册。

## 相关

- [发布渠道](/zh/install/development-channels)
