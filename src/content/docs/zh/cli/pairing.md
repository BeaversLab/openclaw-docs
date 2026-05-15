---
summary: "`openclaw pairing` 的 CLI 参考（批准/列出配对请求）"
read_when:
  - You're using pairing-mode DMs and need to approve senders
title: "配对"
---

# `openclaw pairing`

批准或检查私信（私信）配对请求（针对支持配对的频道）。

相关：

- 配对流程：[配对](/zh/channels/pairing)

## 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

列出一个渠道的待处理配对请求。

选项：

- `[channel]`：位置渠道 id
- `--channel <channel>`：显式渠道 id
- `--account <accountId>`：多账户渠道的账户 id
- `--json`：机器可读输出

注意：

- 如果配置了多个支持配对的渠道，则必须按位置或使用 `--channel` 提供渠道。
- 只要渠道 id 有效，则允许使用扩展渠道。

## `pairing approve`

批准待处理的配对代码并允许该发送者。

用法：

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- 当恰好配置了一个支持配对的渠道时，使用 `openclaw pairing approve <code>`

选项：

- `--channel <channel>`：显式渠道 id
- `--account <accountId>`：多账户渠道的账户 id
- `--notify`：在同一渠道上向请求者发回确认

所有者引导：

- 如果您在批准配对码时 `commands.ownerAllowFrom`OpenClaw 为空，OpenClaw 还会将批准的发送者记录为命令所有者，使用诸如 `telegram:123456789` 之类的渠道范围条目。
- 这只会引导第一个所有者。后续的配对批准不会替换或扩展 `commands.ownerAllowFrom`。
- 命令所有者是被允许运行仅限所有者的命令并批准危险操作（如 `/diagnostics`、`/export-trajectory`、`/config` 和 exec 批准）的人工操作员账户。

## 注意

- 渠道输入：按位置传递 (`pairing list telegram`) 或使用 `--channel <channel>`。
- `pairing list` 支持多账户渠道的 `--account <accountId>`。
- `pairing approve` 支持 `--account <accountId>` 和 `--notify`。
- 如果只配置了一个支持配对的渠道，则允许 `pairing approve <code>`。
- 如果您在此引导功能存在之前批准了发送者，请运行 `openclaw doctor`；当未配置命令所有者时它会发出警告，并显示 `openclaw config set commands.ownerAllowFrom ...` 命令以进行修复。

## 相关

- [CLI 参考](CLI/en/cli)
- [渠道配对](/zh/channels/pairing)
