---
summary: "在 Linux 服务器或云 VPS 上运行 OpenClaw — 提供商选择、架构和调优"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux server"
sidebarTitle: "Linux Server"
---

Run the OpenClaw Gateway(网关) on any Linux server or cloud VPS. This page helps you
pick a 提供商, explains how cloud deployments work, and covers generic Linux
tuning that applies everywhere.

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/zh/install/railway">
    一键浏览器设置
  </Card>
  <Card title="Northflank" href="/zh/install/northflank">
    一键浏览器设置
  </Card>
  <Card title="DigitalOcean" href="/zh/install/digitalocean">
    简单的付费 VPS
  </Card>
  <Card title="Oracle Cloud" href="/zh/install/oracle">
    Always Free ARM 层级
  </Card>
  <Card title="Fly.io" href="/zh/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh/install/hetzner">
    Docker on Hetzner VPS
  </Card>
  <Card title="Hostinger" href="/zh/install/hostinger">
    支持一键设置的 VPS
  </Card>
  <Card title="GCP" href="/zh/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/zh/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/zh/install/exe-dev">
    带有 HTTPS 代理的 VM
  </Card>
  <Card title="Raspberry Pi" href="/zh/install/raspberry-pi">
    ARM 自托管
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免费套餐)** 也很适用。
社区视频演练可在以下地址观看：
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
（社区资源 —— 可能会失效）。

## 云设置的工作原理

- **Gateway(网关) 运行在 VPS 上** 并拥有状态 + 工作区。
- 你可以通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑或手机进行连接。
- 将 VPS 视为事实来源，并定期**备份**状态 + 工作区。
- 安全默认设置：将 Gateway(网关) 保留在回环地址上，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan` 或 `tailnet`，则要求 `gateway.auth.token` 或 `gateway.auth.password`。

相关页面：[Gateway(网关) 远程访问](/zh/gateway/remote)，[平台中心](/zh/platforms)。

## 首先加固管理员访问

在公共 VPS 上安装 OpenClaw 之前，请先确定您希望如何
管理该服务器本身。

- 如果您希望仅通过 Tailnet 进行管理员访问，请先安装 Tailscale，将 VPS
  加入您的 tailnet，通过 Tailscale IP 或
  MagicDNS 名称验证第二个 SSH 会话，然后限制公共 SSH。
- 如果您不使用 Tailscale，请在暴露更多服务之前
  对您的 SSH 路径应用同等的加固措施。
- 这与 Gateway(网关) 访问是分开的。您仍然可以将 OpenClaw 绑定到
  loopback，并使用 SSH 隧道或 Tailscale Serve 来访问仪表板。

Tailscale 特定的 Gateway(网关) 选项位于 [Tailscale](/zh/gateway/tailscale)。

## 在 VPS 上使用共享的公司代理

当所有用户都在同一信任边界内且该代理仅用于业务时，为团队运行单个代理是一种有效的设置。

- 将其保留在专用的运行时环境（VPS/VM/容器 + 专用操作系统用户/账户）中。
- 不要将该运行时环境登录到个人 Apple/Google 帐户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在对抗关系，请按 gateway/host/OS 用户进行拆分。

安全模型详情：[Security](/zh/gateway/security)。

## 在 VPS 中使用节点

您可以将 Gateway(网关) 保留在云端，并在本地设备上配对 **节点**
(Mac/iOS/Android/headless)。节点提供本地屏幕/摄像头/画布和 `system.run`
功能，而 Gateway(网关) 则保留在云端。

文档：[Nodes](/zh/nodes)，[Nodes CLI](/zh/cli/nodes)。

## 小型虚拟机和 ARM 主机的启动优化

如果在低功耗虚拟机（或 ARM 主机）上感到 CLI 命令速度较慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 改善了重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免了自重新生成路径带来的额外启动开销。
- 首次命令运行会预热缓存；后续运行会更快。
- 有关 Raspberry Pi 的具体信息，请参阅 [Raspberry Pi](/zh/install/raspberry-pi)。

### systemd 调优清单（可选）

对于使用 `systemd` 的虚拟机主机，请考虑：

- 添加服务环境变量以获得稳定的启动路径：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为的明确性：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 状态/缓存路径优先使用 SSD 支持的磁盘，以减少随机 I/O 冷启动惩罚。

对于标准的 `openclaw onboard --install-daemon` 路径，请编辑用户单元：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

如果您特意安装了系统单元，请通过 `sudo systemctl edit openclaw-gateway.service` 编辑
`openclaw-gateway.service`。

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动恢复服务](https://www.redhat.com/en/blog/systemd-automate-recovery)。

有关 Linux OOM 行为、子进程受害者选择和 `exit 137`
诊断，请参阅 [Linux 内存压力和 OOM 终止](/zh/platforms/linux#memory-pressure-and-oom-kills)。

## 相关

- [安装概述](/zh/install)
- [DigitalOcean](/zh/install/digitalocean)
- [Fly.io](/zh/install/fly)
- [Hetzner](/zh/install/hetzner)
