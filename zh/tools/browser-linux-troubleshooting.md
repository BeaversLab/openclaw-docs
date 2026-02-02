---
title: "Browser Troubleshooting"
summary: "修复 Linux 上 OpenClaw 浏览器控制在 Chrome/Brave/Edge/Chromium 上的 CDP 启动问题"
read_when: "Linux 上浏览器控制失败，尤其是 snap 版 Chromium"
---

# 浏览器排查（Linux）

## 问题：“Failed to start Chrome CDP on port 18800”

OpenClaw 的浏览器控制服务在启动 Chrome/Brave/Edge/Chromium 时失败，错误如下：
```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile "openclaw"."}
```

### 根因

在 Ubuntu（以及许多 Linux 发行版）上，默认的 Chromium 安装是 **snap 包**。Snap 的 AppArmor 隔离会干扰 OpenClaw 启动并监控浏览器进程。

`apt install chromium` 实际安装的是一个重定向到 snap 的占位包：
```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这并不是一个真正的浏览器 —— 只是一个包装器。

### 解决方案 1：安装 Google Chrome（推荐）

安装官方的 Google Chrome `.deb` 包，它不会被 snap 沙箱化：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

然后更新你的 OpenClaw 配置（`~/.openclaw/openclaw.json`）：

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

### 解决方案 2：使用 Snap Chromium（仅附加模式）

如果你必须使用 snap 版 Chromium，将 OpenClaw 配置为只附加到手动启动的浏览器：

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
chromium-browser --headless --no-sandbox --disable-gpu   --remote-debugging-port=18800   --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data   about:blank &
```

3. （可选）创建 systemd 用户服务，自动启动 Chrome：
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

启用：`systemctl --user enable --now openclaw-browser.service`

### 验证浏览器是否工作

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

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `browser.enabled` | 启用浏览器控制 | `true` |
| `browser.executablePath` | Chromium 内核浏览器二进制路径（Chrome/Brave/Edge/Chromium） | 自动探测（优先默认浏览器且为 Chromium 内核） |
| `browser.headless` | 无界面运行 | `false` |
| `browser.noSandbox` | 添加 `--no-sandbox` 标志（部分 Linux 环境需要） | `false` |
| `browser.attachOnly` | 不启动浏览器，仅附加到已有实例 | `false` |
| `browser.cdpPort` | Chrome DevTools Protocol 端口 | `18800` |

### 问题：“Chrome extension relay is running, but no tab is connected”

你正在使用 `chrome` profile（扩展中继）。它期望 OpenClaw 浏览器扩展附加到一个正在运行的标签页。

修复方式：
1. **使用托管浏览器**：`openclaw browser start --browser-profile openclaw`
   （或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用扩展中继**：安装扩展，打开一个标签页，并点击 OpenClaw 扩展图标进行附加。

备注：
- `chrome` profile 尽可能使用你的 **系统默认 Chromium 浏览器**。
- 本地 `openclaw` profile 会自动分配 `cdpPort`/`cdpUrl`；只有在远程 CDP 时才需要手动设置。
