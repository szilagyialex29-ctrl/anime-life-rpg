<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared mentor/class/quest definitions in game-data and level/cosmetic rules in progression so UI and AI use the same gameplay context.
- Resolve equipped cosmetics against earned levels on every render so stale saved selections cannot unlock rewards.
- Mentor advice is a one-shot public CSRF-protected server function, not a conversation; inputs are caller-supplied and no player history is stored server-side.
- Call Lovable AI through request-local Responses helpers on the server; persist terminal credit/access blocks in a service-only guard table to prevent repeated blocked spending.
- Use generated class-specific avatar tier portraits and named mentor portraits to keep cosmetics and mentor identity visually distinct.
- Load uploaded fighter assets through saved asset pointers; isolate normalization from animated roots and retarget locomotion through explicit bone maps so different skeletons remain compatible.
- Use incrementing attack IDs for one-shot fighter clips so consecutive attacks restart even when their animation state does not change.
- Bind uploaded FBX animation tracks to cloned-node UUIDs across duplicate skeleton names and restore bind transforms after retargeting to prevent mesh deformation.
