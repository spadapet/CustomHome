---
name: home-model-publishing
description: 'Publish verified CustomHome model and documentation changes. Use when asked to commit, push, publish to main, update project skills or prepare the completed home-design work for GitHub.'
---

# Publish the completed design

1. Confirm the requested remote and target branch. Work on a topic branch;
   fetching remote refs must not discard pending model changes.
2. Inspect working-tree and index paths. Include the owner's requested model,
   room documentation, tests and project customizations, including intentional
   deletions. Keep unrelated local files such as `.aidevops/` out of the commit.
3. Fetch the target and check incoming commits. Preserve other people's work.
   If integration is required, resolve against the common ancestor rather
   than replacing entire files with one side.
4. Follow [model verification](../home-model-editing/SKILL.md). Before
   publication, run the full suite:

   ```powershell
   node .\.github\skills\home-model-editing\scripts\check-model.cjs
   git diff --check
   ```

   Verify the production browser still loads, with temporary instrumentation
   removed. Check current room notes for stale dimensions and safety labels.
   Keep the viewer minimal and model-first: publish only UI needed for the
   owner's request. Do not restore unrequested banners, slogans, badges,
   explanatory panels, duplicate menus or links. Verify the removed top
   slogan, concept badge and visible garage-door explanation banner stay
   absent; retain necessary errors, safety warnings and accessible feedback.
5. Stage intended paths explicitly. Inspect `git diff --cached --stat` and the
   staged file list before committing. Keep a separate customization commit
   when model work and reusable workflows are both being published.
6. Check the committed paths and representative committed content, not just
   the working tree. Compare the branch with the merge base of the fetched
   target to catch unrelated changes.
7. Push only with explicit authorization. When the owner expressly requests
   publication to `main`, use a normal fast-forward push with an explicit
   target ref. Never force-push main or bypass branch protection. If a PR is
   required, explain the blocker and use the repository's PR process.
8. Read back the remote target SHA and confirm it matches the intended commit.
   Check any available GitHub workflow status; a successful push alone is not
   proof that hosting deployment completed.

Report the target branch, commit, test result and any deployment or approval
limitations. Do not describe safety-limited model placements as approved
construction or operation.
