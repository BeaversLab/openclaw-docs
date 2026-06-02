---
summary: "OpenClaw从 OpenClaw 监督 Codex 应用服务器会话。"
read_when:
  - You are installing, configuring, or auditing the codex-supervisor plugin
title: "Codex Supervisor 插件"
---

# Codex Supervisor 插件

从 OpenClaw 监督 Codex 应用服务器会话。

## 分发

- 软件包：`@openclaw/codex-supervisor`
- 安装方式：包含在 OpenClaw 中

## 接口

合约：工具

{/* openclaw-plugin-reference:manual-start */}

## 会话列表

`codex_sessions_list` 默认仅列出已加载的 Codex 会话。设置 `include_stored` 以包含存储的历史记录；该插件使用 Codex 应用服务器的仅状态数据库列表路径，并且默认将存储结果限制为 200 个。传递 `max_stored_sessions` 可以降低或提高此上限，最高为 1000。

{/* openclaw-plugin-reference:manual-end */}
