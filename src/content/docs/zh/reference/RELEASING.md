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
9. 对于 beta 版本，打标签 `vYYYY.M.D-beta.N`，然后从匹配的 `release/YYYY.M.D` 分支运行 `OpenClaw Release Publish`。它会验证 `pnpm plugins:sync:check`，将所有可发布的插件包并行分发到 npm 和相同集合的 ClawHub，然后在插件 OpenClaw 发布成功后，立即使用匹配的 dist-tag 提升准备好的 npm npm 预检工件。在 OpenClaw npm 发布子任务成功后，它会从完整的匹配 `CHANGELOG.md` 部分创建或更新匹配的 GitHub 发布/预发布页面。发布到 npm `latest` 的 Stable 版本会成为 GitHub 的最新版本；保留在 npm `beta` 上的 stable 维护版本则使用 GitHub `latest=false` 创建。当 ClawHub OpenClaw 正在发布时，npm 发布可能仍在运行，但发布发布工作流会立即打印子运行 ID。默认情况下，在分发它之后它不会等待 ClawHub，因此 OpenClaw npm 的可用性不会被较慢的 ClawHub 审批或注册表工作阻塞；当 ClawHub 必须阻塞工作流完成时，请设置 `wait_for_clawhub=true`。ClawHub 路径会重试瞬态 CLI 依赖安装失败，即使一个预览单元格不稳定也会发布通过预览的插件，并以对每个预期插件版本的注册表验证结束，以便部分发布保持可见和可重试。发布后，运行 `pnpm release:verify-beta -- YYYY.M.D-beta.N --openclaw-npm-run <run-id> --plugin-npm-run <run-id> --plugin-clawhub-run <run-id>` 以从一个命令验证 GitHub 预发布、npm `beta` dist-tags、npm 完整性、已发布的安装路径、ClawHub 精确版本、ClawHub 工件以及子工作流结论。当 ClawHub 侧车仅在可重试作业中失败并应就地重新运行时，添加 `--rerun-failed-clawhub`。然后对已发布的 `openclaw@YYYY.M.D-beta.N` 或 `openclaw@beta` 包运行发布后包验收。如果推送或发布的预发布版本需要修复，请剪裁下一个匹配的预发布编号；不要删除或重写旧的预发布版本。
10. 对于 stable（稳定版），只有经过审查的 beta 或 release candidate（候选发布版本）拥有所需的验证证据后才能继续。Stable 的 npm 发布也会通过 `OpenClaw Release Publish`，通过 `preflight_run_id` 重用成功的 preflight 构件；stable macOS 发布准备就绪还需要 `main` 上打包好的 `.zip`、`.dmg`、`.dSYM.zip` 和已更新的 `appcast.xml`。私有 macOS 发布工作流会在发布资源验证通过后，自动将已签名的 appcast 发布到公开的 `main`；如果分支保护阻止了直接推送，它将打开或更新 appcast PR。
11. 发布后，运行 npm 发布后验证程序，当您需要发布后渠道证明时，运行可选的独立
    已发布 npm Telegram E2E 测试，根据需要进行 dist-tag 提升，验证生成的 GitHub 发布页面，
    并运行发布公告步骤。

## 发布预检

- 在发布预检之前运行 `pnpm check:test-types`，以便测试 TypeScript 在更快的本地 `pnpm check` 闸门之外保持覆盖
- 在发布预检之前运行 `pnpm check:architecture`，以便更广泛的导入周期和架构边界检查在更快的本地闸门之外通过
- 在 `pnpm release:check` 之前运行 `pnpm build && pnpm ui:build`，以便预期的 `dist/*` 发布工件和控制 UI 捆绑包存在于打包验证步骤中
- 在根版本升级之后、打标签之前运行 `pnpm release:prep`。它会运行每个通常会在版本/配置/API 更改后发生漂移的确定性发布生成器：插件版本、插件清单、基础配置架构、打包渠道配置元数据、配置文档基线、插件 SDK 导出以及插件 SDK API 基线。`pnpm release:check` 会在检查模式下重新运行这些守卫，并在运行包发布检查之前一次性报告其发现的所有生成的漂移故障。
- 在发布批准之前运行手动 `Full Release Validation` 工作流，以便从一个入口启动所有发布前测试箱。它接受分支、标签或完整的提交 SHA，调度手动 `CI`，并调度 `OpenClaw Release Checks`MatrixTelegramDocker 进行安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径浸泡保留在 `run_release_soak=true` 后面；`release_profile=full` 强制开启浸泡。使用 `release_profile=full` 和 `rerun_group=all`Telegram，它还会针对发布检查中的 `release-package-under-test` 制品运行包 Telegram E2E。在发布 beta 版后提供 `release_package_spec`npmTelegram，以便在无需重新构建发布 tarball 的情况下，跨发布检查、包验收和包 Telegram E2E 复用已发布的 npm 包。仅当 Telegram 应使用与其余发布验证不同的已发布包时，才提供 `npm_telegram_package_spec`Telegram。当包验收应使用与发布包规格不同的已发布包时，提供 `package_acceptance_package_spec`。当私密证据报告需要证明验证与已发布的 npm 包匹配而不强制运行 Telegram E2E 时，提供 `evidence_package_spec`npmTelegram。示例：
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- 当你希望在发布工作继续的同时获得包候选版本的侧渠道证明时，请运行手动 `Package Acceptance` 工作流。对 `openclaw@beta`、`openclaw@latest` 或确切的发布版本使用 `source=npm`；使用 `source=ref` 打包受信任的 `package_ref` 分支/标签/SHA 并配合当前的 `workflow_ref` 套件；对具有必需 SHA-256 的 HTTPS tarball 使用 `source=url`；或对由另一个 GitHub Actions 运行上传的 tarball 使用 `source=artifact`。该工作流将候选项解析为 `package-under-test`，针对该 tarball 复用 Docker E2E 发布调度器，并可以使用 `telegram_mode=mock-openai` 或 `telegram_mode=live-frontier` 针对同一 tarball 运行 Telegram QA。当所选 Docker 渠道包含 `published-upgrade-survivor` 时，包产物即为候选项，且 `published_upgrade_survivor_baseline` 选择已发布的基线。`update-restart-auth` 将候选项包同时用作已安装的 CLI 和被测包，从而执行候选项更新命令的托管重启路径。
  示例：`gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  常用配置文件：
  - `smoke`：安装/渠道/代理、网关网络和配置重载通道
  - `package`：不包含 OpenWebUI 或实时 ClawHub 的原生包/更新/重启/插件通道
  - `product`：包配置文件以及 MCP 渠道、cron/子代理清理、
    OpenAI 网络搜索和 OpenWebUI
  - `full`Docker：Docker 的 release-path chunks 包含 OpenWebUI
  - `custom`：精确选择 `docker_lanes` 以进行有针对性的重新运行
- 当您仅需为发布候选版本获取完整的常规 CI 覆盖范围时，直接运行手动 `CI` 工作流。手动 CI 调度会绕过变更范围限定，并强制执行 Linux Node 分片、bundled-plugin 分片、渠道合约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n 通道。
  示例：`gh workflow run ci.yml --ref release/YYYY.M.D`
- 验证发布遥测时运行 `pnpm qa:otel:smoke`。它通过本地 OTLP/HTTP 接收器测试 QA-lab，并验证导出的跟踪 span 名称、有界属性以及内容/标识符脱敏，而无需 Opik、Langfuse 或其他外部收集器。
- 在每个标记版本发布前运行 `pnpm release:check`
- 在标签存在后，运行 `OpenClaw Release Publish` 以执行变更发布序列。从 `release/YYYY.M.D` 调度它（或者在发布 main 可达标签时从 `main`OpenClawnpm），传入发布标签和成功的 OpenClaw npm `preflight_run_id`，并保留默认的插件发布范围 `all-publishable`npmClawHubOpenClawnpm，除非你有意运行针对性的修复。该工作流会序列化插件 npm 发布、插件 ClawHub 发布以及 OpenClaw npm 发布，以确保核心包不会在其外部化的插件之前发布。
- 发布检查现在在单独的手动工作流中运行：
  `OpenClaw Release Checks`
- `OpenClaw Release Checks`MatrixTelegram 还会在发布批准前运行 QA Lab 模拟一致性通道以及快速的实时 Matrix 配置文件和 Telegram QA 通道。实时通道使用 `qa-live-shared`Telegram 环境；Telegram 还使用 Convex CI 凭证租约。当您需要完整的 Matrix 传输、媒体和 E2EE 清单并行运行时，请使用 `matrix_profile=all` 和 `matrix_shards=true`Matrix 运行手动 `QA-Lab - All Lanes` 工作流。
- 跨操作系统安装和升级运行时验证是公开的
  `OpenClaw Release Checks` 和 `Full Release Validation` 的一部分，它们直接调用
  可复用工作流
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- 这种拆分是有意的：保持真正的 npm 发布路径简短、确定性且专注于产物，而较慢的实时检查则保留在它们自己的通道中，以免它们延迟或阻止发布
- 承载密钥的发布检查应通过 `Full Release
Validation` or from the `main`/release 工作流引用进行调度，以确保工作流逻辑和
  机密信息得到控制
- `OpenClaw Release Checks` 接受分支、标签或完整的提交 SHA，只要解析出的提交可从 OpenClaw 分支或发布标签访问
- `OpenClaw NPM Release` 仅验证预检也接受当前的完整 40 字符工作流分支提交 SHA，而无需已推送的标签
- 该 SHA 路径仅用于验证，不能提升为真正的发布
- 在 SHA 模式下，工作流仅为包元数据检查合成 `v<package.json version>`；实际的发布仍然需要真实的发布标签
- 这两个工作流都将真正的发布和提升路径保留在 GitHub 托管的运行器上，而非变更的验证路径可以使用更大的
  Blacksmith Linux 运行器
- 该工作流运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  时，同时使用了 `OPENAI_API_KEY` 和 `ANTHROPIC_API_KEY` 工作流密钥
- npm 发布预检不再等待单独的发布检查通道
- 在本地标记发布候选版本之前，请运行
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`。此辅助工具
  会按顺序运行快速发布防护、插件 npm/ClawHub 发布检查、构建、
  UI 构建以及 `release:openclaw:npm:check`，以便在 GitHub 发布工作流启动之前
  捕获常见的阻碍审批的错误。
- 在批准之前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或匹配的 beta/correction 标签）
- 在 npm publish 之后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或匹配的 beta/correction 版本）以验证在新的临时前缀中
  已发布注册表的安装路径
- 在 beta 发布后，运行 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live` 以使用共享租用的 Telegram 凭证池，针对已发布的 Telegram 包验证已安装包的新手引导、npm 设置以及真实的 Telegram E2E。本地维护者的临时操作可以省略 Convex vars，并直接传递三个 `OPENCLAW_QA_TELEGRAM_*` env 凭证。
- 若要从维护者机器上运行完整的发布后 Beta 冒烟测试，请使用 `pnpm release:beta-smoke -- --beta betaN`。该辅助脚本运行 Parallels npm 更新/新目标验证，调度 `NPM Telegram Beta E2E`Telegram，轮询确切的工作流运行，下载构件，并打印 Telegram 报告。
- 维护者可以通过 GitHub Actions 使用手动的 `NPM Telegram Beta E2E` 工作流运行相同的发布后检查。该工作流被有意设计为仅限手动运行，不会在每次合并时运行。
- 维护者发布自动化现在使用 preflight-then-promote（预检后发布）模式：
  - 真实的 npm 发布必须通过成功的 npm `preflight_run_id`
  - 真正的 npm 发布必须从与成功的预检运行相同的 `main` 或 `release/YYYY.M.D` 分支进行调度
  - 稳定的 npm 版本默认发布到 `beta`
  - 稳定的 npm 发布可以通过工作流输入显式指定为 `latest`
  - 基于令牌的 npm dist-tag 变更现在位于
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    中以确保安全，因为 `npm dist-tag add` 仍然需要 `NPM_TOKEN`，而
    公共仓库仅保留 OIDC 发布
  - public `macOS Release` 仅用于验证；当 tag 仅存在于发布分支上但工作流是从 `main` 分派的时，设置 `public_release_branch=release/YYYY.M.D`
  - 真实的私有 mac 发布必须通过成功的私有 mac `preflight_run_id` 和 `validate_run_id`
  - 真实的发布路径会提升准备好的制品，而不是重新构建它们
- 对于像 `YYYY.M.D-N` 这样的稳定修正版本，发布后验证器
  也会检查从 `YYYY.M.D` 到 `YYYY.M.D-N` 的相同临时前缀升级路径，
  这样版本修正就不会在基础稳定负载上悄悄遗留较旧的全局安装
- npm 发布预检失败关闭，除非压缩包同时包含
  npm`dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 有效载荷
  这样我们就不会再次发布空的浏览器仪表板
- 发布后验证还会检查已发布的插件入口点和
  包元数据是否存在于已安装的注册表布局中。如果发布版本
  缺少插件运行时负载，则无法通过发布后验证，
  并且无法提升至 `latest`。
- `pnpm test:install:smoke`npm 还会对候选更新压缩包强制执行 npm 打包 `unpackedSize` 预算，以便安装程序端到端测试在发布发布路径之前捕获意外的打包膨胀
- 如果发布工作涉及 CI 规划、扩展时序清单或扩展测试矩阵，请在批准前从 `.github/workflows/plugin-prerelease.yml` 重新生成并审查规划器拥有的 `plugin-prerelease-extension-shard` 矩阵输出，以免发布说明描述过时的 CI 布局
- 稳定的 macOS 版本发布准备还包括更新程序界面：
  - GitHub 版本最终必须包含打包好的 GitHub`.zip`、`.dmg` 和 `.dSYM.zip`
  - 发布后，`main`macOS 上的 `appcast.xml` 必须指向新的 stable zip 包；私有 macOS 发布工作流会自动提交它，或者在直接推送被阻止时打开一个 appcast PR
  - 打包的应用必须保持非调试的 bundle id、非空的 Sparkle feed URL，以及一个等于或高于该发布版本的规范 Sparkle 构建基线的 `CFBundleVersion`

## 发布测试环境

`Full Release Validation` 是操作员从一个入口启动所有预发布测试的方式。对于快速移动分支上的固定提交证明，请使用该辅助程序，以便每个子工作流都从固定在目标 SHA 的临时分支运行：

```bash
pnpm ci:full-release --sha <full-sha>
```

该辅助程序推送 `release-ci/<sha>-...`，从该分支使用 `ref=<sha>` 分发 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，然后删除临时分支。这可以避免意外证明一个较新的 `main` 子运行。

对于发布分支或标签验证，请从受信任的 `main` 工作流引用中运行，并将发布分支或标签作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

该工作流解析目标引用，使用 `target_ref=<release-ref>` 手动触发 `CI`，触发 `OpenClaw Release Checks`，为面向包的检查准备父级 `release-package-under-test` 构件，并在 `release_profile=full` 包含 `rerun_group=all` 或当设置了 `release_package_spec` 或 `npm_telegram_package_spec` 时，触发独立的包 Telegram E2E。`OpenClaw Release
Checks` 随后分发安装冒烟测试、跨操作系统发布检查、启用 soak 时的 live/E2E Docker 发布路径覆盖、带有 Telegram 包 QA 的包验收、QA Lab 一致性、live Matrix 以及 live Telegram。只有当 `Full Release Validation`
摘要显示 `normal_ci` 和 `release_checks` 成功时，完整运行才可接受。在 full/all 模式下，`npm_telegram` 子级也必须成功；在 full/all 模式之外，除非提供了已发布的 `release_package_spec` 或 `npm_telegram_package_spec`，否则将跳过它。最终验证者摘要包含每个子运行的慢速任务表，因此发布经理无需下载日志即可查看当前的关键路径。请参阅 [完整发布验证](/zh/reference/full-release-validation) 以了解完整的阶段矩阵、确切的工作流作业名称、stable 与 full 配置文件的差异、构件以及集中的重新运行句柄。子工作流是从运行 `Full Release
Validation`, normally `--ref main`, even when the target `ref` 的受信任引用触发的，该引用指向较旧的发布分支或标记。没有单独的 Full Release Validation workflow-ref 输入；通过选择工作流运行引用来选择受信任的框架。不要将 `--ref main -f ref=<sha>` 用于移动 `main` 时的确切提交证明；原始提交 SHA 不能作为工作流分发引用，因此请使用 `pnpm ci:full-release --sha <sha>` 创建固定的临时分支。

使用 `release_profile` 来选择实时/提供商的范围：

- `minimum`：最快的发布关键 OpenAI/核心实时和 Docker 路径
- `stable`：最低要求加上稳定的提供商/后端覆盖，用于发布批准
- `full`：稳定版本加上广泛的顾问提供商/媒体覆盖

当阻碍发布的流水线显示为绿色，并且您希望在升级前进行详尽的实时/E2E、Docker 发布路径以及有限的已发布升级存活扫描时，请将 `run_release_soak=true` 与 `stable`Docker 结合使用。该扫描涵盖最新的四个稳定版本软件包，加上固定的 `2026.4.23` 和 `2026.5.2` 基线，以及较旧的 `2026.4.15`Docker 覆盖范围，其中重复的基线已被移除，并且每个基线被分片到其自己的 Docker 运行器作业中。`full` 意味着 `run_release_soak=true`。

`OpenClaw Release Checks` 使用受信任的工作流引用来一次性解析目标引用为 `release-package-under-test`，并在 soak 运行期间在跨操作系统、包验收和发布路径 Docker 检查中重用该产物。这确保所有面向包的检查框使用相同的字节，并避免重复的包构建。当 beta 版本已发布到 npm 后，设置 `release_package_spec=openclaw@YYYY.M.D-beta.N`，以便发布检查下载已发布的包一次，从 `dist/build-info.json` 中提取其构建源 SHA，并在跨操作系统、包验收、发布路径 Docker 和包 Telegram 通道中重用该产物。跨操作系统 OpenAI 安装冒烟测试在设置了 repo/org 变量时使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则使用 `openai/gpt-5.4`，因为此通道旨在验证包安装、新手引导、网关启动和一次实时代理轮次，而不是对最慢的默认模型进行基准测试。更广泛的实时提供商矩阵仍然是特定于模型的覆盖范围的场所。

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

在进行针对性修复后的第一次重新运行时，不要使用完整的 umbrella。如果某个 box 失败，请针对下一次验证使用失败的子工作流、作业、Docker 轨道、package 配置文件、模型 提供商 或 QA 轨道。仅在修复更改了共享的发布编排或导致之前所有 box 的证据失效时，才再次运行完整的 umbrella。umbrella 的最终验证器会重新检查记录的子工作流运行 ID，因此子工作流重新运行成功后，只需重新运行失败的 `Verify full validation` 父作业。

对于有限范围的恢复，请将 `rerun_group` 传递给总控任务。`all` 是真正的
发布候选运行，`ci` 仅运行正常的 CI 子任务，`plugin-prerelease`
仅运行仅发布插件子任务，`release-checks` 运行每个发布
box，较窄的发布组是 `install-smoke`、`cross-os`、
`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 和 `npm-telegram`。
针对 `npm-telegram` 的重点重跑需要 `release_package_spec` 或
`npm_telegram_package_spec`；使用 `release_profile=full` 的完整/全部运行使用
release-checks 包构件。重点
cross-OS 重跑可以添加 `cross_os_suite_filter=windows/packaged-upgrade` 或
另一个 OS/suite 过滤器。QA release-check 失败是建议性的；仅 QA
失败不会阻止发布验证。

### Vitest

Vitest 盒子是手动 `CI` 子工作流。手动 CI 故意绕过变更范围限制，强制为发布候选版本运行正常的测试图：Linux Node 分片、bundled-plugin 分片、渠道契约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 以及 Control UI i18n。

使用此框来回答“源码树是否通过了完整的常规测试套件？”
这与发布路径的产品验证不同。需要保留的证据：

- 显示已分派的 `CI` 运行 URL 的 `Full Release Validation` 摘要
- `CI` 在精确的目标 SHA 上运行成功（绿色状态）
- 在调查回归问题时，来自 CI 作业的失败或缓慢的分片名称
- 当运行需要性能分析时，Vitest 计时产物，例如 `.artifacts/vitest-shard-timings.json`

仅在发布需要确定性的正常 CI 但不需要 Docker、QA Lab、live、跨操作系统或 package boxes 时，才直接运行手动 CI：

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

Docker 测试箱位于 `OpenClaw Release Checks` 到 `openclaw-live-and-e2e-checks-reusable.yml` 之间，加上发布模式的 `install-smoke` 工作流。它通过打包的 Docker 环境来验证发布候选版本，而不仅仅是源代码级别的测试。

发布 Docker 覆盖范围包括：

- 启用了慢速 Bun 全局安装冒烟测试的完整安装冒烟测试
- 根据目标 SHA 准备/复用根 Dockerfile 冒烟镜像，配合 QR，
  root/gateway 和 installer/Bun 冒烟任务作为独立的 install-smoke
  分片运行
- 仓库 E2E 通道
- release-path Docker 块：`core`、`package-update-openai`、
  `package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、
  `plugins-runtime-services`、
  `plugins-runtime-install-a`、`plugins-runtime-install-b`、
  `plugins-runtime-install-c`、`plugins-runtime-install-d`、
  `plugins-runtime-install-e`、`plugins-runtime-install-f`、
  `plugins-runtime-install-g` 和 `plugins-runtime-install-h`
- 请求时，`plugins-runtime-services` 块内的 OpenWebUI 覆盖率
- 拆分捆绑插件安装/卸载通道
  `bundled-plugin-install-uninstall-0` 至
  `bundled-plugin-install-uninstall-23`
- 当发布检查包含实时套件时，进行 live/E2E 提供商套件和 Docker 实时模型覆盖

在重新运行之前使用 Docker 构建产物。release-path 调度器会上传 `.artifacts/docker-tests/`，其中包含 lane 日志、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON 以及重新运行命令。为了进行针对性恢复，请在可重用的 live/E2E 工作流上使用 `docker_lanes=<lane[,lane]>`，而不是重新运行所有 release 代码块。生成的重新运行命令在可用时会包含之前的 `package_artifact_run_id` 和已准备的 Docker 镜像输入，因此失败的 lane 可以复用同一 tarball 和 GHCR 镜像。

### QA 实验室

QA 实验室也是 `OpenClaw Release Checks`Docker 的一部分。它是代理行为和渠道级别的发布关卡，与 Vitest 和 Docker 包机制分开。

发布 QA 实验室覆盖范围包括：

- mock parity lane，使用代理 parity 包将 OpenAI 候选 lane 与 Opus 4.6 基线进行比较
- 使用 `qa-live-shared` 环境的快速实时 Matrix QA 配置文件
- 使用 Convex CI 凭证租约的实时 Telegram QA 通道
- 当发布遥测需要明确的本地证明时使用 `pnpm qa:otel:smoke`

使用此框来回答“发布在 QA 场景和实时渠道流程中是否表现正确？”在批准发布时，请保留 parity、Matrix 和 Telegram 渠道的构建产物 URL。完整的 Matrix 覆盖范围仍然可以作为手动分片的 QA-Lab 运行使用，而不是默认的发布关键渠道。

### 打包

Package 测试箱是可安装产品的关卡。它由
`Package Acceptance` 和解析器
`scripts/resolve-openclaw-package-candidate.mjs` 支持。解析器将
候选项规范为 `package-under-test` 压缩包，供 Docker E2E 使用，验证
包清单，记录包版本和 SHA-256，并将
工作流 harness 引用与包源引用分开保存。

支持的候选源：

- `source=npm`：`openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布版本
- `source=ref`：打包受信任的 `package_ref` 分支、标签或完整提交 SHA
  并使用所选的 `workflow_ref` 测试工具
- `source=url`: 下载具有所需 `package_sha256` 的 HTTPS `.tgz`
- `source=artifact`: 复用由另一个 GitHub Actions 运行上传的 `.tgz`

`OpenClaw Release Checks` 运行 `source=artifact`（准备好的发布包工件）、`suite_profile=custom`、`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`、`telegram_mode=mock-openai` 的包验收。包验收针对同一个解析出的 tarball，保留迁移、更新、配置认证更新重启、实时 ClawHub 技能安装、过时插件依赖清理、离线插件固件、插件更新和 Telegram 包 QA。阻塞性发布检查使用默认的最新已发布包基线；`run_release_soak=true` 或 `release_profile=full` 会扩展到从 `2026.4.23` 到 `latest` 的每个稳定 npm 发布基线以及报告问题固件。对于已发布的候选版本，请使用带 `source=npm` 的包验收；对于发布前基于 SHA 的本地 npm tarball，请使用 `source=ref`/`source=artifact`。这是先前需要 Parallels 的大部分包/更新覆盖范围的 GitHub 原生替代品。针对特定操作系统的新手引导、安装程序和平台行为，跨操作系统发布检查仍然很重要，但包/更新产品验证应优先使用包验收。

更新和插件验证的规范清单是
[测试更新和插件](/zh/help/testing-updates-plugins)。在决定
是使用本地、Docker、包验收还是 release-check 通道来证明
插件安装/更新、doctor 清理或已发布包迁移变更时，请使用该清单。
从每个稳定的 `2026.4.23+` 包进行详尽的已发布更新迁移
是一个单独的手动 `Update Migration` 工作流，不属于完整发布 CI 的一部分。

旧版软件包验收的宽限期是有意设限的。通过 `2026.4.25` 的软件包可以使用兼容性路径来处理已发布到 npm 的元数据缺口：缺少压缩包中的私有 QA 清单条目、缺少 `gateway install --wrapper`、缺少源自压缩包的 git 固件中的补丁文件、缺少持久化的 `update.channel`、旧版插件安装记录位置、缺少应用市场安装记录持久化以及在 `plugins update` 期间的配置元数据迁移。已发布的 `2026.4.26` 软件包可能会针对已随附的本地构建元数据标记文件发出警告。后续软件包必须满足现代软件包合约；同样的缺口将导致发布验证失败。

当发布问题涉及实际的可安装软件包时，请使用更广泛的软件包验收配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

常用软件包配置文件：

- `smoke`：快速软件包安装/渠道/代理，网关网络以及配置
  重载通道
- `package`：安装/更新/重启/插件软件包约定以及实时 ClawHub
  技能安装证明；这是发布检查的默认设置
- `product`：`package`OpenAI 加上 MCP 频道、cron/subagent 清理、OpenAI 网络
  搜索和 OpenWebUI
- `full`Docker：包含 OpenWebUI 的 Docker 发布路径块
- `custom`：用于针对性重试的精确 `docker_lanes` 列表

对于包候选 Telegram 验证，请在包验收（Package Acceptance）上启用 `telegram_mode=mock-openai` 或
`telegram_mode=live-frontier`。该工作流会将解析出的 `package-under-test` 压缩包传递到 Telegram 通道；独立的
Telegram 工作流仍接受已发布的 npm 规范以进行发布后检查。

## 发布发布自动化

`OpenClaw Release Publish` 是常规的可变发布入口点。它
按发布所需顺序编排可信发布者工作流：

1. 检出发布标签并解析其提交 SHA。
2. 验证该标签可从 `main` 或 `release/*` 访问。
3. 运行 `pnpm plugins:sync:check`。
4. 使用 `publish_scope=all-publishable` 和
   `ref=<release-sha>` 调度 `Plugin NPM Release`。
5. 使用相同的 scope 和 SHA 调度 `Plugin ClawHub Release`。
6. 使用 release tag、npm dist-tag 和
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

直接提升到 `latest` 是显式的：
}

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

仅在针对特定修复或重新发布工作时使用较低级别的 `Plugin NPM Release` 和 `Plugin ClawHub Release` 工作流。对于选定的插件修复，请将 `plugin_publish_scope=selected` 和 `plugins=@openclaw/name` 传递给 `OpenClaw Release Publish`，或者在必须不发布 OpenClaw 包时直接调度子工作流。

## NPM 工作流输入

`OpenClaw NPM Release` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1` 或
  `v2026.4.2-beta.1`；当 `preflight_only=true` 时，它也可以是当前的
  完整 40 字符工作流分支提交 SHA，用于仅验证的预检
- `preflight_only`：`true` 仅用于验证/构建/打包，`false` 用于
  真实的发布路径
- `preflight_run_id`：在真实的发布路径上必填，以便工作流重用
  来自成功预检运行的准备好的 tarball
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`

`OpenClaw Release Publish` 接受以下由操作员控制的输入：

- `tag`：必需的发布标签；必须已存在
- `preflight_run_id`：成功的 `OpenClaw NPM Release` 预检查运行 ID；
  当 `publish_openclaw_npm=true` 时为必需
- `npm_dist_tag`npmOpenClaw：OpenClaw 包的 npm 目标标签
- `plugin_publish_scope`：默认为 `all-publishable`；仅在专注的修复工作时使用 `selected`
- `plugins`：当 `plugin_publish_scope=selected` 时，以逗号分隔的 `@openclaw/*` 包名称
- `publish_openclaw_npm`：默认为 `true`；仅在使用该工作流作为仅插件修复编排器时设置 `false`
- `wait_for_clawhub`: 默认为 `false`npmClawHub，因此 npm 可用性不会受到 ClawHub 旁路的阻塞；仅当工作流完成必须包含 ClawHub 完成时，才设置 `true`ClawHub

`OpenClaw Release Checks` 接受这些操作员控制的输入：

- `ref`：要验证的分支、标签或完整提交 SHA。包含密钥的检查
  要求解析后的提交必须可从 OpenClaw 分支或
  发布标签访问。
- `run_release_soak`：在稳定/默认发布检查中，选择启用详尽的 live/E2E、Docker 发布路径，
  以及 all-since upgrade-survivor soak 测试。此选项会被 `release_profile=full` 强制开启。

规则：

- Stable 和 correction 标签可能会发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 对于 `OpenClaw NPM Release`，仅在
  `preflight_only=true` 时才允许输入完整的提交 SHA
- `OpenClaw Release Checks` 和 `Full Release Validation` 始终
  仅用于验证
- 实际的发布路径必须使用与预检期间相同的 `npm_dist_tag`；
  工作流会在继续发布之前验证该元数据

## 稳定版 npm 发布流程

当切分稳定版 npm 发布时：

1. 运行 `OpenClaw NPM Release` 并使用 `preflight_only=true`
   - 在标签存在之前，您可以使用当前完整的工作流分支提交
     SHA 对预检工作流进行仅验证的空运行
2. 选择 `npm_dist_tag=beta` 用于正常的 beta 优先流程，或仅在
   您有意直接进行稳定版发布时选择 `latest`
3. 当您需要正常 CI 以及实时提示缓存、Docker、QA Lab、Matrix 和 Telegram 覆盖范围时，请在 release 分支、release 标签或完整的 commit SHA 上运行 `Full Release Validation`，以通过一个手动工作流获取所有这些内容
4. 如果您有意只需要确定性的正常测试图，请在 release 引用上运行手动 `CI` 工作流
5. 保存成功的 `preflight_run_id`
6. 使用相同的 `tag`、相同的 `npm_dist_tag` 和保存的 `preflight_run_id` 运行 `OpenClaw Release Publish`；它会在提升 npm ClawHub 包之前将外部化插件发布到 OpenClaw 和 npm
7. 如果发布已到达 `beta`，请使用私有
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   工作流将该稳定版本从 `beta` 提升到 `latest`
8. 如果该版本有意直接发布到 `latest`，并且 `beta` 应立即紧随相同的稳定版本，请使用相同的私有工作流将两个 dist-tags 指向该稳定版本，或者让其定期的自我修复同步稍后移动 `beta`

出于安全考虑，dist-tag 变更位于私有仓库中，因为它仍需要 `NPM_TOKEN`，而公共仓库保持仅支持 OIDC 发布。

这确保了直接发布路径和 beta 优先的升级路径都有文档记录，并且对操作者可见。

如果维护人员必须回退到本地 npm 身份验证，请仅在专用的 tmux 会话中运行任何 1Password CLI (`op`) 命令。不要直接从主代理 shell 调用 `op`；将其保留在 tmux 中可以使提示、警报和 OTP 处理可见，并防止重复的主机警报。

## 公开引用

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者在
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中使用私有发布文档来获取实际的运行手册。

## 相关

- [发布渠道](/zh/install/development-channels)
