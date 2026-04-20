---
summary: "OpenClaw (macOS 应用) 的首次运行设置流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "入门（macOS 应用）"
sidebarTitle: "入门：macOS 应用"
---

# 入门（macOS 应用）

本文档介绍了**当前**的首次运行设置流程。我们的目标是提供流畅的“第 0 天”体验：选择 Gateway(网关) 的运行位置，连接身份验证，运行向导，然后让代理程序自行引导。
有关新手引导路径的总体概述，请参阅 [新手引导 Overview](/zh/start/onboarding-overview)。

<Steps>
<Step title="批准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="Approve find local networks">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="欢迎与安全提示">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是一个个人代理：一个受信任的操作员边界。
- 共享/多用户设置需要锁定（分割信任边界，保持工具访问最少，并遵循 [安全](/zh/gateway/security)）。
- 本地新手引导现在将新配置默认为 `tools.profile: "coding"`，以便新的本地设置保留文件系统/运行时工具，而无需强制使用不受限制的 `full` 配置文件。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型层级，并保持严格的工具策略/沙箱隔离。

</Step>
<Step title="本地与远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway(网关)** 运行在哪里？

- **本机（仅本地）：** 新手引导可以配置身份验证并在本地写入凭据。
- **远程（通过 SSH/Tailnet）：** 新手引导**不**配置本地身份验证；凭据必须存在于 Gateway(网关) 主机上。
- **稍后配置：** 跳过设置并将应用程序保留为未配置状态。

<Tip>
**Gateway(网关) 身份验证提示：**

- 向导现在甚至会为环回生成一个 **令牌**，因此本地 WS 客户端必须进行身份验证。
- 如果您禁用身份验证，任何本地进程都可以连接；请仅在完全受信任的计算机上使用它。
- 使用 **令牌** 进行多计算机访问或非环回绑定。

</Tip>
</Step>
<Step title="权限">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

新手引导请求以下所需的 TCC 权限：

- 自动化
- 通知
- 辅助功能
- 屏幕录制
- 麦克风
- 语音识别
- 摄像头
- 位置

</Step>
<Step title="CLI">
  <Info>此步骤是可选的</Info>
  该应用可以通过 npm、pnpm 或 bun 安装全局 `openclaw` CLI。
  它优先使用 npm，其次是 pnpm，如果 bun 是唯一检测到的包管理器，则使用 bun。对于 Gateway 运行时，Node 仍然是推荐的路径。
</Step>
<Step title="新手引导聊天（专用会话）">
  设置完成后，应用将打开一个专用的新手引导聊天会话，以便代理可以自我介绍并指导后续步骤。这将首次运行指南与您的正常对话区分开来。有关在代理首次运行期间网关主机上发生的情况，请参阅 [Bootstrapping](/zh/start/bootstrapping)。
</Step>
</Steps>
