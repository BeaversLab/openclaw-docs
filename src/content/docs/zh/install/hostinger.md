---
summary: "在 Hostinger 上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

通过 **一键式** 托管部署或 **VPS** 安装，在 [Hostinger](https://www.hostinger.com/openclaw) 上运行持久的 OpenClaw Gateway(网关)。

## 先决条件

- Hostinger 账户 ([注册](https://www.hostinger.com/openclaw))
- 大约 5-10 分钟

## 选项 A：一键式 OpenClaw

开始使用的最快方式。Hostinger 负责处理基础设施、Docker 和自动更新。

<Steps>
  <Step title="购买并启动">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择一个托管式 OpenClaw 计划并完成结账。

    <Note>
    在结账期间，您可以选择 **即用型 AI** 积分，这些积分是预购买的，并即时集成在 OpenClaw 内部 -- 无需来自其他提供商的外部账户或 API 密钥。您可以立即开始聊天。或者，在设置过程中提供您自己的来自 Anthropic、OpenAI、Google Gemini 或 xAI 的密钥。
    </Note>

  </Step>

  <Step title="选择消息渠道">
    选择一个或多个渠道进行连接：

    - **WhatsApp** -- 扫描设置向导中显示的二维码。
    - **Telegram** -- 粘贴来自 [BotFather](https://t.me/BotFather) 的机器人令牌。

  </Step>

<Step title="完成安装">点击 **Finish** 部署实例。准备就绪后，从 hPanel 中的 **OpenClaw Overview** 访问 OpenClaw 仪表板。</Step>

</Steps>

## 选项 B：VPS 上的 OpenClaw

对您的服务器拥有更多控制权。Hostinger 通过 Docker 在您的 VPS 上部署 OpenClaw，您可以通过 hPanel 中的 **Docker Manager** 进行管理。

<Steps>
  <Step title="购买 VPS">
    1. 从 [Hostinger OpenClaw 页面](https://www.hostinger.com/openclaw)，选择 VPS 上的 OpenClaw 计划并完成结账。

    <Note>
    您可以在结账期间选择 **即用型 AI** 积分 -- 这些是预购买的，并即时集成在 OpenClaw 内部，因此您无需来自其他提供商的外部账户或 API 密钥即可开始聊天。
    </Note>

  </Step>

  <Step title="配置 OpenClaw">
    配置好 VPS 后，请填写配置字段：

    - **Gateway(网关) token(网关令牌)** -- 自动生成；请保存以备后用。
    - **WhatsApp number** -- 带区号的电话号码（可选）。
    - **Telegram bot token** -- 来自 [BotFather](https://t.me/BotFather)（可选）。
    - **API keys** -- 仅在结账时未选择“即用型 AI 点数”时需要。

  </Step>

<Step title="启动 OpenClaw">点击 **Deploy（部署）**。运行后，通过点击 hPanel 中的 **Open（打开）** 打开 OpenClaw 仪表板。</Step>

</Steps>

日志、重启和更新直接通过 hPanel 中的 Docker Manager 界面进行管理。要更新，请点击 Docker Manager 中的 **Update（更新）**，这将拉取最新的镜像。

## 验证您的设置

向您连接的渠道上的助手发送“Hi”。OpenClaw 将回复并引导您完成初始偏好设置。

## 故障排除

**仪表板无法加载** -- 等待几分钟让容器完成配置。检查 hPanel 中的 Docker Manager 日志。

**Docker 容器不断重启** -- 打开 Docker Manager 日志并查找配置错误（缺少令牌、API keys 无效）。

**Telegram bot 无响应** -- 直接从 Telegram 发送您的配对代码消息，在您的 OpenClaw 聊天中作为一条消息发送以完成连接。

## 后续步骤

- [渠道](/zh/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) 配置](/zh/gateway/configuration) -- 所有配置选项
