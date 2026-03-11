---
summary: "在沙盒 macOS VM（本地或托管）中运行 OpenClaw，当您需要隔离或 iMessage 时"
read_when:
  - "You want OpenClaw isolated from your main macOS environment"
  - "You want iMessage integration (BlueBubbles) in a sandbox"
  - "You want a resettable macOS environment you can clone"
  - "You want to compare local vs hosted macOS VM options"
title: "macOS 虚拟机"
---

# 在 macOS 虚拟机上运行 OpenClaw（沙盒）

## 推荐默认选项（大多数用户）

- **小型 Linux VPS** 用于始终在线的 Gateway 和低成本。参见 [VPS 托管](/zh/vps)。
- **专用硬件**（Mac mini 或 Linux 机箱），如果您想要完全控制和用于浏览器自动化的**住宅 IP**。许多站点阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合**：将 Gateway 保留在便宜的 VPS 上，并在需要浏览器/UI 自动化时将 Mac 连接为**节点**。参见 [节点](/zh/nodes) 和 [Gateway 远程](/zh/gateway/remote)。

当您特别需要仅 macOS 的功能（iMessage/BlueBubbles）或想要与日常 Mac 严格隔离时，请使用 macOS VM。

## macOS VM 选项

### 在 Apple Silicon Mac 上的本地 VM（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在现有的 Apple Silicon Mac 上在沙盒 macOS VM 中运行 OpenClaw。

这为您提供了：

- 完全隔离的 macOS 环境（您的主机保持清洁）
- 通过 BlueBubbles 支持 iMessage（在 Linux/Windows 上不可能）
- 通过克隆虚拟机即时重置
- 无需额外的硬件或云成本

### 托管 Mac 提供商（云）

如果您想要云中的 macOS，托管的 Mac 提供商也可以工作：

- [MacStadium](https://www.macstadium.com/)（托管的 Mac）
- 其他托管的 Mac 供应商也可以工作；遵循他们的 VM + SSH 文档

一旦您拥有对 macOS VM 的 SSH 访问权限，请继续执行下面的步骤 6。

---

## 快速路径（Lume，有经验的用户）

2. `lume create openclaw --os macos --ipsw latest`
4. `lume run openclaw --no-display`
1. 安装 Lume
3. 完成设置助手，启用远程登录（SSH）
5. SSH 进入，安装 OpenClaw，配置频道
6. 完成

---

## 您需要什么（Lume）

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上的 macOS Sequoia 或更高版本
- 每个 VM 约 60 GB 可用磁盘空间
- 大约 20 分钟

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

这会下载 macOS 并创建虚拟机。VNC 窗口会自动打开。

注意：下载可能需要一段时间，具体取决于您的连接。

---

## 3) 完成设置助手

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（如果您稍后想要 iMessage，请登录）
3. 创建用户帐户（记住用户名和密码）
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开系统设置 → 通用 → 共享
2. 启用"远程登录"

---

## 4) 获取虚拟机的 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

---

## 5) SSH 进入虚拟机

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为您创建的帐户，并将 IP 替换为您虚拟机的 IP。

---

## 6) 安装 OpenClaw

在虚拟机内：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照入门提示设置您的模型提供商（Anthropic、OpenAI 等）。

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

然后登录 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

---

## 8) 无显示器运行虚拟机

停止虚拟机并在无显示器的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

虚拟机在后台运行。OpenClaw 的守护进程保持 Gateway 运行。

检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 额外奖励：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 添加到 OpenClaw。

在虚拟机内：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhook 指向您的 gateway（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

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

重启 gateway。现在您的代理可以发送和接收 iMessage。

完整的设置详情：[BlueBubbles 频道](/zh/channels/bluebubbles)

---

## 保存黄金镜像

在进一步自定义之前，快照您的清洁状态：

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

- 保持 Mac 接入电源
- 在系统设置 → 能源节省中禁用睡眠
- 如需要，使用 `caffeinate`

对于真正的始终在线，请考虑专用的 Mac mini 或小型 VPS。参见 [VPS 托管](/zh/vps)。

---

## 故障排除

| Problem                  | Solution                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| 无法 SSH 进入虚拟机        | 检查虚拟机的系统设置中是否启用了"远程登录"                            |
| 虚拟机 IP 未显示        | 等待虚拟机完全启动，再次运行 `lume get openclaw`                           |
| 找不到 Lume 命令   | 将 `~/.local/bin` 添加到您的 PATH                                                    |
| WhatsApp 二维码无法扫描 | 确保在运行 `openclaw channels login` 时登录的是虚拟机（而不是主机） |

---

## 相关文档

- [VPS 托管](/zh/vps)
- [节点](/zh/nodes)
- [Gateway 远程](/zh/gateway/remote)
- [BlueBubbles 频道](/zh/channels/bluebubbles)
- [Lume 快速入门](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守虚拟机设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker 沙盒](/zh/install/docker)（替代隔离方法）
