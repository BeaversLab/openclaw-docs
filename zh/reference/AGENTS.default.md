---
title: "默认 AGENTS.md"
summary: "个人助理设置的默认 OpenClaw 代理指令和技能清单"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md — OpenClaw 个人助理（默认）

## 首次运行（推荐）

OpenClaw 为该代理使用一个专用的工作区目录。默认：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

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

3. 可选：如果你想要个人助理技能清单，请用此文件替换 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 来选择不同的工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认设置

- 不要将目录或秘密信息倾倒到聊天中。
- 除非被明确要求，否则不要运行破坏性命令。
- 不要向外部消息界面发送部分/流式回复（仅发送最终回复）。

## 会话开始（必需）

- 阅读 `SOUL.md`、`USER.md`、`memory.md` 以及 `memory/` 中今天和昨天的内容。
- 在回复之前执行此操作。

## 灵魂（必需）

- `SOUL.md` 定义了身份、语气和边界。请保持其最新状态。
- 如果你更改了 `SOUL.md`，请告知用户。
- 每次会话你都是一个全新的实例；连续性保存在这些文件中。

## 共享空间（推荐）

- 你不是用户的代言人；在群聊或公共频道中请小心行事。
- 不要分享私人数据、联系信息或内部笔记。

## 记忆系统（推荐）

- 每日日志：`memory/YYYY-MM-DD.md`（如果需要，创建 `memory/`）。
- 长期记忆：`memory.md` 用于持久化的事实、偏好和决策。
- 会话开始时，阅读今天 + 昨天 + `memory.md`（如果存在）。
- 捕获内容：决策、偏好、约束、未完成的事项。
- 除非明确要求，否则避免记录秘密信息。

## 工具与技能

- 工具位于技能中；需要时请遵循每个技能的 `SKILL.md`。
- 将特定于环境的笔记保存在 `TOOLS.md`（技能笔记）中。

## 备份提示（推荐）

如果您将此工作区视为 Clawd 的“记忆”，请将其设为一个 git 仓库（最好是私有的），以便 `AGENTS.md` 和您的记忆文件都能得到备份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## OpenClaw 的功能

- 运行 WhatsApp 网关 + Pi 编码代理，以便助手可以读/写聊天记录、获取上下文，并通过主机 Mac 运行技能。
- macOS 应用程序管理权限（屏幕录制、通知、麦克风），并通过其捆绑的二进制文件暴露 `openclaw` CLI。
- 直接聊天默认折叠到代理的 `main` 会话中；群组保持隔离为 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳保持后台任务活跃。

## 核心技能（在设置 → 技能 中启用）

- **mcporter** — 用于管理外部技能后端的工具服务器运行时/CLI。
- **Peekaboo** — 快速的 macOS 截图工具，支持可选的 AI 视觉分析。
- **camsnap** — 从 RTSP/ONVIF 监控摄像头捕获帧、剪辑或运动警报。
- **oracle** — 支持 OpenAI 的代理 CLI，具有会话回放和浏览器控制功能。
- **eightctl** — 在终端控制您的睡眠。
- **imsg** — 发送、读取、流式传输 iMessage 和 SMS。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：表情反应、贴纸、投票。请使用 `user:<id>` 或 `channel:<id>` 目标（仅使用数字 ID 容易产生歧义）。
- **gog** — Google Suite CLI：Gmail、日历、云端硬盘、联系人。
- **spotify-player** — 终端 Spotify 客户端，用于搜索/排队/控制播放。
- **sag** — ElevenLabs 语音合成，具有 Mac 风格的 say UX；默认流式传输到扬声器。
- **Sonos CLI** — 通过脚本控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** — 通过脚本播放、分组和自动化 BluOS 播放器。
- **OpenHue CLI** — 飞利浦 Hue 灯光控制，用于场景和自动化。
- **OpenAI Whisper** — 本地语音转文字，用于快速听写和语音邮件转录。
- **Gemini CLI** — 在终端中使用 Google Gemini 模型进行快速问答。
- **agent-tools** — 用于自动化和辅助脚本的实用工具包。

## 使用说明

- 脚本编写首选 `openclaw` CLI；Mac 应用程序负责处理权限。
- 从“技能(Skills)”选项卡运行安装；如果二进制文件已存在，则会隐藏该按钮。
- 保持心跳(heartbeats)启用，以便助手能够安排提醒、监视收件箱并触发相机捕获。
- Canvas UI 以全屏模式运行，并带有原生覆盖层。避免将关键控件放置在左上/右上/底部边缘；在布局中添加明确的间距，不要依赖安全区域插入。
- 对于基于浏览器的验证，请使用 `openclaw browser` (标签页/状态/屏幕截图) 和 OpenClaw 管理的 Chrome 配置文件。
- 对于 DOM 检查，请使用 `openclaw browser eval|query|dom|snapshot` (当需要机器输出时，使用 `--json`/`--out`)。
- 对于交互，请使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (点击/输入需要快照引用；使用 `evaluate` 来获取 CSS 选择器)。

import zh from '/components/footer/zh.mdx';

<zh />
