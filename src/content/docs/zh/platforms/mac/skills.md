---
summary: "macOS Skills 设置界面和网关支持的状态"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

macOS 应用通过网关展示 OpenClaw Skills；它不会在本地解析 Skills。

## 数据源

- `skills.status` (gateway) 返回所有 Skills 以及资格和缺失要求（包括捆绑 Skills 的允许列表阻止项）。
- 要求派生自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义了安装选项 (brew/node/go/uv)。
- 应用调用 `skills.install` 在网关主机上运行安装程序。
- 内置的危险代码 `critical` 发现默认会阻止 `skills.install`；可疑发现仍仅发出警告。危险覆盖存在于网关请求中，但默认应用流程保持故障关闭。
- 如果每个安装选项都是 `download`，则网关会显示所有下载选择。
- 否则，网关会使用当前安装首选项和主机二进制文件选择一个首选安装程序：当启用 `skills.install.preferBrew` 且存在 `brew` 时首选 Homebrew，然后是 `uv`，然后是 `skills.install.nodeManager` 中配置的节点管理器，最后是 `go` 或 `download` 等后备选项。
- 节点安装标签反映了配置的节点管理器，包括 `yarn`。

## Env/API 密钥

- 应用将密钥存储在 `~/.openclaw/openclaw.json` 下的 `skills.entries.<skillKey>` 中。
- `skills.update` 会修补 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装和配置更新发生在网关主机上（而不是本地 Mac 上）。

## 相关

- [Skills](/zh/tools/skills)
- [macOS 应用](/zh/platforms/macos)
