---
title: "发布清单（npm + macOS）"
summary: "npm + macOS 应用发布的逐步清单"
read_when:
  - 发布新的 npm 版本
  - 发布新的 macOS 应用版本
  - 发布前验证元数据
---

# 发布清单（npm + macOS）

在仓库根目录使用 `pnpm`（Node 22+）。打 tag/publish 前保持工作区干净。

## Operator 触发

当 operator 说 “release” 时，立即执行以下预检查（除非被阻塞，否则不额外提问）：

- 阅读本文档与 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量，并确认 `SPARKLE_PRIVATE_KEY_FILE` + App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应放在 `~/.profile`）。
- 如需，使用 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 中的 Sparkle keys。

1. **版本与元数据**

- [ ] 提升 `package.json` 版本（例如 `2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync` 对齐扩展包版本 + changelog。
- [ ] 更新 CLI/version 字符串：[`src/cli/program.ts`](https://github.com/openclaw/openclaw/blob/main/src/cli/program.ts) 与 [`src/provider-web.ts`](https://github.com/openclaw/openclaw/blob/main/src/provider-web.ts) 中的 Baileys user agent。
- [ ] 确认 package 元数据（name、description、repository、keywords、license）与 `bin` 映射指向 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)。
- [ ] 若依赖变更，运行 `pnpm install` 更新 `pnpm-lock.yaml`。

2. **构建与产物**

- [ ] 若 A2UI 输入有变更，运行 `pnpm canvas:a2ui:bundle` 并提交更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（生成 `dist/`）。
- [ ] 验证 npm 包 `files` 包含所有必须的 `dist/*` 文件夹（特别是 `dist/node-host/**` 与 `dist/acp/**`，用于 headless node + ACP CLI）。
- [ ] 确认 `dist/build-info.json` 存在且包含期望的 `commit` hash（CLI banner 用于 npm 安装）。
- [ ] 可选：构建后 `npm pack --pack-destination /tmp`；检查 tarball 内容并保存以用于 GitHub release（**不要**提交它）。

3. **Changelog 与文档**

- [ ] 更新 `CHANGELOG.md`，加入面向用户的亮点（若不存在则创建）；条目必须按版本严格降序。
- [ ] 确保 README 示例/参数与当前 CLI 行为一致（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test`（或 `pnpm test:coverage` 如需覆盖率输出）
- [ ] `pnpm release:check`（验证 npm pack 内容）
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必做）
  - 若上一个 npm 版本已知损坏，可设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1` 以跳过预安装步骤。
- [ ] （可选）完整 installer 冒烟（包含非 root + CLI 覆盖）：`pnpm test:install:smoke`
- [ ] （可选）Installer E2E（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，onboard，然后执行真实工具调用）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个 key；运行两个 provider）
- [ ] （可选）若变更影响发送/接收路径，手动检查 web gateway。

5. **macOS app（Sparkle）**

- [ ] 构建并签名 macOS app，然后打包 zip 用于分发。
- [ ] 生成 Sparkle appcast（通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 生成 HTML 说明），并更新 `appcast.xml`。
- [ ] 保留 app zip（及可选 dSYM zip）以便附加到 GitHub release。
- [ ] 按 [macOS release](/zh/platforms/mac/release) 中的命令与环境变量执行。
  - `APP_BUILD` 必须为纯数字且单调递增（不含 `-beta`），以保证 Sparkle 正确比较版本。
  - 如需公证，使用由 App Store Connect API 环境变量创建的 `openclaw-notary` keychain profile（见 [macOS release](/zh/platforms/mac/release)）。

6. **发布（npm）**

- [ ] 确认 git 状态干净；按需提交并 push。
- [ ] `npm login`（如需，验证 2FA）。
- [ ] `npm publish --access public`（预发布使用 `--tag beta`）。
- [ ] 验证 registry：`npm view openclaw version`、`npm view openclaw dist-tags`、`npx -y openclaw@X.Y.Z --version`（或 `--help`）。

### 故障排查（2.0.0-beta2 发布记录）

- **npm pack/publish 卡住或 tarball 超大**：`dist/OpenClaw.app`（以及 release zip）被打包进 npm。通过 `package.json` `files` 白名单修复（包含 dist 子目录、docs、skills；排除 app bundle）。使用 `npm pack --dry-run` 确认 `dist/OpenClaw.app` 不在列表中。
- **npm auth web 循环导致 dist-tags 失败**：使用 legacy auth 获取 OTP：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`
- **`npx` 验证出现 `ECOMPROMISED: Lock compromised`**：用新缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`
- **修复后需要重新指向 tag**：强制更新并 push tag，然后确认 GitHub release 资产仍匹配：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7. **GitHub release + appcast**

- [ ] 打 tag 并 push：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
- [ ] 创建/更新 `vX.Y.Z` 的 GitHub release，**标题为 `openclaw X.Y.Z`**（不只是 tag）；正文应包含该版本的 **完整** changelog（Highlights + Changes + Fixes），内联（无裸链接），并且 **正文不得重复标题**。
- [ ] 附加产物：`npm pack` tarball（可选）、`OpenClaw-X.Y.Z.zip`、`OpenClaw-X.Y.Z.dSYM.zip`（如生成）。
- [ ] 提交更新后的 `appcast.xml` 并 push（Sparkle 从 main 提供 feed）。
- [ ] 在干净临时目录（无 `package.json`）运行 `npx -y openclaw@X.Y.Z send --help`，确认安装/CLI 入口正常。
- [ ] 发布并分享 release notes。

## 插件发布范围（npm）

只发布 **已存在于 npm** 的 `@openclaw/*` 插件。未在 npm 的内置插件保持 **仅磁盘树**（仍随 `extensions/**` 发布）。

生成列表的过程：

1. `npm search @openclaw --json` 记录包名。
2. 与 `extensions/*/package.json` 的 name 对比。
3. 只发布 **交集**（已在 npm）。

当前 npm 插件列表（按需更新）：

- @openclaw/bluebubbles
- @openclaw/diagnostics-otel
- @openclaw/discord
- @openclaw/lobster
- @openclaw/matrix
- @openclaw/msteams
- @openclaw/nextcloud-talk
- @openclaw/nostr
- @openclaw/voice-call
- @openclaw/zalo
- @openclaw/zalouser

Release notes 还需注明 **新增但默认不启用的内置插件**（示例：`tlon`）。
