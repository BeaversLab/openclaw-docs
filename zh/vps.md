---
summary: "OpenClaw 的 VPS 托管中心 (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "VPS 托管"
---

# VPS 托管

该中心链接到支持的 VPS/托管指南，并从高层次解释云部署的工作原理。

## 选择提供商

- **Railway**（一键 + 浏览器设置）：[Railway](/zh/en/install/railway)
- **Northflank**（一键 + 浏览器设置）：[Northflank](/zh/en/install/northflank)
- **Oracle Cloud (Always Free)**: [Oracle](/zh/en/platforms/oracle) — $0/月 (Always Free，ARM；容量/注册可能比较挑剔)
- **Fly.io**: [Fly.io](/zh/en/install/fly)
- **Hetzner (Docker)**: [Hetzner](/zh/en/install/hetzner)
- **GCP (Compute Engine)**: [GCP](/zh/en/install/gcp)
- **exe.dev** (VM + HTTPS 代理)：[exe.dev](/zh/en/install/exe-dev)
- **AWS (EC2/Lightsail/free tier)**: 效果也不错。视频指南：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 云设置如何工作

- **Gateway 在 VPS 上运行** 并拥有状态 + 工作区。
- 您可以通过 **Control UI** 或 **Tailscale/SSH** 从笔记本电脑/手机连接。
- 将 VPS 视为事实来源，并**备份**状态 + 工作区。
- 安全默认设置：将 Gateway 保持在环回地址上，并通过 SSH 隧道或 Tailscale Serve 访问它。
  如果绑定到 `lan`/`tailnet`，请要求 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway remote](/zh/en/gateway/remote)  
平台中心：[Platforms](/zh/en/platforms)

## 在 VPS 上共享公司代理

当用户处于同一个信任边界内（例如一个公司团队）并且代理仅用于业务时，这是一个有效的设置。

- 将其保持在专用运行时上（VPS/VM/容器 + 专用操作系统用户/帐户）。
- 不要将该运行时登录到个人 Apple/Google 帐户或个人浏览器/密码管理器配置文件中。
- 如果用户之间存在敌对关系，请按 gateway/host/OS 用户进行拆分。

安全模型详情：[Security](/zh/en/gateway/security)

## 将节点与 VPS 配合使用

您可以将 Gateway 保留在云端，并在本地设备上配对 **节点**（Mac/iOS/Android/无头设备）。当 Gateway 保留在云端时，节点提供本地屏幕/摄像头/画布和 `system.run` 功能。

文档：[节点](/zh/en/nodes)、[节点 CLI](/zh/en/cli/nodes)

## 针对小型虚拟机和 ARM 主机的启动优化

如果在低功耗虚拟机（或 ARM 主机）上感觉 CLI 命令运行缓慢，请启用 Node 的模块编译缓存：

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
- 首次运行命令会预热缓存；后续运行会更快。
- 有关树莓派的具体信息，请参阅 [树莓派](/zh/en/platforms/raspberry-pi)。

### systemd 优化检查清单（可选）

对于使用 `systemd` 的虚拟机主机，请考虑：

- 添加服务环境变量以稳定启动路径：
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
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。
