---
summary: "在几分钟内安装 OpenClaw 并运行您的首次聊天。"
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "入门指南"
---

# 入门指南

安装 OpenClaw，运行新手引导，并与您的 AI 助手聊天 — 全程
大约需要 5 分钟。完成后，您将拥有一个运行的 Gateway(网关)，已配置的身份验证，
以及一个可用的聊天会话。

## 所需条件

- **Node.js** — 推荐 Node 24（也支持 Node 22.14+）
- 来自模型提供商（API、Anthropic、Google 等）的 **OpenAI 密钥** — 新手引导将会提示您

<Tip>使用 `node --version` 检查你的 Node 版本。 **Windows 用户：** 原生 Windows 和 WSL2 均受支持。WSL2 更加稳定，推荐用于完整体验。参见 [Windows](/en/platforms/windows)。 需要安装 Node？参见 [Node setup](/en/install/node)。</Tip>

## 快速设置

<Steps>
  <Step title="安装 OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Install Script Process"
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
    其他安装方式 (Docker，Nix，npm)：[Install](/en/install)。
    </Note>

  </Step>
  <Step title="运行新手引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导将指引你选择模型提供商，设置 API 密钥，以及配置 Gateway(网关)。大约需要 2 分钟。

    完整参考请参见 [新手引导 (CLI)](/en/start/wizard)。

  </Step>
  <Step title="验证 Gateway(网关) 是否正在运行">
    ```bash
    openclaw gateway status
    ```

    您应该看到 Gateway(网关) 正在监听端口 18789。

  </Step>
  <Step title="打开仪表板">
    ```bash
    openclaw dashboard
    ```

    这将在浏览器中打开控制 UI。如果能加载，说明一切正常。

  </Step>
  <Step title="发送第一条消息">
    在 Control UI 聊天中输入一条消息，你应该会收到 AI 的回复。

    想在手机上聊天？设置最快的渠道是
    [Telegram](/en/channels/telegram) (只需一个 bot token)。参见 [Channels](/en/channels)
    了解所有选项。

  </Step>
</Steps>

## What to do next

<Columns>
  <Card title="连接渠道" href="/en/channels" icon="message-square">
    WhatsApp，Telegram，Discord，iMessage 等等。
  </Card>
  <Card title="配对与安全" href="/en/channels/pairing" icon="shield">
    控制谁可以向你的代理发送消息。
  </Card>
  <Card title="配置 Gateway(网关)" href="/en/gateway/configuration" icon="settings">
    模型、工具、沙箱和高级设置。
  </Card>
  <Card title="浏览工具" href="/en/tools" icon="wrench">
    浏览器、执行、网络搜索、技能和插件。
  </Card>
</Columns>

<Accordion title="高级：环境变量">
  如果您将 OpenClaw 作为服务帐户运行或想要自定义路径：

- `OPENCLAW_HOME` — 用于内部路径解析的主目录
- `OPENCLAW_STATE_DIR` — 覆盖状态目录
- `OPENCLAW_CONFIG_PATH` — 覆盖配置文件路径

完整参考：[环境变量](/en/help/environment)。

</Accordion>
