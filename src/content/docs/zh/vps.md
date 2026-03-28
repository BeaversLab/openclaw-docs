---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw — 提供商选择、架构和调优"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux Server"
sidebarTitle: "Linux Server"
---

# Linux Server

在任何 Linux 服务器或云 VPS 上运行 OpenClaw Gateway。本页面帮助您
选择提供商，解释云部署如何工作，并涵盖适用于任何地方的通用 Linux
调优。

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/zh/install/railway">
    一键式，浏览器设置
  </Card>
  <Card title="Northflank" href="/zh/install/northflank">
    一键式，浏览器设置
  </Card>
  <Card title="DigitalOcean" href="/zh/install/digitalocean">
    简单的付费 VPS
  </Card>
  <Card title="Oracle Cloud" href="/zh/install/oracle">
    永久免费 ARM 层
  </Card>
  <Card title="Fly.io" href="/zh/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh/install/hetzner">
    Hetzner VPS 上的 Docker
  </Card>
  <Card title="GCP" href="/zh/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/zh/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/zh/install/exe-dev">
    带 HTTPS 代理的 VM
  </Card>
  <Card title="Raspberry Pi" href="/zh/install/raspberry-pi">
    ARM 自托管
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免费层)** 也运行良好。
社区视频演练位于
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(社区资源 - 可能会失效)。

## 云设置如何工作

- **Gateway 在 VPS 上运行** 并拥有状态 + 工作区。
- 您通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑或手机进行连接。
- 将 VPS 视为事实来源，并定期**备份**状态和工作区。
- 安全默认设置：将 Gateway(网关) 保持在本地回环地址上，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan` 或 `tailnet`，则要求使用 `gateway.auth.token` 或 `gateway.auth.password`。

相关页面：[Gateway(网关) 远程访问](/zh/gateway/remote)、[平台中心](/zh/platforms)。

## VPS 上的共享公司代理

当所有用户都在同一个信任边界内且该代理仅用于业务时，为团队运行单个代理是有效的设置。

- 将其保留在专用运行时上（VPS/VM/容器 + 专用操作系统用户/帐户）。
- 请勿将该运行时登录到个人 Apple/Google 帐户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在利益冲突，请按 Gateway/主机/操作系统用户进行拆分。

安全模型详情：[安全](/zh/gateway/security)。

## 将节点与 VPS 配合使用

您可以将 Gateway(网关) 保留在云端，并在本地设备上配对**节点**
(Mac/iOS/Android/headless)。节点提供本地屏幕/摄像头/画布和 `system.run`
功能，而 Gateway(网关) 则保留在云端。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)。

## 小型 VM 和 ARM 主机的启动优化

如果 CLI 命令在低功率 VM（或 ARM 主机）上感觉缓慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可缩短重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 可避免自重启动路径产生的额外启动开销。
- 首次运行命令会预热缓存；后续运行会更快。
- 有关 Raspberry Pi 的详细信息，请参阅 [Raspberry Pi](/zh/install/raspberry-pi)。

### systemd 优化清单（可选）

对于使用 `systemd` 的 VM 主机，请考虑：

- 添加服务环境变量以获得稳定的启动路径：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为的明确性：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 对于状态/缓存路径，请优先选择支持 SSD 的磁盘，以减少随机 I/O 冷启动开销。

示例：

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。
