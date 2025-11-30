# The Architect’s Notebook

I keep running into the same problem: the notes and sketches I keep about the architecture end up scattered across too
many tools.
For pet projects I sketch in Draw.io, write Markdown in a Git repo, and some of my reasoning drifts into Basecamp.
At my day job it fragments even further—across Teams channels, wikis, PM tools, emails, chats, loose Markdown files,
Draw.io diagrams, and an endless supply of slide decks.

OneNote never clicked for me. It tries to emulate paper, while I interact with a mouse and keyboard. It’s too free.
I prefer constraints—just enough structure that I can focus on the thinking rather than the formatting. That’s why I
like Markdown: limited, but in the liberating way.

So I wanted something quieter. Something of my own.
A personal knowledge space where the pre-docs—the rough notes, sketches, arguments-in-progress—can actually stay in one
place before they graduate to official documentation.
My own take on OneNote, but opinionated in the ways that help me think.

---

## The initial idea

It didn’t start as a PKM project.  
The idea was much bigger.

At some point I realized: knowledge flows from work.  
So instead of stitching tools together, maybe I should build something where **project management and knowledge
management share the same foundation**—not bolted on afterwards, but part of the workflow itself.

The project-management part felt straightforward.  
My own process doesn’t require much more than tasks and notes.

But the knowledge-management part… that’s where the uncertainty sits.

Enterprise knowledge management is complicated for reasons I’m not trying to solve here: permissions, comments,
conflicts, shared taxonomies, workflows, change tracking. All important for a collaborative tool — and I’m confident
those aspects are solvable.

But the real risk in the larger idea is not collaboration.  
It’s **knowledge** itself: how it’s captured, structured, found, and shaped.

So I reframed the question:

> *“What do I actually need for personal knowledge management?”*

A smaller question.  
Sharply scoped.  
And something I can test myself — to see whether the UX actually supports the way I think.

This notebook is that proof-of-value experiment.  
A way to validate the knowledge-management foundations before I attempt anything larger.

---

## Constraints

Before thinking about features, I had to be clear about boundaries.

- This is a **personal** tool. No collaboration, no comments, no change tracking.
- Built **for myself first**. If others benefit — great.
- Browser-based, because that’s the GUI stack I understand best.
- **Privacy-first**, everything stored locally through the File System Access API.
- Backups and syncing are external concerns (OneDrive, Dropbox, Git — whatever fits).

I work in a regulated environment, so “just put it in the cloud” is not an option.  
Local-first isn’t a preference — it’s a requirement.

---

## The tool

Obsidian introduced a beautiful idea: notes forming a knowledge graph.  
That became a key inspiration.

Because I chose web technologies, I can stand on the shoulders of existing libraries:

- **Markdown** via Toast UI Editor and Marked
- **Diagrams** via the Draw.io embed — fully client-side, no data leaves the browser
- **Mermaid** for lightweight system sketches
- **Chart.js** for structured visualizations

I also borrowed ideas from Confluence — notably **tags**.  
Tags allow both hierarchical browsing and powerful filtering across the knowledge graph.  
Full-text search fills in the gaps (MiniSearch handles that for me).

### Narratives: a missing feature in most tools

One feature I always wanted is the ability to create a story — a curated path through existing notes, regardless of
chronology.  
A way to assemble context around a decision, not just the decision itself.

That idea aligns closely with Martin Fowler’s **Infodeck** —  
and that’s exactly how I treat narratives:  
landscape, slide-like sequences built from fragments of knowledge already stored in the system.

These must export cleanly to PDF for offline sharing.

### Architectural views

As an architect I also need structural views of the knowledge graph — not just freeform diagrams.  
If I commit to consistent metadata, I can generate C4 views directly from my documents.  
So I chose the **C4 model** as the unifying vocabulary for system context.

This means the C4 diagrams aren’t something I draw —  
they’re something I *derive* from decisions and notes.

### Working On (attention & flow)

One perspective I haven’t described yet is “Working on” – the small dashboard that answers the simplest question in a
personal notebook: What am I actually doing right now? It shows which documents are in draft or under review, and the
sidebar keeps the last few notes I touched close at hand. It’s not a workflow engine or a kanban board; it’s a gentle
prompt that surfaces whatever is currently alive in my head. In a tool that aims to hold my architectural thinking, it
becomes the anchor point – a way to return to the thread I was following before the day scattered me across meetings,
chats, and context-switches.

---

## The document model

Every note you write is essentially a “document,” similar to Confluence.  
The document is the **aggregate root**.  
It contains metadata and a collection of *sections*.

Each section is stored as a separate file — a Markdown file, JSON, XML (for Draw.io), etc.  
This prevents conflicts and makes references predictable.

Any section in your knowledge base can be addressed with a simple
(document_id, section_id) pair.
That means an infodeck slide never has to start from scratch:
you can reuse existing text, diagrams, or even embed sections inline — and anything you embed remains a first-class,
referenceable piece of knowledge.

Metadata forms a small domain language around documents:

- `type: note | ADR | principle | persona | ...`  
  This affects the UI.  
  For example, ADRs have a dedicated Y-Statement section.

- ADRs and decisions may also declare **effects** (e.g., introducing a new C4 component, creating a relationship, or
  marking technical debt).  
  With this, the C4 model can be reconstructed directly from your decisions.

- Notes can declare their **scope**, linking them to C4 elements.  
  Again: the C4 model isn’t drawn — it’s used as a navigational structure.

Metadata is what turns a pile of documents into a knowledge system.

---

## What this tool really gives me

It integrates the tools I already use —  
Markdown, diagrams, sketches — but overlays them with a consistent data model.  
It helps me attach meaningful metadata.  
It connects everything into a navigable knowledge graph.

It’s an external brain.  
An opinionated Obsidian.  
A local, single-user Confluence.  
A place for architectural thinking without distraction.

I still have ideas for future visualizations, but those can wait.  
For now, I want to see whether this tool supports me the way I hope it will.

Because sometimes the best way to think about architecture  
is to build a small piece of it for yourself.