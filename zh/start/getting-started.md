---
summary: "安装 OpenClaw 并在几分钟内运行您的第一次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "入门指南"
---

# 入门指南

目标：从零开始，以最少的设置完成第一次可运行的聊天。

<Info>
最快的聊天方式：打开控制 UI（无需设置频道）。运行 `openclaw dashboard`
并在浏览器中聊天，或者在 <Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">网关主机</Tooltip> 上打开 `http://127.0.0.1:18789/`。
文档：[Dashboard](/zh/en/web/dashboard) 和 [Control UI](/zh/en/web/control-ui)。
</Info>

## 先决条件

- 推荐使用 Node 24（Node 22 LTS，目前为 `22.16+`，出于兼容性考虑仍支持）

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
    其他安装方法和要求：[安装](/zh/en/install)。
    </Note>

  </Step>
  <Step title="运行入门向导">
    ```bash
    openclaw onboard --install-daemon
    ```

    该向导配置身份验证、网关设置和可选频道。
    详情请参见 [入门向导](/zh/en/start/向导)。

</Step> <Step title="检查 Gateway 网关"> 如果您安装了服务，它应该已经在运行：

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
如果控制 UI 加载成功，说明您的 Gateway 网关 已准备就绪。
</Check>

## 可选检查和附加项

<AccordionGroup> <Accordion title="在前台运行 Gateway 网关"> 适用于快速测试或故障排除。

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="发送测试消息">
    需要配置频道。

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## 有用的环境变量

如果您以服务帐户身份运行 OpenClaw 或想要自定义配置/状态位置：

- `OPENCLAW_HOME` 设置用于内部路径解析的主目录。
- `OPENCLAW_STATE_DIR` 会覆盖状态目录。
- `OPENCLAW_CONFIG_PATH` 会覆盖配置文件路径。

完整的环境变量参考：[环境变量](/zh/en/help/environment)。

## 深入了解

<Columns>
  <Card title="新手引导 Wizard (details)" href="/zh/en/start/wizard">
    完整的 CLI 向导参考和高级选项。
  </Card>
  <Card title="macOS app 新手引导" href="/zh/en/start/onboarding">
    macOS 应用的首次运行流程。
  </Card>
</Columns>

## 你将获得

- 一个正在运行的 Gateway 网关
- 已配置的认证
- 控制 UI 访问权限或已连接的频道

## 后续步骤

- 私信安全和审批：[配对](/zh/en/channels/pairing)
- 连接更多频道：[频道](/zh/en/channels)
- 高级工作流和从源代码构建：[设置](/zh/en/start/setup)

import zh from '/components/footer/zh.mdx';

<zh />
