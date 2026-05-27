---
summary: "个人助理设置的默认 OpenClaw 代理指令和技能列表"
title: "默认 AGENTS.md"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

## 首次运行（推荐）

OpenClaw 为该代理使用一个专用的工作区目录。默认：OpenClaw`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

1. 创建工作区（如果尚未存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作区模板复制到工作区中：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：如果您想要个人助理技能名册，请将 AGENTS.md 替换为此文件：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 选择不同的工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认值

- 不要将目录或秘密信息转储到聊天中。
- 除非被明确要求，否则不要运行破坏性命令。
- 在更改配置或调度程序（例如 crontab、systemd 单元、nginx 配置或 shell rc 文件）之前，请先检查现有状态，并默认保留/合并。
- 不要向外部消息传递界面发送部分/流式回复（仅发送最终回复）。

## 会话开始（必需）

- 读取 `SOUL.md`、`USER.md` 和 `memory/` 中的今天+昨天记录。
- 如果存在，请阅读 `MEMORY.md`。
- 在回复之前执行此操作。

## Soul（必需）

- `SOUL.md` 定义了身份、语气和边界。请保持其最新状态。
- 如果您更改了 `SOUL.md`，请告知用户。
- 每次会话您都是一个全新的实例；连续性存在于这些文件中。

## 共享空间（推荐）

- 你不是用户的代言人；在群聊或公共频道中请务必小心。
- 不要分享私人数据、联系信息或内部笔记。

## 记忆系统（推荐）

- 每日日志：`memory/YYYY-MM-DD.md`（如果需要，请创建 `memory/`）。
- 长期记忆：`MEMORY.md` 用于持久化的事实、偏好和决策。
- 小写 `memory.md` 仅用于遗留修复输入；请勿故意保留两个根文件。
- 在会话开始时，请阅读今天 + 昨天 + `MEMORY.md`（如果存在）。
- 在写入内存文件之前，请先读取它们；只写入具体的更新，切勿写入空的占位符。
- 捕获内容：决策、偏好、约束、未完成事项。
- 避免记录机密信息，除非明确要求。

## 工具和 Skills

- 工具位于 Skills 中；需要时请遵循每个 Skill 的 `SKILL.md`。
- 将特定于环境的笔记保留在 `TOOLS.md`（Skills 笔记）中。

## 备份提示（推荐）

如果你将此工作空间视为 Clawd 的“记忆”，请将其设为 git 仓库（最好是私有的），以便 `AGENTS.md` 和你的内存文件得到备份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 运行 WhatsApp 网关 + Pi 编程代理，以便助手可以读/写聊天记录、获取上下文，并通过主机 Mac 运行 Skills。
- macOS 应用程序管理权限（屏幕录制、通知、麦克风），并通过其捆绑的二进制文件公开 macOS`openclaw`CLI CLI。
- 直接聊天默认折叠到代理的 `main` 会话中；群组保持隔离为 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳保持后台任务运行。

## 核心 Skills（在 Settings → Skills 中启用）

- **mcporter** - 用于管理外部 Skill 后端的工具服务器运行时/CLI。
- **Peekaboo** - 快速 macOS 截图，支持可选的 AI 视觉分析。
- **camsnap** - 从 RTSP/ONVIF 安防摄像头捕获帧、剪辑或动态警报。
- **oracle** - 支持会话回放和浏览器控制的 OpenAI 就绪代理 CLI。
- **eightctl** - 从终端控制你的睡眠。
- **imsg** - 发送、读取、流式传输 iMessage 和短信 (SMS)。
- **wacli** - WhatsApp CLI：同步、搜索、发送。
- **discord** - Discord 操作：回应表情、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 目标（仅使用数字 ID 会产生歧义）。
- **gog** - Google Suite CLI：Gmail、日历、云端硬盘、联系人。
- **spotify-player** - 终端 Spotify 客户端，用于搜索/加入队列/控制播放。
- **sag** - 具有类似 mac 风格 say 用户体验的 ElevenLabs 语音；默认流式传输到扬声器。
- **Sonos CLI** - 从脚本控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** - 从脚本播放、分组和自动化 BluOS 播放器。
- **OpenHue CLI** - 用于场景和自动化的 Philips Hue 灯光控制。
- **OpenAI Whisper** - 用于快速听写和语音邮件转录的本地语音转文字。
- **Gemini CLI** - 从终端使用 Google Gemini 模型进行快速问答。
- **agent-tools** - 用于自动化和辅助脚本的实用工具包。

## 使用说明

- 脚本编写首选 `openclaw` CLI；Mac 应用程序处理权限。
- 从 Skills 选项卡运行安装；如果二进制文件已存在，它会隐藏该按钮。
- 保持心跳启用，以便助手可以安排提醒、监视收件箱并触发相机捕获。
- Canvas UI 以全屏模式运行，并带有原生覆盖层。避免将关键控件放置在左上角/右上角/底部边缘；在布局中添加明确的边距，并且不要依赖安全区域插入。
- 对于浏览器驱动的验证，请将 `openclaw browser`（选项卡/状态/屏幕截图）与 OpenClaw 管理的 Chrome 配置文件一起使用。
- 对于 DOM 检查，请使用 `openclaw browser eval|query|dom|snapshot`（当需要机器输出时，请使用 `--json`/`--out`）。
- 对于交互，请使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（点击/输入需要快照引用；对于 CSS 选择器，请使用 `evaluate`）。

## 相关

- [Agent workspace](/zh/concepts/agent-workspace)
- [Agent runtime](/zh/concepts/agent)
