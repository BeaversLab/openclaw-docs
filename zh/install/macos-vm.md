---
summary: "当您需要隔离环境或使用 iMessage 时，在沙盒化的 macOS 虚拟机（本地或托管）中运行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration (BlueBubbles) in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虚拟机"
---

# 在 macOS 虚拟机上运行 OpenClaw（沙盒化）

## 推荐的默认选项（大多数用户）

- **小型 Linux VPS** 用于全天候运行的 Gateway(网关) 网关和低成本。请参阅 [VPS hosting](/zh/vps)。
- **专用硬件**（Mac mini 或 Linux 主机），如果您需要完全控制和用于浏览器自动化的**住宅 IP**。许多网站会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将 Gateway(网关) 网关保留在廉价的 VPS 上，并在需要浏览器/UI 自动化时将您的 Mac 作为 **节点** 连接。请参阅 [Nodes](/zh/nodes) 和 [Gateway(网关) remote](/zh/gateway/remote)。

当您特别需要仅限 macOS 的功能（iMessage/BlueBubbles）或希望与日常使用的 Mac 严格隔离时，请使用 macOS 虚拟机。

## macOS 虚拟机选项

### 您 Apple Silicon Mac 上的本地虚拟机（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在现有的 Apple Silicon Mac 上，于沙箱隔离的 macOS VM 中运行 OpenClaw。

这将为您提供：

- 隔离的完整 macOS 环境（您的主机保持干净）
- 通过 BlueBubbles 支持 iMessage（在 Linux/Windows 上无法实现）
- 通过克隆虚拟机即时重置
- 无需额外的硬件或云成本

### 托管 Mac 提供商（云端）

如果您希望在云端使用 macOS，托管 Mac 提供商也是可行的：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 供应商也可以；请遵循他们的虚拟机 + SSH 文档

一旦您拥有对 macOS 虚拟机的 SSH 访问权限，请继续执行下面的第 6 步。

---

## 快速路径 (Lume，有经验的用户)

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助理，启用远程登录 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 所需内容 (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上的 macOS Sequoia 或更高版本
- 每个 VM 约 60 GB 可用磁盘空间
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

此操作将下载 macOS 并创建 VM。VNC 窗口会自动打开。

注意：根据您的网络连接情况，下载可能需要一段时间。

---

## 3) 完成设置助理

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（如果您以后想要 iMessage，请登录）
3. 创建用户账户（记住用户名和密码）
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

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN",
    },
  },
}
```

然后登录 WhatsApp（扫描二维码）：

```bash
openclaw channels login
```

---

## 8) 无显示模式运行 VM

停止 VM 并在没有显示的情况下重新启动：

```bash
lume stop openclaw
lume run openclaw --no-display
```

虚拟机在后台运行。OpenClaw 的守护进程会让 Gateway 网关保持运行。

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
4. 将 BlueBubbles webhooks 指向您的 Gateway 网关（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

添加到您的 OpenClaw 配置：

```json5
{
  channels: {
    bluebubbles: {
      serverUrl: "http://localhost:1234",
      password: "your-api-password",
      webhookPath: "/bluebubbles-webhook",
    },
  },
}
```

重启 Gateway 网关。现在您的代理可以发送和接收 iMessage 了。

完整设置详情：[BlueBubbles 渠道](/zh/channels/bluebubbles)

---

## 保存黄金镜像

在进行进一步自定义之前，请为您干净的状态拍摄快照：

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

- 保持 Mac 接通电源
- 在系统设置 → 节能器中禁用睡眠
- 如需要，使用 `caffeinate`

若要真正实现全天候运行，请考虑使用专用的 Mac mini 或小型 VPS。请参阅 [VPS hosting](/zh/vps)。

---

## 故障排除

| 问题                      | 解决方案                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| 无法通过 SSH 连接到虚拟机 | 检查虚拟机的系统设置中是否启用了“远程登录”                        |
| 虚拟机 IP 未显示          | 等待虚拟机完全启动，再次运行 `lume get openclaw`                  |
| 找不到 Lume 命令          | 将 `~/.local/bin` 添加到您的 PATH                                 |
| 无法扫描 WhatsApp 二维码  | 确保运行 `openclaw channels login` 时您已登录到虚拟机（而非主机） |

---

## 相关文档

- [VPS hosting](/zh/vps)
- [Nodes](/zh/nodes)
- [Gateway 网关 remote](/zh/gateway/remote)
- [BlueBubbles 渠道](/zh/channels/bluebubbles)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI Reference](https://cua.ai/docs/lume/reference/cli-reference)
- [Unattended VM Setup](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup) (高级)
- [Docker 沙箱隔离](/zh/install/docker) (替代隔离方案)

import zh from "/components/footer/zh.mdx";

<zh />
