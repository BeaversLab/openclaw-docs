---
summary: "SOUL Evil hook (swap SOUL.md with SOUL_EVIL.md)"
read_when:
  - 您想要启用或调整 SOUL Evil hook
  - 您想要一个清除窗口或随机概率的人格交换
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

SOUL Evil hook 会在清除窗口期间或随机将 **injected** `SOUL.md` 内容与 `SOUL_EVIL.md` 进行交换。它**不会**修改磁盘上的文件。

## 工作原理

当 `agent:bootstrap` 运行时，该 hook 可以在组装系统提示之前替换内存中的 `SOUL.md` 内容。如果 `SOUL_EVIL.md` 缺失或为空，OpenClaw 会记录警告并保留正常的 `SOUL.md`。

Sub-agent 运行**不会**在其引导文件中包含 `SOUL.md`，因此该 hook 对子代理没有影响。

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

在代理工作区根目录（`SOUL.md` 旁边）创建 `SOUL_EVIL.md`。

## 选项

- `file` (字符串)：替代 SOUL 文件名（默认：`SOUL_EVIL.md`）
- `chance` (数字 0–1)：每次运行使用 `SOUL_EVIL.md` 的随机概率
- `purge.at` (HH:mm)：每日清除开始时间（24小时制）
- `purge.duration` (时长)：窗口长度（例如 `30s`、`10m`、`1h`）

**优先级：** 清除窗口优先于概率。

**时区：** 设置时使用 `agents.defaults.userTimezone`；否则使用主机时区。

## 注意

- 磁盘上不会写入或修改任何文件。
- 如果 `SOUL.md` 不在引导列表中，该 hook 不执行任何操作。

## 另请参阅

- [Hooks](/zh/hooks)

import zh from "/components/footer/zh.mdx";

<zh />
