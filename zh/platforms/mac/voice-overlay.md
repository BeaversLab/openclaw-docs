---
title: "语音覆盖层生命周期（macOS）"
summary: "唤醒词与按住说话重叠时的语音覆盖层生命周期"
read_when:
  - 调整语音覆盖层行为
---
# 语音覆盖层生命周期（macOS）

受众：macOS 应用贡献者。目标：当唤醒词与按住说话重叠时，让语音覆盖层行为可预测。

### 当前意图
- 如果覆盖层已由唤醒词显示，用户再按下热键，则热键会 *接管* 现有文本而不是重置。覆盖层在热键按住期间保持显示。用户松开时：若有裁剪后的文本则发送，否则关闭。
- 仅唤醒词时仍在静默后自动发送；按住说话则在松开时立即发送。

### 已实现（2025-12-09）
- 覆盖层会话为每次捕获（唤醒词或按住说话）携带 token。当 token 不匹配时，partial/final/send/dismiss/level 更新会被丢弃，避免陈旧回调。
- 按住说话会将当前可见的覆盖层文本作为前缀（即唤醒覆盖层显示时按热键会保留文本并追加新语音）。它会等待最多 1.5 秒的最终转写，超时则回退到当前文本。
- 在 `voicewake.overlay`、`voicewake.ptt`、`voicewake.chime` 分类下以 `info` 级别输出提示音/覆盖层日志（会话开始、partial、final、send、dismiss、提示音原因）。

### 下一步
1. **VoiceSessionCoordinator（actor）**
   - 任何时刻只拥有一个 `VoiceSession`。
   - API（基于 token）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带陈旧 token 的回调（防止旧识别器重新打开覆盖层）。
2. **VoiceSession（模型）**
   - 字段：`token`、`source`（wakeWord|pushToTalk）、已提交/临时文本、提示音标记、计时器（自动发送、空闲）、`overlayMode`（display|editing|sending）、冷却截止时间。
3. **覆盖层绑定**
   - `VoiceSessionPublisher`（`ObservableObject`）将活跃会话镜像到 SwiftUI。
   - `VoiceWakeOverlayView` 仅通过 publisher 渲染；不直接修改全局单例。
   - 覆盖层用户操作（`sendNow`、`dismiss`、`edit`）回调到 coordinator，并带 session token。
4. **统一发送路径**
   - 在 `endCapture` 时：若裁剪文本为空 → dismiss；否则 `performSend(session:)`（仅播放一次发送提示音、转发、关闭）。
   - 按住说话：无延迟；唤醒词：可选延迟用于自动发送。
   - 按住说话结束后对唤醒运行时应用短冷却，避免唤醒词立即再次触发。
5. **日志**
   - Coordinator 在 subsystem `bot.molt`、category `voicewake.overlay` 与 `voicewake.chime` 输出 `.info` 日志。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

### 调试清单
- 复现覆盖层卡住时，实时查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "bot.molt" AND category CONTAINS "voicewake"' --level info --style compact
  ```
- 验证只存在一个活跃的 session token；陈旧回调应被 coordinator 丢弃。
- 确保按住说话松开时总是用活跃 token 调用 `endCapture`；若文本为空，预期 `dismiss`，不播放提示音或发送。

### 迁移步骤（建议）
1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 与 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime`，改为创建/更新/结束会话，而非直接操作 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk`，采用现有会话并在松开时调用 `endCapture`；应用运行时冷却。
4. 将 `VoiceWakeOverlayController` 接入 publisher；移除 runtime/PTT 的直接调用。
5. 添加会话接管、冷却、空文本关闭的集成测试。
