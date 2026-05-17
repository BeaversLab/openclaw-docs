---
summary: "CLI 参考 `openclaw daemon`（网关服务管理的旧版别名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "Daemon"
---

# `openclaw daemon`

Gateway(网关) 网关 服务管理命令的旧别名。

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

- `status`：显示服务安装状态并探测 Gateway(网关) 网关 健康状况
- `install`：安装服务 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 通用选项

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `restart``--safe`：%%PH:INLINE_CODE:36:824e751%%、`--skip-deferral`、`--force`、`--wait <duration>`、`--json`
- 生命周期（`uninstall|start|stop`）：`--json`

注意：

- `status` 会尽可能解析为探测认证配置的身份验证 SecretRefs。
- 如果在此命令路径中无法解析所需的身份验证 SecretRef，当探测连接/身份验证失败时，`daemon status --json` 将报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，将抑制未解析的 auth-ref 警告以避免误报。
- `status --deep` 增加了尽力而为的系统级服务扫描。当它发现其他类似网关的服务时，人工输出会打印清理提示，并警告每台机器一个网关仍然是通常的建议。
- `status --deep` 还会在感知插件模式下运行配置验证，并显示已配置的插件清单警告（例如缺少渠道配置元数据），以便安装和更新冒烟测试能够捕获这些问题。默认的 `status` 保持跳过插件验证的快速只读路径。
- 在 Linux systemd 安装上，`status` 令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- 漂移检查使用合并的运行时环境（首先是服务命令环境，然后是进程环境回退）来解析 `gateway.auth.token` SecretRefs。
- 如果令牌身份验证未实际激活（显式 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或未设置模式且密码可能获胜且没有令牌候选者可能获胜），令牌漂移检查将跳过配置令牌解析。
- 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌身份验证需要令牌但配置的令牌 SecretRef 未解析，安装将以失败告终。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 但未设置 `gateway.auth.mode`，安装将被阻止，直到明确设置模式。
- 在 macOS 上，`install` 保持 LaunchAgent plist 仅所有者可读写，并通过所有者文件和包装器加载托管服务环境值，而不是将 API 密钥或身份验证配置文件环境引用序列化到 `EnvironmentVariables` 中。
- 如果您有意在一台主机上运行多个网关，请隔离端口、配置/状态和工作区；请参阅 [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。
- `restart --safe`Gateway(网关) 请求正在运行的 Gateway(网关) 预检活跃工作并在活跃工作排空后安排一次合并重启。普通的 `restart` 保持现有的服务管理器行为；`--force` 仍然是立即覆盖的路径。
- `restart --safe --skip-deferral`OpenClawGateway(网关) 运行感知 OpenClaw 的安全重启，但绕过活跃工作延迟门，因此即使报告了阻塞程序，Gateway(网关) 也会立即发出重启。当卡住的任务运行阻止安全重启时的操作员应急手段；需要 `--safe`。

## 首选

有关当前文档和示例，请使用 [`openclaw gateway`](/zh/cli/gateway)。

## 相关

- [CLI 参考](CLI/en/cli)
- [Gateway(网关) 运维手册](<Gateway(网关)/en/gateway>)
