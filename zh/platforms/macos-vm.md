---
summary: "当您需要隔离环境或 iMessage 时，请在沙盒化的 macOS 虚拟机（本地或托管）中运行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虚拟机"
---

# macOS 虚拟机上的 OpenClaw（沙盒化）

## 推荐的默认选项（大多数用户）

- 使用**小型 Linux VPS** 作为全天候在线的网关且成本低廉。请参阅 [VPS 托管](/zh/en/vps)。
- 如果您希望完全控制并拥有用于浏览器自动化的**住宅 IP**，请使用**专用硬件**（Mac mini 或 Linux 主机）。许多网站会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将网关保留在便宜的 VPS 上，并在需要浏览器/UI 自动化时将 Mac 作为**节点**连接。请参阅[节点](/zh/en/nodes)和[网关远程](/zh/en/gateway/remote)。

当您特别需要仅限 macOS 的功能（iMessage/BlueBubbles）或希望与您日常使用的 Mac 严格隔离时，请使用 macOS 虚拟机。

## macOS 虚拟机选项

### Apple Silicon Mac 上的本地虚拟机（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在您现有的 Apple Silicon Mac 上受沙盒保护的 macOS 虚拟机中运行 OpenClaw。

这为您提供：

- 隔离的完整 macOS 环境（主机保持清洁）
- 通过 BlueBubbles 支持 iMessage（在 Linux/Windows 上无法实现）
- 通过克隆虚拟机即时重置
- 无需额外的硬件或云服务费用

### 托管 Mac 提供商（云端）

如果您想要云端 macOS，托管 Mac 提供商也可以使用：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 供应商也可以使用；请遵循其虚拟机 + SSH 文档

一旦您拥有 macOS 虚拟机的 SSH 访问权限，请继续执行下面的步骤 6。

---

## 快速路径（Lume，有经验的用户）

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助手，启用远程登录（SSH）
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 您需要什么（Lume）

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上运行 macOS Sequoia 或更高版本
- 每个虚拟机约 60 GB 可用磁盘空间
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

## 2) 创建 macOS 虚拟机

```bash
lume create openclaw --os macos --ipsw latest
```

这将下载 macOS 并创建虚拟机。VNC 窗口会自动打开。

注意：下载可能需要一段时间，具体取决于您的网络连接。

---

## 3) 完成设置助理

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（如果您以后需要使用 iMessage，则登录）
3. 创建用户账户（请记住用户名和密码）
4. 跳过所有可选功能

设置完成后，启用 SSH：

1. 打开“系统设置” → “通用” → “共享”
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

将 `youruser` 替换为您创建的账户，并将 IP 替换为您的虚拟机 IP。

---

## 6) 安装 OpenClaw

在虚拟机内部：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按照入职提示设置您的模型提供商（Anthropic、OpenAI 等）。

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

停止虚拟机并在无显示的情况下重启：

```bash
lume stop openclaw
lume run openclaw --no-display
```

虚拟机在后台运行。OpenClaw 的守护进程将保持网关运行。

检查状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## 彩蛋：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 添加到 OpenClaw。

在虚拟机内部：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用您的 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhooks 指向您的网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

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

重启网关。现在您的代理可以发送和接收 iMessage 了。

完整设置详情：[BlueBubbles 频道](/zh/en/channels/bluebubbles)

---

## 保存黄金镜像

在进行进一步自定义之前，为您的干净状态创建快照：

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

## 7x24 小时运行

通过以下方式保持虚拟机运行：

- 保持 Mac 连接电源
- 在“系统设置” → “节能”中禁用睡眠
- 如有需要，使用 `caffeinate`

对于真正的始终在线，请考虑专用的 Mac mini 或小型 VPS。请参阅 [VPS 托管](/zh/en/vps)。

---

## 故障排除

| 问题                  | 解决方案                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------- |
| 无法 SSH 进入 VM        | 检查 VM 的系统设置中是否启用了“远程登录”                            |
| 未显示 VM IP        | 等待 VM 完全启动，再次运行 `lume get openclaw`                           |
| 找不到 Lume 命令   | 将 `~/.local/bin` 添加到您的 PATH 环境变量中                                                    |
| WhatsApp 二维码无法扫描 | 运行 `openclaw channels login` 时确保您已登录 VM（而非主机） |

---

## 相关文档

- [VPS hosting](/zh/en/vps)
- [Nodes](/zh/en/nodes)
- [Gateway remote](/zh/en/gateway/remote)
- [BlueBubbles channel](/zh/en/channels/bluebubbles)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI Reference](https://cua.ai/docs/lume/reference/cli-reference)
- [Unattended VM Setup](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (高级)
- [Docker Sandboxing](/zh/en/install/docker) (替代隔离方案)
