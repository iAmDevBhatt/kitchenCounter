## Tool call discipline

- Never end a turn with only narration about what you're about to do next
  ("Let me read X", "Next I will fix Y"). If you state an intention to take
  an action, you MUST issue the corresponding tool call in that same turn.
- Only end your turn with plain text when the task is fully complete, or
  when you genuinely need user input/clarification to proceed.
- Before ending a turn, check your open TODO list. If any item is still
  pending and you have enough information to act on it, act on it now
  instead of describing what you'll do.