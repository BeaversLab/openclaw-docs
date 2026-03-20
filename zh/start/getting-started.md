---
summary: "在几分钟内安装 OpenClaw 并运行您的第一次聊天。"
read_when:
  - 首次从零开始设置
  - 您希望最快获得可用的聊天体验
title: "入门指南"
---

# 入门指南

目标：以最少的设置从零开始实现第一次可用的聊天。

<Info>
最快的聊天方式：打开控制 UI（无需设置渠道）。运行 `openclaw dashboard`
并在浏览器中聊天，或者在
<Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">Gateway(网关)主机</Tooltip>上打开 `http://127.0.0.1:18789/`。
文档：[仪表板](/zh/web/dashboard) 和 [控制 UI](/zh/web/control-ui)。
</Info>

## 先决条件

- 推荐使用 Node 24（目前为 `22.16+` 的 Node 22 LTS 出于兼容性考虑仍受支持）

<Tip>
如果不确定，请使用 `node --version` 检查您的 Node 版本。
</Tip>

## 快速设置 (CLI)

<Steps>
  <Step title="安装 OpenClaw（推荐）">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="安装脚本流程"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    其他安装方法和要求：[安装](/zh/install)。
    </Note>

  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    新手引导会配置身份验证、Gateway(网关)设置以及可选渠道。
    详见 [新手引导 (CLI)](/zh/start/wizard)。

  </Step>
  <Step title="检查 Gateway(网关)">
    如果您安装了该服务，它应该已经在运行：

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="打开控制 UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
如果控制 UI 加载成功，您的 Gateway(网关)已准备就绪。
</Check>

## 可选检查和额外内容

<AccordionGroup>
  <Accordion title="在前台运行 Gateway">
    适用于快速测试或故障排除。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="发送测试消息">
    需要一个已配置的渠道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 有用的环境变量

如果您以服务帐户运行 OpenClaw 或希望自定义配置/状态位置：

- `OPENCLAW_HOME` 设置用于内部路径解析的主目录。
- `OPENCLAW_STATE_DIR` 覆盖状态目录。
- `OPENCLAW_CONFIG_PATH` 覆盖配置文件路径。

完整的环境变量参考：[Environment vars](/zh/help/environment)。

## 深入了解

<Columns>
  <Card title="新手引导 (CLI)" href="/zh/start/wizard">
    完整的 CLI 新手引导参考和高级选项。
  </Card>
  <Card title="macOS 应用新手引导" href="/zh/start/onboarding">
    macOS 应用的首次运行流程。
  </Card>
</Columns>

## 您将拥有

- 一个运行中的 Gateway
- 已配置身份验证
- 控制 UI 访问权限或已连接的渠道

## 后续步骤

- 私信安全和审批：[Pairing](/zh/channels/pairing)
- 连接更多渠道：[Channels](/zh/channels)
- 高级工作流程和从源代码构建：[Setup](/zh/start/setup)

import en from "/components/footer/en.mdx";

<en />
