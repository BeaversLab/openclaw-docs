---
summary: "安装 OpenClaw、onboard Gateway 并配对您的第一个 channel。"
read_when:
  - 您想要从安装到运行 Gateway 的最快路径
title: "Quick start"
---

<Note>
OpenClaw 需要 Node 22 或更新版本。
</Note>

## Install

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

## Onboard and run the Gateway

<Steps>
  <Step title="Onboard 并安装 service">
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

Onboarding 后，Gateway 通过 user service 运行。您仍然可以使用 `openclaw gateway` 手动运行它。

<Info>
稍后在 npm 和 git installs 之间切换很容易。安装其他 flavor 并运行
`openclaw doctor` 来更新 gateway service entrypoint。
</Info>

## From source（development）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard --install-daemon
```

如果您还没有 global install，从 repo 通过 `pnpm openclaw ...` 运行 onboarding。

## Multi instance quickstart（可选）

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

## Send a test message

需要运行中的 Gateway。

```bash
openclaw message send --target +15555550123 --message "Hello from OpenClaw"
```
