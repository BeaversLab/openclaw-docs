---
summary: "OpenClaw 記錄：輪替診斷檔案記錄 + 統一記錄隱私權旗標"
read_when:
  - 擷取 macOS 記錄或調查私人資料記錄
  - 調查語音喚醒/工作階段生命週期問題
title: "macOS 記錄"
---

# 記錄

## 輪替診斷檔案記錄

OpenClaw 透過 swift-log (預設為統一記錄) 路由 macOS 應用程式記錄，並且當您需要持久的擷取時，可以寫入本地的輪替檔案記錄到磁碟。

- 詳細程度：**Debug pane → Logs → App logging → Verbosity**
- 啟用：**Debug pane → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl` (自動輪替；舊檔案會加上 `.1`、`.2`、... 等後綴)
- 清除：**Debug pane → Logs → App logging → “Clear”**

備註：

- 此功能**預設為關閉**。僅在主動除錯時啟用。
- 請將該檔案視為敏感資料；未經審查請勿分享。

## macOS 上的統一記錄私人資料

統一記錄會對大多數資料負載進行編輯，除非子系統選擇加入 `privacy -off`。根據 Peter 關於 macOS [記錄隱私權種種](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025) 的文章，這是由 `/Library/Preferences/Logging/Subsystems/` 中的 plist 控制，並以子系統名稱作為鍵值。只有新的記錄項目會套用該旗標，因此請在重現問題前啟用它。

## 為 OpenClaw 啟用 (`ai.openclaw`)

- 先將 plist 寫入暫存檔，然後以 root 權限原子性地安裝它：

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

- 不需要重新開機；logd 會很快注意到該檔案，但只有新的記錄行會包含私人資料負載。
- 使用現有的協助程式查看更豐富的輸出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 除錯後停用

- 移除覆寫：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 或者可以執行 `sudo log config --reload` 以強制 logd 立即捨棄該覆寫。
- 請記住此處可能包含電話號碼和訊息內容；僅在您主動需要這些額外細節時才保留該 plist。

import en from "/components/footer/en.mdx";

<en />
