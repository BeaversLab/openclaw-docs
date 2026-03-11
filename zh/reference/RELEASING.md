---
summary: "npm + macOS 应用分步发布检查清单"
read_when:
  - "Cutting a new npm release"
  - "Cutting a new macOS app release"
  - "Verifying metadata before publishing"
---

# 发布检查清单（npm + macOS）

从仓库根目录使用 `pnpm`（Node 22+）。在标记/发布前保持工作树干净。

## 操作员触发

当操作员说"发布"时，立即执行此预检查（除非被阻止否则无需额外询问）：

- 阅读本文档和 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量并确认 `SPARKLE_PRIVATE_KEY_FILE` + App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应位于 `~/.profile`）。
- 如需要，从 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 使用 Sparkle 密钥。

1. **版本与元数据**

- [ ] 升级 `package.json` 版本（例如 `2026.1.29`）。
- [ ] 运行 `pnpm plugins:sync` 以对齐扩展包版本 + 更新日志。
- [ ] 更新 CLI/版本字符串：[`src/cli/program.ts`](https://github.com/openclaw/openclaw/blob/main/src/cli/program.ts) 和 [`src/provider-web.ts`](https://github.com/openclaw/openclaw/blob/main/src/provider-web.ts) 中的 Baileys user agent。
- [ ] 确认包元数据（name、description、repository、keywords、license）并且 `bin` 映射指向 `openclaw` 的 [`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)。
- [ ] 如果依赖项发生变化，运行 `pnpm install` 以使 `pnpm-lock.yaml` 保持最新。

2. **构建与产物**

- [ ] 如果 A2UI 输入发生变化，运行 `pnpm canvas:a2ui:bundle` 并提交任何更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/openclaw/openclaw/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（重新生成 `dist/`）。
- [ ] 验证 npm 包 `files` 包含所有必需的 `dist/*` 文件夹（特别是 headless node + ACP CLI 的 `dist/node-host/**` 和 `dist/acp/**`）。
- [ ] 确认 `dist/build-info.json` 存在并包含预期的 `commit` 哈希（CLI banner 使用此哈希进行 npm 安装）。
- [ ] 可选：构建后 `npm pack --pack-destination /tmp`；检查 tarball 内容并为其 GitHub 发布做好准备（**不要**提交它）。

3. **更新日志与文档**

- [ ] 使用面向用户的亮点更新 `CHANGELOG.md`（如果文件不存在则创建）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前 CLI 行为匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test`（或 `pnpm test:coverage` 如果需要覆盖率输出）
- [ ] `pnpm release:check`（验证 npm pack 内容）
- [ ] `OPENCLAW_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必需）
  - 如果紧邻的上一个 npm 发布已知已损坏，请为 preinstall 步骤设置 `OPENCLAW_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `OPENCLAW_INSTALL_SMOKE_SKIP_PREVIOUS=1`。
- [ ]（可选）完整安装程序冒烟测试（添加非 root + CLI 覆盖）：`pnpm test:install:smoke`
- [ ]（可选）安装程序端到端测试（Docker，运行 `curl -fsSL https://openclaw.ai/install.sh | bash`，入职，然后运行真实工具调用）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两个密钥；运行两个 providers）
- [ ]（可选）如果你的更改影响发送/接收路径，抽查 web gateway。

5. **macOS 应用 (Sparkle)**"

- [ ] 构建 + 签署 macOS 应用，然后将其压缩以进行分发。"
- [ ] 生成 Sparkle appcast（通过 [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh) 的 HTML 说明）并更新 `appcast.xml`。"
- [ ] 保持应用 zip（以及可选的 dSYM zip）准备好附加到 GitHub 发布。"
- [ ] 遵循 [macOS 发布](/zh/platforms/mac/release) 获取确切的命令和所需的环境变量。
  - `APP_BUILD` 必须是数字 + 单调的（没有 `-beta`），以便 Sparkle 正确比较版本。
  - 如果进行公证，请使用从 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（参阅 [macOS 发布](/zh/platforms/mac/release)）。"

6. **发布 (npm)**"

- [ ] 确认 git 状态干净；根据需要提交并推送。"
- [ ] `npm login`（如果需要，验证 2FA）。"
- [ ] `npm publish --access public`（预发布使用 `--tag beta`）。"
- [ ] 验证注册表：`npm view openclaw version`、`npm view openclaw dist-tags` 和 `npx -y openclaw@X.Y.Z --version`（或 `--help`）。"

### 故障排查（来自 2.0.0-beta2 发布的说明）"

- **npm pack/publish 挂起或产生巨大的 tarball**：`dist/OpenClaw.app` 中的 macOS 应用包（以及发布 zip）被卷入包中。通过 `package.json` `files` 白名单发布内容来修复（包括 dist 子目录、docs、skills；排除应用包）。使用 `npm pack --dry-run` 确认未列出 `dist/OpenClaw.app`。"
- **dist-tags 的 npm auth web 循环**：使用旧版 auth 获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add openclaw@X.Y.Z latest`"
- **`npx` 验证失败并显示 `ECOMPROMISED: Lock compromised`**：使用新的缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y openclaw@X.Y.Z --version`"
- **标签在后期修复后需要重新指向**：强制更新并推送标签，然后确保 GitHub 发布资产仍然匹配：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`"

7. **GitHub 发布 + appcast**"

- [ ] 标记并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。"
- [ ] 为 `vX.Y.Z` 创建/刷新 GitHub 发布，**标题为 `openclaw X.Y.Z`**（而不仅仅是标签）；正文应包含该版本的**完整**更新日志部分（亮点 + 更改 + 修复），内联（没有裸链接），并且**不得在正文中重复标题**。"
- [ ] 附加产物：`npm pack` tarball（可选）、`OpenClaw-X.Y.Z.zip` 和 `OpenClaw-X.Y.Z.dSYM.zip`（如果已生成）。"
- [ ] 提交更新的 `appcast.xml` 并推送（Sparkle 从 main 获取信息）。"
- [ ] 从一个干净的临时目录（没有 `package.json`），运行 `npx -y openclaw@X.Y.Z send --help` 以确认安装/CLI 入口点工作。"
- [ ] 宣布/共享发布说明。"

## 插件发布范围 (npm)"

我们只在 `@openclaw/*` 范围下发布**现有的 npm 插件**。未在 npm 上的捆绑插件保持**仅磁盘树**（仍然随 `extensions/**` 提供）。"

推导列表的流程："

1. `npm search @openclaw --json` 并捕获包名称。"
2. 与 `extensions/*/package.json` 名称比较。"
3. 仅发布**交集**（已在 npm 上）。"

当前 npm 插件列表（根据需要更新）："

- @openclaw/bluebubbles"
- @openclaw/diagnostics-otel"
- @openclaw/discord"
- @openclaw/feishu"
- @openclaw/lobster"
- @openclaw/matrix"
- @openclaw/msteams"
- @openclaw/nextcloud-talk"
- @openclaw/nostr"
- @openclaw/voice-call"
- @openclaw/zalo"
- @openclaw/zalouser"

发布说明还必须指出**未默认启用的新可选捆绑插件**（例如：`tlon`）。"
