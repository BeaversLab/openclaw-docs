---
summary: “`openclaw config` 的 CLI 参考（get/set/unset/file/validate）”
read_when:
  - You want to read or edit config non-interactively
title: “config”
---

# `openclaw config`

配置助手：按路径 get/set/unset/validate 值并打印当前活动的配置文件。
不带子命令运行以打开配置向导（与 `openclaw configure` 相同）。

## 示例

```bash
openclaw config file
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config unset tools.web.search.apiKey
openclaw config validate
openclaw config validate --json
```

## 路径

路径使用点或括号表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理列表索引来定位特定的代理：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

值在可能的情况下被解析为 JSON5；否则它们将被视为字符串。
使用 `--strict-json` 来强制进行 JSON5 解析。`--json` 仍作为遗留别名受到支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## 子命令

- `config file`：打印当前活动的配置文件路径（从 `OPENCLAW_CONFIG_PATH` 解析或默认位置）。

编辑后重启网关。

## 验证

根据当前活动的架构验证配置，而不启动网关。

```bash
openclaw config validate
openclaw config validate --json
```

import zh from '/components/footer/zh.mdx';

<zh />
