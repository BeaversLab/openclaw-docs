> [!NOTE]
> 本页正在翻译中。

---
summary: "OpenClaw 日志：滚动诊断文件 + 统一日志隐私标记"
read_when:
  - 捕获 macOS 日志或调查私密数据日志
  - 排查语音唤醒/会话生命周期问题
---
# 日志（macOS）

## 滚动诊断文件日志（Debug 面板）
OpenClaw 通过 swift-log 记录 macOS 应用日志（默认使用统一日志），并在需要持久化捕获时写入本地滚动日志文件。

- 详细程度：**Debug 面板 → Logs → App logging → Verbosity**
- 启用：**Debug 面板 → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（自动轮转；旧文件后缀为 `.1`、`.2` …）
- 清除：**Debug 面板 → Logs → App logging → “Clear”**

说明：
- 默认 **关闭**。仅在主动调试时启用。
- 该文件可能包含敏感信息，分享前务必审阅。

## macOS 统一日志中的私密数据

统一日志会默认打码大多数 payload，除非子系统开启 `privacy -off`。根据 Peter 在 2025 年的文章 [logging privacy shenanigans](https://steipete.me/posts/2025/logging-privacy-shenanigans)，该行为由 `/Library/Preferences/Logging/Subsystems/` 下以子系统名命名的 plist 控制。只有新的日志条目会受该标志影响，因此请在复现问题前启用。

## 为 OpenClaw 启用（`bot.molt`）
- 先写入临时文件，再以 root 原子安装：

```bash
cat <<'EOF' >/tmp/bot.molt.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/bot.molt.plist /Library/Preferences/Logging/Subsystems/bot.molt.plist
```

- 无需重启；logd 会很快读取该文件，但只有新的日志行会包含私密内容。
- 可用现有 helper 查看更丰富输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试后禁用
- 移除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/bot.molt.plist`。
- 可选运行 `sudo log config --reload` 让 logd 立刻清除覆盖。
- 此通道可能包含电话号码与消息正文；仅在确有需要时保留该 plist。
