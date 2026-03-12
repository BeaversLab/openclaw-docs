---
summary: "OpenClaw 日志记录：滚动诊断文件日志 + 统一日志隐私标志"
read_when:
  - Capturing macOS logs or investigating private data logging
  - Debugging voice wake/session lifecycle issues
title: "macOS 日志记录"
---

# 日志记录

## 滚动诊断文件日志

OpenClaw 通过 swift-log（默认为统一日志记录）路由 macOS 应用日志，并在您需要持久化捕获时将本地滚动文件日志写入磁盘。

- 详细程度：**调试面板 → 日志 → 应用日志 → 详细程度**
- 启用：**调试面板 → 日志 → 应用日志 → “写入滚动诊断日志 (JSONL)”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`（自动轮换；旧文件后缀为 `.1`，`.2`，…）
- 清除：**调试面板 → 日志 → 应用日志 → “清除”**

注意事项：

- 此项**默认关闭**。仅在主动调试时启用。
- 请将该文件视为敏感信息；未经审查请勿分享。

## macOS 上的统一日志记录私有数据

除非子系统选择加入 `privacy -off`，否则统一日志记录会编辑大多数负载。根据 Peter 关于 macOS [日志记录隐私恶作剧](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025) 的文章，这是由 `/Library/Preferences/Logging/Subsystems/` 中的 plist 控制的，该 plist 以子系统名称为键。只有新的日志条目会获取该标志，因此请在重现问题之前启用它。

## 为 OpenClaw (`ai.openclaw`) 启用

- 先将 plist 写入临时文件，然后以 root 身份原子性地安装它：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
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
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- 不需要重新启动；logd 会快速注意到该文件，但只有新的日志行才会包含私有负载。
- 使用现有的辅助工具查看更丰富的输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试后禁用

- 移除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- （可选）运行 `sudo log config --reload` 以强制 logd 立即丢弃覆盖。
- 请记住，此界面可能包含电话号码和消息正文；仅在您主动需要额外详细信息时才保留 plist。
