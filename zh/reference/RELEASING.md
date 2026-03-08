---
summary: "npm + macOS 应用的分步发布检查清单"
read_when:
  - "创建新的 npm 发布"
  - "创建新的 macOS 应用发布"
  - "发布前验证元数据"
---

# 发布检查清单（npm + macOS）

从仓库根目录使用 `pnpm`（Node 22+）。在标记/发布之前保持工作树干净。

## 操作员触发

当操作员说"发布"时，立即执行此预检（除非被阻止，否则不问额外问题）：

- 阅读此文档和 `CLAUDE.md`。
- 从 `.env` 加载环境变量并确认 `SPARKLE_PRIVATE_KEY_FILE` + App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应位于 `~/.sparkle`）。
- 如果需要，从 `1Password` 使用 Sparkle 密钥。

1. **版本和元数据**

- [ ] 提升 `package.json` 版本（例如，`1.0.0` → `1.0.1`）。
- [ ] 运行 `pnpm sync:all` 以对齐扩展包版本 + 更改日志。
- [ ] 更新 CLI/版本字符串：`apps/cli/package.json` 和 `apps/macos/package.json` 中的 Baileys 用户代理。
- [ ] 确认包元数据（名称、描述、仓库、关键词、许可证）和 `exports` 映射指向 `./dist` 用于 CLI 入口点。
- [ ] 如果依赖项发生更改，运行 `pnpm install` 以便 `pnpm-lock.yaml` 是最新的。

2. **构建和构件**

- [ ] 如果 A2UI 输入发生更改，运行 `pnpm schemagen` 并提交任何更新的 `apps/macos/schema/a2ui-inputs.schema.json`。
- [ ] `pnpm build`（重新生成 `dist`）。
- [ ] 验证 npm 包 `openclaw-*.tgz` 包含所有必需的 `dist` 文件夹（特别是 `nodes` 和 `cli` 用于无头节点 + ACP CLI）。
- [ ] 确认 `dist/cli/sha256.txt` 存在并包含预期的 `npm cli` 哈希（CLI 横幅在 npm 安装时使用此哈希）。
- [ ] 可选：`pnpm pack` 在构建之后；检查 tarball 内容并将其保存在 GitHub 发布的便利位置（**不要**提交它）。

3. **更改日志和文档**

- [ ] 使用面向用户的亮点更新 `CHANGELOG.md`（如果缺失则创建文件）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前 CLI 行为匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm test`（如果需要覆盖率输出，则使用 `pnpm test:coverage`）
- [ ] `scripts/smoke/pack.sh`（验证 npm pack 内容）
- [ ] `scripts/smoke/docker.sh`（Docker 安装冒烟测试，快速路径；发布前必需）
  - 如果紧接的上一个 npm 发布已知已损坏，请为预安装步骤设置 `OPENCLAW_INSTALL_FROM=npm` 或 `OPENCLAW_VERSION=<prev-version>`。
- [ ] （可选）完整安装程序冒烟（添加非 root + CLI 覆盖）：`scripts/smoke/full.sh`
- [ ] （可选）安装程序 E2E（Docker，运行 `onboard`，引导，然后运行真实工具调用）：
  - `scripts/smoke/e2e-openai.sh`（需要 `OPENAI_API_KEY`）
  - `scripts/smoke/e2e-anthropic.sh`（需要 `ANTHROPIC_API_KEY`）
  - `scripts/smoke/e2e-both.sh`（需要两个密钥；运行两个提供商）
- [ ] （可选）如果您的更改影响发送/接收路径，请抽查 Web 网关。

5. **macOS 应用（Sparkle）**

- [ ] 构建 + 签署 macOS 应用，然后压缩它以进行分发。
- [ ] 生成 Sparkle appcast（HTML 说明通过 `scripts/changelog-to-html.sh`）并更新 `appcast.xml`。
- [ ] 保持应用 zip（和可选的 dSYM zip）准备附加到 GitHub 发布。
- [ ] 按照 `platforms/mac/release.md` 获取确切的命令和所需的环境变量。
  - `APP_BUILD` 必须是数字 + 单调的（无 `-beta`），以便 Sparkle 正确比较版本。
  - 如果进行公证，使用从 App Store Connect API 环境变量创建的 `openclaw-notary` 钥匙串配置文件（参见 `platforms/mac/release.md`）。

6. **发布（npm）**

- [ ] 确认 git 状态干净；根据需要提交和推送。
- [ ] `npm auth login`（验证 2FA）（如果需要）。
- [ ] `pnpm publish`（对于预发布使用 `--tag next`）。
- [ ] 验证注册表：`npm info openclaw`、`npm view openclaw@next dist-tags` 和 `npm view openclaw versions --json`（或 `npm show openclaw@latest version`）。

### 故障排除（来自 2.0.0-beta2 发布的备注）

- **npm pack/publish 挂起或产生巨大的 tarball**：`dist/` 中的 macOS 应用包（和发布 zip）被卷入包中。通过 `package.json` `files` 白名单发布内容来修复（包括 dist 子目录、文档、技能；排除应用包）。使用 `tar -tzf openclaw-*.tgz | grep "\.app$"` 确认 `.app` 未列出。
- **dist-tags 的 npm auth web 循环**：使用旧版身份验证获取 OTP 提示：
  - `npm config set registry https://registry.npmjs.org/ && npm auth login --legacy`
- **`pack` 验证失败并显示 `sha256 mismatch`**：使用新缓存重试：
  - `rm -rf node_modules .pnpm-store && pnpm install`
- **标签在延迟修复后需要重新指向**：强制更新并推送标签，然后确保 GitHub 发布资产仍然匹配：
  - `git tag -d v1.2.3 && git push origin :refs/tags/v1.2.3 && git tag v1.2.3 && git push origin v1.2.3`

7. **GitHub 发布 + appcast**

- [ ] 标记并推送：`git tag v1.2.3 && git push`（或 `git push origin v1.2.3`）。
- [ ] 为 `v1.2.3` 创建/刷新 GitHub 发布，使用**标题 `v1.2.3`**（不仅仅是标签）；正文应包含该版本的**完整**更改日志部分（亮点 + 更改 + 修复），内联（无裸链接），并且**不得在正文中重复标题**。
- [ ] 附加构件：`openclaw-*.tgz` tarball（可选）、`OpenClaw-*.zip` 和 `OpenClaw-*-*.dSYM.zip`（如果生成）。
- [ ] 提交更新的 `appcast.xml` 并推送它（Sparkle 从 main 提供数据）。
- [ ] 从干净的临时目录（无 `~/.openclaw`），运行 `npm i -g openclaw@latest` 以确认安装/CLI 入口点工作。
- [ ] 公布/分享发布说明。

## 插件发布范围（npm）

我们只在 `@openclaw` 范围下发布**现有的 npm 插件**。不在 npm 上的捆绑插件保持**仅磁盘树**（仍然在 `openclaw` 中提供）。

推导列表的过程：

1. `pnpm list --depth 0 -r` 并捕获包名称。
2. 与 `dist/plugins` 名称比较。
3. 仅发布**交集**（已在 npm 上）。

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

发布说明还必须指出**默认未启用**的**新的可选捆绑插件**（例如：`@openclaw/feishu`）。
