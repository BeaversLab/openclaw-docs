---
summary: "SOUL Evil hook（将 SOUL.md 与 SOUL_EVIL.md 交换）"
read_when:
  - You want to enable or tune the SOUL Evil hook
  - You want a purge window or random-chance persona swap
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

SOUL Evil hook 在清除窗口内或随机将 **注入（injected）** 的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。它 **不** 会修改磁盘上的文件。

## 工作原理

当 `agent:bootstrap` 运行时，该 hook 可以在组装系统提示词之前替换内存中的 `SOUL.md` 内容。如果 `SOUL_EVIL.md` 缺失或为空，OpenClow 将记录警告并保留正常的 `SOUL.md`。

子代理运行在其引导文件中 **不** 包含 `SOUL.md`，因此此 hook 对子代理无效。

## 启用

```bash
openclaw hooks enable soul-evil
```

然后设置配置：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

在代理工作区根目录中创建 `SOUL_EVIL.md`（与 `SOUL.md` 相邻）。

## 选项

- `file` (字符串): 备用 SOUL 文件名（默认：`SOUL_EVIL.md`）
- `chance` (数字 0–1): 每次运行使用 `SOUL_EVIL.md` 的随机概率
- `purge.at` (HH:mm): 每日清除开始时间（24小时制）
- `purge.duration` (时长): 窗口长度（例如 `30s`、`10m`、`1h`）

**优先级：** 清除窗口优先于随机概率。

**时区：** 如果设置了 `agents.defaults.userTimezone` 则使用它；否则使用主机时区。

## 注意事项

- 磁盘上不会写入或修改任何文件。
- 如果 `SOUL.md` 不在引导列表中，则该 hook 不起作用。

## 另请参阅

- [Hooks](/zh/en/hooks)
