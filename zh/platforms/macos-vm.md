---
summary: "当您需要隔离或 iMessage 功能时，请在沙盒化的 macOS 虚拟机（本地或托管）中运行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虚拟机"
---

# macOS 虚拟机上的 OpenClaw（沙盒化）

## 推荐的默认选项（大多数用户）

- **小型 Linux VPS** 用于全天候 Gateway 和低成本。请参阅 [VPS hosting](/zh/vps)。
- 如果您希望完全控制并拥有用于浏览器自动化的**住宅 IP**，请使用**专用硬件**（Mac mini 或 Linux 主机）。许多网站会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将 Gateway(网关) 保留在便宜的 VPS 上，并在您需要浏览器/UI 自动化时将 Mac 作为 **节点** 连接。请参阅 [Nodes](/zh/nodes) 和 [Gateway(网关) remote](/zh/gateway/remote)。

当您特别需要仅限 macOS 的功能（iMessage/BlueBubbles）或希望与您日常使用的 Mac 严格隔离时，请使用 macOS 虚拟机。

## macOS 虚拟机选项

### Apple Silicon Mac 上的本地虚拟机（Lume）

在您现有的 Apple Silicon Mac 上，使用 [Lume](https://cua.ai/docs/lume) 在沙箱隔离的 OpenClaw VM 中运行 macOS。

这为您提供：

- 隔离的完整 macOS 环境（主机保持清洁）
- 通过 BlueBubbles 支持 iMessage（在 Linux/Windows 上无法实现）
- 通过克隆虚拟机即时重置
- 无需额外的硬件或云服务费用

### 托管 Mac 提供商（云端）

如果您想要云端 macOS，托管 Mac 提供商也可以使用：

- [MacStadium](https://www.macstadium.com/) (托管 Mac)
- 其他托管 Mac 供应商也可以使用；请遵循其虚拟机 + SSH 文档

一旦您拥有 macOS 虚拟机的 SSH 访问权限，请继续执行下面的步骤 6。

---

## 快速路径 (Lume，有经验的用户)

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助理，启用远程登录 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 所需条件 (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上的 macOS Sequoia 或更高版本
- 每个 VM 约需 60 GB 可用磁盘空间
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

文档：[Lume 安装](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 创建 macOS VM

```bash
lume create openclaw --os macos --ipsw latest
```

这将下载 macOS 并创建 VM。VNC 窗口会自动打开。

注意：根据您的网络情况，下载可能需要一些时间。

---

## 3) 完成设置助理

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（或者如果您稍后需要 iMessage，则登录）
3. 创建用户账户 (请记住用户名和密码)
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开系统设置 → 通用 → 共享
2. 启用“远程登录”

---

## 4) 获取 VM 的 IP 地址

```bash
lume get openclaw
```

查找 IP 地址 (通常是 `192.168.64.x`)。

---

## 5) SSH 登录到 VM

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为您创建的账户，并将 IP 替换为您的 VM IP。

---

## 6) 安装 OpenClaw

在 VM 内部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照新手引导提示设置您的模型提供商（Anthropic、OpenAI 等）。

---

## 7) 配置频道

编辑配置文件：

```bash
nano ~/.openclaw/openclaw.json
```

添加您的频道：

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

然后登录到 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

---

## 8) 无头运行 VM

停止 VM 并在没有显示的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 在后台运行。OpenClaw 的守护进程保持 Gateway 网关运行。

检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 额外功能：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 添加到 OpenClaw。

在 VM 内部：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhooks 指向您的 Gateway 网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

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

重启 Gateway 网关。现在您的 agent 可以发送和接收 iMessages。

完整的设置详情：[BlueBubbles 渠道](/zh/channels/bluebubbles)

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

## 全天候运行 (24/7)

通过以下方式保持 VM 运行：

- 保持您的 Mac 插入电源
- 在系统设置 → 节能中禁用睡眠
- 如果需要，使用 `caffeinate`

对于真正的全天候在线，请考虑专用的 Mac mini 或小型 VPS。请参阅 [VPS 托管](/zh/vps)。

---

## 故障排除

| 问题                 | 解决方案                                                         |
| -------------------- | ---------------------------------------------------------------- |
| 无法 SSH 进入 VM     | 检查 VM 的系统设置中是否启用了“远程登录”                         |
| VM IP 未显示         | 等待 VM 完全启动，再次运行 `lume get openclaw`                   |
| 找不到 Lume 命令     | 将 `~/.local/bin` 添加到您的 PATH                                |
| WhatsApp QR 无法扫描 | 确保在运行 `openclaw channels login` 时您登录的是 VM（而非主机） |

---

## 相关文档

- [VPS 托管](/zh/vps)
- [节点](/zh/nodes)
- [Gateway(网关) remote](/zh/gateway/remote)
- [BlueBubbles 渠道](/zh/channels/bluebubbles)
- [Lume 快速入门](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守 VM 设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker 沙箱隔离](/zh/install/docker)（替代隔离方法）

import zh from "/components/footer/zh.mdx";

<zh />
