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
6. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`。在标签存在之前，
   允许使用完整的 40 字符发布分支 SHA 进行仅验证的
   预检。保存成功的 `preflight_run_id`。
7. 使用 `Full Release Validation` 针对发布分支、标签或完整提交 SHA 启动所有预发布测试。这是四个大型发布测试箱的唯一手动入口点：Vitest、Docker、QA Lab 和 Package。
8. 如果验证失败，请在发布分支上修复并重新运行证明修复的最小失败文件、通道、工作流作业、包配置文件、提供商或模型允许列表。仅当更改的表面使先前的证据失效时，才重新运行完整的总体流程。
9. 对于 beta 版本，先打标签 `vYYYY.M.D-beta.N`，然后从匹配的 `release/YYYY.M.D` 分支运行 `OpenClaw Release Publish`。它会验证 `pnpm plugins:sync:check`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub，并行将所有可发布的插件包分发给 npm 和同一组 ClawHub，然后在插件 npm 发布成功后，立即使用匹配的 dist-tag 推广准备好的 OpenClaw npm 预检工件。在 OpenClaw npm 发布子任务成功后，它会从完整的匹配 `CHANGELOG.md`npm 部分创建或更新匹配的 GitHub release/prerelease 页面。发布到 npm `latest`GitHubnpm 的 Stable 版本将成为 GitHub latest release；保留在 npm `beta`GitHub 上的 stable 维护版本则使用 GitHub `latest=false`ClawHubOpenClawnpmClawHubOpenClawnpmClawHub 创建。在 OpenClaw npm 发布期间，ClawHub 发布可能仍在运行，但发布发布工作流会立即打印子运行 ID。默认情况下，它在分发后不会等待 ClawHub，因此 OpenClaw npm 的可用性不会因为较慢的 ClawHub 审批或注册表工作而被阻塞；如果 ClawHub 必须阻塞工作流完成，请设置 `wait_for_clawhub=true`ClawHubClawHubCLI。ClawHub 路径会重试临时的 CLI 依赖安装失败，即使某个预览单元格不稳定也会发布通过预览的插件，并以每个预期的插件版本的注册表验证结束，以便部分发布保持可见和可重试。发布后，对已发布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果推送或发布的预发布版本需要修复，请切出下一个匹配的预发布版本号；不要删除或重写旧的预发布版本。
10. 对于稳定版，仅在经过审查的 Beta 版或候选发布版具备
    所需的验证证据后继续。稳定版 npm 发布也通过
    `OpenClaw Release Publish` 进行，通过
    `preflight_run_id` 重用成功的预检产物；稳定版 macOS 发布准备
    还需要 `main` 上打包好的 `.zip`、`.dmg`、`.dSYM.zip` 和更新的 `appcast.xml`。
    私有 macOS 发布工作流在发布资源验证通过后，会自动将已签名的 appcast 发布到公共
    `main`；如果分支保护阻止了
    直接推送，它会打开或更新 appcast PR。
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
- 在发布审批之前运行手动 `Full Release Validation` 工作流，以便从一个入口点启动所有预发布测试框。它接受分支、标签或完整的提交 SHA，调度手动 `CI`，并为安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道调度 `OpenClaw Release Checks`MatrixTelegramDocker。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径浸泡测试保留在 `run_release_soak=true` 之后；`release_profile=full` 强制开启浸泡测试。使用 `release_profile=full` 和 `rerun_group=all`Telegram 时，它还会针对发布检查中的 `release-package-under-test` 产物运行包 Telegram E2E。发布后提供 `npm_telegram_package_spec`Telegramnpm，当相同的 Telegram E2E 也需要证明已发布的 npm 包时。发布后提供 `package_acceptance_package_spec`npm，当包验收应针对已发布的 npm 包（而非基于 SHA 构建的产物）运行其包/更新矩阵时。提供 `evidence_package_spec`npmTelegram，当私有证据报告需要证明验证与已发布的 npm 包匹配，而不强制运行 Telegram E2E 时。
  示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当您希望在发布工作继续时为软件包候选版本提供侧渠道验证时，请运行手动 `Package Acceptance` 工作流。使用 `source=npm` 表示 `openclaw@beta`、`openclaw@latest` 或确切的发布版本；使用 `source=ref` 打包受信任的 `package_ref` 分支/标签/SHA 以及当前的 `workflow_ref` 测试工具；使用 `source=url` 处理具有必需 SHA-256 的 HTTPS tarball；或使用 `source=artifact` 处理由另一个 GitHub Actions 运行上传的 tarball。该工作流将候选版本解析为 `package-under-test`，针对该 tarball 复用 Docker E2E 发布调度程序，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 对同一 tarball 运行 Telegram QA。当所选 Docker 渠道包含 `published-upgrade-survivor` 时，软件包产物即为候选版本，而 `published_upgrade_survivor_baseline` 选择已发布的基线。`update-restart-auth` 将候选软件包同时用作已安装的 CLI 和被测软件包，从而执行候选更新命令的托管重启路径。示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai` 常用配置：
  - `smoke`：安装/渠道/代理、网关网络和配置重载渠道
  - `package`：不包含 OpenWebUI 或实时 ClawHub 的原生产物软件包/更新/重启/插件渠道
  - `product`：软件包配置以及 MCP 渠道、cron/子代理清理、OpenAI 网络搜索和 OpenWebUI
  - `full`：包含 OpenWebUI 的 Docker 发布路径块
  - `custom`：用于 focused rerun 的精确 `docker_lanes` 选择
- 当您只需要为发布候选版本提供完整的常规 CI 覆盖时，直接运行手动 `CI`Linux 工作流。手动 CI 调度会绕过变更范围界定，并强制执行 Linux Node 分片、bundled-plugin 分片、渠道 契约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n 渠道。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 在验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器对 QA-lab 进行测试，并验证导出的 trace span 名称、边界属性以及内容/标识符编辑，而无需 Opik、Langfuse 或其他外部收集器。
- 在每次打标签发布之前运行 `pnpm release:check`
- 在标签存在后，运行 `OpenClaw Release Publish` 以执行变更性的发布序列。从 `release/YYYY.M.D` 调度（或者在发布 main-reachable 标签时从 `main` 调度），传入发布标签和成功的 OpenClaw npm `preflight_run_id`，并保留默认的插件发布范围 `all-publishable`，除非您有意进行针对性的修复。该工作流会对插件 npm 发布、插件 ClawHub 发布和 OpenClaw npm 发布进行序列化，以确保核心包不会在其外部化插件之前发布。
- 发布检查现在在单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` 也会在发布批准之前运行 QA Lab 模拟对等通道以及快速的实时 Matrix 配置文件和 Telegram QA 通道。实时通道使用 `qa-live-shared` 环境；Telegram 还使用 Convex CI 凭证租约。当您需要完整的 Matrix 传输、媒体和 E2EE 清单并行运行时，请使用 `matrix_profile=all` 和 `matrix_shards=true` 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公共 `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用可重用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意的：保持真正的 npm 发布路径简短、确定性且专注于产物，而较慢的实时检查则保留在它们自己的通道中，以免它们延迟或阻止发布
- 带有密钥的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行调度，以便工作流逻辑和密钥保持受控
- `OpenClaw Release Checks` 接受分支、标签或完整的提交 SHA，只要解析出的提交可从 OpenClaw 分支或发布标签访问
- `OpenClaw NPM Release` 仅验证预检也接受当前的完整 40 字符工作流分支提交 SHA，而无需推送标签
- 该 SHA 路径仅用于验证，不能提升为真正的发布
- 在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；真正的发布仍然需要真正的发布标签
- 这两个工作流都将真正的发布和提升路径保留在 GitHub 托管的运行器上，而非变更的验证路径可以使用更大的
  Blacksmith Linux 运行器
- 该工作流使用 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
- npm 发布预检不再等待单独的发布检查通道
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以在新的临时前缀中
  验证已发布注册表的安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  以使用共享租用的 Telegram 凭证池，
  根据已发布的 Telegram 包验证
  已安装包的 新手引导、npm 设置
  以及真实的 Telegram E2E。
  本地维护人员的临时操作可以省略 Convex 变量，
  并直接传递三个 `OPENCLAW_QA_TELEGRAM_*` 环境凭证。
- 要在维护者机器上运行完整的发布后 beta 冒烟测试，请使用 `pnpm release:beta-smoke -- --beta betaN`。
  该辅助脚本运行 Parallels npm 更新/新目标验证，
  触发 `NPM Telegram Beta E2E`，轮询确切的工作流运行，
  下载构建产物并打印 Telegram 报告。
- 维护人员可以通过手动 `NPM Telegram Beta E2E` 工作流
  在 GitHub Actions 中运行相同的发布后检查。
  该操作被设计为仅限手动，不会在每次合并时运行。
- 维护者发布自动化现在使用先预检后升级（preflight-then-promote）的方式：
  - 真实的 npm publish 必须通过成功的 npm `preflight_run_id`
  - 真实的 npm publish 必须从成功的预检运行
    所在的 `main` 或 `release/YYYY.M.D` 分支触发
  - stable npm releases 默认发布到 `beta`
  - stable npm publish 可以通过工作流输入
    显式指定 `latest` 作为目标
  - 基于令牌的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` 中
    以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，
    而公共仓库则保持仅限 OIDC 发布
  - public `macOS Release` 仅用于验证；当标签仅存在于发布分支上，但工作流是从 `main` 调度时，设置 `public_release_branch=release/YYYY.M.D`
  - 真正的私有 mac 发布必须通过成功的私有 mac `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会提升准备好的构件，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定版修正发布，发布后验证程序还会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，以确保发布修正不会在基础稳定版负载上悄悄遗留旧的全局安装
- npm 发布前检查会失败关闭，除非压缩包包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 负载，这样我们就不会再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的插件入口点和包元数据是否存在于已安装的注册表布局中。如果发布缺少插件运行时负载，则无法通过发布后验证程序，也不能被提升到 `latest`。
- `pnpm test:install:smoke` 还会对候选更新压缩包强制执行 npm pack `unpackedSize` 预算，以便安装程序 e2e 在发布发布路径之前捕获意外的 pack 膨胀
- 如果发布工作涉及 CI 规划、扩展时间清单或扩展测试矩阵，请在批准之前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查规划器拥有的 `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明描述过时的 CI 布局
- 稳定版 macOS 发布准备就绪还包括更新程序表面：
  - GitHub 发布最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - 发布后，`appcast.xml` 上的 `main`macOS 必须指向新的 stable zip；私有 macOS 发布工作流会自动提交它，或在直接推送被阻止时打开一个 appcast PR
  - 打包后的应用必须保留非调试的 bundle id、非空的 Sparkle feed URL，以及一个 `CFBundleVersion`，该版本必须等于或高于该发布版本的规范 Sparkle 构建基线

## 发布测试盒

`Full Release Validation` 是操作员从一个入口启动所有预发布测试的方式。对于快速移动分支上的固定提交证明，请使用该辅助工具，以便每个子工作流都从固定为目标 SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助工具会推送 `release-ci/<sha>-...`，使用 `ref=<sha>` 从该分支调度 `Full Release Validation`，验证每个子工作流的 `headSha` 是否与目标匹配，然后删除临时分支。这可以避免意外证明较新的 `main` 子运行。

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

该工作流解析目标引用，使用 `target_ref=<release-ref>` 手动调度 `CI`，调度 `OpenClaw Release Checks`，准备用于面向包检查的父级 `release-package-under-test`Telegram 构件，并在使用 `rerun_group=all` 进行 `release_profile=full` 或设置了 `npm_telegram_package_spec`OpenClawDockerTelegramMatrixTelegram 时，调度独立的包 Telegram E2E 测试。`OpenClaw Release Checks` 随后展开安装冒烟测试、跨操作系统发布检查、在启用 soak 时的实时/E2E Docker 发布路径覆盖、包含 Telegram 包 QA 的包验收、QA Lab 一致性、实时 Matrix 以及实时 Telegram。只有当 `Full Release Validation` 摘要显示 `normal_ci` 和 `release_checks` 成功时，完整运行才是可接受的。在 full/all 模式下，`npm_telegram` 子项也必须成功；在 full/all 模式之外，除非提供了已发布的 `npm_telegram_package_spec`，否则会跳过它。最终验证者摘要包含每次子运行的 slowest-job 表，因此发布管理者无需下载日志即可查看当前的关键路径。有关完整的阶段矩阵、确切的工作流作业名称、stable 与 full 配置文件的差异、构件以及专注于重新运行的句柄，请参阅 [Full release validation](/zh/reference/full-release-validation)。子工作流是从运行 `Full Release Validation`, normally `--ref main`, even when the target `ref` 的受信任引用调度的，该引用指向较旧的发布分支或标签。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行引用来选择受信任的测试工具。不要使用 `--ref main -f ref=<sha>` 来获取移动 `main` 的确切提交证明；原始提交 SHA 不能作为工作流调度引用，因此请使用 `pnpm ci:full-release --sha <sha>` 来创建固定的临时分支。

使用 `release_profile` 来选择实时/提供商的覆盖范围：

- `minimum`OpenAIDocker：最快的发布关键型 OpenAI/core 实时和 Docker 路径
- `stable`：最低要求加上稳定的提供商/后端覆盖，用于发布审批
- `full`：稳定版本加上广泛的顾问式提供商/媒体覆盖

当阻碍发布的通道状态为绿色，并且您希望在升级前进行详尽的实时/E2E、Docker 发布路径以及有限制的已发布升级存活扫描时，请将 `run_release_soak=true` 与 `stable`Docker 结合使用。该扫描涵盖最新的四个稳定软件包，加上固定的 `2026.4.23` 和 `2026.5.2` 基线，以及较旧的 `2026.4.15`Docker 覆盖范围，其中重复的基线已被移除，且每个基线被分片到其自己的 Docker 运行器作业中。`full` 隐含 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流引用将目标引用解析一次为 `release-package-under-test`DockerOpenAI，并在浸泡运行期间，在跨操作系统、包验收和发布路径 Docker 检查中重用该构件。这使所有面向软件包的检查保持在相同的字节上，并避免重复的软件包构建。当设置 repo/org 变量时，跨操作系统 OpenAI 安装冒烟测试使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为此通道旨在证明软件包安装、新手引导、网关启动和一次实时代理轮转，而不是对最慢的默认模型进行基准测试。更广泛的实时提供商矩阵仍然是特定于模型的覆盖范围的场所。

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
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

在进行针对性修复后的首次重跑时，不要使用完整的总覆盖测试（umbrella）。如果某个测试盒失败，请在下一次验证中使用失败的子工作流、作业、Docker 车道、包配置文件、模型提供商或 QA 车道。仅当修复更改了共享的发布编排或使之前所有测试盒的证据失效时，才再次运行完整的总覆盖测试。总覆盖测试的最终验证器会重新检查记录的子工作流运行 ID，因此在子工作流成功重运行后，仅重跑失败的 Docker`Verify full validation` 父作业。

对于有界恢复，请将 `rerun_group` 传递给总覆盖测试。`all` 是真正的发布候选运行，`ci` 仅运行正常的 CI 子任务，`plugin-prerelease` 仅运行仅发布的插件子任务，`release-checks` 运行每个发布测试盒，更窄的发布组是 `install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。有针对性的 `npm-telegram` 重运行需要 `npm_telegram_package_spec`；带有 `release_profile=full` 的完整/全部运行使用 release-checks 包构件。有针对性的跨操作系统重运行可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或另一个操作系统/套件过滤器。QA release-check 失败是建议性的；仅 QA 失败不会阻止发布验证。

### Vitest

Vitest 测试盒是手动 `CI`Linux 子工作流。手动 CI 有意绕过更改范围限制，并强制为发布候选运行正常的测试图：Linux Node 分片、bundled-plugin 分片、渠道合约、Node 22 兼容性、`check`、`check-additional`WindowsmacOSAndroid、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 和 Control UI i18n。

使用此测试盒来回答“源代码树是否通过了完整的正常测试套件？”
这与发布路径产品验证不同。需保留的证据：

- `Full Release Validation` 摘要显示已分派的 `CI` 运行 URL
- `CI` 在精确的目标 SHA 上运行通过
- 在调查回归时来自 CI 作业的失败或缓慢的分片名称
- 当运行需要性能分析时，Vitest 计时产物，例如 `.artifacts/vitest-shard-timings.json`

仅当版本需要确定性的正常 CI 但不需要 Docker、QA Lab、实时、跨操作系统或包测试框时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 测试框位于 `OpenClaw Release Checks` 到 `openclaw-live-and-e2e-checks-reusable.yml` 之间，加上发布模式的 `install-smoke` 工作流。它通过打包的 Docker 环境而不是仅通过源代码级测试来验证发布候选版本。

发布 Docker 覆盖范围包括：

- 完整安装冒烟测试，启用缓慢的 Bun 全局安装冒烟测试
- 按目标 SHA 准备/重用根 Dockerfile 冒烟镜像，使用 QR，根/网关和安装程序/Bun 冒烟作业作为单独的安装冒烟分片运行
- 仓库 E2E 通道
- 发布路径 Docker 块：`core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services`、`plugins-runtime-install-a`、`plugins-runtime-install-b`、`plugins-runtime-install-c`、`plugins-runtime-install-d`、`plugins-runtime-install-e`、`plugins-runtime-install-f`、`plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 根据请求，在 `plugins-runtime-services` 块内的 OpenWebUI 覆盖范围
- 拆分的捆绑插件安装/卸载通道 `bundled-plugin-install-uninstall-0` 到 `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时，实时/E2E 提供商套件和 Docker 实时模型覆盖范围

在重新运行之前使用 Docker 制品。Release-path 调度器会上传包含渠道日志、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON 和重运行命令的 Docker`.artifacts/docker-tests/`。为了集中恢复，请在可重用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是重新运行所有 release 块。生成的重运行命令在可用时包含先前的 `package_artifact_run_id`Docker 和准备好的 Docker 镜像输入，因此失败的渠道可以重用相同的 tarball 和 GHCR 镜像。

### QA Lab

QA Lab 盒也是 `OpenClaw Release Checks`Docker 的一部分。它是代理行为和渠道级别的 release 闸门，与 Vitest 和 Docker 打包机制是分开的。

Release QA Lab 覆盖范围包括：

- 使用代理奇偶校验包将 OpenAI 候选渠道与 Opus 4.6 基线进行比较的模拟奇偶校验渠道
- 使用 Matrix`qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭据租约的实时 Telegram QA 渠道
- 当 release 遥测需要显式的本地证明时，`pnpm qa:otel:smoke`

使用此盒来回答“release 在 QA 场景和实时渠道流中的行为是否正确？”在批准 release 时，请保留奇偶校验、Matrix 和 Telegram 渠道的制品 URL。完整的 Matrix 覆盖范围仍然可用作手动分片的 QA-Lab 运行，而不是默认的 release 关键渠道。

### Package

Package 盒是可安装产品的闸门。它由 `Package Acceptance` 和解析器 `scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器将候选者标准化为 Docker E2E 消耗的 `package-under-test`Docker tarball，验证包清单，记录包版本和 SHA-256，并将工作流 harness ref 与包源 ref 分开保存。

支持的候选来源：

- `source=npm`：`openclaw@beta`、`openclaw@latest`OpenClaw 或确切的 OpenClaw release 版本
- `source=ref`: 打包一个受信任的 `package_ref` 分支、标签或完整的提交 SHA
  并使用所选的 `workflow_ref` 工具
- `source=url`: 下载具有所需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`: 重用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 运行 Package Acceptance，使用 `source=artifact`（即
准备好的发布包工件）、`suite_profile=custom`、
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、
`telegram_mode=mock-openai`。Package Acceptance 针对同一个解析后的
tarball 保留迁移、更新、
配置的身份验证更新重启、实时 ClawHub 技能安装、过时的插件依赖清理、离线插件
fixtures、插件更新以及 Telegram 包 QA。阻塞性发布检查使用默认的最新发布包
基线；`run_release_soak=true` 或
`release_profile=full` 会扩展为从
`2026.4.23` 到 `latest` 的每个稳定 npm 发布的基线
加上已报告问题的 fixtures。对已发布的候选项使用
带有 `source=npm` 的 Package Acceptance，或在发布前对
基于 SHA 的本地 npm tarball 使用
`source=ref`/`source=artifact`。它是 GitHub 原生的
替代品，用于替代以前需要
Parallels 的大部分包/更新覆盖范围。跨操作系统发布检查对于特定于操作系统的 （新手引导）、
安装程序和平台行为仍然很重要，但包/更新产品验证应
优先选择 Package Acceptance。

更新和插件验证的规范检查清单是
[Testing updates and plugins](/zh/help/testing-updates-plugins)。在决定哪种本地、Docker、Package Acceptance 或 release-check 渠道能证明
插件安装/更新、doctor 清理或已发布包迁移变更时，请使用它。
从每个稳定的 `2026.4.23+` 包中进行详尽的已发布更新迁移
是一个单独的手动 `Update Migration` 工作流，不是 Full Release CI 的一部分。

旧版包验收的宽容度是有意限时的。通过
`2026.4.25` 的包可能会使用兼容性路径来处理已发布
到 npm 的元数据缺口：压缩包中缺失的私有 QA 清单条目、缺失的
`gateway install --wrapper`、从压缩包派生的 git
fixture 中缺失的补丁文件、缺失的持久化 `update.channel`、旧版插件安装记录
位置、缺失的 marketplace 安装记录持久化，以及 `plugins update` 期间的配置元数据
迁移。已发布的 `2026.4.26` 包可能会对
已随附的本地构建元数据标记文件发出警告。后续的包
必须满足现代包契约；同样的缺口将导致发布
验证失败。

当发布问题涉及实际的
可安装包时，请使用更广泛的 Package Acceptance 配置文件：

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
  重新加载渠道
- `package`：安装/更新/重启/插件包契约加上实时的 ClawHub
  技能安装证明；这是 release-check 的默认值
- `product`：`package` 加上 MCP 渠道、cron/子代理清理、OpenAI 网络
  搜索和 OpenWebUI
- `full`：带有 OpenWebUI 的 Docker 发布路径块
- `custom`：用于专注重运行的精确 `docker_lanes` 列表

对于包候选 Telegram 验证，请在包验收上启用 Telegram`telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。该工作流将已解析的 `package-under-test`TelegramTelegramnpm tarball 传递到 Telegram 通道；独立的
Telegram 工作流仍接受已发布的 npm 规范以进行发布后检查。

## 发布发布自动化

`OpenClaw Release Publish` 是正常的可变发布入口。它
按发布所需的顺序协调受信任发布者工作流：

1. 检出发布标记并解析其提交 SHA。
2. 验证该标记可从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的作用域和 SHA 调度 `Plugin ClawHub Release`。
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

稳定发布到默认的 beta dist-tag：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

直接升级到 `latest` 的稳定版本是显式的：

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅将较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流
用于专门的修复或重新发布工作。对于选定的插件修复，请将
`plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传递给
`OpenClaw Release Publish`OpenClaw，或者当必须不发布
OpenClaw 包时直接调度子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受这些由操作员控制的输入：

- `tag`：必需的发布标记，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前
  完整的 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：仅用于验证/构建/打包的 `true`，用于实际发布路径的 `false`
- `preflight_run_id`：在实际发布路径上必需，以便工作流重用成功的预检运行中准备好的压缩包
- `npm_dist_tag`npm：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签；必须已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 预检运行 ID；当 `publish_openclaw_npm=true` 时必需
- `npm_dist_tag`npmOpenClaw：OpenClaw 包的 npm 目标标签
- `plugin_publish_scope`：默认为 `all-publishable`；仅在专注于修复工作时使用 `selected`
- `plugins`：当 `plugin_publish_scope=selected` 时，以逗号分隔的 `@openclaw/*` 包名称
- `publish_openclaw_npm`：默认为 `true`；仅在使用该工作流作为仅插件修复协调器时设置为 `false`

`OpenClaw Release Checks` 接受以下由操作员控制的输入：

- `ref`OpenClaw：用于验证的分支、标签或完整提交 SHA。包含密钥的检查要求解析出的提交必须能从 OpenClaw 分支或发布标签访问。
- `run_release_soak`Docker：在稳定/默认发布检查中选择加入详尽的 live/E2E、Docker 发布路径以及 all-since 升级幸存者 soak。当 `release_profile=full` 时会强制开启。

规则：

- 稳定版和更正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅当 `preflight_only=true` 时才允许输入完整的提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际发布路径必须使用预检查期间使用的相同 `npm_dist_tag`；
  工作流会在发布继续前验证该元数据

## 稳定 npm 发布序列

在创建稳定 npm 版本时：

1. 使用 `preflight_only=true` 运行 `OpenClaw NPM Release`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交
     SHA 对预检查工作流进行仅验证的空运行
2. 对于常规的 beta 优先流程，请选择 `npm_dist_tag=beta`；或者仅当您
   故意想要直接进行稳定发布时，才选择 `latest`
3. 当您需要通过一个手动工作流获得常规 CI 以及实时的提示缓存、Docker、QA Lab、
   Matrix 和 Telegram 覆盖时，请在发布分支、发布标签或完整
   提交 SHA 上运行 `Full Release Validation`
4. 如果您故意只需要确定性的常规测试图，请在
   发布引用上改为运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag`
   和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会将外部化插件发布到 npm
   和 ClawHub，然后再提升 OpenClaw npm 包
7. 如果发布落在了 `beta` 上，请使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果发布故意直接发布到了 `latest`，且 `beta`
   应立即跟随同一个稳定构建，请使用同一个私有
   工作流将这两个 dist-tag 指向该稳定版本，或者让其计划的
   自愈同步稍后移动 `beta`

出于安全考虑，dist-tag 变更位于私有仓库中，因为它仍需要 `NPM_TOKEN`，而公共仓库则仅保留 OIDC 发布方式。

这既保持了直接发布路径和 beta 优先升级路径都有文档记录，又让操作者可见。

如果维护者必须回退到本地 npm 认证，请仅在专用的 tmux 会话中运行任何 1Password CLI (npmCLI`op`) 命令。不要直接从主 agent shell 调用 `op`；将其保留在 tmux 中可以使提示、警报和 OTP 处理变得可见，并防止重复的主机警报。

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
