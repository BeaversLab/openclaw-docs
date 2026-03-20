---
summary: "OpenClaw 的 VPS 托管中心 (OpenClaw/Fly/Oracle/Hetzner/exe.dev)"
read_when:
  - 您希望在云端运行 Gateway(网关)
  - 您需要一份 VPS/托管指南的快速地图
title: "VPS 托管"
---

# VPS 托管

该中心链接到受支持的 VPS/托管指南，并从高层次解释云端部署的工作原理。

## 选择提供商

- **Railway**（一键 + 浏览器设置）：[Railway](/zh/install/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/zh/install/northflank)
- **Oracle Cloud (Always Free)**：[Oracle](/zh/platforms/oracle) — $0/月（Always Free，ARM；容量/注册可能比较棘手）
- **Fly.io**：[Fly.io](/zh/install/fly)
- **Hetzner (Docker)**：[Hetzner](/zh/install/hetzner)
- **GCP (Compute Engine)**：[GCP](/zh/install/gcp)
- **exe.dev** (VM + HTTPS 代理)：[exe.dev](/zh/install/exe-dev)
- **AWS (EC2/Lightsail/免费层)**：同样效果很好。视频指南：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 云设置的工作原理

- **Gateway(网关) 运行在 VPS 上** 并拥有状态 + 工作区。
- 您可以通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑/手机连接。
- 将 VPS 视为事实来源，并**备份**状态 + 工作区。
- 安全默认设置：将 Gateway(网关) 保持在环回地址上，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan`/`tailnet`，则要求 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway(网关) remote](/zh/gateway/remote)  
平台中心：[Platforms](/zh/platforms)

## 在 VPS 上共享公司代理

当用户处于同一个信任边界（例如一个公司团队）且代理仅用于业务时，这是一个有效的设置。

- 将其保留在专用运行时（VPS/VM/容器 + 专用操作系统用户/帐户）上。
- 不要将该运行时登录到个人 Apple/Google 帐户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在敌对关系，请按网关/主机/操作系统用户进行拆分。

安全模型详情：[Security](/zh/gateway/security)

## 将节点与 VPS 配合使用

您可以将 Gateway(网关) 保留在云端，并将本地设备上的**节点**进行配对
(Mac/iOS/Android/headless)。节点提供本地屏幕/摄像头/画布和 `system.run`
功能，而 Gateway(网关) 则保留在云端。

文档：[节点](/zh/nodes)，[节点 CLI](/zh/cli/nodes)

## 针对小型虚拟机和 ARM 主机的启动优化

如果在低功耗虚拟机（或 ARM 主机）上 CLI 命令感觉缓慢，请启用 Node 的模块编译缓存：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可以改善重复命令的启动时间。
- `OPENCLAW_NO_RESPAWN=1` 避免了来自自重启路径的额外启动开销。
- 首次命令运行会预热缓存；后续运行会更快。
- 有关 Raspberry Pi 的详细信息，请参阅 [Raspberry Pi](/zh/platforms/raspberry-pi)。

### systemd 调优清单（可选）

对于使用 `systemd` 的虚拟机主机，请考虑：

- 添加服务环境变量以获得稳定的启动路径：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重启行为显式：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 对于状态/缓存路径，首选支持 SSD 的磁盘，以减少随机 I/O 冷启动惩罚。

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
[systemd 可以自动执行服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

import zh from "/components/footer/zh.mdx";

<zh />
