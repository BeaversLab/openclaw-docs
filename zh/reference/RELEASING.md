---
title: "发布检查清单"
summary: "针对 npm + macOS 应用的分步发布检查清单"
read_when:
  - Cutting a new npm release
  - Cutting a new macOS app release
  - Verifying metadata before publishing
---

# 发布检查清单 (npm + macOS)

默认使用 Node 24 从仓库根目录运行 `pnpm`。为了保持兼容性，目前仍支持 Node 22 LTS（当前为 `22.16+`）。在标记/发布前请保持工作树干净。

## 操作人员触发

当操作人员说“发布”时，立即执行此飞行前检查（除非受阻，否则不要问额外的问题）：

- 阅读此文档并 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量，并确认 `SPARKLE_PRIVATE_KEY_FILE` + App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应位于 `~/.profile`）。
- 如需要，请使用来自 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 的 Sparkle 密钥。

## 版本控制

当前的 OpenClaw 版本使用基于日期的版本控制。

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
  - 仓库历史中的示例：`v2026.2.26`, `v2026.3.8`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
  - 仓库历史中的示例：`v2026.2.15-beta.1`, `v2026.3.8-beta.1`
- 在任何地方都使用相同的版本字符串，在不使用 Git 标签的地方去掉前缀 `v`：
  - `package.json`： `2026.3.8`
  - Git 标签： `v2026.3.8`
  - GitHub 发布标题： `openclaw 2026.3.8`
- 不要对月份或日期进行零填充。使用 `2026.3.8`，而不是 `2026.03.08`。
- Stable 和 beta 是 npm 的 dist-tags，不是单独的发布线：
  - `latest` = 稳定版
  - `beta` = 预发布/测试版
- Dev 是 `main` 的移动头指针，而不是普通的 git 标记发布。
- 发布工作流会强制执行当前的稳定版/beta 标签格式，并拒绝 CalVer 日期距离发布日期超过 2 个 UTC 日历日的版本。

历史记录说明：

- 较旧的标签如 `v2026.1.11-1`、 `v2026.2.6-3` 和 `v2.0.0-beta2` 存在于仓库历史中。
- 将这些视为遗留标签模式。新发布应使用 `vYYYY.M.D` 作为稳定版，使用 `vYYYY.M.D-beta.N` 作为测试版。

1. **版本与元数据**

- [ ] 更新 `package.json` 版本（例如， `2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync` 以对齐扩展包版本 + 更新日志。
- [ ] 更新 [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) 中的 CLI/版本字符串，以及 [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts) 中的 Baileys 用户代理。
- [ ] 确认包元数据（名称、描述、仓库、关键词、许可证）以及 `bin` 映射指向 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs) 适用于 `openclaw`。
- [ ] 如果依赖项发生了变化，运行 `pnpm install` 以确保 `pnpm-lock.yaml` 是最新的。

2. **构建与产物**

- [ ] 如果 A2UI 输入发生了变化，运行 `pnpm canvas:a2ui:bundle` 并提交任何更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（重新生成 `dist/`）。
- [ ] 验证 npm 包 `files` 包含所有必需的 `dist/*` 文件夹（特别是用于 headless node + ACP CLI 的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认 `dist/build-info.json` 存在并包含预期的 `commit` 哈希值（CLI banner 在 npm 安装时使用此哈希）。
- [ ] 可选：在构建之后 `npm pack --pack-destination /tmp`；检查压缩包内容并将其保留以备 GitHub 发布使用（**不要**提交它）。

3. **变更日志与文档**

- [ ] 更新 `CHANGELOG.md` 以包含面向用户的亮点（如果文件缺失则创建它）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前的 CLI 行为相匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test`（或者如果您需要覆盖率输出，则运行 `pnpm test:coverage`）
- [ ] `pnpm release:check`（验证 npm pack 内容）
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速通道；发布前必须执行）
  - 如果紧邻的上一个 npm 发布版本已知损坏，请为预安装步骤设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1`。
- [ ] （可选）完整安装程序冒烟测试（增加非 root + CLI 覆盖率）：`pnpm test:install:smoke`
- [ ] （可选）安装程序端到端测试（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，进行入门，然后运行真实的工具调用）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个密钥；运行两个提供商）
- [ ] （可选）如果您的更改影响发送/接收路径，请抽查 Web 网关。

5. **macOS 应用 (Sparkle)**

- [ ] 构建并对 macOS 应用进行签名，然后将其打包为 zip 以供分发。
- [ ] 生成 Sparkle appcast（HTML 注释通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)）并更新 `appcast.xml`。
- [ ] 准备好应用 zip（以及可选的 dSYM zip）以附加到 GitHub 版本中。
- [ ] 请遵循 [macOS release](/zh/en/platforms/mac/release) 中的确切命令和所需的环境变量。
  - `APP_BUILD` 必须是数字 + 单调递增（没有 `-beta`），以便 Sparkle 正确比较版本。
  - 如果要进行公证，请使用从 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（参见 [macOS release](/zh/en/platforms/mac/release)）。

6. **发布 (npm)**

- [ ] 确认 git 状态是干净的；根据需要提交并推送。
- [ ] 确认为 `openclaw` 包配置了 npm 可信发布。
- [ ] 推送匹配的 git 标签以触发 `.github/workflows/openclaw-npm-release.yml`。
  - 稳定版标签发布到 npm `latest`。
  - Beta 版标签发布到 npm `beta`。
  - 如果标签与 `package.json` 不匹配、不在 `main` 上，或者其 CalVer 日期距离发布日期超过 2 个 UTC 日历日，工作流程将拒绝这些标签。
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags` 和 `npx -y openclaw@X.Y.Z --version`（或 `--help`）。

### 故障排除（来自 2.0.0-beta2 发布的说明）

- **npm pack/publish 挂起或生成巨大的 tarball**：`dist/OpenClaw.app` 中的 macOS 应用程序包（以及发布 zip 文件）会被卷入包中。通过 `package.json` `files` 白名单化发布内容来修复（包含 dist 子目录、docs、skills；排除应用程序包）。通过 `npm pack --dry-run` 确认 `dist/OpenClaw.app` 未被列出。
- **npm auth web loop for dist-tags**：使用传统身份验证以获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证失败并显示 `ECOMPROMISED: Lock compromised`**：使用全新的缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **Tag 在后期修复后需要重新指向**：强制更新并推送 tag，然后确保 GitHub 发布资源仍然匹配：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7. **GitHub 发布 + appcast**

- [ ] 标记并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
  - 推送 tag 也会触发 npm 发布工作流。
- [ ] 为 `vX.Y.Z` 创建/刷新 GitHub 发布版本，并使用 **标题 `openclaw X.Y.Z`**（不仅仅是标签）；正文应包含该版本的 **完整** 更新日志部分（Highlights + Changes + Fixes），内容需内联（无裸链接），并且 **正文中不得重复标题**。
- [ ] 附加构件：`npm pack` 压缩包（可选）、`OpenClaw-X.Y.Z.zip` 和 `OpenClaw-X.Y.Z.dSYM.zip`（如果已生成）。
- [ ] 提交更新后的 `appcast.xml` 并将其推送（Sparkle 从 main 获取更新）。
- [ ] 在一个干净的临时目录中（无 `package.json`），运行 `npx -y openclaw@X.Y.Z send --help` 以确认安装/CLI 入口点正常工作。
- [ ] 公告/分享发布说明。

## 插件发布范围 (npm)

我们仅在 `@openclaw/*` 作用域下发布 **现有的 npm 插件**。未在 npm 上发布的捆绑插件仍保持 **仅限磁盘树**（仍随附在 `extensions/**` 中）。

推导列表的流程：

1. `npm search @openclaw --json` 并捕获包名称。
2. 与 `extensions/*/package.json` 名称进行比较。
3. 仅发布**交集**部分（即已在 npm 上的）。

当前的 npm 插件列表（根据需要更新）：

- @openclaw/bluebubbles
- @openclaw/diagnostics-otel
- @openclaw/discord
- @openclaw/feishu
- @openclaw/lobster
- @openclaw/matrix
- @openclaw/msteams
- @openclaw/nextcloud-talk
- @openclaw/nostr
- @openclaw/voice-call
- @openclaw/zalo
- @openclaw/zalouser

发行说明还必须指出 **非默认开启** 的 **新的可选捆绑插件**（例如：`tlon`）。
