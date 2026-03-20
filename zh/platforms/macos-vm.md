---
summary: "当您需要隔离或 iMessage 时，在沙箱隔离的 macOS VM（本地或托管）中运行 OpenClaw"
read_when:
  - 您希望 OpenClaw 与您的主 macOS 环境隔离
  - 您希望在沙箱中获得 iMessage 集成
  - 您想要一个可重置的 macOS 环境，可以对其进行克隆
  - 您想比较本地与托管的 macOS VM 选项
title: "macOS VMs"
---

# OpenClaw on macOS VMs (沙箱隔离)

## Recommended default (most users)

- **小型 Linux VPS** 用于始终在线的 Gateway(网关) 和低成本。请参阅 [VPS hosting](/zh/vps)。
- **专用硬件**（Mac mini 或 Linux 盒子）如果您想要完全控制以及用于浏览器自动化的**住宅 IP**。许多站点会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将 Gateway(网关) 保留在便宜的 VPS 上，并在您需要浏览器/UI 自动化时将您的 Mac 作为**节点**连接。请参阅 [Nodes](/zh/nodes) 和 [Gateway(网关) remote](/zh/gateway/remote)。

当您特别需要仅限 macOS 的功能（iMessage/BlueBubbles）或希望与日常 Mac 严格隔离时，请使用 macOS VM。

## macOS VM options

### Local VM on your Apple Silicon Mac (Lume)

使用 [Lume](https://cua.ai/docs/lume) 在您现有的 Apple Silicon Mac 上，于沙箱隔离的 macOS VM 中运行 OpenClaw。

This gives you:

- 完全隔离的 macOS 环境（您的主机保持整洁）
- 通过 BlueBubbles 支持 iMessage（在 Linux/Windows 上是不可能的）
- 通过克隆 VM 即时重置
- No extra hardware or cloud costs

### Hosted Mac providers (cloud)

If you want macOS in the cloud, hosted Mac providers work too:

- [MacStadium](https://www.macstadium.com/) (hosted Macs)
- Other hosted Mac vendors also work; follow their VM + SSH docs

Once you have SSH access to a macOS VM, continue at step 6 below.

---

## Quick path (Lume, experienced users)

1. Install Lume
2. `lume create openclaw --os macos --ipsw latest`
3. Complete Setup Assistant, enable Remote Login (SSH)
4. `lume run openclaw --no-display`
5. SSH in, install OpenClaw, configure channels
6. Done

---

## What you need (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- macOS Sequoia or later on the host
- ~60 GB free disk space per VM
- ~20 minutes

---

## 1) Install Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

If `~/.local/bin` isn't in your PATH:

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

Verify:

```bash
lume --version
```

Docs: [Lume Installation](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) Create the macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

这将下载 macOS 并创建虚拟机。VNC 窗口会自动打开。

注意：根据您的网络连接情况，下载可能需要一段时间。

---

## 3) 完成设置助手

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（或者如果您以后想要 iMessage，请登录）
3. 创建一个用户账户（记住用户名和密码）
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开系统设置 → 通用 → 共享
2. 启用“远程登录”

---

## 4) 获取虚拟机的 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

---

## 5) SSH 登录到虚拟机

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为您创建的账户，并将 IP 替换为您虚拟机的 IP。

---

## 6) 安装 OpenClaw

在虚拟机内部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照新手引导提示设置您的模型提供商（Anthropic、OpenAI 等）。

---

## 7) 配置渠道

编辑配置文件：

```bash
nano ~/.openclaw/openclaw.json
```

添加您的渠道：

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15551234567"]
    },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  }
}
```

然后登录 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

---

## 8) 无显示运行虚拟机

停止虚拟机并在不显示的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

虚拟机在后台运行。OpenClaw 的守护进程保持网关运行。

检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 额外奖励：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 添加到 OpenClaw。

在虚拟机内部：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhook 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

添加到您的 OpenClaw 配置：

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

重启网关。现在您的代理可以发送和接收 iMessage。

完整设置详情：[BlueBubbles 渠道](/zh/channels/bluebubbles)

---

## 保存黄金镜像

在进行进一步自定义之前，对您的干净状态进行快照：

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

随时重置：

```bash
lume stop openclaw && lume delete openclaw
lume clone openclaw-golden openclaw
lume run openclaw --no-display
```

---

## 全天候运行

通过以下方式保持虚拟机运行：

- 保持您的 Mac 接通电源
- 在系统设置 → 能源节约中禁用睡眠
- 如有需要，使用 `caffeinate`

若要实现真正的全天候在线，请考虑专用的 Mac mini 或小型 VPS。请参阅 [VPS 托管](/zh/vps)。

---

## 故障排除

| 问题                  | 解决方案                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| 无法 SSH 登录到虚拟机        | 检查虚拟机的系统设置中是否启用了“远程登录”                            |
| 虚拟机 IP 未显示        | 等待虚拟机完全启动，再次运行 `lume get openclaw`                           |
| 找不到 Lume 命令   | 将 `~/.local/bin` 添加到您的 PATH                                                    |
| WhatsApp 二维码无法扫描 | 确保在运行 `openclaw channels login` 时已登录到 VM（而非主机） |

---

## 相关文档

- [VPS 托管](/zh/vps)
- [节点](/zh/nodes)
- [Gateway(网关) 远程](/zh/gateway/remote)
- [BlueBubbles 渠道](/zh/channels/bluebubbles)
- [Lume 快速入门](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守 VM 设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) （高级）
- [Docker 沙箱隔离](/zh/install/docker) （替代隔离方法）

import en from "/components/footer/en.mdx";

<en />
