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

在任何 Linux 服务器或云 VPS 上运行 OpenClaw Gateway(网关)。本页面帮助您
选择提供商，解释云部署如何工作，并涵盖适用于任何地方的通用 Linux
调优。

## 选择提供商

<CardGroup cols={2}>
  <Card title="Railway" href="/zh/install/railway">
    一键式浏览器设置
  </Card>
  <Card title="Northflank" href="/zh/install/northflank">
    一键式浏览器设置
  </Card>
  <Card title="DigitalOcean" href="/zh/install/digitalocean">
    简单的付费 VPS
  </Card>
  <Card title="Oracle Cloud" href="/zh/install/oracle">
    始终免费 ARM 层
  </Card>
  <Card title="Fly.io" href="/zh/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh/install/hetzner">
    Docker 在 Hetzner VPS 上
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
    带 HTTPS 代理的 VM
  </Card>
  <Card title="Raspberry Pi" href="/zh/install/raspberry-pi">
    ARM 自托管
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免费套餐)** 也能很好地工作。
可以在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
查看社区视频演练
（社区资源 —— 可能会变得不可用）。

## 云设置如何工作

- **Gateway(网关) 在 VPS 上运行** 并拥有状态 + 工作区。
- 您可以通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑或手机进行连接。
- 将 VPS 视为事实来源，并定期**备份**状态 + 工作区。
- 安全默认设置：将 Gateway(网关) 保留在本地回环，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan` 或 `tailnet`，请要求 `gateway.auth.token` 或 `gateway.auth.password`。

相关页面：[Gateway 远程访问](/zh/gateway/remote)、[平台中心](/zh/platforms)。

## 在 VPS 上共享公司代理

当每个用户都在相同的信任边界内且代理仅用于业务时，为团队运行单个代理是有效的设置。

- 将其保存在专用的运行时环境（VPS/VM/容器 + 专用操作系统用户/帐户）中。
- 切勿将该运行时登录到个人 Apple/Google 帐户或个人浏览器/密码管理器配置文件。
- 如果用户之间存在对抗关系，请按 gateway/host/操作系统用户进行拆分。

安全模型详情：[安全](/zh/gateway/security)。

## 结合 VPS 使用节点

您可以将 Gateway(网关) 保留在云端，并在本地设备上配对**节点**
(Mac/iOS/Android/headless)。节点提供本地屏幕/摄像头/画布和 `system.run`
功能，而 Gateway(网关) 则保留在云端。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)。

## 针对小型虚拟机和 ARM 主机的启动优化

如果在低功耗虚拟机（或 ARM 主机）上运行 CLI 命令感觉缓慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免来自自重生路径的额外启动开销。
- 首次命令运行会预热缓存；后续运行会更快。
- 关于 Raspberry Pi 的具体细节，请参阅 [Raspberry Pi](/zh/install/raspberry-pi)。

### systemd 调优检查清单（可选）

对于使用 `systemd` 的虚拟机主机，请考虑：

- 添加服务环境变量以获得稳定的启动路径：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为显式化：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 对于状态/缓存路径，首选 SSD 支持的磁盘以减少随机 I/O 冷启动惩罚。

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

如果您刻意安装了系统单元，请通过 `sudo systemctl edit openclaw-gateway.service` 编辑
`openclaw-gateway.service`。

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

关于 Linux OOM 行为、子进程受害者选择以及 `exit 137`
诊断，请参阅 [Linux 内存压力和 OOM 终止](/zh/platforms/linux#memory-pressure-and-oom-kills)。
