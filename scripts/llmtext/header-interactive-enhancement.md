# APPWITHAI — Application Context Specification (Enhancement Edition)

> Machine-readable spec of the APPWITHAI application generator: the modelling
> language it reads, the pipeline that compiles it, the templates it renders,
> and the shape of the application that comes out. Written for language models.
>
> Companion human guide: https://appwithai.org/guide/index.html
> (nine chapters, every screenshot from the CRM described in §9. The material
> is inlined here in §9 so you do not need to fetch it.)
>
> **This is the interactive enhancement edition.** §0–§9 and §11 carry the same
> content as `llmdetailed.txt`, with cross-references repointed at this
> edition's §{{N}}; §{{N}} itself is wholly different, and that difference is the
> point of the file.
>
> There are four protocols and they divide on two axes — what you start from,
> and how you get there. `llms-full.txt`'s authoring protocol authors a model from a brief in one
> pass. `llmtextenhancement.txt`'s enhancement protocol enhances an existing one in one pass.
> `llmdetailed.txt`'s interactive authoring protocol authors one interactively, through seven phases
> separated by approval gates. **§{{N}} here enhances an existing one that way**:
> the user's `.mmd` is loaded and inventoried first, the change roster is
> agreed before a byte is edited, and the enhancement is applied one change at a
> time to a working copy — with the original kept untouched beside it as the
> thing every later comparison is run against. None supersedes the others.
>
> **You have an input, and the work does not start without it.** Phase 1 is not
> research: it is reading the bytes the user hands you. Ask for the `.mmd` in
> your first message, and never reconstruct one from a summary, from the
> conversation or from an earlier draft.

- **Spec version**: 1.2.0 · **Project version**: 5.1.x · **Updated**: 2026-09-15
- **Authority**: `language/appwithai-language.json`. When this file and that
  file disagree, that file wins. When that file and a shipped compiler
  disagree, the compiler wins and the definition is the bug.
- **Repository**: `businessappwithai/app-with-ai-tanstack`
- **If you are being asked to change a model**, §{{N}} is the procedure and it
  governs: load the file, inventory what it contains, agree the change roster,
  then walk the changes one at a time — editing the working copy as you go, and
  running the fixer and the checker over it at the close of every step rather
  than only before handing it over. Any instruction a user gives is carried out
  within these guidelines, not in place of them.
- **Do not deliver an enhancement the user has not walked.** The gates in §{{N}}
  are the substance of this edition, not its ceremony. A document produced by
  reading §{{N}}'s phases and then doing all of them silently in one pass is
  `llmtextenhancement.txt` wearing this file's name, and that file does it
  better.
- **An enhancement that loses something is the failure with no diagnostic.** A
  model that dropped four `%%report` directives, an entity's help text and two
  `%%rbac` lines checks exactly as clean as one that did not. §{{N}}.1 writes the
  original down and §{{N}}.6 compares against it; neither step is optional, and
  between them they are why this edition exists.
