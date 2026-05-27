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
- 当您在发布工作进行期间需要包候选版本的侧渠道验证时，请运行手动 `Package Acceptance` 工作流。针对 `openclaw@beta`、`openclaw@latest` 或确切的发布版本，请使用 `source=npm`；使用 `source=ref` 通过当前的 `workflow_ref` 测试框架打包受信任的 `package_ref` 分支/标签/SHA；使用 `source=url` 处理具有必需 SHA-256 和严格公共 URL 策略的公共 HTTPS 压缩包；使用 `source=trusted-url` 处理使用必需 `trusted_source_id` 和 SHA-256 的命名受信任源策略；或使用 `source=artifact` 处理由另一个 GitHub Actions 运行上传的压缩包。该工作流将候选版本解析为 `package-under-test`，针对该压缩包重用 Docker E2E 发布调度程序，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一压缩包运行 Telegram QA。当选定的 Docker 渠道包含 `published-upgrade-survivor` 时，包工件即为候选版本，而 `published_upgrade_survivor_baseline` 用于选择已发布基线。`update-restart-auth` 将候选包同时用作已安装的 CLI 和被测包，从而测试候选更新命令的受管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用配置文件：
  - `smoke`：安装/渠道/代理、网关网络和配置重载通道
  - `package`：不包含 OpenWebUI 或实时 ClawHub 的原生包/更新/重启/插件通道
  - `product`：包配置文件以及 MCP 渠道、cron/子代理清理、
    OpenAI 网络搜索和 OpenWebUI
  - `full`Docker：Docker 的 release-path chunks 包含 OpenWebUI
  - `custom`：精确选择 `docker_lanes` 以进行有针对性的重新运行
- 当您仅需要对发布候选版本进行完整的常规 CI 覆盖时，请直接运行手动 `CI` 工作流。手动 CI 调度会绕过变更范围限定，并强制运行 Linux Node 分片、捆绑插件分片、插件和渠道合约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建工件冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n 渠道。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器运行
  QA-lab，并验证追踪、指标和日志导出，以及有界的追踪属性和内容/标识符脱敏，而无需
  Opik、Langfuse 或其他外部收集器。
- 验证受保护的 Prometheus 抓取时运行 `pnpm qa:prometheus:smoke`。
  它运行 QA-lab，拒绝未经身份验证的抓取，并验证
  发布关键的指标系列不包含提示内容、原始标识符、
  身份验证令牌和本地路径。
- 当您想要连续运行源代码检出版本的 OpenTelemetry 和 Prometheus 冒烟通道时，运行 `pnpm qa:observability:smoke`。
- 在每个标记发布之前运行 `pnpm release:check`
- `OpenClaw NPM Release` preflight 在打包 npm npmnpm tarball 之前生成依赖发布证据。
  npm advisory 漏洞关卡会阻止发布。传递清单风险、依赖所有权/安装
  表面以及依赖变更报告仅作为发布证据。
  依赖变更报告将发布候选版本与先前可访问的发布标记进行比较。
- preflight 将依赖证据上传为
  `openclaw-release-dependency-evidence-<tag>`，并将其嵌入到
  准备好的 npm npm preflight artifact 中的 `dependency-evidence/` 下。实际
  发布路径复用该 preflight artifact，然后将相同的证据以 `openclaw-<version>-dependency-evidence.zip` 形式附加到 GitHub release。
- 在标签存在之后，运行 `OpenClaw Release Publish` 以执行可变发布序列。从 `release/YYYY.M.D` 分发它（或者在发布可从 main 分支到达的标签时从 `main` 分发），传入发布标签和成功的 OpenClaw npm `preflight_run_id`，并保留默认的插件发布范围 `all-publishable`npm，除非你有意进行针对性的修复。该工作流会对插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布进行序列化，以确保核心包不会在其外部化插件之前发布。
- 发布检查现在在一个单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 还会在发布批准之前运行 QA Lab 模拟对等通道以及快速实况 Matrix 配置文件和 Telegram QA 通道。实况通道使用 `qa-live-shared` 环境；Telegram 也使用 Convex CI 凭证租约。当你需要完整的 Matrix 传输、媒体和 E2EE 清单并行运行时，请使用 `matrix_profile=all` 和 `matrix_shards=true` 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公共 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用
  可重用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意为之：保持真实的 npm 发布路径简短、确定性且专注于产物，而较慢的实况检查则留在它们自己的通道中，以免拖延或阻塞发布
- 带有密钥的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行分发，以便工作流逻辑和密钥保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整的提交 SHA，只要解析出的提交可以从 OpenClaw 分支或发布标签到达
- `OpenClaw NPM Release` validation-only preflight 也接受当前的
  完整 40 字符工作流分支提交 SHA，而无需推送标签
- 该 SHA 路径仅用于验证，不能提升为真正的发布
- 在 SHA 模式下，工作流仅针对包元数据检查合成 `v<package.json version>`；真正的发布仍然需要真正的发布标签
- 这两个工作流将真正的发布和提升路径保留在 GitHub 托管的
  运行器上，而非变更的验证路径可以使用更大的
  Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  并同时使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布预检不再等待单独的发布检查通道
- 在本地标记发布候选版本之前，请运行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。该辅助工具
  按照能在 npm 发布工作流开始之前捕获常见
  阻碍批准错误的顺序，运行快速发布防护、插件 ClawHub/GitHub 发布检查、构建、
  UI 构建以及 `release:openclaw:npm:check`。
- 在批准之前，请运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的临时前缀中验证已发布的注册表
  安装路径
- 在 beta 发布之后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享租用的 Telegram 凭据池
  针对已发布的 Telegram 包验证已安装包的 新手引导、npm 设置以及真正的 Telegram E2E。
  本地维护者的临时操作可以省略 Convex 变量，并直接传递三个
  `OPENCLAW_QA_TELEGRAM_*` 环境凭据。
- 若要从维护者机器运行完整的发布后 beta 冒烟测试，请使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助脚本运行 Parallels npm 更新/新目标验证，调度 `NPM Telegram Beta E2E`，轮询确切的工作流运行，下载构建产物，并打印 Telegram 报告。
- 维护者可以通过手动 `NPM Telegram Beta E2E` 工作流在 GitHub Actions 中运行相同的发布后检查。该工作流被有意设计为仅限手动，不会在每次合并时运行。
- 维护者发布自动化现在使用先预检后推广的方式：
  - 真正的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真正的 npm 发布必须从与成功的预检运行相同的 `main` 或 `release/YYYY.M.D` 分支进行调度
  - stable npm 版本默认发布到 `beta`
  - stable npm 发布可以通过工作流输入显式指定目标为 `latest`
  - 基于令牌的 npm dist-tag 修改现在位于 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 中以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而公共仓库仅保留 OIDC 发布
  - 公共 `macOS Release` 仅用于验证；当标签仅存在于发布分支上但工作流是从 `main` 调度时，请设置 `public_release_branch=release/YYYY.M.D`
  - 真正的私有 mac 发布必须通过成功的私有 mac `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会推广准备好的构建产物，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的 stable 修正版本，发布后验证器还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以确保发布修正不会在基础 stable 有效负载上静默遗留旧的全局安装
- npm release preflight fails closed unless the tarball includes both
  npm`dist/control-ui/index.html` and a non-empty `dist/control-ui/assets/` payload
  so we do not ship an empty browser dashboard again
- 发布后验证还会检查已发布的插件入口点和
  包元数据是否存在于已安装的注册表布局中。如果发布
  的插件运行时负载缺失，该发布将无法通过发布后验证，
  且不能被提升到 `latest`。
- `pnpm test:install:smoke`npm 还会对候选更新 tarball 强制执行 npm pack `unpackedSize` 预算，
  以便安装程序 e2e 在发布发布路径之前捕获意外的打包膨胀
- 如果发布工作涉及 CI 规划、扩展时间清单或
  扩展测试矩阵，请在批准之前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查规划器拥有的
  `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明
  描述过时的 CI 布局
- Stable macOS release readiness also includes the updater surfaces:
  - the GitHub release must end up with the packaged GitHub`.zip`, `.dmg`, and `.dSYM.zip`
  - `appcast.xml` on `main`macOS must point at the new stable zip after publish; the
    private macOS publish workflow commits it automatically, or opens an appcast
    PR when direct push is blocked
  - the packaged app must keep a non-debug bundle id, a non-empty Sparkle feed
    URL, and a `CFBundleVersion` at or above the canonical Sparkle build floor
    for that release version

## Release test boxes

`Full Release Validation` is how operators kick off all pre-release tests from
one entrypoint. For a pinned commit proof on a fast-moving branch, use the
helper so every child workflow runs from a temporary branch fixed at the target
SHA:

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助脚本推送 `release-ci/<sha>-...`，使用 `ref=<sha>` 从该分支调度 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，然后删除临时分支。这可以避免意外证明较新的 `main` 子运行。

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

该工作流解析目标 ref，使用 `target_ref=<release-ref>` 分发手动 `CI`，分发 `OpenClaw Release Checks`，准备一个面向包检查的父 `release-package-under-test` 构件，并在使用 `rerun_group=all` 进行 `release_profile=full` 或设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时分发独立包 Telegram E2E。`OpenClaw Release Checks` 随后会在启用 soak（ soak）时分发安装冒烟测试、跨操作系统发布检查、实时/E2E Docker 发布路径覆盖，包含 Telegram 包 QA 的包验收、QA Lab 对等性、实时 Matrix 以及实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功时，完整运行才可接受。在完整/所有模式下，`npm_telegram` 子工作流也必须成功；在非完整/所有模式下，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则会跳过该子工作流。最终验证者摘要包含每个子运行的最慢作业表，因此发布经理无需下载日志即可查看当前的关键路径。有关完整阶段矩阵、确切的工作流作业名称、stable 与 full profile 的差异、构件和重点重新运行句柄，请参阅 [Full release validation](/zh/reference/full-release-validation)。子工作流从运行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任 ref 分发，该 ref 指向较旧的发布分支或标记。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行 ref 来选择受信任的 harness。请勿使用 `--ref main -f ref=<sha>` 对移动 `main` 进行精确提交证明；原始提交 SHA 不能作为工作流分发 ref，因此请使用 `pnpm ci:full-release --sha <sha>` 创建固定的临时分支。

使用 `release_profile` 选择实时/提供商范围：

- `minimum`OpenAIDocker：最快的发布关键 OpenAI/core live 和 Docker 路径
- `stable`：最低要求加上稳定的提供商/后端覆盖范围，用于发布批准
- `full`：稳定版加上广泛的顾问提供商/媒体覆盖范围

当阻止发布的通道状态为绿色，并且你希望在升级前进行详尽的 live/E2E、Docker 发布路径和有界的已发布升级幸存者扫描时，请将 `run_release_soak=true` 与 `stable`Docker 结合使用。该扫描覆盖最新的四个稳定版本包，加上固定的 `2026.4.23` 和 `2026.5.2` 基线，以及较旧的 `2026.4.15`Docker 覆盖范围，其中重复的基线已被移除，每个基线被分片到自己的 Docker runner 作业中。`full` 意味着 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流引用一次性将目标引用解析为 `release-package-under-test`Dockernpm，并在浸泡运行期间在跨操作系统、包验收和发布路径 Docker 检查中重用该构件。这使所有面向包的测试箱保持在相同的字节上，并避免重复的包构建。当 beta 版本已在 npm 上时，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便发布检查下载已发布的包一次，从 `dist/build-info.json`DockerTelegramOpenAI 中提取其构建源 SHA，并在跨操作系统、包验收、发布路径 Docker 和包 Telegram 通道中重用该构件。当设置了 repo/org 变量时，跨操作系统 OpenAI 安装冒烟测试使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为该通道旨在验证包安装、新手引导、网关启动和一次 live agent 轮次，而不是对最慢的默认模型进行基准测试。更广泛的 live 提供商 矩阵仍然是特定模型覆盖的地方。

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

在进行针对性修复后的第一次重跑时，请勿使用完整的 umbrella 范围。如果某个 box 失败，请使用失败的子工作流、作业、Docker 轨道、package profile、模型 提供商 或 QA 轨道进行下一次验证。仅当修复更改了共享的发布编排或使之前的所有 box 证据失效时，才再次运行完整的 umbrella。Umbrella 的最终验证器会重新检查记录的子工作流运行 ID，因此当子工作流成功重运行后，只需重运行失败的 Docker`Verify full validation` 父作业。

对于有界恢复，请将 `rerun_group` 传递给 umbrella。`all` 是真正的发布候选运行，`ci` 仅运行正常的 CI 子项，`plugin-prerelease` 仅运行仅发布插件子项，`release-checks` 运行每个发布 box，而较窄的发布组是 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。针对性的 `npm-telegram` 重运行需要 `release_package_spec` 或 `npm_telegram_package_spec`；带有 `release_profile=full` 的完整/所有运行使用 release-checks 包构件。针对性的跨操作系统重运行可以添加 `cross_os_suite_filter=windows/packaged-upgrade`OpenClaw 或其他操作系统/套件过滤器。QA release-check 失败是建议性的，除了标准运行时 工具 覆盖率门控，当所需的 OpenClaw 动态工具从标准层级摘要中漂移或消失时，该门控会阻止发布验证。

### Vitest

Vitest 盒是手动 `CI`Linux 子工作流。手动 CI 故意绕过变更范围限制，强制为发布候选项运行正常测试图：Linux Node 分片、bundled-plugin 分片、插件和渠道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n。

使用此盒来回答“源代码树是否通过了完整的正常测试套件？”这与发布路径产品验证不同。需要保留的证据：

- `Full Release Validation` 摘要，显示已调度的 `CI` 运行 URL
- 在精确的目标 SHA 上 `CI` 运行显示为绿色
- 在调查回归问题时来自 CI 作业的失败或缓慢分片名称
- Vitest 计时产物，例如 `.artifacts/vitest-shard-timings.json`，
  当运行需要性能分析时

仅当发布需要确定性的正常 CI 但不需要 Docker、QA Lab、live、跨操作系统或 package 盒时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 盒位于 `OpenClaw Release Checks` 到
`openclaw-live-and-e2e-checks-reusable.yml` 中，以及发布模式
`install-smoke` 工作流中。它通过打包的 Docker 环境而不是仅通过源代码级测试来验证发布候选项。

发布 Docker 覆盖范围包括：

- 完整安装冒烟测试，启用了缓慢的 Bun 全局安装冒烟测试
- 按目标 SHA 准备/重用根 Dockerfile 冒烟测试镜像，其中 QR、
  root/gateway 和 installer/Bun 冒烟测试作业作为单独的 install-smoke
  分片运行
- 存储库 E2E 渠道
- release-path Docker 块：Docker`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 根据要求，`plugins-runtime-services` 块内的 OpenWebUI 覆盖范围
- 拆分捆绑插件安装/卸载渠道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时的实时/E2E 提供商套件和 Docker 实时模型覆盖范围

在重新运行之前使用 Docker 构件。release-path 调度器会上传
Docker`.artifacts/docker-tests/`，其中包含渠道日志、`summary.json`、`failures.json`、
阶段计时、调度器计划 JSON 以及重新运行命令。为了进行集中恢复，
请在可重用的实时/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是
重新运行所有发布块。生成的重新运行命令包含先前的
`package_artifact_run_id`Docker 和准备好的 Docker 镜像输入（如果可用），因此
失败的渠道可以重用相同的 tar 包和 GHCR 镜像。

### QA 实验室

QA 实验室也是 `OpenClaw Release Checks`Docker 的一部分。它是代理
行为和渠道级发布关卡，独立于 Vitest 和 Docker
打包机制。

发布 QA 实验室覆盖范围包括：

- 使用代理一致性包将 OpenAI 候选渠道与 Opus 4.6
  基线进行比较的 mock 一致性渠道
- 使用 Matrix`qa-live-shared` 环境的快速实时 Matrix QA 配置
- 使用 Convex CI 凭据租约的实时 Telegram QA 渠道
- 当发布遥测需要明确的本地证明时，使用
  `pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或
  `pnpm qa:observability:smoke`

使用此框来回答“发布在 QA 场景和实时渠道流程中是否表现正确？”。在批准发布时，请保留用于 parity、Matrix 和 Telegram 渠道的构建产物 URL。完整的 Matrix 覆盖范围仍然可以通过手动分片的 QA-Lab 运行获得，而不是作为默认的关键发布渠道。

### 打包

打包框是可安装产品的关卡。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 提供支持。解析器将候选版本规范化为 Docker E2E 所使用的 `package-under-test` 压缩包，验证包清单，记录包版本和 SHA-256，并将工作流程 harness 引用与包源引用分开保存。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或精确的 OpenClaw 发布版本
- `source=ref`：使用所选的 `workflow_ref` harness 打包受信任的 `package_ref` 分支、标签或完整提交 SHA
- `source=url`：下载具有必需 `package_sha256` 的公共 HTTPS `.tgz`；URL 凭据、非默认 HTTPS 端口、私有/内部/专用主机名或解析地址，以及不安全的重定向将被拒绝
- `source=trusted-url`：从 `.github/package-trusted-sources.json` 中的命名策略下载具有必需 `package_sha256` 和 `trusted_source_id` 的 HTTPS `.tgz`；将其用于维护者拥有的企业镜像或私有包仓库，而不是向 `source=url` 添加输入级别的专用网络绕过
- `source=artifact`：重用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 使用 `source=artifact` 运行 Package Acceptance，这是已准备的发布包工件，`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、`telegram_mode=mock-openai`ClawHubTelegram。Package Acceptance 针对同一个已解析的 tarball 保留迁移、更新、配置的身份验证更新重启、实时的 ClawHub 技能安装、过时的插件依赖清理、离线插件 fixtures、插件更新以及 Telegram 包 QA。阻止发布的检查使用默认的最新已发布包基线；`run_release_soak=true` 或 `release_profile=full`npm 会扩展为从 `2026.4.23` 到 `latest` 的每个稳定 npm 已发布基线，外加报告问题的 fixtures。将 Package Acceptance 与 `source=npm` 配合使用以用于已发布的候选版本，与 `source=ref`npm 配合使用以用于发布前基于 SHA 的本地 npm tarball，与 `source=trusted-url` 配合使用以用于维护者拥有的企业/私有镜像，或与 `source=artifact`GitHubGitHub 配合使用以用于由另一个 GitHub Actions 运行上传的已准备 tarball。它是以前需要 Parallels 的大部分包/更新覆盖范围的 GitHub 原生替代品。跨操作系统发布检查对于特定于操作系统的引导、安装程序和平台行为仍然很重要，但包/更新产品验证应优先使用 Package Acceptance。

更新和插件验证的权威检查清单是 [Testing updates and plugins](/zh/help/testing-updates-pluginsDocker)。在决定哪个本地、Docker、Package Acceptance 或发布检查通道证明插件安装/更新、doctor 清理或已发布包迁移更改时，请使用它。从每个稳定的 `2026.4.23+` 包进行详尽的已发布更新迁移是一个单独的手动 `Update Migration` 工作流，不是完整发布 CI 的一部分。

传统包验收的宽容期是有意设置的时间限制。`2026.4.25` 及之前的包可能会针对已发布到 npm 的元数据缺口使用兼容性路径：压缩包中缺失的私有 QA 清单条目、缺失的 `gateway install --wrapper`、从压缩包衍生的 git 夹具中缺失的补丁文件、缺失的持久化 `update.channel`、传统插件安装记录位置、缺失的 marketplace 安装记录持久化，以及在 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 包可能会针对已附带的本机构建元数据戳记文件发出警告。后续的包必须满足现代包合约；同样的缺口将导致发布验证失败。

当发布问题涉及实际的可安装包时，请使用更广泛的包验收配置文件：

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
- `package`：安装/更新/重启/插件包合约以及实时的 ClawHub 技能安装证明；这是发布检查的默认设置
- `product`：`package` 加上 MCP 渠道、cron/子代理清理、OpenAI 网络搜索以及 OpenWebUI
- `full`：包含 OpenWebUI 的 Docker 发布路径片段
- `custom`：用于针对性重新运行的精确 `docker_lanes` 列表

对于包候选 Telegram 证明，请在包验收上启用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier`。工作流会将解析出的 `package-under-test` 压缩包传递到 Telegram 通道；独立的 Telegram 工作流仍然接受已发布的 npm 规范以进行发布后检查。

## 发布发布自动化

`OpenClaw Release Publish` 是正常的变更性发布入口。它按照发布所需的顺序编排可信发布者工作流：

1. 检出发布标签并解析其提交 SHA。
2. 验证该标签是否可从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的作用域和 SHA 调度 `Plugin ClawHub Release`。
6. 使用发布标签、npm dist-tag 和
   保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

Beta 发布示例：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

发布到默认 beta dist-tag 的 Stable 版本：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接提升到 `latest` 的 Stable 版本是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅针对针对性的修复或重新发布工作，使用较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。
对于选定的插件修复，将 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传递给
`OpenClaw Release Publish`，或者当 OpenClaw 包绝不能发布时，直接调度子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 表示仅进行验证/构建/打包，`false` 表示
  真实的发布路径
- `preflight_run_id`：在真实发布路径上必需，以便工作流复用
  来自成功预检运行的已准备压缩包
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签；必须已存在
- `preflight_run_id`: 成功的 `OpenClaw NPM Release` 预检运行 ID；
  当 `publish_openclaw_npm=true` 时必需
- `npm_dist_tag`: npmOpenClaw 包的目标标签
- `plugin_publish_scope`: 默认为 `all-publishable`；仅
  在针对特定修复工作时使用 `selected`
- `plugins`: 当 `plugin_publish_scope=selected` 时，以逗号分隔的
  `@openclaw/*` 包名称
- `publish_openclaw_npm`: 默认为 `true`；仅当将
  工作流用作仅插件的修复编排器时才设置 `false`
- `wait_for_clawhub`: 默认为 `false`，以便 npm 可用性不会被
  ClawHub 副车（sidecar）阻塞；仅当工作流完成必须包含
  ClawHub 完成时才设置 `true`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`: 要验证的分支、标签或完整提交 SHA。包含密钥的检查
  要求解析出的提交必须可从 OpenClaw 分支或
  发布标签访问。
- `run_release_soak`: 选择加入详尽的实时/E2E、Docker 发布路径，以及
  在稳定/默认发布检查上的自始至今的升级存活 soak 测试。此选项会被
  `release_profile=full` 强制开启。

规则：

- 稳定版和修正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当 `preflight_only=true` 时才允许输入完整提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际发布路径必须使用与预检期间相同的 `npm_dist_tag`；
  工作流将在发布继续之前验证该元数据

## 稳定版 npm 发布序列

当发布稳定版 npm 时：

1. 运行带有 `preflight_only=true` 的 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的 workflow-branch 提交 SHA 进行仅验证的预检工作流试运行
2. 对于正常的 Beta 优先流程，请选择 `npm_dist_tag=beta`；或者仅在您有意进行直接稳定版发布时选择 `latest`
3. 当您希望通过一个手动工作流程获得正常的 CI 以及实时的提示缓存、Docker、QA Lab、Matrix 和 Telegram 覆盖时，请在发布分支、发布标签或完整提交 SHA 上运行 `Full Release Validation`
4. 如果您仅需要确定性的正常测试图，请在发布引用上运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会将外部化插件发布到 npm 和 ClawHub，然后再升级 OpenClaw npm 包
7. 如果发布到了 `beta`，请使用私有 `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 工作流将该稳定版本从 `beta` 升级到 `latest`
8. 如果发布有意直接发布到 `latest` 并且 `beta` 应立即遵循相同的稳定构建，请使用相同的私有工作流将两个 dist-tag 指向该稳定版本，或者让其计划的自动修复同步稍后移动 `beta`

出于安全考虑，dist-tag 变更位于私有仓库中，因为它仍然需要 `NPM_TOKEN`，而公共仓库保持仅限 OIDC 发布。

这使得直接发布路径和 Beta 优先升级路径都有文档记录且对操作员可见。

如果维护者必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话内运行任何 1Password CLI (npmCLI`op`) 命令。不要直接从主代理 shell 调用 `op`；将其保留在 tmux 中可以使提示、警报和 OTP 处理变得可观察，并防止重复的主机警报。

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

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档来获取实际的运行手册。

## 相关

- [发布渠道](/zh/install/development-channels)
