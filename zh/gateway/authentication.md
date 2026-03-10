---
summary: "模型身份验证:OAuth、API 密钥和 setup-token"
read_when:
  - "调试模型身份验证或 OAuth 过期"
  - "记录身份验证或凭据存储"
title: "身份验证"
---

# 身份验证

OpenClaw 支持模型提供商的 OAuth 和 API 密钥。对于 Anthropic
账户,我们建议使用 **API 密钥**。对于 Claude 订阅访问,
使用由 `claude setup-token` 创建的长期令牌。

查看 [/concepts/oauth](/zh/concepts/oauth) 以了解完整的 OAuth 流程和存储
布局。

## 推荐的 Anthropic 设置(API 密钥)

如果您直接使用 Anthropic,请使用 API 密钥。

1. 在 Anthropic 控制台中创建 API 密钥。
2. 将其放在 **gateway 主机**上(运行 `openclaw gateway` 的机器)。

```bash
export ANTHROPIC_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 在 systemd/launchd 下运行,最好将密钥放在
   `~/.openclaw/.env` 中,以便守护进程可以读取它:

```bash
cat >> ~/.openclaw/.env <<'EOF'
ANTHROPIC_API_KEY=...
EOF
```

然后重启守护进程(或重启您的 Gateway 进程)并重新检查:

```bash
openclaw models status
openclaw doctor
```

如果您不想自己管理环境变量,入门向导可以为守护进程存储
API 密钥:`openclaw onboard`。

查看 [Help](/zh/help) 以了解环境变量继承的详细信息(`env.shellEnv`、
`~/.openclaw/.env`、systemd/launchd)。

## Anthropic: setup-token(订阅身份验证)

对于 Anthropic,推荐的路径是 **API 密钥**。如果您使用 Claude
订阅,也支持 setup-token 流程。在 **gateway 主机**上运行它:

```bash
claude setup-token
```

然后将其粘贴到 OpenClaw 中:

```bash
openclaw models auth setup-token --provider anthropic
```

如果令牌是在另一台机器上创建的,请手动粘贴:

```bash
openclaw models auth paste-token --provider anthropic
```

如果您看到类似这样的 Anthropic 错误:

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.
```

...请改用 Anthropic API 密钥。

手动令牌输入(任何提供商;写入 `auth-profiles.json` 并更新配置):

```bash
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter
```

自动化友好的检查(过期/缺失时退出 `1`，即将过期时退出 `2`):

```bash
openclaw models status --check
```

可选的运维脚本(systemd/Termux)记录在此处:
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

> `claude setup-token` 需要交互式 TTY。

## 检查模型身份验证状态

```bash
openclaw models status
openclaw doctor
```

## 控制使用哪个凭据

### 每会话(聊天命令)

使用 `/model <alias-or-id>@<profileId>` 为当前会话固定特定的提供商凭据(示例配置文件 ID: `anthropic:default`、`anthropic:work`)。

使用 `/model`(或 `/model list`)进行紧凑选择;使用 `/model status` 查看完整视图(候选项 + 下一个身份验证配置文件,以及配置时的提供商端点详细信息)。

### 每个代理(CLI 覆盖)

为代理设置显式的身份验证配置文件顺序覆盖(存储在该代理的 `auth-profiles.json` 中):

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 定位特定代理;省略它以使用已配置的默认代理。

## 故障排除

### “未找到凭据”

如果 Anthropic 令牌配置文件缺失,请在
**gateway 主机**上运行 `claude setup-token`,然后重新检查:

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认哪个配置文件即将过期。如果配置文件
缺失,请重新运行 `claude setup-token` 并再次粘贴令牌。

## 要求

- Claude Max 或 Pro 订阅(用于 `claude setup-token`)
- 已安装 Claude Code CLI(`claude` 命令可用)
