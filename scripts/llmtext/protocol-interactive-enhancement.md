## {{N}}. Interactive enhancement protocol — how to answer "change my existing model"

Everything above describes the system. This section is the **procedure**, and it
governs. When someone hands you an existing `.mmd` and asks for it to be
extended, corrected, grown or reworked — however informally they put it — carry
out their instruction *within these guidelines* rather than in place of them.
Their words set the change; this file sets the form of the answer.

Where the two genuinely conflict, say so in one sentence and follow this file for
the artifact. An enhanced `.mmd` that says what the user asked for but that
`checker.js` refuses is not a deliverable, and neither is a clean document that
quietly lost half of what they already had.

**This is the interactive enhancement edition of the protocol.** There are now
four, and they divide on two axes — what you start from, and how you get there:

| | Start from a brief | Start from an existing `.mmd` |
|---|---|---|
| **One pass** | `llms-full.txt`'s authoring protocol | `llmtextenhancement.txt`'s enhancement protocol |
| **Phased, with gates** | `llmdetailed.txt`'s interactive authoring protocol | **this file, §{{N}}** |

Its batch companion, `llmtextenhancement.txt`'s enhancement protocol, reads the model, applies the
change, validates and hands it back. That form is right for a small, clearly
stated change to a model the user knows well. This form exists because
enhancement has a failure the batch form cannot see coming, and it gets worse the
larger and older the model is:

1. **The user's model is not yours, and you did not watch it being built.**
   Every unexplained column in it is load-bearing to somebody. A one-pass
   enhancement discovers which ones at the moment the user opens the result, and
   that is the most expensive place to discover it.
2. **What an enhancement destroys, no diagnostic reports.** A model that lost
   four `%%report` directives, an entity's help text and two `%%rbac` lines
   checks exactly as clean as one that did not. The checker answers *would the
   generator accept this*; nothing answers *is this still their model*.
3. **The change is thinner than the change it implies.** "Add invoicing" is four
   entities, an enum, a lifecycle, a rule about overdue balances, a role that can
   see money, and an effect on an order lifecycle nobody mentioned.

The interactive form answers all three with **phases separated by approval
gates**, with the model **baselined before a byte of it is edited**, and with the
enhancement **applied to the file on disk one change at a time** rather than
reconstructed at the end from whatever is still in context.

```
Phase 1  Load and inventory the model   →  Gate A  inventory approved
Phase 2  Agree the change roster        →  Gate B  roster approved
Phase 3  Baseline the working copy      ←  the parallel build starts here
Phase 4  Walk each change, one at a time→  Gate C  per change, then merge + check
Phase 5  Cross-cutting pass             →  Gate D  ripple, access, reports, coverage
Phase 6  Validate to clean, and prove nothing was lost  →  Gate E
Phase 7  Deliver

        from Phase 3 onward, every step ends:  edit → fixer → checker → clean
        and every step also ends:  inventory → compare → nothing lost
```

Do not skip a phase, do not cross a gate the user has not approved, and do not
open a step while the last one left the `.mmd` dirty or the inventory short.

A gate waits on the *user*, and on nothing else. In particular it never waits on
a network call: if the published checker cannot be reached, §{{N}}.6 says what to
do and the answer is to carry on with the model's status stated, never to hold
the phase open.

### {{N}}.0 How to run this protocol

**Get the file before you do anything else.** This protocol has an input. Phase 1
is not research and it is not a conversation about the business — it is reading
the bytes the user is going to hand you. Ask for them in your first message and
do not begin without them:

> Send me the `.mmd` you want enhanced — attach the file, or paste its contents
> in a single fenced block — and tell me what you want changed. I will read it
> first and show you what is in it today, before I change anything.

**Never reconstruct the model.** Not from a summary, not from the conversation,
not from a version you wrote earlier, not from an example that resembles it. A
reconstruction is a new model wearing the old one's name, and everything
hand-written in the original is gone from it without a diagnostic firing. If you
do not have the bytes, you do not have the model — ask again.

**Ask, do not announce.** Every gate is an `AskUserQuestion` call (or the
equivalent in whatever surface you are running on) — one question at a time, with
real options. A gate presented as prose ("let me know if this looks right") is
not a gate: it invites a nod, and a nod is not an approval of anything specific.

**One question at a time — where the answer changes the next question.** The rule
is a test, not a count. Two questions belong in separate turns when the first
one's answer would change how you ask the second. Questions that are genuinely
independent may be put together. What the rule forbids is the numbered list of
eleven questions the user has to answer in one message, because that is a form
rather than a walkthrough and it moves the work back onto them.

**Propose, do not interrogate.** Every document this protocol produces is
presented **already filled in**, for the user to correct. That applies twice over
here: you are working inside a model somebody already built, so the inventory,
the change roster and every dossier are yours to draft from what the file
actually says — not blanks for the user to complete.

**Never cross a gate on inference.** Where the request is silent on something
ordinary, fill it and mark it as filled. Where it leaves a genuine fork — two
plausible readings with materially different models — ask. A filled gap is
visible in the document under review and cheap to correct; a silent choice
between two readings is neither.

**The original is never overwritten until Phase 7.** Keep the file exactly as it
arrived, and work on a copy. The original is the only thing that can answer
"was that already there?", and once it is gone the question is unanswerable for
the rest of the session.

**The session directory is the state, not the conversation.** Write each phase's
output to disk *before* starting the next phase. A context compaction mid-session
must cost nothing but the chat scrollback.

**A gate is a loop, not a verdict.** The user does not approve or reject; they
look, ask for a change, look again, and approve when they are satisfied:

```
   present  →  the user looks  →  approve      →  next phase
                     │                ↑
                     └──  amend  ──────┘   re-present, re-check, re-show
```

Offer the middle arm explicitly, every time — *"tell me what to change and I will
show you again"* — because a user given only approve-or-reject will approve
something they are not happy with rather than restart a phase. There is no limit
on how many times a gate loops.

**Show the model, do not only describe it.** Every gate from Phase 3 onward asks
the user to approve something they cannot read in `.mmd` source: an entity's
columns and their controls, a lifecycle's legal moves, a decision flow's
branches, who ends up able to see what. Mermaid renders the ERD and nothing
else — the rules, the workflows, the enums and the access control are `%%`
directives it treats as comments — so a stakeholder pointed at a Mermaid preview
is being shown the smallest part of what they are approving.

**The viewers are at `https://appwithai.org/viewers/`**, and they draw all of
it — entities with their columns, badges and help text, relationships in crow's
foot notation, state machines with the moves the generated API will allow, sagas
as an ordered ladder, decision tables as tables, and the roles with the entity
counts each one gets. They matter more in enhancement than in authoring, because
the question here is not only *is this right* but *is this still what I had*, and
the **Workflows**, **Business rules** and **Access** tabs are where a loss shows
up as a picture rather than as a number. Tell the user about it **once, at
Phase 1**, when the model they already own is the thing on screen.

Three ways in, and the first is the one to recommend: **Watch a file** re-reads
the `.mmd` from disk as it changes, so the picture keeps up with the walkthrough
without the user doing anything (Chromium-family browsers only — it needs the
File System Access API). **Open a file** and **paste** work everywhere.

It is not a second opinion about the document. The page reads the model with the
same parser, rule compiler, workflow compiler and RBAC derivation the generator
runs, and it reports the same checker verdict as §{{N}}.6 — so what it draws is
what `appwithai generate` will build, and a diagnostic shown there is a real
diagnostic. It is a picture of the model, never an approval of it: the gates are
still yours to ask for.

**Hand over the file at every gate, do not merely mention the page.** A reader on
a chat surface has no access to the `.mmd` on your disk. Attach the current
working copy to the message that opens the gate; they load it with **Open a
file** and look at the version being approved rather than the version two changes
ago. Ask once, at Gate B, how often they want it — every gate, phase boundaries
only, or on request — and then keep to that.

**What the viewer catches that the checker cannot.** The checker answers *would
the generator accept this document*. It does not answer *is this the application
you meant*, and in enhancement it does not answer *is anything missing* either.
An entity the parser silently dropped, a lifecycle whose states no `%%enum`
declares, a role that used to read nine entities and now reads two, a decision
table with a row that can never match — each of those is a clean report and a
broken application. Look at the picture before closing a gate, not only at the
counts.

**Resume before you restart.** On invocation, look for `docs/eml-sessions/*/`
first. If a session exists whose `progress.md` shows unfinished work, show its
state and offer to resume it. Starting a second enhancement session against the
same model is how two divergent copies of one document get built, and the user
will end up choosing between them without knowing what is in either.

**The checker and the fixer run at every step, not at the end.** Phase 6 is where
validation *finishes*, not where it starts. From the moment the working copy
exists (§{{N}}.3) there is a real document on disk, and from then on **every step
that touches the `.mmd` closes the same way**:

```
   edit the .mmd  →  fixer  →  checker  →  clean?  ──yes──→  inventory compare
                       ↑                     │                      │
                       └────── no ───────────┘              nothing lost?  ──→  gate
```

Both tools, in that order, every time — the fixer first because the auto-fixable
codes (§{{N}}.6) are noise the user should never be asked about, the checker
after because the fixer's own repairs can leave a new diagnostic behind. The
tools are the ones in §{{N}}.6; run them there once and reuse the command.

**And the inventory compare runs at every step too**, which is what this edition
adds to the loop. It is two numbers and it takes a second: the counts from the
Phase 1 inventory, against the same counts taken from the working copy. Any of
them falling without the user having asked is a defect found one step after it
was introduced, rather than at Phase 6 with nine other changes stacked on top of
it.

Four rules hold that loop honest:

- **No gate closes over a document with errors.** Not Gate C, not Gate D. A step
  that ends with an unchecked or dirty `.mmd` has not ended — it has been
  abandoned in the middle, and the next step will build on it.
- **No gate closes over a document that lost something.** Put back what fell
  before you present the gate, or name the loss and ask for it, if the user's own
  change is what removed it.
- **The warnings a phase is expected to carry are named where they occur.** Any
  warning not named in this section is treated as a finding, not as background.
  Diagnostics that were in the model when it arrived are named once at Phase 3
  and are not findings at all unless your change touched their cause.
- **The fixer repairs; it does not decide.** A diagnostic that could be repaired
  two ways is a question for the gate you are standing at, and that is most of
  why this form is interactive.

Log every run in `03-validation.md` as you go, one line per step: the step, the
counts before, what the fixer changed, the counts after, and the inventory
delta. At Phase 6 that log is the evidence the enhancement was built clean rather
than cleaned up at the end.

#### The session directory

**Rooted where the user's work is, not where you happen to be.** In a single
project that is the repository root; in a workspace holding several, ask which
one at Gate A rather than picking; where there is no repository at all, any
directory the user names will do. What matters is that it is one place, it
survives a compaction, and the user knows where it is — say the absolute path
once when you create it.

```
<project root>/docs/eml-sessions/<business-slug>-enhancement-<yyyy-mm-dd>/
├── progress.md            # phase, gate status, per-change state — the resume file
├── 00-original.mmd        # ⭐ the model exactly as received. Never edited
├── 00-inventory.md        # Phase 1 — what the model contains today, and its baseline report
├── 01-changes.md          # Phase 2 — the change roster
├── changes/<NN>-<slug>.md # one dossier per change, Phase 4
├── 02-cross-cutting.md    # Phase 5
├── <business-slug>.mmd    # ⭐ the working copy, enhanced one change at a time
└── 03-validation.md       # Phase 6 checker log, and the regression table
```

`00-original.mmd` is the point of the directory. It is written once, in Phase 1,
and nothing in this protocol ever writes to it again — it is what Phase 6's
regression comparison is run against, and what answers "did I break that or did I
find it broken?" every time the question comes up.

`<business-slug>` is taken from the model's own `%%meta name:`, lower-cased and
hyphenated, so the working copy keeps the name the user's file already had.

#### `progress.md` — the resume file

Rewrite it at every gate. It is the only thing a resumed session can trust:

```markdown
# acme-dance-studio — enhancement progress
Phase: 4 (change walkthrough)  ·  Updated: 2026-03-11

Original: 00-original.mmd  ·  9 entities · 41 rbac · 12 reports · 0e 0w on arrival
Working:  acme-dance-studio.mmd  ·  11 entities · 47 rbac · 12 reports · 0e 0w

| Gate | State |
|---|---|
| A inventory   | approved |
| B roster      | approved |
| C changes     | 2 of 5   |
| D cross-cut   | — |
| E validation  | — |
```

Carry both count lines. A resumed session that can see the original's numbers
beside the working copy's can tell in one glance whether the work so far has cost
anything, which is exactly what a resumed session cannot otherwise know.

#### Completion modes

Ask at Gate B how the user wants the walkthrough run, and record the answer:
change by change with a gate at each (the default), phase boundaries only, or
straight through to Phase 6 with a single review at the end. The last of those is
the batch protocol with extra steps and it is a legitimate choice for a small
change — but say once that it gives up the per-change review, and hold to the
inventory compare regardless of which mode they pick.

### {{N}}.1 Phase 1 — Load the model, and inventory what it contains

**Read the file the user sent, and nothing else.** Accept it as an attachment, a
pasted fenced block, a path or a URL. If it arrives inside a fence, take the
block's contents verbatim and strip only the fence markers. If several files
arrive, ask which one is the model rather than merging them.

If the user describes a model instead of sending one, stop and say so: that is
the authoring protocol's job, and `llmdetailed.txt`'s interactive authoring protocol builds a model from a
description. This protocol has nothing to enhance until a file exists.

Write it to `00-original.mmd` the moment you have it, before you read it
closely. Then do two things to it.

**Check it, as received.** Run the fixer and the checker over the original bytes
(§{{N}}.6) and record the counts in `00-inventory.md`. This is the baseline. A
model that arrives dirty is ordinary and is not a reason to stop — it is a reason
to know, because every diagnostic at Phase 6 will otherwise be indistinguishable
from one you caused. Do not repair the user's document under cover of their
request; note what is there and raise it at Gate A as a question of its own.

**Inventory it.** Read the whole document — every line, not the parts the request
seems to touch — and write down what is in it:

| Count | Read from |
|---|---|
| Entities, by name | Every entity block in every `erDiagram` |
| Columns per entity | The attribute lines inside each block |
| Relationships | Every cardinality line |
| Enums, and their values | Every `%%enum` |
| Enum bindings | Every `%%field … enum:` |
| Help text | Every `%%entity … help:` and `%%field … help:` |
| Rules, and their actions | Every `%%rule` flowchart and every `%%action` |
| Workflows, by `kind:` | Every `%%workflow` |
| States and transitions | Every `stateDiagram-v2` |
| Hooks | Every `%%hook` |
| Roles, and the entities each reads | Every `%%rbac` |
| Reports | Every `%%report` |
| Indexes, categories, parents | Every `%%index`, `%%category`, `%%entity … parent:` |

Note the document's **conventions** as well as its contents: how entities are
named, whether columns are snake_case, whether help text is a sentence or a
phrase, what order the sections come in. Everything you add has to look like the
person who wrote the rest wrote it too.

**Gate A — the inventory.** Present `00-inventory.md` and ask the user to confirm
it is their model and that nothing in it surprises them. This is the gate that
earns its keep most often: it is where a user says "those three entities are
dead, we stopped using them in March", or "that role should not be able to read
payments", or "who added that report?" — findings that change the enhancement
before it starts, and that nobody would have surfaced by asking about the change
alone.

Ask here, too, whether anything in the model is off-limits, and whether the
pre-existing diagnostics (if there are any) should be fixed as part of this work
or left exactly as they are.

### {{N}}.2 Phase 2 — Agree the change roster

**Draft the roster from the request; do not ask the user to write it.** Turn what
they asked for into a numbered list of discrete changes, each one small enough to
walk in a single step at Phase 4, and each one classified:

| Class | Means |
|---|---|
| **Add** | Something the model does not have today: an entity, a column, an enum value, a rule, a role, a report |
| **Extend** | Something that exists gains a part: a lifecycle gains a state, an enum gains a value, an entity gains a relationship |
| **Change** | Something that exists becomes different: a retyped column, a renamed entity, a rewritten rule |
| **Remove** | Something goes. Only ever because the user asked, and never as a side effect of something else |

For each change, state in one line what it touches and what it implies. This is
where the thinness of a request gets made visible: "add invoicing" becomes four
Add rows, two Extend rows and one Change row, and the user sees the size of what
they asked for before any of it is written.

**Name the implications as their own rows.** A new entity implies an `%%rbac`
line per role that works with it, help text on it and every column, and an
`%%enum` behind any status it carries. A new state implies a widened enum. A
renamed entity implies every reference to the old name moving with it. These are
not footnotes to the change; they are part of it, and a roster that hides them
understates the work at exactly the gate where the user is deciding whether to
approve it.

**Say what you will not do.** Anything the request implies that you judge out of
scope goes on the roster as an explicit omission, so the user can move it back in
rather than discover it missing.

**Gate B — the roster.** Present the numbered list, with the classification and
the implications, and ask for approval. Ask the two housekeeping questions here
as well: the completion mode (§{{N}}.0), and how often they want the working
file handed over.

### {{N}}.3 Phase 3 — Baseline the working copy *(the parallel build starts here)*

Copy `00-original.mmd` to `<business-slug>.mmd`. That copy is the working file,
and from this point on every step edits it, checks it and compares it.

Make no change to it in this phase. The point of Phase 3 is to establish that the
working copy is the original, byte for byte, and that it checks the way the
original checked — so that the first real difference appears in Phase 4 and is
attributable to a change on the roster.

Run the loop once over the untouched copy, record the result in
`03-validation.md` as the zero row, and tell the user the model is loaded, what
it contains, and where the file lives. This is the moment to name the viewers
(§{{N}}.0): the picture they see now is their model as it stands, and every
picture after this one differs from it by something they approved.

A model that arrives with diagnostics keeps them here. Do not clear the zero row
to make the log look tidy — the zero row is what makes every later row mean
something.

### {{N}}.4 Phase 4 — Walk the changes, one at a time

Take the roster in order. For each change, write a dossier to
`changes/<NN>-<slug>.md` **already filled in**, apply it to the working copy, run
the loop, compare the inventory, and open Gate C.

A dossier is short and it is specific. It says what is being changed, what the
model says about that area today, what it will say afterward, and what else moves
as a consequence:

```markdown
# 03 · Add Invoice

## Today
Order carries `total_amount` and a `paid` boolean. Nothing records how it
was paid, when, or against what.

## After
New entity `Invoice`, parent `Order`, with the columns below.

| Column | Type | Modifiers | Enum | Help |
|---|---|---|---|---|
| id | string | PK | — | The invoice's unique identifier. |
| order_id | string | FK | — | The order this invoice bills for. |
| issued_on | date | | — | The date the invoice was sent to the customer. |
| status | string | | InvoiceStatus | Where the invoice has reached in collection. |

## Also moves
- `%%enum InvoiceStatus: draft, issued, paid, overdue, written_off`
- `%%rbac role:finance on Invoice.read` · `role:sales_manager on Invoice.read`
- `%%entity Invoice parent: Order`
- Lifecycle `InvoiceLifecycle`, kind: state, over the five statuses
- `Order` gains nothing. Its `paid` boolean stays until change 05 retires it

## Open questions
- Does an invoice ever bill more than one order? Modelled as one-to-many
  from Order for now; say if it should be many-to-many.
```

**Apply one change at a time, and close the loop before opening the next.** The
discipline is the whole point: a step that ends with a clean checker, an
inventory that lost nothing, and a user who has seen the result is a step that
can be built on. Two changes applied together are two changes that have to be
unpicked together when the second one turns out to be wrong.

**Follow the blast radius inside the document, every time.** The directives that
name a thing are not next to it — they sit beside the diagram they annotate, all
through the file:

| When you… | Also update |
|---|---|
| Add an entity | Relationships at both ends; `%%rbac … .read` for every role that works with it; help on it and every column; `%%enum` and `%%field … enum:` for any closed vocabulary; `%%category` if the document groups entities; `%%entity … parent:` if it is a line item |
| Add a column | Type and modifiers; help text; enum binding if it is a vocabulary; the `FK` modifier **and** a relationship line if it points at another entity; any `%%report` that should now select it |
| Add a state | The `%%enum` behind the status column gains the value; entries and exits still reach `[*]`; `%%rbac` on the new transition |
| Add a rule | Its `on <Entity> event: <hookType>` binding; whether it merely decides or must also act — a rule that must act needs `%%action` |
| Add a role | One `%%rbac … .read` per entity that role works with. A role that reads nothing signs in to an empty application |
| Rename anything | Every reference to the old name: foreign-key prefixes, relationship lines, `%%rbac`, `%%rule`, `%%workflow`, `%%hook`, `%%step`, `%%field`, `%%index`, and the SQL inside every `%%report` |
| Remove anything | Everything that names it, by the same list — and nothing else |

**Preserve as you go.** Keep the document's order, its naming, its help-text
voice and its directive spelling. Never drop a line you were not asked to drop.
Never rename silently. Never narrow an enum a state machine uses. Each of those
is a loss the checker will not report, which is why the inventory compare runs
at the close of every step and not only at Phase 6.

**Gate C — the change.** Present what the model now says, hand over the working
file if that is the cadence the user chose, and ask for approval to move to the
next change. Show the counts: entities before and after, and any inventory line
that moved. A change that was supposed to add one entity and moved four numbers
is worth a sentence of explanation before it is approved, not after.

#### The moves available every round

At every Gate C the user can approve, amend, defer the change to the end of the
roster, drop it, or add a change they thought of while looking at this one. A new
change goes on the roster and the roster is re-presented — it does not get folded
silently into the step in front of you, because a step that grew after its
dossier was written is a step nobody approved.

### {{N}}.5 Phase 5 — The cross-cutting pass

The roster is done. What remains is everything that is nobody's single change,
and in enhancement that is more than it is in authoring, because the new parts
have to be joined to the old ones rather than merely to each other.

Work `02-cross-cutting.md` through five sweeps:

1. **The ripple sweep.** For every change on the roster, ask what in the
   *original* model should have moved with it and did not. An existing saga that
   should now write the new entity. An existing rule whose condition should
   account for the new status. An existing hook that should fire on the new
   column. This is the sweep that turns an addition into a feature: entities that
   exist but that nothing in the original model ever touches are a schema, not a
   change to the business.

2. **The access matrix.** Every entity — the ones you added and the ones that
   were already there — against every role. Present it as a grid with the counts
   per role, and check it against what the Phase 1 inventory recorded. A role
   whose entity count *fell* is the finding this sweep exists for.

3. **The workflow sweep.** Every state machine still reaches `[*]` from `[*]`,
   every state is a value of the enum bound to its column, and every new
   transition that needs a role rule has one.

4. **The coverage sweep.** Every new entity has help text on itself and on every
   column; every new closed vocabulary has an `%%enum` and a `%%field … enum:`
   binding; every new foreign key has both the `FK` modifier and a relationship
   line. These are the parts that thin out first, and they are exactly the parts
   no diagnostic complains about until `EML151`–`EML153` do.

5. **The reporting sweep** — §{{N}}.5.1.

**Gate D — the cross-cutting pass.** Present the access matrix, the ripple list
and what the coverage sweep found, and ask for approval. Name anything you chose
not to do.

#### {{N}}.5.1 The reporting pass — keep the questions the model already answers

A `%%report` directive is a question the users actually ask, written as the SQL
that answers it, and it is the single easiest thing in a model to lose: nothing
else in the document refers to it, so a rewrite that goes from memory drops every
one of them without a mark.

Two jobs in this sweep, and the first one matters more:

**Keep the ones that are there.** Count the `%%report` directives in the working
copy against the count in the Phase 1 inventory. They must match. Then read each
one that names something your changes touched — a renamed entity, a retyped
column, a dropped field — because a report's SQL is text, and a column that moved
underneath it leaves the directive checking clean and the report failing the
first time somebody runs it.

**Add the ones the change implies.** A new entity that records money, volume or
elapsed time is a question somebody will ask within a week. Propose them, with
the SQL written out, and let the user pick — an unasked-for report costs nothing
to decline and a missing one costs a round trip.

### {{N}}.6 Phase 6 — Validate to clean, and prove nothing was lost

Phase 6 has two halves, and only the first of them has a tool. The checker
answers *would the generator accept this document*. Nothing answers *is this
still their model* — so the second half is the inventory comparison, and it is
not optional.

{{TOOLS}}

#### The regression comparison — what enhancement adds

A clean checker run says the enhanced model is valid. It does not say the
enhancement was safe, and the difference is the whole reason this protocol wrote
`00-original.mmd` down in Phase 1.

Take the inventory of the delivered file and put it beside the Phase 1 inventory
of the original, line for line, in `03-validation.md`:

```markdown
| Count            | Original | Enhanced | Δ   | Asked for? |
|------------------|----------|----------|-----|------------|
| Entities         | 9        | 11       | +2  | yes — 03, 04 |
| Columns          | 78       | 97       | +19 | yes |
| Enums            | 6        | 7        | +1  | yes — 03 |
| %%entity help:   | 9        | 11       | +2  | yes |
| %%field help:    | 78       | 97       | +19 | yes |
| Rules            | 4        | 5        | +1  | yes — 06 |
| Workflows        | 3        | 4        | +1  | yes — 03 |
| Hooks            | 7        | 7        | 0   | — |
| %%rbac lines     | 41       | 47       | +6  | yes |
| %%report         | 12       | 12       | 0   | — |
```

**Every Δ is positive or zero unless the user asked for it to be negative.** A
negative Δ with an empty "asked for?" cell is a defect and it is found here:

| If this fell and nobody asked | You have |
|---|---|
| Entity count, or an entity name vanished | Dropped an entity |
| Columns on an entity no change touched | Rewritten it from memory |
| Enum values | Broken every state and rule bound to the missing one |
| `%%entity help:` / `%%field help:` | Emptied part of the generated manual |
| `%%rbac` lines, or a role's entity count | Made something invisible to a role that could see it yesterday |
| `%%report` | Deleted a question somebody's users ask |
| Hooks, rules, actions, steps, workflows | Removed behaviour the application was running |

Put back what fell, then run the checker again — the repair is a new edit and the
file has to be re-validated after it. Do not present Gate E over a table with an
unexplained negative in it.

**Then read the enhanced file end to end, once**, looking for the two faults no
count can see: a reference to something you renamed that you did not follow, and
a new entity or column with no help text. Both check clean.

**Gate E — validation.** Present the checker's final verdict, the regression
table and anything you had to escalate, and ask for approval to deliver. Name
every pre-existing diagnostic you left alone and say that you left it alone
deliberately.

### {{N}}.7 Phase 7 — Deliver

**Run the loop one last time over the exact bytes you are about to hand over.**
Editing stops; validation starts again from zero. The file that leaves your hands
must be the one that came out of a clean run, not an earlier draft.

Hand back the **whole enhanced model**, under the name it arrived with unless the
user asked for a different one. Not a diff, not a patch, not the new sections on
their own, and never an abbreviated listing with "the rest as before" in the
middle of it — that turns the deliverable into a merge the user has to perform by
hand into a document they did not write, which is where losses come from.

- If you can write to a filesystem, the working copy is already the artifact.
  Attach it.
- If your surface has a file, download or artifact mechanism, use it, with the
  `.mmd` extension intact.
- **Only if the surface truly cannot carry a file**: print the complete document
  inside a single triple-backtick `mermaid` fence, the file name on the line
  above it, and nothing else between the fences.
- **Do not offer the by-products.** The original, the dossiers, the validation
  log: they stay in the session directory, where the user can read them if they
  want. One attachment.

Alongside the file — in the reply, never inside it — give the change roster as
built, the regression table from §{{N}}.6, the checker's counts for the original
and for the delivered file, anything still unresolved, and where the session
directory is on disk. Then tell them what to do next: upload the file at
`https://appwithai.org/guide/run-in-browser.html#upload`, where it becomes a
running application in the browser tab.

Say plainly that the original is still at `00-original.mmd`. A user who can see
where their untouched model is will try the new one; a user who cannot will
wonder whether they still have it.

### {{N}}.8 Reference material for the walkthrough

#### What a change costs, by class

| Change | Typically also touches |
|---|---|
| A new entity | 1 `%%enum` if it has a status, 1 lifecycle, 1–3 `%%rbac`, 1 `%%entity help:`, one `%%field help:` per column, 1 `%%category`, 1–2 relationships |
| A new column | Its help, its enum binding or its `FK` + relationship, and any report that should select it |
| A new state | The enum behind the column, both terminal edges, and any `%%rbac` on the transition |
| A new role | One `%%rbac … .read` per entity it works with — the whole matrix row, not one line |
| A rename | Every directive that names the old string, and the generated application's existing table |

#### Question banks

**At Gate A, about the model as it stands.** Is everything in here still in use?
Is anything in here wrong today, separately from what you are asking for? Are the
roles still the jobs your business has? Who reads these reports?

**At Gate B, about the change.** Is this a new thing, or a different shape for a
thing you already have? Does it need its own lifecycle, or is it a column on
something that already has one? Who does this work, and should they be able to
see it? What happens to the records you already have when this lands?

**At Gate C, about one change.** Is this the vocabulary your people use for it?
Is this the order the states actually happen in? Should this be visible to
everyone who can see its parent?

#### Help-text patterns

Write what the thing is *for* in this business, not what it is. `The date the
invoice was sent to the customer.` earns its place; `Issued on date.` does not —
that is `EML151`, help that restates its own name. Match the voice already in the
document: if its help text is sentences, write sentences.
