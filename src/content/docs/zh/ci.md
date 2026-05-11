---
summary: "CI 作业图、范围门控和本地命令等效项"
title: CI 流水线
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能范围限定，当仅不相关区域发生更改时跳过昂贵的作业。手动 `workflow_dispatch` 运行有意绕过智能范围限定，并针对发布候选或广泛验证展开完整的正常 CI 图。

`Full Release Validation` 是“发布前运行所有内容”的手动总括工作流。它接受分支、标签或完整提交 SHA，使用该目标调度手动 `CI` 工作流，并调度 `OpenClaw Release Checks` 以进行安装冒烟测试、包验收、Docker 发布路径套件、live/E2E、OpenWebUI、QA Lab 奇偶性、Matrix 和 Telegram 车道。当提供已发布的包规范时，它还可以运行发布后 `NPM Telegram Beta E2E` 工作流。总括工作流记录调度的子运行 ID，最终 `Verify full validation` 作业重新检查当前子运行结论。如果子工作流被重新运行并变为通过，则仅重新运行父验证程序作业以刷新总括工作流结果。

发布 live/E2E 子项保持广泛的本地 `pnpm test:live` 覆盖率，但它通过 `scripts/test-live-shard.mjs` 作为命名分片（`native-live-src-agents`、`native-live-src-gateway`、`native-live-test`、`native-live-extensions-a-k` 和 `native-live-extensions-l-z`）运行，而不是作为一个串行作业。这在保持相同文件覆盖率的同时，使缓慢的实时提供商故障更容易重新运行和诊断。

`Package Acceptance` 是用于验证包工件而不阻塞发布工作流的并行运行工作流。它从已发布的 npm 规范、使用所选 `workflow_ref` 构建框架构建的可信 `package_ref`、带有 SHA-256 的 HTTPS tarball URL，或来自另一个 GitHub Actions 运行的 tarball 工件中解析一个候选者，将其上传为 `package-under-test`，然后复用该 tarball 的 Docker 发布/E2E 调度器，而不是重新打包工作流检出。配置文件涵盖冒烟、包、产品、完整和自定义 Docker 车道选择。`package` 配置文件使用离线插件覆盖率，因此已发布包的验证不受限于实时 ClawHub 的可用性。可选的 Telegram 车道在 `NPM Telegram Beta E2E` 工作流中复用 `package-under-test` 工件，并保留已发布的 npm 规范路径以供独立调度使用。

## 包验收

当问题是“这个可安装的 OpenClaw 包是否作为产品正常工作？”时，请使用 `Package Acceptance`。这与正常的 CI 不同：正常的 CI 验证源代码树，而包验收通过用户在安装或更新后使用的相同 Docker E2E 测试框架来验证单个 tarball。

该工作流包含四个作业：

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选者，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test` 工件上传，并在 GitHub 步骤摘要中打印源、工作流引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml` 并带有 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`。可重用工作流下载该工件，验证 tarball 清单，在需要时准备包摘要 Docker 镜像，并对该包运行所选的 Docker 车道，而不是打包工作流检出。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 时它会运行，并在包验收解决了一个包时安装相同的 `package-under-test` 构件；独立的 Telegram 调度仍然可以安装已发布的 npm 规范。
4. 如果包解决、Docker 验收或可选的 Telegram 通道失败，`summary` 将使工作流失败。

候选来源：

- `source=npm`：仅接受 `openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布版本（如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的 beta/stable 验收。
- `source=ref`：打包受信任的 `package_ref` 分支、标签或完整提交 SHA。解决器会获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签访问，在分离的工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url`：下载 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact`：从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；对于外部共享的构件，`package_sha256` 是可选的，但建议提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/工具代码。`package_ref` 是当 `source=ref` 时被打包的源提交。这允许当前测试工具在不运行旧工作流逻辑的情况下验证较旧的受信任源提交。

配置文件映射到 Docker 覆盖率：

- `smoke`：`npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package`: `npm-onboard-channel-agent`, `doctor-switch`,
  `update-channel-switch`, `bundled-channel-deps-compat`, `plugins-offline`,
  `plugin-update`
- `product`: `package` 加上 `mcp-channels`, `cron-mcp-cleanup`,
  `openai-web-search-minimal`, `openwebui`
- `full`: 完整的 Docker 发布路径块，包含 OpenWebUI
- `custom`: 精确的 `docker_lanes`；当 `suite_profile=custom` 时为必需

Release checks call Package Acceptance with `source=ref`,
`package_ref=<release-ref>`, `workflow_ref=<release workflow ref>`,
`suite_profile=custom`,
`docker_lanes='bundled-channel-deps-compat plugins-offline'`, and
`telegram_mode=mock-openai`. The release-path Docker
chunks cover the overlapping package/update/plugin lanes, while Package
Acceptance keeps the artifact-native bundled-渠道 compat, offline plugin, and
Telegram proof against the same resolved package tarball.
Cross-OS release checks still cover OS-specific 新手引导, installer, and
platform behavior; package/update product validation should start with Package
Acceptance. The Windows packaged and installer fresh lanes also verify that an
installed package can import a browser-control override from a raw absolute
Windows path.

针对通过 `2026.4.25` 已发布的软件包（包括 `2026.4.25-beta.*`），Package Acceptance 设定了一个有限的旧版兼容性窗口。此处记录了这些特殊许可，以免它们变成永久性的静默跳过：当压缩包中省略了这些文件时，`dist/postinstall-inventory.json` 中的已知私有 QA 条目可能会发出警告；当软件包未公开该标志时，`doctor-switch` 可能会跳过 `gateway install --wrapper` 持久化子案例；`update-channel-switch` 可能会从压缩包派生的假 git 固定装置中修剪缺失的 `pnpm.patchedDependencies`，并记录缺失的持久化 `update.channel`；插件冒烟测试可能会读取旧的安装记录位置，或接受缺失的 marketplace 安装记录持久化；并且 `plugin-update` 可能允许配置元数据迁移，同时仍要求安装记录和无重新安装行为保持不变。`2026.4.25` 之后的软件包必须满足现代契约；相同条件将导致失败而不是警告或跳过。

示例：

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

调试失败的软件包验收运行时，请先从 `resolve_package` 摘要开始，确认软件包源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker 制品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、通道日志、阶段计时和重运行命令。建议重运行失败的软件包配置文件或特定的 Docker 通道，而不是重运行完整的发布验证。

QA Lab 在主要的智能限定（smart-scoped）工作流之外拥有专用的 CI 通道。`Parity gate` 工作流在匹配的 PR 变更和手动调度时运行；它会构建私有 QA 运行时并比较模拟的 GPT-5.5 和 Opus 4.6 智能包。`QA-Lab - All Lanes` 工作流每晚在 `main` 上以及通过手动调度运行；它会将模拟对等（parity）检查、实时 Matrix 通道以及实时 Telegram 和 Discord 通道作为并行任务展开。实时任务使用 `qa-live-shared` 环境，而 Telegram/Discord 使用 Convex 租约。Matrix 在预定和发布检查（gate）中使用 `--profile fast`，仅当检出（checked-out）的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入保持 `all`；手动 `matrix_profile=all` 调度总是将完整的 Matrix 覆盖范围分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 任务。`OpenClaw Release Checks` 还会在发布批准之前运行对发布至关重要的 QA Lab 通道。

`Duplicate PRs After Merge` 工作流是一个用于合并后重复清理的手动维护者工作流。它默认为试运行（dry-run），并且仅在 `apply=true` 时关闭明确列出的 PR。在更改 GitHub 之前，它会验证已合并的 PR 已合并，并且每个重复项都有共享的引用问题或重叠的变更块。

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于使现有文档与最近合并的变更保持一致。它没有纯粹的调度计划：在 `main` 上的成功非机器人推送 CI 运行可以触发它，并且手动调度可以直接运行它。当 `main` 已继续推进或在过去一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行调用将跳过。当它运行时，它会审查从上一次未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此每小时的运行可以覆盖自上次文档传递以来累积的所有主要变更。

`Test Performance Agent` 工作流是用于慢速测试的事件驱动 Codex 维护通道。它没有纯粹的计划：在 `main` 上的成功非机器人推送 CI 运行可以触发它，但如果另一个工作流运行调用已经在该 UTC 日期运行或正在运行，它将跳过。手动调度绕过该每日活动门控。该通道构建完整的套件分组 Vitest 性能报告，让 Codex 仅进行保持覆盖率的小幅测试性能修复，而不是广泛的重构，然后重新运行完整套件报告并拒绝减少通过基线测试计数的更改。如果基线存在失败的测试，Codex 可能仅修复明显的失败，并且在提交任何内容之前，代理后的完整套件报告必须通过。当 `main` 在机器人推送落地之前前进时，该通道将重新绑定已验证的补丁，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁将被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 作业概览

| 作业                             | 目的                                                                     | 运行时间                     |
| -------------------------------- | ------------------------------------------------------------------------ | ---------------------------- |
| `preflight`                      | 检测仅文档更改、更改的范围、更改的扩展，并构建 CI 清单                   | 始终在非草稿推送和 PR 上运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                   | 始终在非草稿推送和 PR 上运行 |
| `security-dependency-audit`      | 针对 npm 建议的无依赖生产 lockfile 审计                                  | 始终在非草稿推送和 PR 上运行 |
| `security-fast`                  | 快速安全作业的必需聚合                                                   | 始终在非草稿推送和 PR 上运行 |
| `build-artifacts`                | 构建 `dist/`、控制 UI、构建产物检查和可重用的下游产物                    | 与 Node 相关的更改           |
| `checks-fast-core`               | 快速 Linux 正确性通道，例如捆绑/插件契约/协议检查                        | 与 Node 相关的更改           |
| `checks-fast-contracts-channels` | 分片渠道契约检查，具有稳定的聚合检查结果                                 | 与 Node 相关的更改           |
| `checks-node-extensions`         | 跨扩展套件的完整捆绑插件测试分片                                         | 与 Node 相关的更改           |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括渠道、捆绑、合约和扩展通道                     | 与 Node 相关的更改           |
| `check`                          | 分片的主本地门控等效项：prod 类型、lint、guards、test 类型和严格冒烟测试 | 与 Node 相关的更改           |
| `check-additional`               | 架构、边界、扩展表面 guards、包边界和 gateway-watch 分片                 | 与 Node 相关的更改           |
| `build-smoke`                    | 内置 CLI 冒烟测试和启动内存冒烟测试                                      | 与 Node 相关的更改           |
| `checks`                         | 内置产物渠道测试的验证器                                                 | 与 Node 相关的更改           |
| `checks-node-compat-node22`      | Node 22 兼容性构建和冒烟通道                                             | 发布的手动 CI 调度           |
| `check-docs`                     | 文档格式化、lint 和损坏链接检查                                          | 文档已更改                   |
| `skills-python`                  | 用于支持 Python 的技能的 Ruff + pytest                                   | 与 Python 技能相关的更改     |
| `checks-windows`                 | Windows 特定的进程/路径测试以及共享运行时导入说明符回归测试              | 与 Windows 相关的更改        |
| `macos-node`                     | 使用共享内置产物的 macOS TypeScript 测试通道                             | 与 macOS 相关的更改          |
| `macos-swift`                    | 用于 macOS 应用的 Swift lint、构建和测试                                 | 与 macOS 相关的更改          |
| `android`                        | 针对两种风格的 Android 单元测试以及一个 debug APK 构建                   | 与 Android 相关的更改        |
| `test-performance-agent`         | 受信任活动后的每日 Codex 慢速测试优化                                    | 主 CI 成功或手动调度         |

手动 CI 调度运行与正常 CI 相同的作业图，但强制开启所有限定范围的通道：Linux Node 分片、bundled-plugin 分片、渠道合约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Android 和 Control UI i18n。手动运行使用唯一的并发组，因此发布候选版本的完整套件不会因同一引用上的另一次推送或 PR 运行而被取消。可选的 `target_ref` 输入允许受信任的调用者使用所选调度引用中的工作流文件，针对分支、标签或完整提交 SHA 运行该图。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 快速失败顺序

作业的顺序经过安排，以便在运行昂贵的检查之前让廉价的检查先失败：

1. `preflight` 决定了哪些通道实际上存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，而不是独立的作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待较重的构建产物和平台矩阵作业。
3. `build-artifacts` 与快速的 Linux 通道重叠，因此下游消费者可以在共享构建准备就绪后立即开始。
4. 较重的平台和运行时通道随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
手动调度会跳过变更作用域检测，并使预检清单表现得好像每个作用域区域都发生了变化一样。
CI 工作流编辑会验证 Node CI 图以及工作流 lint，但不会自行强制 Windows、Android 或 macOS 原生构建；这些平台通道仍局限于平台源代码的变更。
仅 CI 路由编辑、选定的廉价核心测试固件编辑以及窄范围的插件契约助手/测试路由编辑使用快速的仅 Node 清单路径：预检、安全和单个 `checks-fast-core` 任务。当变更的文件仅限于快速任务直接练习的路由或助手表面时，该路径会避免构建产物、Node 22 兼容性、渠道契约、完整的核心分片、打包插件分片以及额外的保护矩阵。
Windows Node 检查仅限于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行器助手、包管理器配置以及执行该通道的 CI 工作流表面；无关的源代码、插件、安装冒烟和仅测试的变更保留在 Linux Node 通道上，这样它们就不会为已被常规测试分片演练过的覆盖率占用 16-vCPU Windows 运行器。
独立的 `install-smoke` 工作流通过自己的 `preflight` 作业重用相同的作用域脚本。它将冒烟覆盖率分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。针对 Docker/package 表面、打包插件 package/manifest 变更以及 Docker 冒烟作业演练的核心插件/渠道/gateway/Plugin SDK 表面，拉取请求运行快速路径。仅源代码的打包插件变更、仅测试的编辑和仅文档的编辑不会占用 Docker 运行器。快速路径构建一次根 Dockerfile 镜像，检查 CLI，运行代理删除共享工作区 CLI 冒烟，运行容器 gateway-network e2e，验证打包的扩展 build arg，并在每个场景的 Docker 运行分别受到限制的情况下，在 240 秒的聚合命令超时内运行受限的打包插件 Docker 配置文件。完整路径保留了针对每日计划运行、手动调度、工作流调用发布检查以及真正涉及安装程序/package/Docker 表面的拉取请求的 QR package 安装和安装程序 Docker/update 覆盖率。`main` 推送（包括合并提交）不会强制完整路径；当变更作用域逻辑在推送时请求完整覆盖率时，工作流保留快速 Docker 冒烟，并将完整安装冒烟留给每日或发布验证。慢速 Bun 全局安装 image-提供商 冒烟由 `run_bun_global_install_smoke` 单独控制；它在每日计划上以及从发布检查工作流运行，并且手动 `install-smoke` 调度可以选择加入，但拉取请求和 `main` 推送不会运行它。QR 和安装程序 Docker 测试保留它们自己专注于安装的 Dockerfiles。本地 `test:docker:all` 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：用于安装程序/update/plugin-dependency 通道的裸 Node/Git 运行器，以及将同一 tarball 安装到 `/app` 的功能镜像，用于正常功能通道。Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，并且运行器仅执行选定的计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道；使用 `OPENCLAW_DOCKER_ALL_PARALLELISM` 调整默认的 10 个主池插槽计数，并使用 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 调整对提供商敏感的 10 个尾部池插槽计数。重型通道上限默认为 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，这样 npm 安装和多服务通道不会过度提交 Docker，而较轻的通道仍会填满可用插槽。重于有效上限的单个通道仍可以从空池开始，然后单独运行直到释放容量。通道启动默认错开 2 秒，以避免本地 Docker 守护进程创建风暴；可以使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或另一个毫秒值覆盖。本地聚合预检 Docker，删除陈旧的 OpenClaw E2E 容器，发出活动通道状态，保留通道计时用于最长优先排序，并支持 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 用于调度器检查。默认情况下，它在第一次失败后停止调度新的池化通道，并且每个通道都有 120 分钟的回退超时，可以使用 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆盖；选定的实时/尾部通道使用更严格的每通道上限。`OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` 运行精确的调度器通道，包括仅发布通道（如 `install-e2e`）和拆分的打包更新通道（如 `bundled-channel-update-acpx`），同时跳过清理冒烟，以便代理可以重现一个失败的通道。可重用的实时/E2E 工作流询问 `scripts/test-docker-all.mjs --plan-json` 需要哪些包、镜像种类、实时镜像、通道和凭据覆盖率，然后 `scripts/docker-e2e.mjs` 将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包产物，要么从 `package_artifact_run_id` 下载包产物；验证 tarball 清单；当计划需要已安装包的通道时，通过 Blacksmith 的 Docker 层缓存构建并推送带包摘要标记的裸/功能 GHCR Docker E2E 镜像；并重用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。`Package Acceptance` 工作流是高级包网关：它从 npm、受信任的 `package_ref`、HTTPS tarball 加 SHA-256 或先前的工件解析候选者，然后将该单个 `package-under-test` 工件传递给可重用的 Docker E2E 工作流。它将 `workflow_ref` 与 `package_ref` 分开，以便当前的接受逻辑可以验证较旧的受信任提交，而无需检出旧的工作流代码。发布检查针对目标引用运行自定义包接受增量：打包渠道兼容性、脱机插件固件以及针对已解析 tarball 的 Telegram 包 QA。发布路径 Docker 套件使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行四个分块作业，因此每个块仅提取其所需的镜像种类，并通过同一加权调度器（`OPENCLAW_DOCKER_ALL_PROFILE=release-path`、`OPENCLAW_DOCKER_ALL_CHUNK=core|package-update|plugins-runtime|bundled-channels`）执行多个通道。当完整的发布路径覆盖率请求时，OpenWebUI 被合并到 `plugins-runtime` 中，并且仅针对 OpenWebUI 专用调度保留独立的 `openwebui` 块。`package-update` 块将安装程序 E2E 拆分为 `install-e2e-openai` 和 `install-e2e-anthropic`；`install-e2e` 仍是聚合的手动重新运行别名。`bundled-channels` 块运行拆分的 `bundled-channel-*` 和 `bundled-channel-update-*` 通道，而不是串行的多合一 `bundled-channel-deps` 通道；`plugins-integrations` 仍是手动重新运行的旧版聚合别名。每个块都上传 `.artifacts/docker-tests/`，其中包含通道日志、计时、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢通道表和每通道重新运行命令。工作流 `docker_lanes` 输入针对准备好的镜像（而不是分块作业）运行选定的通道，这将失败通道的调试范围限制为一个目标 Docker 作业，并为该运行准备、下载或重用包产物；如果选定的通道是实时 Docker 通道，则目标作业为该重新运行在本地构建实时测试镜像。生成的每通道 GitHub 重新运行命令（当这些值存在时）包括 `package_artifact_run_id`、`package_artifact_name` 和准备好的镜像输入，因此失败的通道可以重用失败运行中的确切包和镜像。使用 `pnpm test:docker:rerun <run-id>` 从 Docker 运行下载 GitHub 工件并打印组合/每通道目标重新运行命令；使用 `pnpm test:docker:timings <summary.json>` 获取慢通道和阶段关键路径摘要。计划的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。打包更新矩阵按更新目标拆分，以便重复的 npm 更新和修复程序修复传递可以与其他打包检查分片。

本地变更通道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地检查关卡对架构边界的要求比广泛的 CI 平台范围更严格：核心生产变更运行 core prod 和 core test typecheck 以及 core lint/guards，核心测试专用变更仅运行 core test typecheck 以及 core lint，扩展生产变更运行 extension prod 和 extension test typecheck 以及 extension lint，而扩展测试专用变更运行 extension test typecheck 以及 extension lint。公共 Plugin SDK 或 plugin-contract 的变更会扩展至 extension typecheck，因为扩展依赖于这些核心契约，但 Vitest extension sweeps 是显式的测试工作。仅包含 Release metadata 的版本升级运行针对 version/config/root-dependency 的检查。未知的 root/config 变更会自动回退到所有检查通道。

手动 CI 调度会运行 `checks-node-compat-node22` 作为发布候选版本的兼容性覆盖。普通的拉取请求和 `main` 推送会跳过该通道，并将矩阵集中在 Node 24 test/渠道 通道上。

最慢的 Node 测试家族被拆分或平衡，以确保每个作业保持较小而不会过度预留运行器：渠道契约作为三个加权分片运行，捆绑插件测试在六个扩展工作器之间平衡，小型核心单元车道成对运行，自动回复作为四个平衡的工作器运行，且回复子树被拆分为 agent-runner、dispatch 和 commands/state-routing 分片，而代理网关/插件配置则分布在现有的仅源代码代理 Node 作业上，而不是等待构建的产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件全能配置。扩展分片作业一次最多运行两个插件配置组，每组一个 Vitest 工作器，并配备更大的 Node 堆，以便导入繁重的插件批次不会产生额外的 CI 作业。广泛的代理车道使用共享的 Vitest 文件并行调度程序，因为它由导入/调度主导，而不是由单个慢速测试文件拥有。`runtime-config` 与 infra core-runtime 分片一起运行，以防止共享运行时分片拥有尾部。包含模式分片使用 CI 分片名称记录计时条目，以便 `.artifacts/vitest-shard-timings.json` 可以区分整个配置和过滤后的分片。`check-additional` 将包边界编译/金丝雀工作保持在一起，并将运行时拓扑架构与 Gateway(网关) 监视覆盖率分开；边界守护分片在一个作业内并发运行其小型独立守护程序。Android 监视、渠道测试和核心支持边界分片在 `dist/` 和 `dist-runtime/` 已经构建后在 `build-artifacts` 内并发运行，保留其旧的检查名称作为轻量级验证器作业，同时避免两个额外的 Blacksmith 工作器和第二个产物消费者队列。
Android CI 同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play 调试 APK。第三方风格没有单独的源集或清单；其单元测试车道仍然使用 SMS/通话日志 BuildConfig 标志编译该风格，同时避免在每个与 GitHub 相关的推送上重复执行调试 APK 打包作业。
当更新的推送到达同一 PR 或 `main` 引用时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一引用的最新运行也失败，否则请将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，以便它们仍然报告正常的分片失败，但在整个工作流已被取代后不会排队。
自动 CI 并发键已版本化（`CI-v7-*`），因此旧队列组中的 GitHub 端僵尸无法无限期阻止较新的主运行。手动全套运行使用 `CI-manual-v1-*` 并且不取消正在进行的运行。

## 运行器

| 运行器                           | 作业                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`，快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`），快速协议/合约/捆绑包检查，分片渠道合约检查，`check` 分片（lint 除外），`check-additional` 分片和聚合，Node 测试聚合验证器，文档检查，Python 技能，workflow-sanity，labeler，auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`，build-smoke，Linux Node 测试分片，捆绑插件测试分片，`android`                                                                                                                                                                                                                                                                                                 |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，其 CPU 密集度仍然很高，以至于 8 vCPU 的成本超过了节省的成本；install-smoke Docker 构建，其中 32-vCPU 排队时间的成本超过了节省的成本                                                                                                                                                                                                                                |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                 |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 上的 `openclaw/openclaw`；fork 回退到 `macos-latest`                                                                                                                                                                                                                                                                                                                |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 上的 `openclaw/openclaw`；fork 回退到 `macos-latest`                                                                                                                                                                                                                                                                                                               |

## 本地等效项

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:changed   # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## 相关

- [安装概述](/zh/install)
- [发布渠道](/zh/install/development-channels)
