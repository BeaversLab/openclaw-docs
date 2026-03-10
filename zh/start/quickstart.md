---
summary: "安装 OpenClaw、入职 Gateway 并配对您的第一个频道。"
read_when:
  - "You want the fastest path from install to a working Gateway"
title: "快速开始"
---

<Note>
OpenClaw 需要 Node 22 或更高版本。
</Note>

## 安装

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    ```
  </Tab>
</Tabs>

## 入职并运行 Gateway

<Steps>
  <Step title="入职并安装服务">
    ```bash
    openclaw onboard --install-daemon
    ```
  </Step>
  <Step title="配对 WhatsApp">
    ```bash
    openclaw channels login
    ```
  </Step>
  <Step title="启动 Gateway">
    ```bash
    openclaw gateway --port 18789
    ```
  </Step>
</Steps>

入职后，Gateway 通过用户服务运行。您仍然可以使用 `openclaw gateway` 手动运行它。

<Info>
稍后在 npm 和 git 安装之间切换很容易。安装另一个版本并运行
`openclaw doctor` 来更新 Gateway 服务入口点。
</Info>

## 从源代码（开发）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard --install-daemon
```

如果您还没有全局安装，请通过 `pnpm openclaw ...` 从仓库运行入职。

## 多实例快速开始（可选）

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

## 发送测试消息

需要运行中的 Gateway。

```bash
openclaw message send --target +15555550123 --message "Hello from OpenClaw"
```

