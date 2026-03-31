---
summary: "修复 OpenClaw 浏览器控制在 Linux 上的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "浏览器控制在 Linux 上失败，尤其是使用 snap Chromium 时"
title: "浏览器故障排除"
---

# 浏览器故障排除 (Linux)

## 问题："无法在端口 18800 上启动 Chrome CDP"

OpenClaw 的浏览器控制服务器无法启动 Chrome/Brave/Edge/Chromium，并出现错误：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（以及许多 Linux 发行版）上，默认安装的 Chromium 是一个 **snap 包**。Snap 的 AppArmor 限制会干扰 OpenClaw 生成和监控浏览器进程的方式。

`apt install chromium` 命令安装的是一个重定向到 snap 的存根包：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这并不是一个真正的浏览器——它只是一个封装。

### 解决方案 1：安装 Google Chrome（推荐）

安装官方的 Google Chrome `.deb` 软件包，它不受 snap 的沙箱限制：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

然后更新您的 OpenClaw 配置 (`~/.openclaw/openclaw.json`)：

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### 解决方案 2：使用 Snap Chromium 配合仅附加模式

如果您必须使用 snap Chromium，请将 OpenClaw 配置为附加到手动启动的浏览器：

1. 更新配置：

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. 手动启动 Chromium：

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. （可选）创建一个 systemd 用户服务以自动启动 Chrome：

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

通过以下方式启用：`systemctl --user enable --now openclaw-browser.service`

### 验证浏览器是否正常工作

检查状态：

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

测试浏览：

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| 选项                     | 描述                                                              | 默认值                                          |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------- |
| `browser.enabled`        | 启用浏览器控制                                                    | `true`                                          |
| `browser.executablePath` | 基于 Chromium 的浏览器二进制文件路径 (Chrome/Brave/Edge/Chromium) | 自动检测（如果基于 Chromium，则首选默认浏览器） |
| `browser.headless`       | 无图形界面运行                                                    | `false`                                         |
| `browser.noSandbox`      | 添加 `--no-sandbox` 标志（某些 Linux 设置需要）                   | `false`                                         |
| `browser.attachOnly`     | 不启动浏览器，仅附加到现有的                                      | `false`                                         |
| `browser.cdpPort`        | Chrome DevTools Protocol 端口                                     | `18800`                                         |

### 问题："未找到 profile=\"user\" 的 Chrome 标签页"

您正在使用一个 `existing-session` / Chrome MCP 配置文件。OpenClaw 可以看到本地 Chrome，但没有打开的标签页可供附加。

修复选项：

1. **使用托管浏览器：** `openclaw browser start --browser-profile openclaw`
   （或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 确保本地 Chrome 正在运行且至少打开了一个标签页，然后使用 `--browser-profile user` 重试。

注：

- `user` 仅限主机。对于 Linux 服务器、容器或远程主机，建议使用 CDP 配置文件。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；仅在远程 CDP 时设置这些参数。
