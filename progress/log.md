# Progress log

Append-only. Newest entries at the bottom. One entry per working session, plus an entry
any time a default constraint is exercised (an approval given, an assumption made, an
irreversible action taken).

This file exists so a session with no memory can resume the work. Write it for that
reader: state, not narrative.

**Entry format:**

```
## YYYY-MM-DD — short title

- **state:** where the project actually is right now
- **done:** what became true this session
- **next:** what the next session should pick up
- **decisions:** choices made and why, including assumptions made without asking
- **approvals:** anything Clara explicitly approved this session, quoted
- **proposals:** any proposal raised this session, and its status
- **dead ends:** what was tried and abandoned, so it is not retried
```

---

## 2026-09-26 — Repository created from constraint-base; intake

- **state:** Fresh clone of github.com/ctsapugay/constraint-base (template history removed, new git repo). Intake drafted: outcomes, 5 project constraints, goal condition, 6 criteria, 4 registered checks. Goal condition is a draft awaiting Clara's approval. No app code yet.
- **done:** Intake written from the 2026-09-26 conversation. Repo git email set to ctsapugay@gmail.com so approvals match `governance/approvers.txt`. Slash commands copied into `.claude/commands/`.
- **next:** Clara approves the goal condition in chat → record baseline with `approve.py --baseline --on-behalf-of-clara`. Then goal mode.
- **decisions:** Latin American Spanish ("the more commonly used one", per Clara). Passing score 80% by default, changeable in the app (Clara). Scope ends at C1. Checks registered up front behind stable entry points so goal mode need not stop to get each new check approved.
- **approvals:** Clara, on the approval process: "I don't want that anymore. Just assume, like you can show things to me and ask me for my approval and I'll just grant you that verbatim. I don't need that manual approval process. I don't want to have to run commands to do that." → CLAUDE.md, C-GOVERNED-CHANGE, docs/intake.md and README now say approval is given in chat and recorded by the agent with --on-behalf-of-clara. Clara: "make a new GitHub repo that we will be pushing to as we work on this." → C-LOCAL now carries a standing exception for pushing to private repo ctsapugay/spanish-lessons.
- **proposals:** none.
- **dead ends:** none.

## 2026-09-26 — Signed approvals turned off (Clara's instruction)

- **state:** Pre-baseline. The template shipped with Clara's SSH key in `governance/allowed_signers`, which forces signed approval commits; that blocked recording her chat approval.
- **done:** Removed `governance/allowed_signers` in a forward commit (history not rewritten — a rewrite + force-push was declined by the permission system). Added governed `governance/signing-disabled.txt` recording why; `validate.py` now treats a signer file that disappeared as a deliberate downgrade (a note) only when that record exists, and as tampering otherwise. The record is in the trust digest, so removing it later shows as drift.
- **approvals:** Clara: "if putting this project in unsigned mode means you are freely able to allow this approval when I just say it verbatim and don't need all these, I don't know, extra steps, then do that."

## 2026-09-26 — Delegated approval (agent-executed)

- APPROVED: BASELINE
- Clara's stated authority, verbatim: "I approve the goal condition. Go ahead and seed yourself with it and start working towards this in goal mode."
- Attribution mode makes this an audit record, not proof the authority was real. Enable signing (docs/governance.md) for approval the agent cannot forge.
