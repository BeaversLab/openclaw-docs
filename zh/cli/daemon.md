---
summary: "CLI 参考 `openclaw daemon`（网关服务管理的旧版别名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Gateway 服务管理命令的旧别名。

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

- `status`：显示服务安装状态并探测网关健康状况
- `install`：安装服务 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 通用选项

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- lifecycle (`uninstall|start|stop|restart`)：`--json`

备注：

- `status` 会尽可能解析配置的探测认证 SecretRefs。
- 在 Linux systemd 安装上，`status` 的令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，则安装将以失败告终。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则安装将被阻止，直到明确设置模式为止。

## 推荐

有关当前的文档和示例，请使用 [`openclaw gateway`](/en/cli/gateway)。

import zh from '/components/footer/zh.mdx';

<zh />
