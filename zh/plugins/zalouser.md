> [!NOTE]
> 本页正在翻译中。

---
summary: "Zalo Personal 插件：通过 zca-cli 扫码登录并发送消息（安装 + 频道配置 + CLI + 工具）"
read_when:
  - 想在 OpenClaw 中使用 Zalo Personal（非官方）
  - 正在配置或开发 zalouser 插件
---

# Zalo Personal（插件）

通过插件为 OpenClaw 提供 Zalo Personal 支持，使用 `zca-cli` 自动化普通 Zalo 个人账号。

> **警告：** 非官方自动化可能导致账号暂停/封禁。风险自担。

## 命名
频道 id 为 `zalouser`，用于明确这是 **个人 Zalo 用户账号**（非官方）自动化。我们保留 `zalo` 供未来潜在的官方 Zalo API 集成。

## 运行位置
该插件 **在 Gateway 进程内**运行。

如果使用远程 Gateway，请在 **运行 Gateway 的机器** 上安装/配置，然后重启 Gateway。

## 安装

### 方案 A：从 npm 安装

```bash
openclaw plugins install @openclaw/zalouser
```

随后重启 Gateway。

### 方案 B：从本地目录安装（开发）

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

随后重启 Gateway。

## 前置条件：zca-cli
Gateway 机器必须在 `PATH` 中有 `zca`：

```bash
zca --version
```

## 配置
频道配置在 `channels.zalouser` 下（不是 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing"
    }
  }
}
```

## CLI

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## 代理工具
工具名：`zalouser`

动作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`
