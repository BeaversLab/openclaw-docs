---
summary: "`openclaw daemon` 的 CLI 参考（网关服务管理的旧版别名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

网关服务管理命令的旧版别名。

`openclaw daemon ...` 映射到与 `openclaw gateway ...` 服务命令相同的服务控制界面。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令

- `status`：显示服务安装状态并探测 Gateway 运行状况
- `install`：安装服务 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服务
- `start`：启动服务
- `stop`: 停止服务
- `restart`: 重启服务

## 常用选项

- `status`: `--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--deep`、`--json`
- `install`: `--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- 生命周期 (`uninstall|start|stop|restart`): `--json`

注意：

- `status` 会在可能的情况下解析已配置的认证 SecretRefs 用于探针认证。
- 在 Linux systemd 安装中，`status` 令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，安装将以失败告终。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则安装将被阻止，直到显式设置模式。

## 首选

请使用 [`openclaw gateway`](/zh/en/cli/gateway) 查看当前文档和示例。

import zh from '/components/footer/zh.mdx';

<zh />
