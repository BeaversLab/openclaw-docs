---
summary: "当您需要隔离或 iMessage 时，在沙箱隔离的 OpenClaw VM（本地或托管）中运行 macOS"
read_when:
  - 您希望将 OpenClaw 与您的主 macOS 环境隔离
  - 您希望在沙箱中进行 iMessage 集成 (BlueBubbles)
  - 您想要一个可以克隆的可重置 macOS 环境
  - 您想要比较本地与托管 macOS VM 选项
title: "macOS VMs"
---

# OpenClaw 在 macOS VM 上（沙箱隔离）

## 推荐的默认设置（大多数用户）

- **小型 Linux VPS**，用于保持 Gateway(网关) 始终在线且成本低廉。请参阅 [VPS hosting](/zh/vps)。
- **专用硬件**（Mac mini 或 Linux 主机），如果您想要完全控制以及用于浏览器自动化的**住宅 IP**。许多站点会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将 Gateway(网关) 保留在便宜的 VPS 上，并在需要浏览器/UI 自动化时将您的 Mac 作为**节点**连接。请参阅 [Nodes](/zh/nodes) 和 [Gateway(网关) remote](/zh/gateway/remote)。

当您特别需要仅限 macOS 的功能 (macOS/iMessage) 或希望与日常 Mac 严格隔离时，请使用 BlueBubbles VM。

## macOS VM 选项

### 本地 Apple Silicon Mac 上的 VM (Lume)

使用 [Lume](https://cua.ai/docs/lume) 在您现有的 Apple Silicon Mac 上的沙箱隔离 OpenClaw VM 中运行 macOS。

这将为您提供：

- 完全隔离的 macOS 环境（主机保持整洁）
- 通过 iMessage 支持 BlueBubbles（在 Linux/Windows 上无法实现）
- 通过克隆 VM 即时重置
- 无需额外的硬件或云成本

### 托管 Mac 提供商（云端）

如果您想要云端的 macOS，托管 Mac 提供商也可以使用：

- [MacStadium](https://www.macstadium.com/) (托管的 Mac)
- 其他托管的 Mac 供应商也可以使用；请遵循他们的 VM + SSH 文档

一旦您拥有 macOS VM 的 SSH 访问权限，请继续执行下面的步骤 6。

---

## 快速路径 (Lume，有经验的用户)

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助手，启用远程登录 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 您需要什么 (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上需安装 macOS Sequoia 或更高版本
- 每个 VM 约 60 GB 的可用磁盘空间
- 约 20 分钟

---

## 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在您的 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

验证：

```bash
lume --version
```

文档：[Lume Installation](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 创建 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

这将下载 macOS 并创建虚拟机。VNC 窗口会自动打开。

注意：根据您的网络连接，下载可能需要一些时间。

---

## 3) 完成设置向导

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（或者如果您以后想要使用 iMessage，请登录）
3. 创建一个用户帐户（请记住用户名和密码）
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开系统设置 → 通用 → 共享
2. 启用“远程登录”

---

## 4) 获取虚拟机 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

---

## 5) SSH 登录到虚拟机

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为您创建的帐户，并将 IP 替换为您虚拟机的 IP。

---

## 6) 安装 OpenClaw

在虚拟机内部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照新手引导提示来设置您的模型提供商（Anthropic、OpenAI 等）。

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

## 8) 无显示模式运行虚拟机

停止虚拟机并在没有显示的情况下重新启动：

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

## 附加功能：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 添加到 OpenClaw。

在虚拟机内部：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles web 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

添加到您的 OpenClaw 配置中：

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

重启网关。现在您的智能体可以发送和接收 iMessage 了。

完整的设置详细信息：[BlueBubbles 渠道](/zh/channels/bluebubbles)

---

## 保存黄金镜像

在进行进一步自定义之前，快照您的干净状态：

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

## 24/7 运行

通过以下方式保持虚拟机运行：

- 保持您的 Mac 插入电源
- 在系统设置 → 节能中禁用睡眠
- 如有需要，使用 `caffeinate`

为了实现真正的全天候运行，请考虑使用专用的 Mac mini 或小型 VPS。请参阅 [VPS 托管](/zh/vps)。

---

## 故障排除

| 问题                    | 解决方案                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| 无法 SSH 登录到虚拟机   | 检查虚拟机的系统设置中是否启用了“远程登录”                         |
| 未显示虚拟机 IP         | 等待虚拟机完全启动，再次运行 `lume get openclaw`                   |
| 找不到 Lume 命令        | 将 `~/.local/bin` 添加到您的 PATH                                  |
| WhatsApp 二维码无法扫描 | 运行 `openclaw channels login` 时，请确保您已登录到 VM（而非主机） |

---

## 相关文档

- [VPS hosting](/zh/vps)
- [Nodes](/zh/nodes)
- [Gateway(网关) remote](/zh/gateway/remote)
- [BlueBubbles 渠道](/zh/channels/bluebubbles)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI Reference](https://cua.ai/docs/lume/reference/cli-reference)
- [Unattended VM Setup](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (高级)
- [Docker 沙箱隔离](/zh/install/docker) (替代隔离方案)

import zh from "/components/footer/zh.mdx";

<zh />
