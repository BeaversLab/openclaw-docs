---
summary: "`openclaw config` 的 CLI 参考（get/set/unset 配置值）"
read_when:
  - 你想以非交互方式读取或编辑配置
title: "config"
---

# `openclaw config`

配置助手：按路径 get/set/unset 值。不带子命令运行会打开配置向导
（等同于 `openclaw configure`）。

## 示例

```bash
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config unset tools.web.search.apiKey
```

## Paths

路径支持点或方括号表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用 agent 列表索引定位特定 agent：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

值会尽量按 JSON5 解析；否则当作字符串处理。
用 `--json` 强制 JSON5 解析。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --json
openclaw config set channels.whatsapp.groups '["*"]' --json
```

编辑后请重启 gateway。
