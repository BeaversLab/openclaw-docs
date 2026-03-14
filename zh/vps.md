---
summary: "OpenClaw VPS 托管中心 (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "VPS 托管"
---

# VPS 托管

该中心链接到支持的 VPS/托管指南，并从高层次解释云部署的工作原理。

## 选择提供商

- **Railway**（一键 + 浏览器设置）：[Railway](/en/install/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/en/install/northflank)
- **Oracle Cloud (Always Free)**: [Oracle](/en/platforms/oracle) — $0/月（Always Free，ARM；容量/注册可能比较棘手）
- **Fly.io**: [Fly.io](/en/install/fly)
- **Hetzner (Docker)**: [Hetzner](/en/install/hetzner)
- **GCP (Compute Engine)**: [GCP](/en/install/gcp)
- **exe.dev**（VM + HTTPS 代理）：[exe.dev](/en/install/exe-dev)
- **AWS (EC2/Lightsail/free tier)**：也运行良好。视频指南：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 云设置如何工作

- **Gateway(网关) 在 VPS 上运行**并拥有状态和工作区。
- 您可以通过 **Control UI** 或 **Tailscale/SSH** 从您的笔记本电脑/手机连接。
- 将 VPS 视为事实来源，并**备份**状态 + 工作区。
- 安全默认设置：将 Gateway(网关) 保留在环回地址上，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan`/`tailnet`，则需要 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway(网关) remote](/en/gateway/remote)  
平台中心：[Platforms](/en/platforms)

## 在 VPS 上共享的公司代理

当用户处于同一信任边界（例如一个公司团队）内且代理仅用于业务时，这是一个有效的设置。

- 将其保留在专用运行时（VPS/VM/容器 + 专用操作系统用户/账户）上。
- 不要将该运行时登录到个人 Apple/Google 账户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在敌对关系，请按 gateway/host/操作系统用户进行拆分。

安全模型详细信息：[Security](/en/gateway/security)

## 在 VPS 上使用节点

您可以将 Gateway(网关) 保留在云端，并在本地设备上配对 **节点**
(Mac/iOS/Android/headless)。节点提供本地屏幕/摄像头/canvas 和 `system.run`
功能，而 Gateway(网关) 则保留在云端。

文档：[节点](/en/nodes)、[节点 CLI](/en/cli/nodes)

## 小型虚拟机和 ARM 主机的启动优化

如果 CLI 命令在低功率虚拟机（或 ARM 主机）上感觉缓慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免来自自重启路径的额外启动开销。
- 首次命令运行会预热缓存；后续运行会更快。
- 有关 Raspberry Pi 的详细信息，请参阅 [Raspberry Pi](/en/platforms/raspberry-pi)。

### systemd 优化清单（可选）

对于使用 `systemd` 的虚拟机主机，请考虑：

- 添加服务环境变量以获得稳定的启动路径：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为明确：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 优先使用 SSD 支持的磁盘用于状态/缓存路径，以减少随机 I/O 冷启动惩罚。

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

import zh from '/components/footer/zh.mdx';

<zh />
