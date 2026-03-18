---
summary: "CLI 參考資料：`openclaw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Config 輔助指令：依路徑 get/set/unset/validate 數值並列印使用中的
設定檔。不帶子指令執行以開啟
設定精靈（與 `openclaw configure` 相同）。

## 範例

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

## 路徑

路徑使用點號或括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理程式清單索引來指定特定代理程式：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 數值

數值會盡可能解析為 JSON5，否則會被視為字串。
使用 `--strict-json` 以強制使用 JSON5 解析。`--json` 仍作為舊版別名支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## 子指令

- `config file`：列印使用中的設定檔路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。

編輯後請重新啟動閘道。

## 驗證

根據使用中的架構驗證目前設定，而不啟動
閘道。

```bash
openclaw config validate
openclaw config validate --json
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
