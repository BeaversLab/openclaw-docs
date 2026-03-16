---
title: "发布策略"
summary: "公开发布渠道、版本命名和节奏"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 发布策略

OpenClaw 有三个公开发布渠道：

- stable：发布到 npm `latest` 的带标签发布
- beta：发布到 npm `beta` 的预发布标签
- dev：`main` 的移动头指针

## 版本命名

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 不要对月份或日期进行零填充
- `latest` 表示当前的稳定 npm 发布
- `beta` 表示当前的预发布 npm 发布
- Beta 版本可能在 macOS 应用赶上之前发布

## 发布节奏

- 发布优先从 Beta 开始
- 仅在最新的 Beta 版本通过验证后才进行 Stable 发布
- 详细的发布流程、审批、凭据和恢复说明仅限维护者查看

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

维护人员使用 [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) 中的私有发布文档作为实际的操作手册。

- [ ] 如果 A2UI 输入发生变化，请运行 `pnpm canvas:a2ui:bundle` 并提交所有更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（重新生成 `dist/`）。
- [ ] 验证 npm 包 `files` 是否包含所有必需的 `dist/*` 文件夹（特别是用于无头节点 + ACP CLI 的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认 `dist/build-info.json` 存在并包含预期的 `commit` 哈希值（CLI 横幅在 npm 安装时会使用此值）。
- [ ] 可选：构建后运行 `npm pack --pack-destination /tmp`；检查压缩包内容并将其保留以供 GitHub 发布使用（请**不要**提交它）。

3. **变更日志与文档**

- [ ] 更新 `CHANGELOG.md` 以包含面向用户的亮点（如果文件不存在则创建）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前 CLI 行为匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test` （如果需要覆盖率输出，则使用 `pnpm test:coverage`）
- [ ] `pnpm release:check` （验证 npm 包内容）
- [ ] 如果 `pnpm config:docs:check` 作为发布验证的一部分失败，并且配置面的更改是故意的，请运行 `pnpm config:docs:gen`，查看 `docs/.generated/config-baseline.json` 和 `docs/.generated/config-baseline.jsonl`，提交更新的基线，然后重新运行 `pnpm release:check`。
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke` （Docker 安装冒烟测试，快速路径；发布前必需）
  - 如果已知紧邻的上一个 npm 发布版本已损坏，请为预安装步骤设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1`。
- [ ] （可选）完整安装程序冒烟测试（增加非 root + CLI 覆盖率）： `pnpm test:install:smoke`
- [ ] （可选）安装程序 E2E（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，进行入职，然后运行真实工具调用）：
  - `pnpm test:install:e2e:openai` （需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic` （需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e` （需要两个密钥；运行两个提供者）
- [ ] （可选）如果您的更改影响发送/接收路径，请抽查 Web 网关。

5. **macOS 应用 (Sparkle)**

- [ ] 构建并签名 macOS 应用，然后将其打包为 zip 以供分发。
- [ ] 生成 Sparkle appcast（通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 生成 HTML 说明）并更新 `appcast.xml`。
- [ ] 准备好应用 zip（以及可选的 dSYM zip）以便附加到 GitHub 发布版本。
- [ ] 请遵循 [macOS 发布](/en/platforms/mac/release) 中的确切命令和所需的环境变量。
  - `APP_BUILD` 必须是数字且单调递增的（没有 `-beta`），以便 Sparkle 正确比较版本。
  - 如果要进行公证，请使用从 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（请参阅 [API 版本发布](/en/platforms/mac/release)）。

6. **发布 (npm)**

- [ ] 确认 git 状态是干净的；如有需要，请提交并推送。
- [ ] 确认已为 `openclaw` 包配置了 npm 受信发布。
- [ ] 此工作流不要依赖 `NPM_TOKEN` 密钥；发布作业使用 GitHub OIDC 受信发布。
- [ ] 推送匹配的 git 标签以触发 `.github/workflows/openclaw-npm-release.yml` 中的预览运行。
- [ ] 在 `npm-release` 环境批准后，使用相同的标签手动运行 `OpenClaw NPM Release` 进行发布。
  - 稳定标签发布到 npm `latest`。
  - Beta 标签发布到 npm `beta`。
  - 回退更正标签（如 `v2026.3.13-1`）映射到 npm 版本 `2026.3.13`。
  - 预览运行和手动发布运行都会拒绝无法映射回 `package.json`、不在 `main` 上，或者其 CalVer 日期距离发布日期超过 2 个 UTC 日历日的标签。
  - 如果 `openclaw@YYYY.M.D` 已发布，回退更正标签对于 GitHub 版本发布和 Docker 恢复仍然有用，但 npm publish 不会重新发布该版本。
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags` 和 `npx -y openclaw@X.Y.Z --version`（或 `--help`）。

### 故障排除（2.0.0-beta2 版本发布的注意事项）

- **npm pack/publish 挂起或生成巨大的 tarball**：`dist/OpenClaw.app`（以及发布 zip 包）中的 macOS 应用程序包被卷入了软件包中。请通过 `package.json` `files` 将发布内容列入白名单来修复此问题（包括 dist 子目录、docs、skills；排除应用程序包）。通过 `npm pack --dry-run` 确认未列出 `dist/OpenClaw.app`。
- **npm auth web 循环（针对 dist-tags）**：使用旧版身份验证以获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证失败，出现 `ECOMPROMISED: Lock compromised`**：请使用新的缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **Tag needs recovery after a late fix**：如果原始的稳定标签关联到一个不可变的 GitHub 版本，请创建一个回退修正标签，如 `vX.Y.Z-1`，而不是尝试强制更新 `vX.Y.Z`。
  - 保持 npm 包版本为 `X.Y.Z`；修正后缀仅用于 git 标签和 GitHub 版本。
  - 仅将此作为最后手段。对于正常迭代，首选 beta 标签，然后进行一个干净的稳定版本发布。

7. **GitHub 版本 + appcast**

- [ ] 标记并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
  - 推送标签也会触发 npm 发布工作流。
- [ ] 为 `vX.Y.Z` 创建/刷新 GitHub 版本，标题为 **title `openclaw X.Y.Z`**（不仅仅是标签）；正文应包含该版本的**完整**更新日志部分（Highlights + Changes + Fixes），内联（不要只有链接），并且**不得在正文中重复标题**。
- [ ] 附加工件：`npm pack` 压缩包（可选）、`OpenClaw-X.Y.Z.zip` 和 `OpenClaw-X.Y.Z.dSYM.zip`（如果已生成）。
- [ ] 提交更新后的 `appcast.xml` 并推送（Sparkle 从 main 获取信息）。
- [ ] 在一个干净的临时目录（无 `package.json`）中，运行 `npx -y openclaw@X.Y.Z send --help` 以确认安装/CLI 入口点工作正常。
- [ ] 公告/分享发布说明。

## 插件发布范围 (npm)

我们仅在 `@openclaw/*` 范围内发布**现有的 npm 插件**。未在 npm 上发布的捆绑插件仅保留**仅磁盘树（disk-tree only）**（仍包含在
`extensions/**` 中）。

推导列表的过程：

1. 运行 `npm search @openclaw --json` 并捕获包名称。
2. 与 `extensions/*/package.json` 名称进行比较。
3. 仅发布**交集**部分（已在 npm 上）。

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

发布说明还必须指出**新的可选捆绑插件**，这些插件**默认未开启**（例如：`tlon`）。

import zh from "/components/footer/zh.mdx";

<zh />
