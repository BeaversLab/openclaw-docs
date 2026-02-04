---
title: "macOS 虚拟机"
summary: "在沙盒化 macOS VM 中运行 OpenClaw（本地或托管），用于隔离或 iMessage"
read_when:
  - 你想将 OpenClaw 与主 macOS 环境隔离
  - 你想在沙盒中使用 iMessage（BlueBubbles）
  - 你想要可重置、可克隆的 macOS 环境
  - 你想比较本地 vs 托管 macOS VM 方案
---

# OpenClaw on macOS VMs（Sandboxing）

## 推荐默认方案（多数用户）

- **小型 Linux VPS**：常驻 Gateway、成本低。见 [VPS hosting](/zh/vps)。
- **专用硬件**（Mac mini 或 Linux 盒子）：若你需要完整控制权，且希望浏览器自动化使用**住宅 IP**。很多网站会屏蔽机房 IP，本地浏览更稳定。
- **混合方案：** Gateway 放在便宜 VPS，需要浏览器/UI 自动化时让 Mac 作为 **node** 连接。见 [节点](/zh/nodes) 与 [Gateway 远程](/zh/gateway/remote)。

只有当你需要 macOS 独占能力（iMessage/BlueBubbles）或希望严格隔离时，才使用 macOS VM。

## macOS VM 选项

### 在 Apple Silicon Mac 上的本地 VM（Lume）

用 [Lume](https://cua.ai/docs/lume) 在 Apple Silicon Mac 上运行沙盒化 macOS VM。

你将获得：

- 完整隔离的 macOS 环境（宿主机保持干净）
- 通过 BlueBubbles 支持 iMessage（Linux/Windows 无法实现）
- 通过克隆快速重置 VM
- 无需额外硬件或云成本

### 托管 Mac 提供商（云）

若你想在云上运行 macOS，可选择托管 Mac：

- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其它托管 Mac 供应商也可用；遵循其 VM + SSH 文档

拿到 macOS VM 的 SSH 访问后，继续下方第 6 步。

---

## 快速路径（Lume，熟练用户）

1. 安装 Lume
2. `lume create openclaw --os macos --ipsw latest`
3. 完成 Setup Assistant，启用 Remote Login（SSH）
4. `lume run openclaw --no-display`
5. SSH 进入，安装 OpenClaw，配置频道
6. 完成

---

## 你需要什么（Lume）

- Apple Silicon Mac（M1/M2/M3/M4）
- 宿主机 macOS Sequoia 或更高版本
- 每个 VM 约 60 GB 可用磁盘
- ~20 分钟

---

## 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在 PATH：

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

这会下载 macOS 并创建 VM。VNC 窗口会自动打开。

注意：下载耗时取决于网络。

---

## 3) 完成 Setup Assistant

在 VNC 窗口中：

1. 选择语言与区域
2. 跳过 Apple ID（若后续需要 iMessage 可登录）
3. 创建用户账号（记住用户名/密码）
4. 跳过所有可选功能

完成后启用 SSH：

1. 打开 System Settings → General → Sharing
2. 启用 “Remote Login”

---

## 4) 获取 VM 的 IP

```bash
lume get openclaw
```

查看 IP 地址（通常 `192.168.64.x`）。

---

## 5) SSH 进入 VM

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为你创建的账号，IP 替换为 VM IP。

---

## 6) 安装 OpenClaw

在 VM 内：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

按提示配置模型 provider（Anthropic、OpenAI 等）。

---

## 7) 配置频道

编辑配置文件：

```bash
nano ~/.openclaw/openclaw.json
```

添加频道：

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

然后登录 WhatsApp（扫码）：

```bash
openclaw channels login
```

---

## 8) 无界面运行 VM

先停止 VM，然后无显示重启：

```bash
lume stop openclaw
lume run openclaw --no-display
```

VM 在后台运行。OpenClaw 的 daemon 会保持 gateway 运行。

查看状态：

```bash
ssh youruser@192.168.64.X "openclaw status"
```

---

## Bonus：iMessage 集成

这是在 macOS 上运行的杀手级功能。使用 [BlueBubbles](https://bluebubbles.app) 为 OpenClaw 添加 iMessage。

在 VM 内：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhook 指向 gateway（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

把它加入 OpenClaw 配置：

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

重启 gateway。现在你的 agent 可以收发 iMessage 了。

完整配置见：[BlueBubbles channel](/zh/channels/bluebubbles)

---

## 保存黄金镜像

在进一步自定义前，先做干净快照：

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

保持 VM 常驻：

- Mac 保持接电
- 在 System Settings → Energy Saver 中禁用睡眠
- 필요时使用 `caffeinate`

若需真正常驻，考虑专用 Mac mini 或小型 VPS。见 [VPS hosting](/zh/vps)。

---

## Troubleshooting

| Problem              | Solution                                                        |
| -------------------- | --------------------------------------------------------------- |
| 无法 SSH 进入 VM     | 确认 VM 的 System Settings 中启用了 “Remote Login”              |
| VM IP 未显示         | 等 VM 完全启动后再运行 `lume get openclaw`                      |
| 找不到 lume 命令     | 将 `~/.local/bin` 加入 PATH                                     |
| WhatsApp QR 无法扫码 | 运行 `openclaw channels login` 时确保在 VM 内登录（不是宿主机） |

---

## 相关文档

- [VPS hosting](/zh/vps)
- [节点](/zh/nodes)
- [Gateway 远程](/zh/gateway/remote)
- [BlueBubbles channel](/zh/channels/bluebubbles)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI 参考](https://cua.ai/docs/lume/reference/cli-reference)
- [Unattended VM 设置](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（高级）
- [Docker Sandboxing](/zh/install/docker)（替代隔离方案）
