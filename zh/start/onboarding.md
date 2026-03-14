---
summary: "OpenClaw（macOS 应用）的首次运行入门流程"
read_when:
  - Designing the macOS onboarding assistant
  - Implementing auth or identity setup
title: "入门（macOS 应用）"
sidebarTitle: "入门：macOS 应用"
---

# 入门（macOS 应用）

本文档描述了**当前**的首次运行入门流程。目标是提供流畅的“第 0 天”体验：选择 Gateway 网关 运行位置，连接身份验证，运行向导，并让代理自行引导。
如需了解入门路径的总体概述，请参阅[入门概述](/zh/en/start/新手引导-overview)。

<Steps>
<Step title="批准 macOS 警告">
<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="" />
</Frame>
</Step>
<Step title="批准查找本地网络">
<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="" />
</Frame>
</Step>
<Step title="欢迎和安全提示">
<Frame caption="Read the security notice displayed and decide accordingly">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是一个个人代理：一个可信操作员边界。
- 共享/多用户设置需要锁定（分离信任边界，保持最低限度的工具访问，并遵循[安全](/zh/en/gateway/security)指南）。
- 本地入门现在将新配置默认设置为 `tools.profile: "coding"`，以便新的本地设置保留文件系统/运行时工具，而无需强制使用不受限制的 `full` 配置文件。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型层级，并保持严格的工具策略/沙盒隔离。

</Step>
<Step title="本地与远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway 网关**运行在哪里？

- **此 Mac（仅本地）：** 入门可以配置身份验证并写入凭据
  到本地。
- **远程（通过 SSH/Tailnet）：** 入门**不会**配置本地身份验证；
  凭据必须存在于网关主机上。
- **稍后配置：** 跳过设置并将应用保留为未配置状态。

<Tip>
**Gateway 网关 身份验证提示：**

- 该向导现在甚至为环回生成一个**令牌**，因此本地 WS 客户端必须进行身份验证。
- 如果您禁用身份验证，任何本地进程都可以连接；请仅在完全受信任的机器上使用此功能。
- 使用 **token** 进行多机器访问或非环回绑定。

</Tip>
</Step>
<Step title="权限">
<Frame caption="Choose what permissions do you want to give OpenClaw">
<img src="/assets/macos-onboarding/05-permissions.png" alt="" />
</Frame>

新手引导 请求以下所需的 TCC 权限：

- 自动化
- 通知
- 辅助功能
- 屏幕录制
- 麦克风
- 语音识别
- 相机
- 位置

</Step>
<Step title="CLI">
  <Info>此步骤是可选的</Info>
  该应用可以通过 npm/pnpm 安装全局 `openclaw` CLI，以便终端工作流和 launchd 任务可以直接工作。
</Step>
<Step title="入门聊天（专用会话）">
  设置完成后，该应用会打开一个专用的入门聊天会话，以便代理可以自我介绍并指导后续步骤。这会将首次运行的指导与您的正常对话区分开来。有关首次运行代理期间网关主机上发生的情况，请参阅 [引导启动](/zh/en/start/bootstrapping)。
</Step>
</Steps>

import zh from '/components/footer/zh.mdx';

<zh />
