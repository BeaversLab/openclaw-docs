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
2. 根据已合并的 PR 和自上一个可访问的发布标签以来的所有直接提交，生成顶部的 `CHANGELOG.md` 部分。保留面向用户的条目，对重叠的 PR/直接提交条目进行去重，提交重写，推送它，并在创建分支之前再次进行变基/拉取。
3. 审查 `src/plugins/compat/registry.ts` 和 `src/commands/doctor/shared/deprecation-compat.ts` 中的发布兼容性记录。仅当升级路径仍然被覆盖时才删除过期的兼容性，或者记录为何特意保留它。
4. 从当前的 `main` 创建 `release/YYYY.M.D`；不要直接在 `main` 上进行正常的发布工作。
5. 为预定标签更新每个所需的版本位置，然后运行 `pnpm release:prep`API。它将以正确的顺序刷新插件版本、插件清单、配置架构、捆绑渠道配置元数据、配置文档基线、插件 SDK 导出和插件 SDK API 基线。在打标签之前提交任何生成的漂移。然后运行本地确定性预检查：`pnpm check:test-types`、`pnpm check:architecture`、`pnpm build && pnpm ui:build` 和 `pnpm release:check`。
6. 使用 `preflight_only=true`npm 运行 `OpenClaw NPM Release`。在标签存在之前，允许使用完整的 40 字符发布分支 SHA 进行仅验证的预检查。预检查会为确切的检出依赖关系图生成依赖发布证据，并将其存储在 npm 预检查产物中。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation`Docker 为发布分支、标签或完整提交 SHA 启动所有预发布测试。这是四个大型发布测试箱的唯一手动入口点：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，请在发布分支上修复并重新运行证明修复的最小失败文件、通道、工作流作业、包配置文件、提供商或模型允许列表。仅当更改的表面使先前的证据失效时，才重新运行完整的总体流程。
9. 对于 beta 版本，打标签 `vYYYY.M.D-beta.N`，然后运行 `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `npmTelegramnpmClawHubrelease/YYYY.M.D` 分支。该辅助工具会
   运行本地生成的发布检查，调度或验证完整的发布
   验证和 npm 预检证据，运行 Parallels 和 Telegram 包
   验证，记录插件 npm 和 ClawHub 计划，并仅在证据包变为绿色时打印确切的
   `OpenClaw Release Publish` 命令。
   `OpenClaw Release Publish`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub 将选定的或所有可发布的插件
   包并行调度到 npm 以及相同的一组到 ClawHub，然后在插件 npm 发布成功后立即
   使用匹配的 dist-tag 提升准备好的 OpenClaw npm 预检构件。
   当 OpenClaw npm 发布子任务成功后，它会从完整的匹配
   `CHANGELOG.md`npm 部分创建或更新匹配的 GitHub release/prerelease 页面。发布到 npm `latest`GitHubnpm 的 Stable 版本成为
   GitHub latest release；保留在 npm `beta`GitHub 上的 stable 维护版本是
   使用 GitHub `latest=false`GitHub 创建的。该工作流还将预检
   依赖证据作为
   `openclaw-<version>-dependency-evidence.zip`GitHubOpenClawnpmClawHubOpenClawnpm 上传到 GitHub release，以便用于发布后事件
   响应。发布工作流会立即打印子运行 ID，自动批准
   工作流令牌有权批准的发布环境门控，用日志尾部总结失败的子作业，一旦 OpenClaw npm 发布成功就关闭 GitHub release 和依赖
   证据，每当 OpenClaw npm 正在发布时就等待 ClawHub，然后运行 `pnpm release:verify-beta`GitHubnpmnpmClawHubTelegramClawHubCLI 并
   上传 GitHub release、npm 包、选定的
   插件 npm 包、选定的 ClawHub 包、子工作流运行 ID 以及可选的 NPM Telegram 运行 ID 的发布后证据。ClawHub 路径会重试短暂的 CLI
   依赖安装失败，即使当一个预览单元不稳定时也会发布通过预览的插件，并以对每个预期的
   插件版本进行注册表验证结束，以便部分发布保持可见和可重试。然后针对已发布的
   `openclaw@YYYY.M.D-beta.N` 或
   `openclaw@beta` 包运行发布后包验收。如果推送或发布的预发布版本需要修复，
   请生成下一个匹配的预发布编号；不要删除或重写旧的
   预发布版本。
10. 对于稳定版，仅当经过审查的 beta 版或候选发布版具备所需的验证证据后，才继续进行。稳定版 npm 发布也会通过 npm`OpenClaw Release Publish`，并通过 `preflight_run_id`macOS 重用成功的预检产物；稳定版 macOS 发布准备就绪还需要在 `main`macOS 上提供打包好的 `.zip`、`.dmg`、`.dSYM.zip` 以及更新后的 `appcast.xml`。macOS 发布工作流会在发布资产验证通过后，自动将签名的 appcast 发布到公共 `main`；如果分支保护阻止了直接推送，它将打开或更新 appcast PR。
11. 发布后，运行 npm 发布后验证程序，当您需要发布后渠道证明时，运行可选的独立
    已发布 npm Telegram E2E 测试，根据需要进行 dist-tag 提升，验证生成的 GitHub 发布页面，
    并运行发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以便测试 TypeScript 保持
  在更快的本地 `pnpm check` 门禁之外覆盖
- 在发布预检之前运行 `pnpm check:architecture`，以便更广泛的导入
  循环和架构边界检查在更快的本地门禁之外通过
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便打包
  验证步骤存在预期的
  `dist/*` 发布产物和 Control UI 包
- 在根版本升级之后和打标签之前运行 `pnpm release:prep`。它
  运行每个确定性的发布生成器，这些生成器通常在版本/配置/API 更改后会漂移：插件版本、插件清单、基础配置
  架构、打包的渠道配置元数据、配置文档基线、插件 SDK
  导出和插件 SDK API 基线。`pnpm release:check` 会以检查模式
  重新运行这些守卫，并在运行包发布检查之前一次性报告它发现的每个生成的漂移失败。
- 插件版本同步会将官方插件包版本和现有的 `openclaw.compat.pluginApi`OpenClawAPIOpenClawAPI 下限默认更新为 OpenClaw 发布版本。应将该字段视为插件 SDK/运行时 API 下限，而不仅仅是包版本的副本：对于有意保持与旧版 OpenClaw 主机兼容的仅插件发布，请将下限保持为受支持的最旧主机 API，并在插件发布证明中记录该选择。
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口点启动所有发布前测试盒。它接受分支、标签或完整的提交 SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks`MatrixTelegramDocker 以进行安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径浸泡保留在 `run_release_soak=true` 之后；`release_profile=full` 强制开启浸泡。使用 `release_profile=full` 和 `rerun_group=all`Telegram 时，它还会针对发布检查中的 `release-package-under-test` 构件运行包 Telegram E2E。发布 beta 版本后提供 `release_package_spec`npmTelegram，以便在无需重新构建发布 tarball 的情况下，在发布检查、包验收和包 Telegram E2E 中重用已发布的 npm 包。仅当 Telegram 应使用与发布验证其余部分不同的已发布包时，才提供 `npm_telegram_package_spec`Telegram。当包验收应使用与发布包规格不同的已发布包时，提供 `package_acceptance_package_spec`。当发布证据报告需要证明验证与已发布的 npm 包匹配且不强制运行 Telegram E2E 时，提供 `evidence_package_spec`npmTelegram。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当您希望在发布工作继续时为候选包获取侧渠道证明，请运行手动 `Package Acceptance` 工作流。使用 `source=npm` 来指定 `openclaw@beta`、`openclaw@latest` 或确切的发布版本；使用 `source=ref` 使用当前的 `workflow_ref` 套件打包受信任的 `package_ref` 分支/标签/SHA；使用 `source=url` 指定具有必需 SHA-256 和严格公共 URL 策略的公共 HTTPS tarball；使用 `source=trusted-url` 指定使用必需 `trusted_source_id` 和 SHA-256 的命名受信任源策略；或使用 `source=artifact` 指定由另一个 GitHub Actions 运行上传的 tarball。该工作流将候选包解析为 `package-under-test`，针对该 tarball 重用 Docker E2E 发布调度器，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选的 Docker 渠道包含 `published-upgrade-survivor` 时，包产物即为候选包，而 `published_upgrade_survivor_baseline` 选择已发布的基线。`update-restart-auth` 将候选包同时作为已安装的 CLI 和被测包，从而执行候选更新命令的托管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用配置：
  - `smoke`：install/渠道/agent、gateway network 和 config reload 渠道
  - `package`：不包括 OpenWebUI 或实时 ClawHub 的 artifact-native package/update/restart/plugin 渠道
  - `product`：package 配置加上 MCP 渠道、cron/subagent 清理、OpenAI 网络搜索和 OpenWebUI
  - `full`：带有 OpenWebUI 的 Docker release-path 块
  - `custom`：用于 focused rerun 的确切 `docker_lanes` 选择
- 当您只需要对发布候选版本进行完整的常规 CI 覆盖时，直接运行手动 `CI`Linux 工作流。手动 CI 调度会绕过变更范围限制，并强制运行 Linux Node 分片、bundled-plugin 分片、plugin 和 渠道 contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n 通道。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器对 QA 实验室进行测试，并验证 trace、metric 和 log 导出，以及有界的 trace 属性和内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在验证收集器兼容性时运行 `pnpm qa:otel:collector-smoke`。它在本地接收器断言之前，将相同的 QA 实验室 OTLP 导出通过真实的 OpenTelemetry Collector Docker 容器进行路由。
- 在验证受保护的 Prometheus 抓取时运行 `pnpm qa:prometheus:smoke`。它对 QA 实验室进行测试，拒绝未经身份验证的抓取，并验证对发布至关重要的指标族保持不含提示内容、原始标识符、身份验证令牌和本地路径。
- 当您希望连续运行源代码检出 OpenTelemetry 和 Prometheus 冒烟通道时，运行 `pnpm qa:observability:smoke`。
- 在每个标记的发布之前运行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 在打包 npm tarball 之前生成依赖发布证据。npm advisory 漏洞门控会阻止发布。传递清单风险、依赖所有权/安装范围和依赖变更报告仅作为发布证据。依赖变更报告会将发布候选版本与上一个可到达的发布标记进行比较。
- 预检将依赖证据上传为
  `openclaw-release-dependency-evidence-<tag>`，并将其嵌入到准备好的 npm 预检制品内的
  `dependency-evidence/` 下。实际的
  发布路径复用该预检制品，然后将相同的证据作为
  `openclaw-<version>-dependency-evidence.zip` 附加到 GitHub 版本中。
- 在标签存在后，运行 `OpenClaw Release Publish` 以执行变更性发布序列。从 `release/YYYY.M.D` 调度它（或者在发布 main 可达标签时使用 `main`），传递发布标签和成功的 OpenClaw npm
  `preflight_run_id`，并保留默认的插件发布范围
  `all-publishable`，除非您故意运行有针对性的修复。该工作流会按顺序执行插件 npm 发布、插件 ClawHub 发布和 OpenClaw
  npm 发布，以确保核心包不会在其外部化插件之前发布。
- 发布检查现在在单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还在发布批准之前运行 QA Lab 模拟奇偶校验通道以及快速的实时 Matrix 配置文件和 Telegram QA 通道。实时通道使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭据租约。当您想要完整的 Matrix
  传输、媒体和 E2EE 清单时，请使用
  `matrix_profile=all` 和 `matrix_shards=true` 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公共
  `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用
  可重用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意的：保持真实的 npm 发布路径简短、
  确定性且以制品为中心，而较慢的实时检查则保留在自己的通道中，以免它们拖延或阻止发布
- 包含机密信息的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行调度，以便工作流逻辑和
  机密信息保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整的提交 SHA，只要解析出的提交可从 OpenClaw 分支或发布标签访问
- `OpenClaw NPM Release` 仅验证预检也接受当前的
  完整 40 字符工作流分支提交 SHA，而无需推送标签
- 该 SHA 路径仅用于验证，不能提升为真正的发布
- 在 SHA 模式下，工作流仅为
  包元数据检查合成 `v<package.json version>`；真正的发布仍需要真正的发布标签
- 这两个工作流都将真正的发布和提升路径保留在 GitHub 托管的
  运行器上，而非变异的验证路径可以使用更大的
  Blacksmith Linux 运行器
- 该工作流使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流机密运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 发布预检不再等待单独的发布检查通道
- 在本地标记发布候选版本之前，请运行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。该辅助工具
  按顺序运行快速发布防护、插件 npm/ClawHub 发布检查、构建、
  UI 构建和 `release:openclaw:npm:check`，以便在 GitHub 发布工作流开始之前捕获常见的
  阻止批准的错误。
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- npm 发布后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以验证已发布的注册表
  在新的临时前缀中的安装路径
- 在 beta 版本发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live` 以使用共享租用的 Telegram 凭证池，针对已发布的 Telegram 包验证已安装包的 npm、Telegram 设置以及真实的 Telegram 端到端 (E2E) 测试。本地维护者的临时一次性操作可以省略 Convex 变量，并直接传递三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭证。
- 要从维护者机器运行完整的发布后 beta 版冒烟测试，请使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助工具运行 Parallels npm 更新/新目标验证，调度 `NPM Telegram Beta E2E`，轮询确切的工作流运行，下载构建产物，并打印 Telegram 报告。
- 维护者可以通过手动 `NPM Telegram Beta E2E` 工作流在 GitHub Actions 中运行相同的发布后检查。该工作流被有意设计为仅手动触发，不会在每次合并时运行。
- 维护者发布自动化现在使用预检后升级 (preflight-then-promote) 机制：
  - 真实的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真实的 npm 发布必须从与成功预检运行相同的 `main` 或 `release/YYYY.M.D` 分支进行调度
  - stable npm 版本发布默认到 `beta`
  - stable npm 发布可以通过工作流输入显式指定目标为 `latest`
  - 基于令牌的 npm dist-tag 修改现在位于 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` 中，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而源代码仓库保留仅限 OIDC 的发布方式
  - public `macOS Release` 仅用于验证；当标签仅存在于发布分支上但工作流是从 `main` 调度时，请设置 `public_release_branch=release/YYYY.M.D`
  - 真实的 macOS 发布必须通过成功的 macOS `preflight_run_id` 和 `validate_run_id`
  - 实际发布路径会提升已准备好的制品，而不是重新构建它们
- 对于 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证器还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以免发布修正版本在基础稳定版本上静默遗留旧的全局安装
- 除非压缩包同时包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，否则 npm 发布预检将失败关闭，这样我们就不会再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的插件入口点和包元数据是否存在于已安装的注册表布局中。如果发布版本缺少插件运行时负载，则无法通过发布后验证，也无法被提升到 `latest`。
- `pnpm test:install:smoke` 还对候选更新压缩包强制执行 npm pack `unpackedSize` 预算，以便安装程序 e2e 在发布发布路径之前捕获意外的包膨胀
- 如果发布工作涉及 CI 规划、扩展时间清单或扩展测试矩阵，请在批准之前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查规划器拥有的 `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明描述过时的 CI 布局
- 稳定 macOS 版本的就绪状态还包括更新程序方面：
  - GitHub 版本最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - `main` 上的 `appcast.xml` 必须在发布后指向新的稳定 zip 包；macOS 发布工作流会自动提交它，或者在直接推送被阻止时打开 appcast PR
  - 打包的应用程序必须保持非调试 bundle id、非空的 Sparkle feed URL，以及该发布版本不低于规范 Sparkle 构建下限的 `CFBundleVersion`

## 发布测试框

`Full Release Validation` 是操作员从一个入口点启动所有预发布测试的方式。对于快速移动分支上的固定提交证明，请使用该辅助工具，以便每个子工作流都从固定在目标 SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助工具推送 `release-ci/<sha>-...`，从该分支使用 `ref=<sha>` 分派 `Full Release Validation`，验证每个子工作流 `headSha` 与目标匹配，然后删除临时分支。这避免了意外证明较新的 `main` 子运行。

对于发布分支或标记验证，请从受信任的 `main` 工作流引用运行它，并将发布分支或标记作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

该工作流解析目标引用，使用 `target_ref=<release-ref>` 手动调度 `CI`，调度 `OpenClaw Release Checks`，为面向包的检查准备父 `release-package-under-test`Telegram 构件，并在使用 `release_profile=full` 配合 `rerun_group=all` 时或设置了 `release_package_spec` 或 `npm_telegram_package_spec`OpenClawDockerTelegramMatrixTelegram 时，调度独立的包 Telegram E2E。`OpenClaw Release Checks` 随后会展开安装冒烟测试、跨操作系统发布检查、在启用 soak 时的实时/E2E Docker 发布路径覆盖、包含 Telegram 包 QA 的包验收、QA Lab 一致性、实时 Matrix 以及实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功时，完整运行才被视为可接受。在完整/全量模式下，`npm_telegram` 子作业也必须成功；在非完整/全量模式下，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则将跳过它。最终验证摘要包含每个子运行的最慢作业表，因此发布经理无需下载日志即可查看当前的关键路径。有关完整阶段矩阵、确切的工作流作业名称、稳定版与完整配置文件的差异、构件以及重点重新运行句柄，请参阅[完整发布验证](/zh/reference/full-release-validation)。子工作流是从运行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任引用调度的，该引用指向较旧的发布分支或标签。没有单独的完整发布验证 workflow-ref 输入；通过选择工作流运行引用来选择受信任框架。对于移动 `main` 时的确切提交证明，请勿使用 `--ref main -f ref=<sha>`；原始提交 SHA 不能作为工作流调度引用，因此请使用 `pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供商的覆盖范围：

- `minimum`：针对版本发布至关重要的最快 OpenAI/core 直连和 Docker 路径
- `stable`：最低要求加上稳定的提供商/后端覆盖范围，用于发布批准
- `full`：稳定版本加上广泛的咨询性提供商/媒体覆盖范围

当阻碍发布的测试线（lanes）状态为绿色，并且希望在正式发布前进行详尽的 live/E2E、Docker 发布路径以及有界的已发布升级幸存者扫描（sweep）时，请将 `run_release_soak=true` 与 `stable` 结合使用。该扫描覆盖最新的四个稳定版本包，加上固定的 `2026.4.23` 和 `2026.5.2` 基线以及较旧的 `2026.4.15` 覆盖范围，其中重复的基线已被移除，并且每个基线被分片到自己的 Docker 运行器作业中。`full` 隐含 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流引用（workflow ref）将目标引用解析一次为 `release-package-under-test`，并在浸泡运行（soak runs）期间在跨操作系统、包验收和发布路径 Docker 检查中重用该产物。这使得所有面向包的测试箱都使用相同的字节，并避免重复的包构建。当 beta 版本已在 npm 上时，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便发布检查下载已发布的包一次，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨操作系统、包验收、发布路径 Docker 和包 Telegram 线路中重用该产物。当设置了 repo/org 变量时，跨操作系统 OpenAI 安装冒烟测试使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为该线路旨在验证包安装、新手引导、网关启动和一次实时代理轮次，而不是对最慢的默认模型进行基准测试。更广泛的实时提供商矩阵仍然是特定于模型的覆盖范围所在。

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

在进行针对性修复后的首次重新运行时，不要使用完整的 umbrella（总控流程）。如果某个 box 失败，请针对下一次验证使用失败的子工作流、作业、Docker 通道、package 配置文件、模型提供商或 QA 通道。只有当修复内容改变了共享的发布编排，或者导致之前所有 box 的证据失效时，才再次运行完整的 umbrella。Umbrella 的最终验证者会重新检查记录的子工作流运行 ID，因此在子工作流成功重新运行后，只需重新运行失败的 `Verify full validation` 父作业。

对于有界的恢复，请将 `rerun_group` 传递给 umbrella。`all` 是真正的发布候选运行，`ci` 仅运行正常的 CI 子项，`plugin-prerelease` 仅运行仅发布的插件子项，`release-checks` 运行每个发布 box，而更窄的发布组是 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。针对性的 `npm-telegram` 重新运行需要 `release_package_spec` 或 `npm_telegram_package_spec`；带有 `release_profile=full` 的完整/所有运行使用 release-checks 包工件。针对性的跨 OS 重新运行可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或其他 OS/套件过滤器。QA release-check 失败仅供参考，但标准运行时 OpenClaw 覆盖率门控除外，当所需的 OpenClaw 动态工具在标准层摘要中发生漂移或消失时，该门控会阻止发布验证。

### Vitest

Vitest 测试箱是手动 `CI` 子工作流。手动 CI 故意绕过变更范围限制，并为发布候选版本强制运行正常测试图：Linux Node 分片、bundled-plugin 分片、插件和渠道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n。

使用此测试箱来回答“源代码树是否通过了完整的正常测试套件？” 这与发布路径产品验证不同。需要保留的证据：

- 显示已调度 `CI` 运行 URL 的 `Full Release Validation` 摘要
- 在精确的目标 SHA 上 `CI` 运行显示绿色（通过）
- 在调查回归问题时，来自 CI 作业的失败或缓慢的分片名称
- 当运行需要性能分析时，Vitest 计时产物，例如 `.artifacts/vitest-shard-timings.json`

仅当发布需要确定性的正常 CI 而不需要 Docker、QA Lab、live、跨操作系统或打包测试箱时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 测试箱位于 `OpenClaw Release Checks` 到 `openclaw-live-and-e2e-checks-reusable.yml` 之间，此外还包括发布模式的 `install-smoke` 工作流。它通过打包的 Docker 环境而不仅仅是源码级测试来验证发布候选版本。

发布 Docker 覆盖范围包括：

- 启用缓慢的 Bun 全局安装冒烟测试的完整安装冒烟测试
- 通过目标 SHA 进行根 Dockerfile 冒烟镜像准备/重用，包含 QR、root/gateway 以及 installer/Bun 冒烟作业作为独立的 install-smoke 分片运行
- 仓库 E2E 渠道
- release-path Docker 块：Docker`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 根据要求，在 `plugins-runtime-services` 块内提供 OpenWebUI 覆盖率
- 拆分打包的插件安装/卸载渠道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时，包括 live/E2E 提供商套件和 Docker 实时模型覆盖率

在重新运行之前使用 Docker 制品。release-path 调度器会上传
Docker`.artifacts/docker-tests/`，其中包含渠道日志、`summary.json`、`failures.json`、
阶段计时、调度器计划 JSON 和重新运行命令。为了进行有针对性的恢复，
请在可重用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是
重新运行所有发布块。生成的重新运行命令在可用时包含先前的
`package_artifact_run_id`Docker 和准备好的 Docker 镜像输入，因此
失败的渠道可以重用同一个 tarball 和 GHCR 镜像。

### QA 实验室

QA 实验室也是 `OpenClaw Release Checks`Docker 的一部分。它是智能体
行为和渠道级发布关卡，与 Vitest 和 Docker
打包机制是分开的。

发布 QA 实验室覆盖率包括：

- 使用智能体奇偶校验包，将 OpenAI 候选渠道与 Opus 4.6
  基线进行比较的 mock 奇偶校验渠道
- 使用 Matrix`qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭证租约的实时 Telegram QA 渠道
- 当发布遥测需要明确的本地证明时，使用 `pnpm qa:otel:smoke`、`pnpm qa:otel:collector-smoke`、
  `pnpm qa:prometheus:smoke` 或
  `pnpm qa:observability:smoke`

使用此框来回答“发布在 QA 场景和实时渠道流中的行为是否正确？”在批准发布时，请保留 parity、Matrix 和 Telegram 渠道的工件 URL。完整的 Matrix 覆盖范围仍可作为手动分片的 QA-Lab 运行使用，而不是默认的 release-critical 渠道。

### Package

Package 框是可安装产品的关卡。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 提供支持。解析器将候选者规范化为 Docker E2E 使用的 `package-under-test` tarball，验证包清单，记录包版本和 SHA-256，并将 workflow harness ref 与包源 ref 分开保存。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布版本
- `source=ref`：打包受信任的 `package_ref` 分支、标签或完整提交 SHA，并使用所选的 `workflow_ref` harness
- `source=url`：下载具有所需 `package_sha256` 的公共 HTTPS `.tgz`；URL 凭据、非默认 HTTPS 端口、私有/内部/专用主机名或解析地址以及不安全的重定向将被拒绝
- `source=trusted-url`：从 `.github/package-trusted-sources.json` 中的命名策略下载具有所需 `package_sha256` 和 `trusted_source_id` 的 HTTPS `.tgz`；将此用于维护者拥有的企业镜像或私有包仓库，而不是向 `source=url` 添加输入级私有网络绕过
- `source=artifact`：重用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact`（即准备好的发布包工件）、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update` 和 `telegram_mode=mock-openai`ClawHubTelegram 运行包验收。包验收针对同一个解析的 tarball 保持迁移、更新、已配置身份验证更新重启、实时 ClawHub 技能安装、过时插件依赖清理、离线索件 fixture、插件更新以及 Telegram 包 QA 的测试。阻塞发布检查使用默认的最新已发布包基线；`run_release_soak=true` 或 `release_profile=full`npm 会扩展到从 `2026.4.23` 到 `latest` 的每个稳定 npm 已发布基线以及已报告问题的 fixture。对于已发布的候选版本，请结合 `source=npm` 使用包验收；对于发布前基于 SHA 的本地 npm tarball，请使用 `source=ref`npm；对于维护者拥有的企业/私有镜像，请使用 `source=trusted-url`；对于由另一个 GitHub Actions 运行上传的准备好的 tarball，请使用 `source=artifact`GitHubGitHub。它是大多数以前需要 Parallels 的包/更新覆盖范围的 GitHub 原生替代品。跨操作系统发布检查对于特定于操作系统的入门引导、安装程序和平台行为仍然很重要，但包/更新产品验证应优先使用包验收。

更新和插件验证的标准检查清单是[测试更新和插件](/zh/help/testing-updates-pluginsDocker)。在决定哪个本地、Docker、包验收或发布检查通道来证明插件安装/更新、doctor 清理或已发布包迁移变更时使用它。从每个稳定的 `2026.4.23+` 包进行详尽的已发布更新迁移是一个单独的手动 `Update Migration` 工作流，不属于完整发布 CI 的一部分。

传统包验收的宽松策略是故意设定了时间限制的。通过 `2026.4.25` 的包可以使用兼容性路径来解决已发布到 npm 的元数据缺口：tarball 中缺失的私有 QA 清单条目、缺失的 `gateway install --wrapper`、从 tarball 派生的 git fixture 中缺失的补丁文件、缺失的持久化 `update.channel`、传统插件安装记录位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 包可能会对已附带的本机构建元数据戳记文件发出警告。后续的包必须满足现代包合约；同样的缺口将导致发布验证失败。

当发布问题涉及实际可安装的包时，请使用更广泛的包验收配置文件：

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

- `smoke`：快速包安装/渠道/代理、网关网络和配置重新加载通道
- `package`：安装/更新/重启/插件包合约加上实时 ClawHub 技能安装证明；这是发布检查的默认设置
- `product`：`package` 加上 MCP 渠道、cron/子代理清理、OpenAI 网络搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径块
- `custom`：用于针对性重运行的精确 `docker_lanes` 列表

对于包候选版本的 Telegram 证明，请在包验收上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。工作流将解析后的 `package-under-test` tarball 传递给 Telegram 通道；独立的 Telegram 工作流仍接受已发布的 npm 规范以进行发布后检查。

## 发布发布自动化

`OpenClaw Release Publish` 是正常的可变发布入口点。它按照发布所需的顺序编排可信发布者工作流：

1. 检出发布标签并解析其提交 SHA。
2. 验证该标签是否可以从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的范围和 SHA 调度 `Plugin ClawHub Release`。
6. 使用发布标签、npm dist-tag 和
   已保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`npm。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Stable 发布到默认的 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Stable 直接提升到 `latest` 是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅针对针对性的修复或重新发布工作，使用较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。当 `publish_openclaw_npm=true` 时，`OpenClaw Release Publish` 会拒绝
`plugin_publish_scope=selected`，因此核心包
不能在没有每个可发布的官方插件的情况下发布，包括
`@openclaw/diffs-language-pack`。对于选定的插件修复，请设置
`publish_openclaw_npm=false` 并带有 `plugin_publish_scope=selected` 和
`plugins=@openclaw/name`，或直接调度子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受这些操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前的
  完整 40 个字符的工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅用于验证/构建/打包，`false` 表示
  真实的发布路径
- `preflight_run_id`：在真实发布路径上必需，以便工作流重用
  来自成功预检运行的准备好的 tarball
- `npm_dist_tag`npm：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受这些操作员控制的输入：

- `tag`：必需的发布标签；必须已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 预检查运行 ID；
  当 `publish_openclaw_npm=true` 时必需
- `npm_dist_tag`：OpenClaw 包的 npmOpenClaw 目标标签
- `plugin_publish_scope`：默认为 `all-publishable`；仅当使用 `publish_openclaw_npm=false` 进行
  专注的仅插件修复工作时使用 `selected`
- `plugins`：当 `plugin_publish_scope=selected` 时，逗号分隔的
  `@openclaw/*` 包名称
- `publish_openclaw_npm`：默认为 `true`；仅当将工作流
  用作仅插件修复编排器时设置 `false`
- `wait_for_clawhub`：默认为 `false`，因此 npm 可用性不会被
  ClawHub 侧车阻止；仅当工作流完成必须包含
  ClawHub 完成时设置 `true`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`：用于验证的分支、标签或完整提交 SHA。包含机密的检查
  要求解析的提交必须可从 OpenClaw 分支或
  发布标签访问。
- `run_release_soak`：选择在稳定/默认发布检查中进行详尽的 live/E2E、Docker 发布路径以及
  自始以来的升级幸存者 soak 测试。它被 `release_profile=full` 强制开启。

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当 `preflight_only=true` 时才允许
  输入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际的发布路径必须使用与预检期间相同的 `npm_dist_tag`；工作流会在继续发布之前验证该元数据

## 稳定版 npm 发布序列

在创建稳定版 npm 发布时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交 SHA 进行仅验证的预检工作流程空运行（dry run）
2. 对于正常的先 beta 后稳定流程，请选择 `npm_dist_tag=beta`；或者仅当您有意进行直接稳定发布时，才选择 `latest`
3. 当您需要通过一个手动工作流获得正常的 CI 以及实时的提示缓存、Docker、QA Lab、Matrix 和 Telegram 覆盖时，在发布分支、发布标签或完整提交 SHA 上运行 `Full Release Validation`
4. 如果您只需要确定性的正常测试图，请在发布引用（release ref）上运行手动的 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会在提升 npm ClawHub 包之前，将外部化的插件发布到 OpenClaw 和 npm
7. 如果发布落脚于 `beta`，请使用 `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` 工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果发布有意直接发布到 `latest` 并且 `beta` 应紧随相同的稳定构建，请使用相同的发布工作流将两个 dist-tags 指向该稳定版本，或者让其定时的自我修复同步稍后移动 `beta`

dist-tag 的变更位于发布账本（release ledger）仓库中，因为它仍需要 `NPM_TOKEN`，而源仓库保留仅限 OIDC 的发布方式。

这使得直接发布路径和 Beta 优先升级路径都有据可查，并对操作者可见。

如果维护者必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话中运行任何 1Password CLI (npmCLI`op`) 命令。不要直接从主代理 shell 调用 `op`；将其保留在 tmux 中可以使提示、警报和 OTP 处理可见，并防止重复的主机警报。

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

维护者使用 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中的私有发布文档作为实际的运行手册。

## 相关

- [发布渠道](/zh/install/development-channels)
