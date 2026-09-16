## {{N}}. Enhancement protocol — how to answer "change my existing model"

This section is the **procedure**, and it governs. When someone hands you an
existing `.mmd` and asks for it to be extended, corrected, grown or reworked —
however informally they put it — carry out their instruction *within* these
guidelines rather than in place of them. Their words set the change; this file
sets the form of the answer.

Where the two genuinely conflict, say so in one sentence and follow this file
for the artifact. An enhanced `.mmd` that says what the user asked for but that
`checker.js` refuses is not a deliverable, and neither is a clean document that
quietly lost half of what they already had.

**This is the enhancement edition of the protocol.** Its companion,
`llms-full.txt`'s authoring protocol is the authoring form: read a brief, infer a model, write
it, validate, deliver. That form starts from nothing. This one starts from a
document that already exists, that someone has already approved, and that may
already be generating an application somebody is using. The difference is not
cosmetic — it changes what "correct" means. In authoring, the only way to fail
is to model the business badly. Here there is a second way, and it is the one
that actually happens: **the enhancement lands and something that used to work
is gone.**

### {{N}}.0 The deliverable, before anything else

**You are being asked for one file: the enhanced model, whole, and every byte of
it is Mermaid.** Not a patch. Not a diff. Not the new entities on their own. Not
a list of edits for the user to apply themselves. The user must be able to take
what you hand back, upload it, and run it — without owning the original any
more.

| Step | What it produces | Is it the deliverable? |
|---|---|---|
| §{{N}}.1 Obtain the model | The existing `.mmd`, in your hands | No — it is the input, and without it there is no work |
| §{{N}}.2 Baseline it | An inventory and a checker report on the bytes as received | No — it is what the result is measured against |
| §{{N}}.3 Establish the change | The change roster, in prose | No — it is your analysis, and it stays in the reply as text |
| §{{N}}.4 Apply the enhancement | The enhanced `.mmd` | **Yes. This is the artifact.** |
| §{{N}}.5 Validate and compare | Checker reports, and the regression table | No — but nothing ships until both are clean |
| §{{N}}.6 Deliver | The whole file, downloadable, and what changed | The handover |

**The two failures this protocol exists to prevent.** The first is the one the
authoring protocol also has: answering with prose about the model instead of the
model. Give the checker a document of headings and bullet lists and it answers
`EML004` — *empty document* — however many pages it runs to.

The second belongs to enhancement alone, and it is the commoner of the two:
**answering with only the part that changed.** A reply that says "add these
lines to your `erDiagram`" is not a deliverable, because the user now has to be
the one who merges it — and a merge they perform by hand into a document they
did not write is exactly where an entity loses its `help:` text, an enum loses a
value, or a `%%rbac` line for an entity nobody mentioned quietly disappears.
You were given the whole file. Give the whole file back.

**The third failure has no diagnostic at all, and that is what makes it the
dangerous one.** An enhanced model can check perfectly clean and still be a
regression: nine entities went in and eight came out, every `%%report` the user
had written was dropped because the rewrite went from memory, the help text that
took somebody an afternoon is now a dash. The checker will not say a word about
any of it — a smaller model is a valid model. §{{N}}.2 and §{{N}}.5 exist to
catch that, and they are the reason this protocol baselines before it edits.

Do not skip step 1, do not start before it, and do not deliver before step 5.

**Exactly one file leaves your hands, and it ends `.mmd`.** Not two — not the
enhanced model plus a change log, a report, a README or a copy of the original.
Where your surface writes files, it writes one; where it attaches files, it
attaches one. Everything you want to say about the enhancement is text in the
same reply, and none of it is a file.

### {{N}}.1 Get the model first — do not start without it

**Ask the user to load their `.mmd` before anything else.** This protocol has an
input, and until that input is in your hands there is nothing here to do. Say so
plainly and ask for it:

> Send me the `.mmd` you want enhanced — attach the file, or paste its contents
> in a single fenced block — and tell me what you want changed. I will read the
> model first, show you what is in it today, and then make the change.

Accept it in whatever form the surface allows: an attached file, a pasted fenced
block, a path you can read, a URL you can fetch. What you must not do is start
without it.

| If the user… | Then |
|---|---|
| Attaches or pastes the model | Read its exact bytes and go to §{{N}}.2 |
| Pastes it inside a fenced block | Take the block's contents verbatim as the file. Strip the fence markers themselves and nothing else |
| Sends a path or a URL | Read it. If you cannot, say which one failed and ask them to paste the contents |
| Sends several files | Ask which one is the model. Do not merge them on your own initiative |
| Sends a **description** of their model rather than the model | Stop. This is the authoring protocol's job, not this one's — point them at `llms-full.txt`'s authoring protocol which builds a model from a description |
| Asks you to enhance a model you wrote earlier in the conversation | Use the exact bytes you delivered, and say that is what you are starting from. If they have edited it since, ask for their copy — theirs is the live one |
| Sends nothing, and describes the change only | Ask again, once, and do not proceed on a reconstruction |

**Never reconstruct the model from memory, from a summary, or from an earlier
draft.** Not the version you wrote three turns ago, not the one you can infer
from the conversation, not "the CRM example, roughly". A reconstruction is a new
model wearing the old one's name, and every hand-written thing in the original —
help text, report SQL, an enum value somebody added for one customer — is gone
from it without a single diagnostic firing. If you do not have the bytes, you do
not have the model.

**Never start from a blank document.** Enhancing is not rewriting. A model
produced from scratch against the same brief is a different deliverable, and it
is the one the user explicitly did not ask for.

### {{N}}.2 Read the model you were given, and baseline it

Before you change a byte, do two things to the file exactly as it arrived.

**First, check it.** Run the published checker over the original bytes, using the modules
this document's validation section publishes, and
write the counts down. This is the baseline, and it answers a question you will
need later: was that diagnostic already there, or did you introduce it? An
enhancement judged against a model that was never checked has no way to tell the
difference, and the usual outcome is that you spend the session fixing something
the user has been living with happily for a year.

A model that arrives **dirty** is normal and is not a reason to stop. Report what
you found in one line, fix what your change touches, and say plainly which
pre-existing diagnostics you left alone and why. Do not silently repair the
user's whole document under cover of their small request — that is a second,
unrequested change, and it is theirs to approve.

**Second, inventory it.** Read the whole document and count what is in it. This
is the record you will compare against in §{{N}}.5:

| Count | Read from |
|---|---|
| Entities, and their names | Every entity block in every `erDiagram` |
| Columns per entity | The attribute lines inside each block |
| Relationships | Every cardinality line |
| Enums, and their values | Every `%%enum` |
| Enum bindings | Every `%%field … enum:` |
| Help text | Every `%%entity … help:` and `%%field … help:` |
| Rules, and their actions | Every `%%rule` flowchart and every `%%action` |
| Workflows | Every `%%workflow`, with its `kind:` |
| States and transitions | Every `stateDiagram-v2` |
| Hooks | Every `%%hook` |
| Roles, and the entities each reads | Every `%%rbac` |
| Reports | Every `%%report` |
| Indexes, categories, parents | Every `%%index`, `%%category`, `%%entity … parent:` |

**Read the whole file, not the parts you think you need.** The commonest way an
enhancement damages a model is that the part it damaged was never read: a
directive further down the document that named the entity you just renamed, a
saga step writing to a column you just removed, a `%%report` whose SQL selects it
by name. The directives are not grouped — they sit beside the diagram they
annotate — so there is no shortcut that is safe.

**Note the document's conventions as you read.** How it names entities, whether
columns are snake_case, whether help text is a sentence or a phrase, how enums
are spelled, what order sections come in. Your additions must look like they were
written by whoever wrote the rest, because in six months nobody will remember
which lines were yours. A model that reads as two models by two authors is a
model that is harder to change again.

### {{N}}.3 Establish what the enhancement actually is

**A change request is always thinner than the change it implies**, in exactly the
way a business description is thinner than the model it implies. "Add invoicing"
is four entities, two enums, a state machine, a rule about overdue balances, a
role that can see money, and an effect on the order lifecycle that nobody
mentioned. Applying the literal sentence produces a model that validates and a
business that still cannot invoice anything.

So think the change through first, covering all six of the headings below. This
is analysis, not the answer: it is text in your reply (§{{N}}.6), it is never a
file of its own, and it never carries the `.mmd` name.

1. **What is being added.** New entities, new columns, new enums, new values in
   an existing enum. For each new entity, everything the authoring protocol
   demands of one: a primary key, typed columns with modifiers, relationships
   with cardinality, help text on the entity and on every column, and a
   classification for every column — points at another entity, holds a closed
   vocabulary, or is free text. A column you leave unclassified becomes a text
   box in the generated application.

2. **What is being changed.** A renamed entity, a retyped column, a widened
   enum, a lifecycle that gains a state. Every one of these has a blast radius
   inside the document, and §{{N}}.4 is where you follow it.

3. **What is being removed, if anything.** Only what the user asked to remove.
   Write down what else names it — a relationship, a foreign key, an `%%rbac`
   line, a rule condition, a saga step, a report's SQL — because all of that
   goes with it, and a dangling reference is an error the checker will find but a
   dropped `%%rbac` line is not.

4. **What the change implies that the user did not say.** New states on an
   existing entity need the enum behind them widened. A new entity needs an
   `%%rbac … .read` line or no role can see it at all. A new money column
   probably belongs in a report. Say what you inferred and mark it as inferred.

5. **Cross-entity effects — state these explicitly, they are the ones most often
   missed.** Where the new thing must create or update records elsewhere, or
   where an existing effect now has to account for it: an invoice closing an
   order, a cancellation releasing a slot the new booking entity reserved. Name
   the trigger, the target entity, and whether the effect is a create, an update
   or a state transition. These become hooks, rule actions or saga steps.

6. **Who works with the new thing.** Every entity you add is assigned to at
   least one existing role, or to a new role you name. This is not a note: it
   becomes one `%%rbac … .read` line per entity, and the generated application
   seeds one signed-in account per role. **An entity with no `%%rbac` is
   invisible to every role**, which is a working application in which the feature
   you were asked to add cannot be reached.

State assumptions as assumptions. Where the request leaves an ordinary gap, fill
it the way a careful analyst would and say what you filled. Where it leaves a
genuine fork — two plausible readings, materially different models — name the
fork, implement the reading you recommend, and say what changes if they meant the
other.

What this step must never do is stop the work. A question raised instead of a
file leaves the user with nothing to correct; a question raised beside a file
they can already run costs them one sentence to answer. Deliver the file either
way.

### {{N}}.4 Apply the enhancement — in place, and additively

Now edit the document. Work from the original bytes, in the original order, and
keep everything you were not asked to change.

**The preservation rules.** These are not style preferences — each one names a
way an enhancement has been observed to destroy something, and none of them is
reported by the checker:

| Rule | What breaks when it is ignored |
|---|---|
| **Keep every line you were not asked to change** | The rewrite-from-memory failure. Anything the original had and your version does not is a silent loss |
| **Keep the document's order** | Sections are read top to bottom and a reader knows where things are. Reordering turns a two-line change into an unreviewable diff |
| **Never rename anything silently** | An entity name is a foreign-key prefix, an `%%rbac` target, a rule binding and a table name in every `%%report`. Rename it and all four must move together — and the generated application's existing data is in a table that no longer exists |
| **Never drop help text** | `%%entity help:` and `%%field help:` are `sys_table.description`, `sys_column.description` and the whole of the generated manual's prose. Nothing complains when they go; the application just stops explaining itself |
| **Never narrow an enum a state machine uses** | Remove a value and every state bound to it is a state the machine can no longer reach. The diagram still draws |
| **Never drop a `%%report`** | It is a question somebody's users actually ask, written as the SQL that answers it. It is also the easiest thing in the document to lose, because nothing else refers to it |
| **Keep the existing style** | Naming, casing, help-text voice, directive spelling. Your lines should be indistinguishable from the ones already there |
| **Add, do not replace, unless asked** | "Also track X" means the model gains X. It does not mean the model becomes X |

**Follow the blast radius of every change.** A change is rarely one line, and the
lines it drags with it are spread through the document:

| When you… | Also update |
|---|---|
| Add an entity | Its relationships at both ends; a `%%rbac … .read` for every role that works with it; help on it and every column; `%%enum` and `%%field … enum:` for any closed vocabulary; a `%%category` if the document groups entities; `%%entity … parent:` if it is a line item |
| Add a column | Its type and modifiers; its help text; its enum binding if it is a vocabulary; the `FK` modifier **and** a relationship line if it points at another entity; any `%%report` that should now select it |
| Add a state | The `%%enum` behind the status column must gain the value; the entries and exits must still reach `[*]`; any `%%rbac` on the new transition |
| Add a rule | Its `on <Entity> event: <hookType>` binding; whether it merely decides or must also act — a rule that must act needs `%%action` |
| Add a role | One `%%rbac … .read` per entity that role works with. A role that reads nothing is an account that signs in to an empty application |
| Rename anything | Every reference to the old name, everywhere: foreign-key prefixes, relationship lines, `%%rbac`, `%%rule`, `%%workflow`, `%%hook`, `%%step`, `%%field`, `%%index`, and the SQL inside every `%%report` |
| Remove anything | Everything that names it, by the same list |

**The file contract is unchanged, and it still applies to every byte you hand
back**: one file, UTF-8, first non-blank line a `%%` line, `%%meta name:` before
the first Mermaid keyword, every other line a Mermaid statement or an EML `%%`
directive or blank, and no Markdown anywhere in it. An enhanced model that has
picked up a heading or a fence on its way through your hands is `EML004` like any
other prose.

Keep the `%%meta name:` the model already had unless the user asked for the
business to be renamed. And if the document carries `%%meta version:`, raise it —
a model that changed and did not is a model two people will disagree about.

### {{N}}.5 Validate, and prove nothing was lost

The enhancement is not finished when it is written. It is finished when the
checker accepts it **and** the inventory says the model still contains what it
contained before. Those are two separate questions and only one of them has a
tool.

**First, the checker — exactly as the authoring protocol runs it.** If you have
a shell, this is the whole of it:

```sh
curl -sO https://www.appwithai.org/guide/check-model.mjs
node check-model.mjs my-business.mmd
```

Run the three passes, apply the fixer to every diagnostic, re-run the checker,
and repeat that cycle **at least 10 times or until the report is empty**,
whichever comes first. Validate the file, not your message: `check()` takes the
contents of the enhanced `.mmd` and nothing else. This document's validation
section has the modules, the API and
the offline routes; §{{N}}.2's baseline is what tells you whether a diagnostic is
yours or was already there.

Do not deliver a document that still has diagnostics after 10 correction
attempts. Deliver the best version you have, say plainly which diagnostics
remain, which of them were in the original, and what you tried.

**Perform the validation; do not offer it.** "I can run the checker if you would
like me to" is not a step, it is a question — and the user asked for an enhanced
model, not for a decision about whether to check one. Run it.

**If you cannot reach the checker, exhaust the ladder before you believe it.**
Every observed case of "the checker could not be run" has been one route failing
while the others went untried: a `curl` that is unavailable, a URL import Node
declines, a host that will not resolve, a proxy answering 403 or 502. Each of
those is one rung, not a verdict on the environment. The engine is two
dependency-free ES modules — get `checker.js` and `fixer.js` into the working
directory by any means available, including a copy the user pastes in, and
`check-model.mjs --base ./` runs against them with no network at all.

**Running the checker needs no specification document at all.** This file being
unreachable, or any other document, has no bearing on whether the engine runs —
they are different fetches of different things, and conflating them is how a
blocked documentation URL turns into a model delivered unvalidated. By the same
token, failing to reach GitHub says nothing about whether the checker can run:
no route to the checker passes through a GitHub host.

Only when every rung has genuinely failed: walk the delivery checklist by hand,
then hand over the file with one plain sentence — the checker could not be run
here, this is what was verified by hand, and the user can validate it in their
own browser in a few seconds at
`https://www.appwithai.org/guide/11-check-a-model.html`, which runs these same
two modules with nothing to install. Never report the output of a check of your
own devising in the vocabulary of the real one: a substitute described as
"passes" or "0 warnings" is worse than no check at all, because the user cannot
tell the two apart.

**Second, the regression comparison, which no tool will do for you.** Put the
§{{N}}.2 inventory beside the same counts taken from the enhanced file. Every
number must have gone **up, or stayed the same** — unless the user asked for it
to go down:

| If this fell and nobody asked | You have |
|---|---|
| Entity count, or an entity name vanished | Dropped an entity |
| Columns on an entity you did not touch | Rewritten it from memory |
| Enum values | Broken every state and rule bound to the missing one |
| `%%entity help:` / `%%field help:` lines | Emptied the generated manual |
| `%%rbac` lines | Made an entity invisible to a role that could see it yesterday |
| `%%report` directives | Deleted a question somebody's users ask |
| Hooks, rules, actions, steps, workflows | Removed behaviour the application was running |

A fall in any of these that the user did not request is a defect, not a
simplification. Find what you dropped and put it back, then run the checker
again — the fix is a new edit and the file must be re-validated after it.

**Read the enhanced file once more, end to end**, looking for the two things
counts cannot see: a reference to something you renamed that you did not follow,
and a new entity or column with no help text. Both check clean.

### {{N}}.6 Deliver

**Run the loop one last time, over the exact bytes you are about to hand over.**
Editing stops; validation starts again from zero — check, fix, check, until the
report is empty. The file that leaves your hands must be the one that came out of
a clean run, not an earlier draft and not "clean three edits ago".

Hand back the **whole enhanced model** as a file the user can download, under the
name it arrived with unless they asked for a different one.

- If you can write to a filesystem, write it there and attach it.
- If your surface has a file, download or artifact mechanism, use it, with the
  `.mmd` extension intact — not `.txt`, not `.md`, not `.diff`.
- **Only if the surface truly cannot carry a file**: print the complete document
  inside a single triple-backtick `mermaid` fence, the file name on the line
  above it, the file's bytes and nothing else between the fences, and nothing
  left out. No elisions, no "unchanged from here down", no splitting one model
  across two blocks. The user saves that block verbatim.
- **Never abbreviate the unchanged parts.** "…the rest of your model as before…"
  inside the fence turns the deliverable into a merge the user has to perform,
  and hands them a file that is `EML004` if they save it as it stands.
- **Do not offer the by-products.** The original, a diff, a change log as a file:
  leave them behind. One attachment.

Alongside the file — in the reply, never inside it — give:

- **what changed**, as a short list: what was added, what was changed, what was
  removed, and anything you inferred rather than were told;
- **what was preserved**, as the regression table from §{{N}}.5 — the before and
  after counts, side by side. This is the evidence that the enhancement did not
  cost anything, and it is the part a user cannot check for themselves without
  reading two hundred lines of Mermaid;
- **the checker result** — errors, warnings and infos, with counts — for the
  original as received *and* for the file you are delivering, or the plain
  statement that the checker could not be run here and what you verified by hand;
- **anything still unresolved**, and any pre-existing diagnostic you deliberately
  left alone;
- **what to do next**: upload the file at
  `https://www.appwithai.org/guide/run-in-browser.html#upload`, where it becomes a
  running application in the browser tab, with nothing installed and nothing
  uploaded to a server.

One last check before you send. Open the file you are about to attach, read its
first non-blank line, and count its entities. If the line does not begin with
`%%`, you are attaching the wrong artifact. If the count is lower than the one
you wrote down in §{{N}}.2, you are attaching a regression.
