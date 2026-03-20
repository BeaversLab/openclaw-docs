---
summary: "CLI 参考文档，用于 `openclaw daemon`（网关服务管理的传统别名）"
read_when:
  - 您仍然在脚本中使用 `openclaw daemon ...`
  - 您需要服务生命周期命令（install/start/stop/restart/status）
title: "daemon"
---

# `openclaw daemon`

Gateway(网关) 服务管理命令的传统别名。

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

- `status`：显示服务安装状态并探测 Gateway(网关) 运行状况
- `install`：安装服务 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 通用选项

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- lifecycle (`uninstall|start|stop|restart`)：`--json`

注意：

- `status` 会在可能的情况下解析探测身份验证的已配置 SecretRefs。
- 如果在此命令路径中未解析所需的身份验证 SecretRef，当探测连接/身份验证失败时，`daemon status --json` 将报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，将取消显示未解析的 auth-ref 警告，以避免误报。
- 在 Linux systemd 安装上，`status` 令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，安装将以失败告终。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 但未设置 `gateway.auth.mode`，安装将被阻止，直到显式设置模式。

## 推荐

请参阅 [`openclaw gateway`](/zh/cli/gateway) 以获取当前的文档和示例。

import en from "/components/footer/en.mdx";

<en />
