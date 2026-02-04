---
summary: "SOUL Evil hook（用 SOUL_EVIL.md 替换 SOUL.md）"
read_when:
  - 你想启用或调优 SOUL Evil hook
  - 你想设置清洗窗口或随机人格切换
title: "SOUL Evil Hook"
---

# SOUL Evil Hook

SOUL Evil hook 会在清洗窗口或随机概率下，将 **注入** 的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。它 **不会** 修改磁盘上的文件。

## 工作原理

当 `agent:bootstrap` 运行时，hook 可以在系统提示组装前替换内存中的 `SOUL.md` 内容。如果 `SOUL_EVIL.md` 缺失或为空，OpenClaw 会记录警告并保留正常 `SOUL.md`。

子 agent 运行 **不会** 在 bootstrap 文件中包含 `SOUL.md`，因此该 hook 对子 agent 无效。

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

在 agent 工作区根目录创建 `SOUL_EVIL.md`（与 `SOUL.md` 同级）。

## 选项

- `file`（string）：替代 SOUL 文件名（默认：`SOUL_EVIL.md`）
- `chance`（number 0–1）：每次运行随机使用 `SOUL_EVIL.md` 的概率
- `purge.at`（HH:mm）：每日清洗开始时间（24 小时制）
- `purge.duration`（duration）：窗口时长（如 `30s`, `10m`, `1h`）

**优先级：**清洗窗口优先于随机概率。

**时区：**若设置了 `agents.defaults.userTimezone` 则使用它，否则使用主机时区。

## 说明

- 不会写入或修改磁盘文件。
- 若 `SOUL.md` 不在 bootstrap 列表中，该 hook 不会生效。

## 另见

- [钩子](/zh/hooks)
