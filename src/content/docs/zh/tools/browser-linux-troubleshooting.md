---
summary: "修复 OpenClaw 浏览器控制在 Linux 上的 Chrome/Brave/Edge/Chromium CDP 启动问题"
read_when: "浏览器控制在 Linux 上失败，尤其是使用 snap Chromium 时"
title: "Browser 故障排除"
---

## 问题：“无法在端口 18800 上启动 Chrome CDP”

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

这并不是一个真正的浏览器——它只是一个包装器。

其他常见的 Linux 启动失败情况：

- `The profile appears to be in use by another Chromium process` 表示 Chrome 在托管的配置文件目录中发现了过时的 `Singleton*` 锁定文件。当锁定指向已死机或不同主机的进程时，OpenClaw 会删除这些锁定并重试一次。
- `Missing X server or $DISPLAY` 表示在没有桌面会话的主机上明确请求了可见浏览器。默认情况下，当 `DISPLAY` 和 `WAYLAND_DISPLAY` 均未设置时，本地托管的配置文件在 Linux 上现在会回退到无头模式。如果您设置了 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless: false` 或 `browser.profiles.<name>.headless: false`，请删除该有头模式覆盖，设置 `OPENCLAW_BROWSER_HEADLESS=1`，启动 `Xvfb`，运行 `openclaw browser start --headless` 进行一次性托管启动，或者在真实的桌面会话中运行 OpenClaw。

### 解决方案 1：安装 Google Chrome（推荐）

安装官方的 Google Chrome `.deb` 包，它不受 snap 的沙箱隔离：

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

### 解决方案 2：将 Snap Chromium 与仅附加模式配合使用

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

使用以下命令启用：`systemctl --user enable --now openclaw-browser.service`

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

| 选项                             | 描述                                                                 | 默认值                                           |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `browser.enabled`                | 启用浏览器控制                                                       | `true`                                           |
| `browser.executablePath`         | 基于 Chromium 的浏览器二进制文件的路径（Chrome/Brave/Edge/Chromium） | 自动检测（当基于 Chromium 时优先使用默认浏览器） |
| `browser.headless`               | 无图形界面运行                                                       | `false`                                          |
| `OPENCLAW_BROWSER_HEADLESS`      | 针对本地托管浏览器无头模式的每个进程覆盖                             | 未设置                                           |
| `browser.noSandbox`              | 添加 `--no-sandbox` 标志（某些 Linux 设置需要）                      | `false`                                          |
| `browser.attachOnly`             | 不启动浏览器，仅连接到现有浏览器                                     | `false`                                          |
| `browser.cdpPort`                | Chrome DevTools Protocol 端口                                        | `18800`                                          |
| `browser.localLaunchTimeoutMs`   | 本地托管 Chrome 发现超时                                             | `15000`                                          |
| `browser.localCdpReadyTimeoutMs` | 本地托管启动后 CDP 就绪超时                                          | `8000`                                           |

在 Raspberry Pi、较旧的 VPS 主机或慢速存储上，当 Chrome 需要更多时间来公开其 CDP HTTP 端点时，请增加 `browser.localLaunchTimeoutMs`。当启动成功但 `openclaw browser start` 仍报告 `not reachable after start` 时，请增加 `browser.localCdpReadyTimeoutMs`。值必须是 `120000` ms 以内的正整数；无效的配置值将被拒绝。

### 问题：“未找到用于 profile=\"user\" 的 Chrome 标签页”

您正在使用 `existing-session` / Chrome MCP 配置文件。OpenClaw 可以看到本地 Chrome，但没有可附加的打开标签页。

修复选项：

1. **使用托管浏览器：** `openclaw browser start --browser-profile openclaw`
   （或设置 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 确保本地 Chrome 正在运行且至少打开了一个标签页，然后使用 `--browser-profile user` 重试。

注意：

- `user` 仅限主机。对于 Linux 服务器、容器或远程主机，建议使用 CDP 配置文件。
- `user` / 其他 `existing-session` 配置文件保留了当前的 Chrome MCP 限制：
  引用驱动的操作、单文件上传挂钩、无对话框超时覆盖、无
  `wait --load networkidle`，并且无 `responsebody`、PDF 导出、下载
  拦截或批量操作。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；仅为远程 CDP 设置这些项。
- 远程 CDP 配置文件接受 `http://`、`https://`、`ws://` 和 `wss://`。
  使用 HTTP(S) 进行 `/json/version` 发现，或者当您的浏览器
  服务为您提供直接的 DevTools 套接字 URL 时使用 WS(S)。

## 相关

- [浏览器](/zh/tools/browser)
- [浏览器登录](/zh/tools/browser-login)
- [浏览器 WSL2 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
