---
summary: "使用 Nix 声明式安装 OpenClaw"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 声明式安装 OpenClaw —— 这是一个官方的、开箱即用的 Home Manager 模块。

<Info>[nix-openclaw](https://github.com/openclaw/nix-openclaw) 仓库是 Nix 安装的事实来源。本页仅为快速概述。</Info>

## 你将获得

- Gateway(网关) + macOS 应用 + 工具（whisper、spotify、cameras）——均已固定版本
- 能够重启存活的 Launchd 服务
- 具有声明式配置的插件系统
- 即时回滚： `home-manager switch --rollback`

## 快速开始

<Steps>
  <Step title="安装 Determinate Nix">如果尚未安装 Nix，请按照 [Determinate Nix 安装程序](https://github.com/DeterminateSystems/nix-installer) 的说明进行操作。</Step>
  <Step title="创建本地 flake">使用 nix-openclaw 仓库中的 agent-first 模板： ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="配置密钥">设置您的消息机器人令牌和模型提供商 API 密钥。位于 `~/.secrets/` 的普通文件即可。</Step>
  <Step title="填写模板占位符并切换">```bash home-manager switch ```</Step>
  <Step title="验证">确认 launchd 服务正在运行，并且你的机器人响应消息。</Step>
</Steps>

有关完整的模块选项和示例，请参阅 [nix-openclaw README](https://github.com/openclaw/nix-openclaw)。

## Nix 模式运行时行为

当设置 `OPENCLAW_NIX_MODE=1` 时（nix-openclaw 会自动设置），OpenClaw 会进入针对 Nix 管理的安装的确定性模式。其他 Nix 包也可以设置相同的模式；nix-openclaw 是官方参考实现。

你也可以手动设置它：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用程序不会自动继承 shell 环境变量。请改用 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下的变化

- 自动安装和自我变更流程被禁用
- `openclaw.json` 被视为不可变。启动衍生的默认值仅保留在运行时，并且配置写入器（如 setup、新手引导、修改 `openclaw update`、插件安装/更新/卸载/启用、`doctor --fix`、`doctor --generate-gateway-token` 和 `openclaw config set`）将拒绝编辑该文件。
- Agent 应改为编辑 Nix 源。对于 nix-openclaw，请使用以 Agent 为先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，并在 `programs.openclaw.config` 或 `instances.<name>.config` 下设置配置。
- 缺失的依赖项会显示 Nix 特定的修复消息
- UI 会显示只读 Nix 模式横幅

### Config and state paths

OpenClaw 从 OpenClaw`OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR`NixNix 中。在 Nix 下运行时，请将这些显式设置为 Nix 管理的位置，以便运行时状态和配置不会保留在不可变存储中。

| 变量                   | 默认值                                  |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### 服务 PATH 发现

launchd/systemd 网关服务会自动发现 Nix-profile 二进制文件，因此那些调用 Nix`nix` 安装的可执行文件的插件和工具无需手动设置 PATH 即可工作：

- 当设置了 `NIX_PROFILES`Nix 时，每个条目都会按从右到左的优先级添加到服务 PATH 中（与 Nix shell 优先级匹配——最右侧的优先）。
- 当未设置 `NIX_PROFILES` 时，将添加 `~/.nix-profile/bin` 作为后备。

这适用于 macOS launchd 和 Linux systemd 服务环境。

## 相关

<CardGroup cols={2}>
  <Card title="nix-openclaw" href="https://github.com/openclaw/nix-openclaw" icon="arrow-up-right-from-square">
    唯一可信来源的 Home Manager 模块和完整设置指南。
  </Card>
  <Card title="Setup wizard" href="/zh/start/wizard" icon="wand-magic-sparkles" NixCLI>
    非 Nix CLI 设置演练。
  </Card>
  <Card title="DockerDocker" href="/zh/install/docker" icon="docker" Nix>
    作为非 Nix 替代方案的容器化设置。
  </Card>
  <Card title="Updating" href="/zh/install/updating" icon="arrow-up-right-from-square">
    与软件包一同更新由 Home Manager 管理的安装。
  </Card>
</CardGroup>
