---
summary: "npm + macOS 应用分步发布检查清单"
read_when:
  - "Cutting a new npm release"
  - "Cutting a new macOS app release"
  - "Verifying metadata before publishing"
---

# 发布检查清单（npm + macOS）

从仓库根目录使用 %%P1%%（Node 22+）。在标记/发布前保持工作树干净。

## 操作员触发

当操作员说"发布"时，立即执行此预检查（除非被阻止否则无需额外询问）：

- 阅读本文档和 %%P2%%。
- 从 %%P3%% 加载环境变量并确认 %%P4%% + App Store Connect 变量已设置（SPARKLE_PRIVATE_KEY_FILE 应位于 %%P5%%）。
- 如需要，从 %%P6%% 使用 Sparkle 密钥。

1. **版本与元数据**

- [ ] 升级 %%P7%% 版本（例如 %%P8%%）。
- [ ] 运行 %%P9%% 以对齐扩展包版本 + 更新日志。
- [ ] 更新 CLI/版本字符串：[%%P10%%]%%P12%% 和 [%%P11%%]%%P13%% 中的 Baileys user agent。
- [ ] 确认包元数据（name、description、repository、keywords、license）并且 %%P14%% 映射指向 %%P16%% 的 [%%P15%%]%%P17%%。
- [ ] 如果依赖项发生变化，运行 %%P18%% 以使 %%P19%% 保持最新。

2. **构建与产物**

- [ ] 如果 A2UI 输入发生变化，运行 %%P20%% 并提交任何更新的 [%%P21%%]%%P22%%。
- [ ] %%P23%%（重新生成 %%P24%%）。
- [ ] 验证 npm 包 %%P25%% 包含所有必需的 %%P26%% 文件夹（特别是 headless node + ACP CLI 的 %%P27%% 和 %%P28%%）。
- [ ] 确认 %%P29%% 存在并包含预期的 %%P30%% 哈希（CLI banner 使用此哈希进行 npm 安装）。
- [ ] 可选：构建后 %%P31%%；检查 tarball 内容并为其 GitHub 发布做好准备（**不要**提交它）。

3. **更新日志与文档**

- [ ] 使用面向用户的亮点更新 %%P32%%（如果文件不存在则创建）；保持条目严格按版本降序排列。
- [ ] 确保 README 示例/标志与当前 CLI 行为匹配（特别是新命令或选项）。

4. **验证**

- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] %%P33%%（或 %%P34%% 如果需要覆盖率输出）
- [ ] %%P35%%（验证 npm pack 内容）
- [ ] %%P36%%（Docker 安装冒烟测试，快速路径；发布前必需）
  - 如果紧邻的上一个 npm 发布已知已损坏，请为 preinstall 步骤设置 %%P37%% 或 %%P38%%。
- [ ]（可选）完整安装程序冒烟测试（添加非 root + CLI 覆盖）：%%P39%%
- [ ]（可选）安装程序端到端测试（Docker，运行 %%P40%%，入职，然后运行真实工具调用）：
  - %%P41%%（需要 %%P42%%）
  - %%P43%%（需要 %%P44%%）
  - %%P45%%（需要两个密钥；运行两个 providers）
- [ ]（可选）如果你的更改影响发送/接收路径，抽查 web gateway。

5. **macOS 应用 (Sparkle)**

- [ ] 构建 + 签名 macOS 应用，然后将其压缩以进行分发。
- [ ] 生成 Sparkle appcast（通过 [%%P46%%]%%P48%% 的 HTML 说明）并更新 %%P47%%。
- [ ] 准备好应用 zip（和可选的 dSYM zip）以附加到 GitHub 发布。
- [ ] 遵循 [macOS release]%%P52%% 中的确切命令和必需的环境变量。
  - %%P49%% 必须是数字 + 单调递增（无 %%P50%%），以便 Sparkle 正确比较版本。
  - 如果进行公证，使用从 App Store Connect API 环境变量创建的 %%P51%% 钥匙串配置文件（参见 [macOS release]%%P53%%）。

6. **发布 (npm)**

- [ ] 确认 git 状态干净；根据需要提交并推送。
- [ ] %%P54%%（验证 2FA）（如果需要）。
- [ ] %%P55%%（预发布使用 %%P56%%）。
- [ ] 验证注册表：%%P57%%、%%P58%% 和 %%P59%%（或 %%P60%%）。

### 故障排除（来自 2.0.0-beta2 发布的说明）

- **npm pack/publish 挂起或生成巨大的 tarball**：%%P61%% 中的 macOS 应用包（以及发布 zip）会被卷入包中。通过 %%P62%% %%P63%% 白名单发布内容来修复（包括 dist 子目录、docs、skills；排除应用包）。使用 %%P64%% 确认未列出 %%P65%%。
- **dist-tags 的 npm auth web 循环**：使用旧版身份验证获取 OTP 提示：
  - %%P66%%
- **%%P67%% 验证失败并显示 %%P68%%**：使用新缓存重试：
  - %%P69%%
- **标签在后期修复后需要重新指向**：强制更新并推送标签，然后确保 GitHub 发布资源仍然匹配：
  - %%P70%%

7. **GitHub 发布 + appcast**

- [ ] 标记并推送：%%P71%%（或 %%P72%%）。
- [ ] 为 %%P73%% 创建/刷新 GitHub 发布，**标题为 %%P74%%**（而不仅仅是标签）；正文应包含该版本的**完整**更新日志部分（Highlights + Changes + Fixes）、内联（无裸链接），并且**不得在正文中重复标题**。
- [ ] 附加产物：%%P75%% tarball（可选）、%%P76%% 和 %%P77%%（如果已生成）。
- [ ] 提交更新的 %%P78%% 并推送（Sparkle 从 main 获取）。
- [ ] 从干净的临时目录（无 %%P79%%），运行 %%P80%% 以确认安装/CLI 入口点正常工作。
- [ ] 公布/分享发布说明。

## Plugin 发布范围 (npm)

我们仅在 %%P81%% 范围下发布**现有的 npm plugins**。未在 npm 上的捆绑插件保持**仅磁盘树**（仍通过 %%P82%% 发送）。

派生列表的流程：

1. %%P83%% 并捕获包名称。
2. 与 %%P84%% 名称进行比较。
3. 仅发布**交集**（已在 npm 上）。

当前 npm plugin 列表（根据需要更新）：

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

发布说明还必须指出**默认未启用的新可选捆绑插件**（例如：%%P85%%）。
