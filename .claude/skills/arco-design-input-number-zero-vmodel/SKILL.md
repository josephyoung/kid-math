---
name: arco-design-input-number-zero-vmodel-not-updating
description: |
  Fix for Arco Design Vue a-input-number when input value is 0, v-model doesn't update and stays undefined. Use when: (1) input 0 but submit button stays disabled, (2) v-model shows undefined even though input displays 0, (3) Arco Design Vue 2.x/3.x InputNumber component.
author: Claude Code
version: 1.0.0
date: 2026-03-28
---

# Arco Design InputNumber 0 值不更新 v-model 修复

## Problem

When using Arco Design Vue's `a-input-number` component, if the user enters **0** into the input:

- The input visually displays `0` correctly
- But the `v-model` bound variable **stays `undefined`**
- Computed properties that check if the user has answered keep returning `false`
- Submit button stays disabled even though the user has entered a value

## Context / Trigger Conditions

- Using `a-input-number` with `v-model="someValue"`
- User enters the digit `0`
- Input box shows `0` but `someValue` remains `undefined`
- Submit button is `:disabled="!answered"` and stays disabled

This bug only happens for the value `0`, other numbers work fine.

## Root Cause

Arco Design InputNumber component has (or had) an issue where it treats `0` as an "empty" value and doesn't trigger the `update:model-value` event that `v-model` relies on. So the bound variable never gets updated.

## Solution

Add an explicit `@input` event handler to manually sync the value from the DOM element to your variable:

```html
<a-input-number
  v-model="question.answer"
  @input="(ev) => question.answer = ev.target ? Number(ev.target.value) : ev"
/>
```

This ensures that even when `v-model` fails to update for `0`, the manual sync will correctly set `question.answer = 0`.

## Verification

After adding the handler:

1. Refresh page
2. Generate a question with answer 0 (e.g. `5 - 5 = ?`, `5 ÷ 5 = ?`)
3. Enter `0` into the input
4. Check if submit button becomes enabled (not disabled/grayed out)
5. Click submit - it should work correctly

## Example from the kid-math project

```html
<a-input-number
  ref="input"
  v-model="question.answer"
  hide-button
  @clear="reAnswer"
  @input="(ev) => question.answer = ev.target ? Number(ev.target.value) : ev"
  @keyup.enter="() => question.completed ? next() : answered ? judge() : void 0"
  style="width: 100px"
  size="large"
  pattern="[0-9]*"
  type="tel"
  :readonly="question.completed"
/>
```

## Notes

- This is a defensive programming technique that works even if the component bug is fixed in future versions
- The ternary `ev.target ? Number(ev.target.value) : ev` handles both cases: if Arco ever changes the event signature to pass the value directly instead of an event, it still works
- This issue is specifically for the value `0` - other numbers work fine with plain `v-model`
- The issue is more likely to surface when you have `const answered = computed(() => typeof question.answer === 'number')` - 0 is a number so it correctly returns `true` once synced

## References

- [Arco Design Vue InputNumber Documentation](https://arco.design/vue/component/input-number)
