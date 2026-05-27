---
summary: "OpenClawOpenClaw 如何验证更新路径、软件包迁移以及插件安装/更新行为"
read_when:
  - Changing OpenClaw update, doctor, package acceptance, or plugin install behavior
  - Preparing or approving a release candidate
  - Debugging package update, plugin dependency cleanup, or plugin install regressions
title: "测试：更新和插件"
sidebarTitle: "更新和插件测试"
---

这是用于更新和插件验证的专门检查清单。目标很简单：证明可安装的软件包能够更新真实的用户状态，通过 `doctor` 修复陈旧的遗留状态，并且仍然可以从受支持的来源安装、加载、更新和卸载插件。

有关更广泛的测试运行器映射，请参阅 [Testing](/zh/help/testing)。有关实时提供商密钥和网络接触测试套件，请参阅 [Testing live](/zh/help/testing-live)。

## 我们要保护的内容

更新和插件测试保护以下契约：

- 软件包 tarball 是完整的，具有有效的 `dist/postinstall-inventory.json`，并且不依赖于未解压的仓库文件。
- 用户可以从较旧的已发布软件包迁移到候选软件包，而不会丢失配置、代理、会话、工作区、插件允许列表或渠道配置。
- `openclaw doctor --fix --non-interactive` 负责遗留清理和修复路径。启动时不应该增加针对陈旧插件状态的隐藏兼容性迁移。
- 插件安装适用于本地目录、git 仓库、npm 软件包以及 ClawHub 注册表路径。
- 插件 npm 依赖项安装在托管的 npm 根目录中，在信任之前进行扫描，并在卸载期间通过 npm 删除，以便提升的依赖项不会残留。
- 当没有任何更改时，插件更新是稳定的：安装记录、解析的来源、已安装的依赖项布局和启用状态保持不变。

## 开发过程中的本地验证

从小处着手：

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

对于插件安装、卸载、依赖项或软件包清单的更改，还要运行覆盖编辑接缝的针对性测试：

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

在任何软件包 Docker 轨道使用 tarball 之前，请验证软件包工件：

```bash
pnpm release:check
```

`release:check` 运行 config/docs/API 漂移检查，写入包 dist 清单，运行 `npm pack --dry-run`，拒绝禁止的打包文件，将 tarball 安装到临时前缀，运行 postinstall，并对捆绑的渠道入口点进行冒烟测试。

## Docker 车道

Docker 车道是产品级别的验证。它们在 Linux 容器内安装或更新真实的包，并通过 CLI 命令、Gateway(网关) 启动、HTTP 探针、RPC 状态和文件系统状态来断言行为。

在迭代过程中使用专注的车道：

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-restart-auth
pnpm test:docker:update-migration
```

重要车道：

- `test:docker:plugins` 验证插件安装冒烟测试、本地文件夹安装、
  本地文件夹更新跳过行为、具有预安装
  依赖项的本地文件夹、`file:` 包安装、带有 CLI 执行的 git 安装、git
  moving-ref 更新、具有提升传递
  依赖项的 npm 注册表安装、npm 更新空操作、格式错误的 npm 包元数据拒绝、
  本地 ClawHub 固件安装和更新空操作、marketplace 更新行为，
  以及 Claude-bundle 启用/检查。设置 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`
  以保持 ClawHub 模块隔离/离线。
- `test:docker:plugin-lifecycle-matrix` 在裸容器中安装候选包，通过 install、inspect、disable、enable、explicit upgrade、explicit downgrade 和 uninstall（删除插件代码后）运行 npm 插件。它记录每个阶段的 RSS 和 CPU 指标。
- `test:docker:plugin-update` 验证已安装的未更改插件在 `openclaw plugins update` 期间不会重新安装或丢失安装元数据。
- `test:docker:upgrade-survivor` 在脏的旧用户夹具上安装候选 tarball，运行包更新和非交互式 doctor，然后启动回环 Gateway(网关) 并检查状态保留。
- `test:docker:published-upgrade-survivor` 首先安装一个已发布的基线版本，通过内置的 `openclaw config set`Gateway(网关) 配置方案进行配置，将其更新到候选 tarball，运行 doctor 检查，检查旧版本清理，启动 Gateway(网关)，并探测 `/healthz`、`/readyz`RPC 和 RPC 状态。
- `test:docker:update-restart-auth`Gateway(网关) 安装候选包，启动一个受管理的 token-auth Gateway(网关)，为 `openclaw update --yes --json`Gateway(网关) 取消调用方网关认证环境变量，并要求候选更新命令在常规探测之前重启 Gateway(网关)。
- `test:docker:update-migration`DiscordTelegram 是侧重清理的已发布更新通道。它从配置好的 Discord/Telegram 风格的用户状态开始，运行基线 doctor 以便配置的插件依赖有机会实现，为配置的打包插件植入旧版插件依赖残留，更新到候选 tarball，并要求更新后 doctor 移除旧版依赖根目录。

有用的已发布升级幸存者变体：

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

可用的场景包括 `base`、`feishu-channel`、`bootstrap-persona`、`plugin-deps-cleanup`、`configured-plugin-installs`、`stale-source-plugin-shadow`、`tilde-log-path` 和 `versioned-runtime-deps`。在聚合运行中，`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` 会扩展到所有报告的问题型场景，包括配置插件的安装迁移。

完整的更新迁移有意与完整发布 CI 分开。当发布问题是“从 2026.4.23 开始的每个已发布的稳定版本是否都能更新到此候选版本并清理插件依赖残留？”时，请使用手动 `Update Migration` 工作流：

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## 包验收

Package Acceptance 是 GitHub 原生的软件包关卡。它将一个候选软件包解析为 GitHub`package-under-test`Docker 压缩包，记录版本和 SHA-256，然后针对该特定压缩包运行可复用的 Docker E2E 通道。工作流 harness 引用与软件包源引用是分离的，因此当前的测试逻辑可以验证较早的受信版本。

候选来源：

- `source=npm`：验证 `openclaw@beta`、`openclaw@latest` 或精确的已发布版本。
- `source=ref`：使用选定的当前 harness 打包受信分支、标签或提交。
- `source=url`：验证具有所需 `package_sha256` 的公共 HTTPS tarball。
  此路径拒绝 URL 凭证、非默认 HTTPS 端口、私有/内部
  主机名或 DNS/IP 结果、特殊用途 IP 空间和不安全的重定向。
- `source=trusted-url`：根据 `.github/package-trusted-sources.json` 中维护者拥有的策略
  验证具有所需 `package_sha256` 和 `trusted_source_id` 的 HTTPS tarball。请将其用于企业/私有
  镜像，而不是通过输入级别的允许私有
  开关来削弱 `source=url`。当由策略配置时，Bearer 身份验证使用固定的
  `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥。
- `source=artifact`：重用由另一个 Actions 运行上传的 tarball。

完整发布验证默认使用 `source=artifact`，它由解析的发布 SHA 构建。对于发布后证明，请传递
`package_acceptance_package_spec=openclaw@YYYY.M.D`，以便相同的升级矩阵
以已发布的 npm 包为目标。

发布检查调用包验收，并附带 package/update/restart/plugin 集：

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

当启用发布 soak 时，它们还会传递：

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

这使得包迁移、更新渠道切换、损坏的受管插件
容忍、过时的插件依赖清理、离线插件覆盖、插件
更新行为以及 Telegram 包 QA 能够在同一解析的构件上运行，而
无需让默认的发布包门控遍历每个已发布的版本。

`last-stable-4` 解析为最近四个稳定的 npm-发布的 OpenClaw 版本。发布包验收将 `2026.4.23` 固定为第一个插件更新兼容性边界，将 `2026.5.2` 固定为插件架构变动的边界，并将 `2026.4.15` 固定为较旧的 2026.4.1x 发布更新基准；解析器会去除已存在于最近四个版本中的固定项。若要详尽覆盖已发布更新的迁移，请在单独的更新迁移工作流中使用 `all-since-2026.4.23`，而不是使用完整发布 CI。当您还需要旧版预发布锚点时，`release-history` 仍可用于手动进行更广泛的采样。

当选择了多个已发布升级的幸存者基准时，可重用的 Docker 工作流会将每个基准分片到其自己的定向运行器作业中。每个基准分片仍运行所选的场景集，但日志和产物按基准保留，并且总耗时受限于最慢的分片，而不是一个大的串行作业。

在发布前验证候选项时，请手动运行包配置文件：

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines="last-stable-4 2026.4.23 2026.5.2 2026.4.15" \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

当发布问题涉及 MCP 通道、cron/subagent 清理、OpenAI 网络搜索或 OpenWebUI 时，请使用 `suite_profile=product`。仅当您需要完整的 Docker 发布路径覆盖时，才使用 `suite_profile=full`。

## 发布默认

对于发布候选项，默认的验证堆栈为：

1. `pnpm check:changed` 和 `pnpm test:changed` 用于源代码级回归。
2. `pnpm release:check` 用于包产物完整性。
3. 包验收 `package` 配置文件或用于安装/更新/重启/插件契约的 release-check 自定义包通道。
4. 跨操作系统发布检查，针对特定于操作系统的安装程序、新手引导和平台行为。
5. 仅当变更的涉及提供商或托管服务行为时，才使用实时套件。

在维护者机器上，广泛的门控和 Docker/包产品验证应在 Testbox 中运行，除非明确进行本地验证。

## 旧版兼容性

兼容性宽容度很窄且有时限：

- 通过 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，在包验收中可能会忽略已发布的包元数据缺口。
- 已发布的 `2026.4.26` 包可能会对已发布的本地构建元数据标记文件发出警告。
- 后续的包必须满足现代契约。相同的缺口将导致失败，而不是发出警告或跳过。

不要为这些旧形状添加新的启动迁移。添加或扩展 doctor 修复，然后在更新命令拥有重启权限时，使用 `upgrade-survivor`、`published-upgrade-survivor` 或 `update-restart-auth` 进行验证。

## 添加覆盖率

更改更新或插件行为时，在能够因正确原因失败的最低层添加覆盖率：

- 纯路径或元数据逻辑：在源代码旁边进行单元测试。
- 包清单或打包文件行为：`package-dist-inventory` 或 tarball 检查器测试。
- CLI 安装/更新行为：Docker 车道断言或装置。
- 已发布版本的迁移行为：`published-upgrade-survivor` 场景。
- 更新拥有的重启行为：`update-restart-auth`。
- 注册表/包源行为：`test:docker:plugins` 装置或 ClawHub 装置服务器。
- 依赖布局或清理行为：同时断言运行时执行和文件系统边界。npm 依赖项可能会被提升到受管理的 npm 根目录下，因此测试应证明根目录已被扫描/清理，而不是假设包本地 `node_modules` 树结构。

默认情况下，保持新的 Docker 装置是隔离的。使用本地装置注册表和虚假包，除非测试的目的是实时注册表行为。

## 故障分类

从工件标识开始：

- 包验收 `resolve_package` 摘要：源、版本、SHA-256 和工件名称。
- Docker 工件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、车道日志和重新运行命令。
- 升级幸存者摘要：`.artifacts/upgrade-survivor/summary.json`，包括基线版本、候选版本、场景、阶段计时和配方步骤。

相比于重新运行整个发布覆盖范围，更倾向于使用相同的构建包重新运行失败的确切通道。
