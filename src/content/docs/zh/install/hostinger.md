---
summary: "在 Hostinger 上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

通过 **一键** 托管部署或 **VPS** 安装，在 [Hostinger](https://www.hostinger.com/openclaw) 上运行持久化的 OpenClaw 网关。

## 前提条件

- Hostinger 账户（[注册](https://www.hostinger.com/openclaw)）
- 大约 5-10 分钟

## 选项 A：一键部署 OpenClaw

最快速的入门方式。Hostinger 负责基础设施、Docker 和自动更新。

<Steps>
  <Step title="购买并启动">
    1. 在 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择托管型 OpenClaw 计划并完成结账。

    <Note>
    在结账过程中，你可以选择 **Ready-to-Use AI** 额度——这些额度是预先购买的，会在 OpenClaw 中即时集成，无需外部账户或其他提供商的 API 密钥。你可以立即开始聊天。或者，你也可以在设置过程中提供来自 Anthropic、OpenAI、Google Gemini 或 xAI 的自有密钥。
    </Note>

  </Step>

  <Step title="选择消息渠道">
    选择一个或多个要连接的渠道：

    - **WhatsApp** —— 扫描设置向导中显示的二维码。
    - **Telegram** —— 粘贴来自 [BotFather](https://t.me/BotFather) 的机器人令牌。

  </Step>

<Step title="完成安装">点击 **Finish** 部署实例。准备就绪后，从 hPanel 的 **OpenClaw Overview** 访问 OpenClaw 仪表板。</Step>

</Steps>

## 选项 B：在 VPS 上部署 OpenClaw

对服务器拥有更多控制权。Hostinger 通过 Docker 在你的 VPS 上部署 OpenClaw，你可以通过 hPanel 中的 **Docker Manager** 进行管理。

<Steps>
  <Step title="购买 VPS">
    1. 在 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择 OpenClaw VPS 计划并完成结账。

    <Note>
    你可以在结账时选择 **Ready-to-Use AI** 额度——这些额度是预先购买的，会在 OpenClaw 中即时集成，无需外部账户或其他提供商的 API 密钥即可开始聊天。
    </Note>

  </Step>

  <Step title="配置 OpenClaw">
    VPS 配置完成后，填写配置字段：

    - **Gateway token** —— 自动生成；请保存以备后用。
    - **WhatsApp 号码** —— 包含国家代码的号码（可选）。
    - **Telegram 机器人令牌** —— 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API 密钥** —— 仅在结账时未选择 Ready-to-Use AI 额度时才需要。

  </Step>

<Step title="启动 OpenClaw">点击 **Deploy**。运行后，在 hPanel 中点击 **Open** 打开 OpenClaw 仪表板。</Step>

</Steps>

日志、重启和更新可直接通过 hPanel 中的 Docker Manager 界面管理。要更新，在 Docker Manager 中点击 **Update**，即可拉取最新镜像。

## 验证设置

在已连接的渠道上向你的助手发送"你好"。OpenClaw 将回复并引导你完成初始偏好设置。

## 故障排除

**仪表板无法加载** —— 等待几分钟让容器完成配置。在 hPanel 中查看 Docker Manager 日志。

**Docker 容器不断重启** —— 打开 Docker Manager 日志，查找配置错误（缺少令牌、无效的 API 密钥）。

**Telegram 机器人无响应** —— 将你的配对码消息从 Telegram 直接发送到 OpenClaw 聊天中，以完成连接。

## 下一步

- [渠道](/en/channels) —— 连接 Telegram、WhatsApp、Discord 等
- [网关配置](/en/gateway/configuration) —— 所有配置选项
