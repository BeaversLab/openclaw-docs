---
title: "发布清单"
summary: "用于 npm + macOS 应用发布的分步清单"
read_when:
  - Cutting a new npm release
  - Cutting a new macOS app release
  - Verifying metadata before publishing
---

# 发布检查清单 (npm + macOS)

默认在 Node 24 环境下，从仓库根目录使用 `pnpm`。当前为 `22.16+` 的 Node 22 LTS 仍出于兼容性原因受支持。在打标签/发布前请保持工作树干净。

## 操作人员触发

当操作人员说“发布”时，立即执行此飞行前检查（除非受阻，否则不要问额外的问题）：

- 阅读此文档并 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量，并确认 `SPARKLE_PRIVATE_KEY_FILE` 和 App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应位于 `~/.profile`）。
- 如有需要，使用 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 中的 Sparkle 密钥。

## 版本控制

当前的 OpenClaw 版本使用基于日期的版本控制。

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
  - 仓库历史中的示例：`v2026.2.26`、`v2026.3.8`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
  - 仓库历史中的示例：`v2026.2.15-beta.1`、`v2026.3.8-beta.1`
- 回退更正标签：`vYYYY.M.D-N`
  - 仅当已发布的不可变版本“消耗”了原始的稳定标签且您无法重复使用它时，才作为最后手段的恢复标签使用。
  - npm 包版本保持 `YYYY.M.D`；`-N` 后缀仅用于 git 标签和 GitHub 发布。
  - 对于正常的预发布迭代，首选 Beta 版，然后在准备好后发布一个干净的稳定标签。
- 在各处使用相同的版本字符串，但在不使用 Git 标签的地方去掉开头的 `v`：
  - `package.json`：`2026.3.8`
  - Git 标签：`v2026.3.8`
  - GitHub 发布标题：`openclaw 2026.3.8`
- 不要对月份或日期进行零填充。使用 `2026.3.8`，而不是 `2026.03.08`。
- Stable 和 beta 是 npm dist-tags（分发标签），不是独立的发布线：
  - `latest` = stable
  - `beta` = prerelease/testing（预发布/测试）
- Dev 是 `main` 的移动头指针，不是普通的 git 标记发布。
- 标签触发的预览运行接受稳定版、Beta 版和回退更正标签，并拒绝其 CalVer 日期距离发布日期超过 2 个 UTC 日历日的版本。

历史记录：

- 仓库历史中存在诸如 `v2026.1.11-1`、`v2026.2.6-3` 和 `v2.0.0-beta2` 之类的旧标签。
- 将更正标签视为仅用于回退的应急手段。新发布仍应使用 `vYYYY.M.D` 表示稳定版，使用 `vYYYY.M.D-beta.N` 表示 Beta 版。

1. **版本与元数据**

- [ ] 升级 `package.json` 版本（例如，`2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync` 以同步扩展包版本和变更日志。
- [ ] 更新 [`src/version.ts`](https://github.com/openclaw/openclaw/blob/main/src/version.ts) 中的 CLI/版本字符串，以及 [`src/web/session.ts`](https://github.com/openclaw/openclaw/blob/main/src/web/session.ts) 中的 Baileys 用户代理。
- [ ] 确认包元数据（名称、描述、仓库、关键词、许可证）和 `bin` 映射指向 `openclaw` 的 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)。
- [ ] 如果依赖项发生了更改，请运行 `pnpm install` 以确保 `pnpm-lock.yaml` 是最新的。

2. **构建与产物**

- [ ] 如果 A2UI 输入发生了更改，请运行 `pnpm canvas:a2ui:bundle` 并提交任何更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（重新生成 `dist/`）。
- [ ] 验证 npm 包 `files` 包含所有必需的 `dist/*` 文件夹（特别是用于无头节点 + ACP CLI 的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认 `dist/build-info.json` 存在并包含预期的 `commit` 哈希值（CLI 横幅在 npm 安装时会使用此哈希值）。
- [ ] 可选：构建后运行 `npm pack --pack-destination /tmp`；检查 tarball 内容并将其保留以供 GitHub 发布使用（请**勿**提交它）。

3. **更新日志与文档**

- [ ] 使用面向用户的亮点更新 `CHANGELOG.md`（如果文件缺失则创建）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前的 CLI 行为匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test`（或者如果您需要覆盖率输出，则运行 `pnpm test:coverage`）
- [ ] `pnpm release:check`（验证 npm pack 内容）
- [ ] 如果 `pnpm config:docs:check` 作为发布验证的一部分失败，并且配置表面的更改是有意的，请运行 `pnpm config:docs:gen`，检查 `docs/.generated/config-baseline.json` 和 `docs/.generated/config-baseline.jsonl`，提交更新的基线，然后重新运行 `pnpm release:check`。
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必需）
  - 如果紧接的上一个 npm 版本已知存在问题，请为预安装步骤设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1`。
- [ ] （可选）完整安装程序冒烟测试（增加非 root + CLI 覆盖率）：`pnpm test:install:smoke`
- [ ] （可选）安装程序 E2E（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，进行入职，然后运行真实的工具调用）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个密钥；运行两个提供者）
- [ ] （可选）如果您的更改影响发送/接收路径，请抽查 Web 网关。

5. **macOS 应用 (Sparkle)**

- [ ] 构建并签署 macOS 应用，然后将其压缩以供分发。
- [ ] 生成 Sparkle appcast（通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 生成 HTML 说明）并更新 `appcast.xml`。
- [ ] 准备好应用 zip 文件（以及可选的 dSYM zip 文件），以便附加到 GitHub 版本中。
- [ ] 请参阅 [macOS release](/en/platforms/mac/release) 了解确切的命令和所需的环境变量。
  - `APP_BUILD` 必须是数字 + 单调递增的（不能有 `-beta`），以便 Sparkle 正确比较版本。
  - 如果要进行公证，请使用从 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（请参阅 [macOS release](/en/platforms/mac/release)）。

6. **发布 (npm)**

- [ ] 确认 git 状态是干净的；根据需要提交并推送。
- [ ] 确认为 `openclaw` 包配置了 npm 受信任发布。
- [ ] 不要在此工作流中依赖 `NPM_TOKEN` 密钥；发布任务使用 GitHub OIDC 受信任发布。
- [ ] 推送匹配的 git 标签以触发 `.github/workflows/openclaw-npm-release.yml` 中的预览运行。
- [ ] 在 `npm-release` 环境批准后，使用相同的标签手动运行 `OpenClaw NPM Release` 以进行发布。
  - 稳定标签发布到 npm `latest`。
  - Beta 标签发布到 npm `beta`。
  - 回退更正标签（如 `v2026.3.13-1`）映射到 npm 版本 `2026.3.13`。
  - 预览运行和手动发布运行都会拒绝无法映射回 `package.json`、不在 `main` 上，或者 CalVer 日期距离发布日期超过 2 个 UTC 日历日的标签。
  - 如果 `openclaw@YYYY.M.D` 已发布，回退更正标签对于 GitHub 版本和 Docker 恢复仍然有用，但 npm publish 不会重新发布该版本。
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags` 和 `npx -y openclaw@X.Y.Z --version`（或 `--help`）。

### 故障排除（来自 2.0.0-beta2 版本的说明）

- **npm pack/publish 挂起或生成巨大的 tarball**：`dist/OpenClaw.app`（以及发布 zip 包）中的 macOS 应用程序包会被卷入包中。通过 `package.json` `files` 将发布内容列入白名单来修复（包括 dist 子目录、docs、skills；排除应用程序包）。使用 `npm pack --dry-run` 确认未列出 `dist/OpenClaw.app`。
- **npm auth 针对 dist-tag 的 web 循环**：使用旧版身份验证以获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证失败并显示 `ECOMPROMISED: Lock compromised`**：使用全新的缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **后期修复后需要恢复标签**：如果原始稳定标签与不可变的 GitHub 发布绑定，则生成一个后备更正标签，如 `vX.Y.Z-1`，而不是尝试强制更新 `vX.Y.Z`。
  - 将 npm 包版本保持在 `X.Y.Z`；更正后缀仅用于 git 标签和 GitHub 发布。
  - 仅将此作为最后的手段。对于正常迭代，首选 beta 标签，然后创建一个干净的稳定版本。

7. **GitHub 发布 + appcast**

- [ ] 标记并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
  - 推送标签也会触发 npm 发布工作流。
- [ ] 为 `vX.Y.Z` 创建/刷新 GitHub 发布，标题为 **`openclaw X.Y.Z`**（不仅仅是标签）；正文应包含该版本的**完整**更新日志部分（Highlights + Changes + Fixes）、内联（无裸链接），并且**不得在正文中重复标题**。
- [ ] 附加工件：`npm pack` tarball（可选）、`OpenClaw-X.Y.Z.zip` 和 `OpenClaw-X.Y.Z.dSYM.zip`（如果已生成）。
- [ ] 提交更新的 `appcast.xml` 并将其推送（Sparkle 从 main 获取）。
- [ ] 从干净的临时目录（没有 `package.json`）中，运行 `npx -y openclaw@X.Y.Z send --help` 以确认安装/CLI 入口点正常工作。
- [ ] 公告/分享发布说明。

## 插件发布范围（npm）

我们仅发布 `@openclaw/*` 范围下的**现有 npm 插件**。未在 npm 上的打包插件保持**仅磁盘树**（仍然包含在
`extensions/**` 中）。

推导列表的过程：

1. `npm search @openclaw --json` 并捕获包名称。
2. 与 `extensions/*/package.json` 名称进行比较。
3. 仅发布**交集**部分（已在 npm 上）。

当前 npm 插件列表（根据需要更新）：

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

发布说明还必须指明**新的可选打包插件**，这些插件**默认未启用**（例如：`tlon`）。

import zh from "/components/footer/zh.mdx";

<zh />
