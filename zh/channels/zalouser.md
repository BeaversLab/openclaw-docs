---
summary: "通过 zca-cli 支持 Zalo 个人账号（扫码登录）、能力与配置"
read_when:
  - 为 OpenClaw 设置 Zalo Personal
  - 调试 Zalo Personal 登录或消息流
---
# Zalo Personal（非官方）

状态：实验性。该集成通过 `zca-cli` 自动化**个人 Zalo 账号**。

> **警告：** 这是非官方集成，可能导致账号被封禁/停用。风险自担。

## 需要插件
Zalo Personal 为插件形式，未随核心安装打包。
- CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 或从源码检出：`openclaw plugins install ./extensions/zalouser`
- 详情：[Plugins](/zh/plugin)

## 前置条件：zca-cli
Gateway 机器必须在 `PATH` 中提供 `zca` 二进制。

- 验证：`zca --version`
- 若缺失，请安装 zca-cli（见 `extensions/zalouser/README.md` 或上游 zca-cli 文档）。

## 快速设置（新手）
1) 安装插件（见上方）。
2) 登录（扫码，Gateway 机器上执行）：
   - `openclaw channels login --channel zalouser`
   - 用 Zalo 手机 App 扫描终端二维码。
3) 启用渠道：

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

4) 重启 Gateway（或完成 onboarding）。
5) 私聊默认需要配对；首次联系时批准配对码。

## 这是什么
- 通过 `zca listen` 接收入站消息。
- 通过 `zca msg ...` 发送回复（文本/媒体/链接）。
- 面向 Zalo Bot API 不可用时的“个人账号”场景。

## 命名
渠道 id 为 `zalouser`，明确表示自动化**个人 Zalo 用户账号**（非官方）。`zalo` 预留给未来可能的官方 Zalo API 集成。

## 查找 ID（目录）
使用目录 CLI 查找联系人/群组及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制
- 出站文本约 2000 字符分块（Zalo 客户端限制）。
- 流式默认关闭。

## 访问控制（私聊）
`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。
`channels.zalouser.allowFrom` 接受用户 ID 或名称。向导在可用时通过 `zca friend find` 将名称解析为 ID。

批准命令：
- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群访问（可选）
- 默认：`channels.zalouser.groupPolicy = "open"`（允许群）。未设置时可用 `channels.defaults.groupPolicy` 覆盖默认值。
- 使用 allowlist 限制：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（key 为群 ID 或名称）
- 阻止所有群：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可提示群 allowlist。
- 启动时，OpenClaw 会将 allowlist 中群/用户名称解析为 ID 并记录映射；无法解析的条目保留原样。

示例：
```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true }
      }
    }
  }
}
```

## 多账号
账号对应 zca profiles。示例：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" }
      }
    }
  }
}
```

## 故障排查

**找不到 `zca`：**
- 安装 zca-cli 并确保 Gateway 进程的 `PATH` 可用。

**登录不生效：**
- `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`
