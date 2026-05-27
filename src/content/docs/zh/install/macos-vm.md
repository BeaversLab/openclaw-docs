---
summary: "当您需要隔离环境或使用 iMessage 时，在沙盒化的 macOS 虚拟机（本地或托管）中运行 OpenClaw"
read_when:
  - You want OpenClaw isolated from your main macOS environment
  - You want iMessage integration in a sandbox
  - You want a resettable macOS environment you can clone
  - You want to compare local vs hosted macOS VM options
title: "macOS 虚拟机"
---

## 推荐默认选项（大多数用户）

- 使用**小型 Linux VPS** 作为全天候运行的 Gateway(网关) 以降低成本。请参阅 [VPS hosting](<LinuxGateway(网关)/en/vps>)。
- **专用硬件**（Mac mini 或 Linux 主机），如果您想要完全控制以及用于浏览器自动化的**住宅 IP**。许多网站会阻止数据中心 IP，因此本地浏览通常效果更好。
- **混合模式：** 将 Gateway(网关) 保留在便宜的 VPS 上，并在需要浏览器/UI 自动化时将您的 Mac 作为**节点**连接。请参阅 [Nodes](<Gateway(网关)/en/nodesGateway(网关)>) 和 [Gateway(网关) remote](/zh/gateway/remote)。

当您特别需要仅限 macOS 的功能（例如 iMessage）或希望与日常使用的 Mac 严格隔离时，请使用 macOS 虚拟机。

## macOS 虚拟机选项

### Apple Silicon Mac 上的本地虚拟机 (Lume)

使用 [Lume](OpenClawmacOShttps://cua.ai/docs/lume) 在您现有的 Apple Silicon Mac 上，于沙箱隔离的 macOS 虚拟机中运行 OpenClaw。

这将为您提供：

- 完全隔离的 macOS 环境（您的主机保持清洁）
- 通过 iMessage`imsg`LinuxWindows 支持 iMessage（默认本地路径在 Linux/Windows 上无法实现）
- 通过克隆虚拟机即时重置
- 无需额外的硬件或云服务费用

### 托管的 Mac 提供商（云端）

如果您想要云端 macOS，托管的 Mac 提供商也可以使用：

- [MacStadium](https://www.macstadium.com/)（托管的 Mac）
- 其他托管的 Mac 供应商也可以使用；请遵循其虚拟机 + SSH 文档

一旦您拥有 macOS 虚拟机的 SSH 访问权限，请继续执行下面的第 6 步。

---

## 快速路径（Lume，经验丰富的用户）

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成设置助理，启用远程登录 (SSH)
4. `lume run openclaw --no-display`
5. SSH 登录，安装 OpenClaw，配置频道
6. 完成

---

## 您需要什么 (Lume)

- Apple Silicon Mac (M1/M2/M3/M4)
- 主机上的 macOS Sequoia 或更高版本
- 每个虚拟机约 60 GB 的可用磁盘空间
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

<Note>下载可能需要一段时间，具体取决于您的网络连接。</Note>

---

## 3) 完成设置向导

在 VNC 窗口中：

1. 选择语言和地区
2. 跳过 Apple ID（如果以后需要使用 iMessage，则登录）
3. 创建用户账户（记住用户名和密码）
4. 跳过所有可选功能

设置完成后：

1. 启用 SSH：打开“系统设置” -> “通用” -> “共享”，并启用“远程登录”。
2. 对于无头 VM 使用，启用自动登录：打开“系统设置” -> “用户与群组”，选择“自动登录为：”，并选择 VM 用户。

---

## 4) 获取虚拟机 IP 地址

```bash
lume get openclaw
```

查找 IP 地址（通常是 `192.168.64.x`）。

---

## 5) SSH 进入虚拟机

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

## 8) 无显示运行虚拟机

停止虚拟机并在无显示模式下重新启动：

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

这是在 macOS 上运行的杀手级功能。使用带有 `imsg`macOS 的 [iMessage](iMessageOpenClaw/en/channels/imessage) 将 Messages 添加到 OpenClaw。

在虚拟机内部：

1. 登录 Messages。
2. 安装 `imsg`。
3. 为运行 OpenClaw/OpenClaw`imsg` 的进程授予完全磁盘访问和自动化权限。
4. 使用 RPC`imsg rpc --help` 验证 RPC 支持。

添加到您的 OpenClaw 配置中：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
    },
  },
}
```

重启网关。现在您的代理可以发送和接收 iMessage 了。

完整设置详情：[iMessage 渠道](iMessage/en/channels/imessage)

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

## 24/7 运行

通过以下方式保持虚拟机运行：

- 保持您的 Mac 接通电源
- 在系统设置 → 节能器中禁用睡眠
- 如有需要，使用 `caffeinate`

若要实现真正的 24/7 全天候运行，请考虑使用专用的 Mac mini 或小型 VPS。请参阅 [VPS 托管](/zh/vps)。

---

## 故障排除

| 问题                    | 解决方案                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| 无法 SSH 进入虚拟机     | 检查虚拟机的系统设置中是否启用了“远程登录”                        |
| 未显示虚拟机 IP         | 等待虚拟机完全启动，再次运行 `lume get openclaw`                  |
| 找不到 Lume 命令        | 将 `~/.local/bin` 添加到您的 PATH 中                              |
| WhatsApp 二维码无法扫描 | 确保运行 `openclaw channels login` 时您已登录到虚拟机（而非主机） |

---

## 相关文档

- [VPS 托管](/zh/vps)
- [节点](/zh/nodes)
- [Gateway(网关) 远程](/zh/gateway/remote)
- [iMessage 渠道](/zh/channels/imessage)
- [Lume 快速入门](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [无人值守虚拟机设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker 沙箱隔离](/zh/install/docker)（替代隔离方案）
