import type { ByPronoun } from '@shared/pronoun'
import { getLanguage } from '../i18n'

/**
 * Every message this window writes that is ABOUT her, one phrasing per pronoun.
 *
 * What the window SAYS, kept apart from what it draws. Read against
 * `shelf.pronoun`, which is re-read on every draw, so a character switch
 * rewords these on the same pass that redraws the sheet.
 *
 * Three blocks were stacked here, two of them saying this twice and the third
 * describing the `worn` message rather than the module. A rationale that sits
 * above the wrong declaration is read as being about that declaration, which is
 * worse than no rationale — it is now on the entry it is about.
 */
const SAYS_EN = {
  readingPermits: {
    she: 'Reading what she may do…',
    he: 'Reading what he may do…',
    it: 'Reading what it may do…',
  },

  marginFacesHead: { she: 'Her expressions', he: 'His expressions', it: 'Its expressions' },
  marginStored: 'Stored at',
  marginBuiltIn: {
    she: 'built-in · no file of her own',
    he: 'built-in · no file of his own',
    it: 'built-in · no file of its own',
  },
  marginUsedNone: 'none',

  /*
    The three views of her page.

    Sentences about her, so they take her pronoun — which is the whole reason
    they do not live in `tabs.ts` beside the movement they belong to. The worn
    character can change from the tray while this window is open, so
    `renderPlaces` re-resolves them on every pass rather than writing them once.
  */
  viewCast: { she: 'Who she is', he: 'Who he is', it: 'What it is' },
  viewArchive: {
    she: 'What she has said',
    he: 'What he has said',
    it: 'What it has said',
  },
  viewPermits: { she: 'What she may do', he: 'What he may do', it: 'What it may do' },

  /**
   * Clicking a card WEARS her — the handoff's own interaction (1a) — so the
   * plates, the assembled prompt and the conversations list all follow from one
   * click. A wake opens a new session, so nothing is torn down; the sheet says
   * as much rather than leaving somebody to wonder whether it took.
   */
  worn: {
    she: 'Worn. She will be this character from her next wake.',
    he: 'Worn. He will be this character from his next wake.',
    it: 'Worn. It will be this character from its next wake.',
  },
  saved: {
    she: 'Saved. It takes effect on her next wake.',
    he: 'Saved. It takes effect on his next wake.',
    it: 'Saved. It takes effect on its next wake.',
  },
  dropHers: {
    she: 'Delete every conversation with her?',
    he: 'Delete every conversation with him?',
    it: 'Delete every conversation with it?',
  },
  dropHersWhy: {
    she: 'Everything she has been told, and everything she said, is removed from this machine. Who she is, her voice and her look are untouched. This cannot be undone.',
    he: 'Everything he has been told, and everything he said, is removed from this machine. Who he is, his voice and his look are untouched. This cannot be undone.',
    it: 'Everything it has been told, and everything it said, is removed from this machine. Who it is, its voice and its look are untouched. This cannot be undone.',
  },
  droppedHers: {
    she: 'Every conversation with her is deleted.',
    he: 'Every conversation with him is deleted.',
    it: 'Every conversation with it is deleted.',
  },
  deleted: {
    she: 'Deleted, with her notes and her conversations. The built-in is worn now.',
    he: 'Deleted, with his notes and his conversations. The built-in is worn now.',
    it: 'Deleted, with its notes and its conversations. The built-in is worn now.',
  },
  restored: {
    she: 'The built-in is back as she ships.',
    he: 'The built-in is back as he ships.',
    it: 'The built-in is back as it ships.',
  },
  made: {
    she: 'Made, and worn. She will be this character from her next wake.',
    he: 'Made, and worn. He will be this character from his next wake.',
    it: 'Made, and worn. It will be this character from its next wake.',
  },
  cutEarly: {
    she: 'interrupted before she got a word out',
    he: 'interrupted before he got a word out',
    it: 'interrupted before it got a word out',
  },
  /*
    The first hour, and it is the delivery's own words.

    "She has not said anything yet. This page fills itself the first time you
    talk to her." A sentence about what will happen, not a report that a query
    returned nothing.
  */
  noTalks: {
    she: 'She has not said anything yet. This page fills itself the first time you talk to her.',
    he: 'He has not said anything yet. This page fills itself the first time you talk to him.',
    it: 'It has not said anything yet. This page fills itself the first time you talk to it.',
  },
  /*
    NOTHING TO SHOW is not the same as FAILED TO READ, and an empty page cannot
    tell you which. So the empty state says what is true of the machine: whether
    conversations are being kept at all, and how many times she has been awake.
    A person whose retention is off learns it here rather than after a week of
    talking to an archive that was never going to fill.
  */
  /* Said where the day strip would be, when no day has anything on it. */
  noDay: 'no day has anything in it',
  noTalksWhy: 'keeping conversations is',
  /* Said after a face is worn from the mood tiles. The face's own name comes
     first — "Done" over eight tiles that look alike at 56px says nothing
     anybody can check — and this is the tail. */
  lookAtHer: { she: ' — look at her.', he: ' — look at him.', it: ' — look at it.' },
  /* Said when the system prompt is saved with nothing in it. What actually
     happens, rather than "Saved": the document is empty and the character is
     still assembled from everything else. */
  promptNowEmpty: {
    she: 'The system prompt is empty. She is still told her character.',
    he: 'The system prompt is empty. He is still told his character.',
    it: 'The system prompt is empty. It is still told its character.',
  },
  /* The receipt after the notes are erased. It names what went and what did
     not, because the confirmation just promised the conversations were safe. */
  backToWho: { she: '‹ Who she is', he: '‹ Who he is', it: '‹ What it is' },
  /* The apparatus column's four labels. Facts, never arguments — the delivery's
     own first audit finding was that this column held prose about the design. */
  /*
    `marginIs`, `marginColour(Head)` and `marginFaces` were here — four
    paragraphs the apparatus column used to carry. They went with the column's
    prose: the delivery's first audit finding is that no words explaining the
    design are left in the interface, and one of them had gone false anyway,
    still saying her colour retints a window that no longer takes a hue.
  */
  /*
    The three drill-downs each have an apparatus column of their own — A2b, A2c
    and A8 all draw one — and all three were showing HER PAGE's four facts. So
    the screen about her notes stood beside "Last awake" and "Stored at · wisp",
    which are true and are about something else.
  */
  /* The rail's heading over the character list. A label, not a sentence — the
     count beside it is the part that moves. */
  /* The month picker on a fresh archive: nothing to choose, said rather than
     drawn as twelve dead buttons with no explanation. */
  monthNoneKept: 'Nothing has been kept in this year, so none of these opens anything.',
  railCast: 'Characters',
  keptHead: 'Lines kept',
  keptSizeHead: 'Written',
  keptWhereHead: 'Stored at',
  /* A8's "Right now", per state. `saving` is not a synonym for either of the
     others: while a save is in flight the box and both buttons are dead, and
     reporting that as "unsaved" would describe the freeze as an edit. */
  promptSaved: 'saved',
  promptUnsaved: 'unsaved',
  promptSaving: 'saving…',
  drawnHead: 'Drawn',
  allowedHead: 'Allowed',
  wearingHead: 'Wearing now',
  drawnAtHead: 'Drawn at',
  drawnAtOwn: {
    she: 'her desktop size',
    he: 'his desktop size',
    it: 'its desktop size',
  },
  sentAtWakeHead: {
    she: 'Sent at her next wake',
    he: 'Sent at his next wake',
    it: 'Sent at its next wake',
  },
  promptWhereHead: 'Stored at',
  /* A7's apparatus column: who the grants apply to, how many are withheld, and
     when a change to one takes effect. */
  permitsForHead: 'In force for',
  permitsForWhom: 'the worn character · the live one',
  permitsWithheldHead: 'Withheld',
  permitsWhenHead: {
    she: 'Sent at her next wake',
    he: 'Sent at his next wake',
    it: 'Sent at its next wake',
  },
  permitsWhen: 'off takes effect at once',
  marginNow: 'Right now',
  marginAsleep: 'asleep',
  marginAwake: 'active on desktop',
  marginHiddenAsleep: 'hidden on desktop · asleep',
  marginHiddenActive: 'hidden on desktop · active',
  marginShownAsleep: 'shown on desktop · asleep',
  wakeAndShow: {
    she: 'Wake her & show on desktop',
    he: 'Wake him & show on desktop',
    it: 'Wake it & show on desktop',
  },
  wakeOnly: {
    she: 'Wake her',
    he: 'Wake him',
    it: 'Wake it',
  },
  putToSleep: {
    she: 'Put her to sleep',
    he: 'Put him to sleep',
    it: 'Put it to sleep',
  },
  showOnDesktop: 'Show on desktop',
  hideOnDesktop: 'Hide on desktop',
  marginLastAwake: 'Last awake',
  marginNeverAwake: 'never · nothing kept yet',
  keptErased: {
    she: 'Erased. Everything she had kept about you is gone.',
    he: 'Erased. Everything he had kept about you is gone.',
    it: 'Erased. Everything it had kept about you is gone.',
  },
  /*
    "on the left" was true of a layout that no longer exists — the list was in
    an aside beside the transcript and is above it now. A sentence that tells
    somebody to look in the wrong direction is worse than one that tells them
    nothing.
  */
  pickOne: {
    she: 'Pick a conversation above, or search everything she has ever said.',
    he: 'Pick a conversation above, or search everything he has ever said.',
    it: 'Pick a conversation above, or search everything it has ever said.',
  },
  noTroubles: {
    she: 'Nothing has gone wrong since she woke up.',
    he: 'Nothing has gone wrong since he woke up.',
    it: 'Nothing has gone wrong since it woke up.',
  },
  troubles: {
    she: 'Things she could not load since she woke up. Each one fell back to a working default, so nothing here stopped her — but a file you edited may not be the one she is using.',
    he: 'Things he could not load since he woke up. Each one fell back to a working default, so nothing here stopped him — but a file you edited may not be the one he is using.',
    it: 'Things it could not load since it woke up. Each one fell back to a working default, so nothing here stopped it — but a file you edited may not be the one it is using.',
  },
  machineSays: {
    she: 'These settings apply whoever she is.',
    he: 'These settings apply whoever he is.',
    it: 'These settings apply whatever it is.',
  },
} as const satisfies Readonly<Record<string, ByPronoun | string>>

const SAYS_ZH: Readonly<Record<keyof typeof SAYS_EN, ByPronoun | string>> = {
  readingPermits: {
    she: '正在读取权限与能力…',
    he: '正在读取权限与能力…',
    it: '正在读取权限与能力…',
  },
  marginFacesHead: { she: '表情设定', he: '表情设定', it: '表情设定' },
  marginStored: '存储位置',
  marginBuiltIn: {
    she: '内置 · 无独立文件',
    he: '内置 · 无独立文件',
    it: '内置 · 无独立文件',
  },
  marginUsedNone: '无',
  viewCast: { she: '角色设定', he: '角色设定', it: '角色设定' },
  viewArchive: {
    she: '历史对话',
    he: '历史对话',
    it: '历史对话',
  },
  viewPermits: { she: '权限许可', he: '权限许可', it: '权限许可' },
  worn: {
    she: '已启用。将在下次唤醒时切换为此角色。',
    he: '已启用。将在下次唤醒时切换为此角色。',
    it: '已启用。将在下次唤醒时切换为此角色。',
  },
  saved: {
    she: '已保存。将在下次唤醒时生效。',
    he: '已保存。将在下次唤醒时生效。',
    it: '已保存。将在下次唤醒时生效。',
  },
  dropHers: {
    she: '删除与她的所有对话记录？',
    he: '删除与他的所有对话记录？',
    it: '删除与它的所有对话记录？',
  },
  dropHersWhy: {
    she: '与她相关的所有对话和记忆都将从本设备删除。角色设定、声音和外观保持不变。此操作无法撤销。',
    he: '与他相关的所有对话和记忆都将从本设备删除。角色设定、声音和外观保持不变。此操作无法撤销。',
    it: '与它相关的所有对话和记忆都将从本设备删除。角色设定、声音和外观保持不变。此操作无法撤销。',
  },
  droppedHers: {
    she: '已删除与她的所有对话记录。',
    he: '已删除与他的所有对话记录。',
    it: '已删除与它的所有对话记录。',
  },
  deleted: {
    she: '已删除该角色及其笔记与对话记录。已切回内置角色。',
    he: '已删除该角色及其笔记与对话记录。已切回内置角色。',
    it: '已删除该角色及其笔记与对话记录。已切回内置角色。',
  },
  restored: {
    she: '已恢复出厂内置角色。',
    he: '已恢复出厂内置角色。',
    it: '已恢复出厂内置角色。',
  },
  made: {
    she: '创建成功并已启用。将在下次唤醒时切换为此角色。',
    he: '创建成功并已启用。将在下次唤醒时切换为此角色。',
    it: '创建成功并已启用。将在下次唤醒时切换为此角色。',
  },
  cutEarly: {
    she: '在开口说话前被打断',
    he: '在开口说话前被打断',
    it: '在开口说话前被打断',
  },
  noTalks: {
    she: '她还没有说过任何话。第一次与她对话后，此页面将自动填充记录。',
    he: '他还没有说过任何话。第一次与他对话后，此页面将自动填充记录。',
    it: '它还没有说过任何话。第一次与它对话后，此页面将自动填充记录。',
  },
  noDay: '该日期暂无记录',
  noTalksWhy: '保存对话记录当前为',
  lookAtHer: { she: ' — 请看角色形象。', he: ' — 请看角色形象。', it: ' — 请看角色形象。' },
  promptNowEmpty: {
    she: '系统提示词为空。角色依然遵循其预设设定。',
    he: '系统提示词为空。角色依然遵循其预设设定。',
    it: '系统提示词为空。角色依然遵循其预设设定。',
  },
  backToWho: { she: '‹ 角色设定', he: '‹ 角色设定', it: '‹ 角色设定' },
  monthNoneKept: '今年尚未保存任何记录，因此暂无内容可打开。',
  railCast: '角色列表',
  keptHead: '已保存行数',
  keptSizeHead: '已写入',
  keptWhereHead: '存储位置',
  promptSaved: '已保存',
  promptUnsaved: '未保存',
  promptSaving: '正在保存…',
  drawnHead: '外观',
  allowedHead: '允许使用',
  wearingHead: '当前启用',
  drawnAtHead: '绘制尺寸',
  drawnAtOwn: {
    she: '桌面尺寸',
    he: '桌面尺寸',
    it: '桌面尺寸',
  },
  sentAtWakeHead: {
    she: '下次唤醒时发送',
    he: '下次唤醒时发送',
    it: '下次唤醒时发送',
  },
  promptWhereHead: '存储位置',
  permitsForHead: '生效对象',
  permitsForWhom: '当前启用角色 · 活跃中',
  permitsWithheldHead: '已禁用',
  permitsWhenHead: {
    she: '下次唤醒时生效',
    he: '下次唤醒时生效',
    it: '下次唤醒时生效',
  },
  permitsWhen: '关闭后立即生效',
  marginNow: '当前状态',
  marginAsleep: '休眠中',
  marginAwake: '桌面上活动中',
  marginHiddenAsleep: '已在桌面隐藏 · 休眠中',
  marginHiddenActive: '已在桌面隐藏 · 活跃中',
  marginShownAsleep: '桌面上显示 · 休眠中',
  wakeAndShow: {
    she: '唤醒形象并在桌面显示',
    he: '唤醒形象并在桌面显示',
    it: '唤醒形象并在桌面显示',
  },
  wakeOnly: {
    she: '唤醒形象',
    he: '唤醒形象',
    it: '唤醒形象',
  },
  putToSleep: {
    she: '让它休眠',
    he: '让它休眠',
    it: '让它休眠',
  },
  showOnDesktop: '在桌面显示形象',
  hideOnDesktop: '在桌面隐藏形象',
  marginLastAwake: '上次唤醒',
  marginNeverAwake: '从未 · 暂无记录',
  keptErased: {
    she: '已清除。关于你的所有记忆均已删除。',
    he: '已清除。关于你的所有记忆均已删除。',
    it: '已清除。关于你的所有记忆均已删除。',
  },
  pickOne: {
    she: '请在上方选择一段对话，或搜索历史发言。',
    he: '请在上方选择一段对话，或搜索历史发言。',
    it: '请在上方选择一段对话，或搜索历史发言。',
  },
  noTroubles: {
    she: '唤醒以来运行正常，无异常。',
    he: '唤醒以来运行正常，无异常。',
    it: '唤醒以来运行正常，无异常。',
  },
  troubles: {
    she: '唤醒以来未能成功加载的项。均已回退到默认项正常运行，未中断服务。',
    he: '唤醒以来未能成功加载的项。均已回退到默认项正常运行，未中断服务。',
    it: '唤醒以来未能成功加载的项。均已回退到默认项正常运行，未中断服务。',
  },
  machineSays: {
    she: '这些设置对所有角色通用生效。',
    he: '这些设置对所有角色通用生效。',
    it: '这些设置对所有角色通用生效。',
  },
} as const satisfies Readonly<Record<keyof typeof SAYS_EN, ByPronoun | string>>

export const SAYS = new Proxy(SAYS_EN, {
  get(target, prop, receiver) {
    if (getLanguage() === 'zh' && prop in SAYS_ZH) {
      return (SAYS_ZH as Record<string, ByPronoun | string>)[prop as string]
    }
    return Reflect.get(target, prop, receiver)
  },
})
