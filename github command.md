# Git & GitHub Command Handbook

## Scenario-based guide for daily development

This handbook covers Git commands commonly used in team projects.
Examples use: - `master` as the stable branch - `dev` as Dev's working
branch - `bhavya` as Bhavya's working branch - `origin` as the GitHub
remote - Replace branch names, file names, URLs, and commit IDs with
your project's actual values.

> **Important:** Git is the version-control tool. GitHub is the hosting
> and collaboration platform. Commands such as `git push`, `git pull`,
> and `git merge` are Git commands; creating a Pull Request is done on
> GitHub (or with GitHub CLI).

------------------------------------------------------------------------

## 1. First-time setup

### Scenario: You have a project folder and want to start tracking it with Git

``` bash
git init
git status
git add .
git commit -m "Initial commit"
```

-   `git init` --- creates a Git repository in the current folder.
-   `git status` --- shows changed, staged, and untracked files.
-   `git add .` --- stages changes under the current directory. Check
    `git status` first.
-   `git commit -m "message"` --- saves staged changes as a commit.

### Scenario: You want to download an existing GitHub repository

``` bash
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
```

`git clone` downloads the repository, its history, and configures a
remote (usually named `origin`).

### Scenario: Connect an existing local project to GitHub

``` bash
git remote add origin https://github.com/OWNER/REPOSITORY.git
git remote -v
git branch -M main
git push -u origin main
```

-   `git remote add` --- adds a remote URL.
-   `git remote -v` --- lists remote names and URLs.
-   `git branch -M main` --- renames the current branch to `main`.
-   `git push -u origin main` --- pushes the branch and sets its
    upstream for simpler future pushes.

------------------------------------------------------------------------

## 2. Check your current situation before doing anything

  ----------------------------------------------------------------------------------------------
  Scenario                Command                                        What it tells you
  ----------------------- ---------------------------------------------- -----------------------
  See changed files       `git status`                                   Staged, unstaged, and
                                                                         untracked files

  List local branches     `git branch`                                   Branches on your
                                                                         computer

  List local and          `git branch -a`                                All known branches
  remote-tracking                                                        
  branches                                                               

  See current branch      `git branch --show-current`                    Current branch name

  See configured remotes  `git remote -v`                                Remote names and URLs

  See recent commits      `git log --oneline`                            Compact commit history

  See graph of branches   `git log --oneline --graph --decorate --all`   Branch and merge
                                                                         history

  See unstaged changes    `git diff`                                     Changes not yet staged

  See staged changes      `git diff --staged`                            Changes prepared for
                                                                         commit

  Inspect a commit        `git show COMMIT_ID`                           Commit details and
                                                                         patch
  ----------------------------------------------------------------------------------------------

**Good habit:** Run `git status` before switching branches, committing,
pulling, merging, or resetting.

------------------------------------------------------------------------

## 3. Branch commands

### Scenario: Create a new branch and move to it

``` bash
git switch -c feature/login
```

Creates and switches to `feature/login`.

### Scenario: Switch to an existing branch

``` bash
git switch dev
```

### Scenario: Create a branch from the latest remote branch

``` bash
git fetch origin
git switch -c feature/login origin/dev
```

### Scenario: Rename the current branch

``` bash
git branch -m new-branch-name
```

### Scenario: Delete a branch that has already been merged

``` bash
git branch -d feature/login
```

### Scenario: Force-delete a local branch

``` bash
git branch -D feature/login
```

Use `-D` only when you are certain you no longer need its unmerged work.

### Scenario: Delete a remote branch

``` bash
git push origin --delete feature/login
```

This removes the branch from the remote repository. Confirm with your
team first.

------------------------------------------------------------------------

## 4. Add, commit, and push

### Scenario: Save all current changes in a commit

``` bash
git status
git add .
git status
git commit -m "Add login feature"
```

### Scenario: Stage only selected files

``` bash
git add src/Login.jsx src/Register.jsx
git commit -m "Add login and registration pages"
```

Other modified files remain unstaged.

### Scenario: Stage only part of a file

``` bash
git add -p
```

Git lets you choose individual change sections (hunks) to stage.

### Scenario: Push your branch for the first time

``` bash
git push -u origin feature/login
```

### Scenario: Push later commits to the same branch

``` bash
git push
```

### Scenario: Push a named local branch to a named remote branch

``` bash
git push origin dev
```

### Scenario: See what is committed but not yet pushed

``` bash
git log origin/dev..HEAD --oneline
```

Run after fetching if you want an up-to-date remote-tracking reference:

``` bash
git fetch origin
git log origin/dev..HEAD --oneline
```

------------------------------------------------------------------------

## 5. Fetch, pull, and merge

### Difference between the three

  -----------------------------------------------------------------------
  Command                 Meaning                 Does it integrate
                                                  changes into your
                                                  current branch?
  ----------------------- ----------------------- -----------------------
  `git fetch origin`      Downloads remote        No
                          updates and updates     
                          remote-tracking refs    

  `git pull`              Fetches and integrates  Yes
                          the upstream branch     

  `git merge dev`         Integrates the named    Yes
                          branch into your        
                          current branch          
  -----------------------------------------------------------------------

### Scenario: Get the latest code for the branch you are currently on

``` bash
git status
git pull
```

### Scenario: Download remote updates without changing your current files

``` bash
git fetch origin
```

### Scenario: Bring latest `master` changes into your `bhavya` branch

``` bash
git switch master
git pull origin master
git switch bhavya
git merge master
```

You first update local `master`, then merge it into `bhavya`.

### Scenario: Dev wants Bhavya to get Dev's latest code before it is merged into master

``` bash
git fetch origin
git switch bhavya
git merge origin/dev
git push origin bhavya
```

This merges the remote-tracking `dev` branch into `bhavya`. It does not
merge anything into `master`.

### Scenario: Merge a feature branch into master locally

``` bash
git switch master
git pull origin master
git merge feature/login
git push origin master
```

For team projects, a GitHub Pull Request is usually safer because
teammates can review the changes before merging.

------------------------------------------------------------------------

## 6. Stash: temporarily save unfinished work

Stash is useful when you have unfinished local changes but need to
switch tasks or branches.

### Scenario: Save tracked-file changes temporarily

``` bash
git stash
```

### Scenario: Save with a clear description

``` bash
git stash push -m "WIP: login form"
```

### Scenario: Include new untracked files too

``` bash
git stash push -u -m "WIP: login API"
```

`-u` includes untracked files. Ignored files are not included.

### Scenario: List saved stashes

``` bash
git stash list
```

### Scenario: View what is inside the latest stash

``` bash
git stash show -p stash@{0}
```

### Scenario: Restore the latest stash and remove it from the stash list

``` bash
git stash pop
```

### Scenario: Restore a stash but keep it saved

``` bash
git stash apply stash@{0}
```

### Scenario: Restore a specific stash

``` bash
git stash apply stash@{1}
```

### Scenario: Delete one stash entry

``` bash
git stash drop stash@{0}
```

### Scenario: Delete all stash entries

``` bash
git stash clear
```

This is destructive. It removes all saved stash entries.

### Full practical stash scenario

You are editing a login page. Bhavya asks you to check another branch,
but your login work is unfinished.

``` bash
git status
git stash push -u -m "WIP: login page"
git switch bhavya
git pull origin bhavya
# Work on Bhavya's branch
git switch dev
git stash list
git stash pop
```

If `stash pop` causes conflicts, resolve the files, stage the
resolutions, and test the project. Do not repeatedly pop the same stash.

------------------------------------------------------------------------

## 7. Undo changes safely

### Scenario: Discard unstaged changes in one file

``` bash
git restore src/Login.jsx
```

This permanently discards unstaged edits in that file.

### Scenario: Unstage a file but keep its edits

``` bash
git restore --staged src/Login.jsx
```

### Scenario: Discard all unstaged tracked-file changes

``` bash
git restore .
```

Careful: this discards local edits to tracked files.

### Scenario: Undo the latest commit but keep changes staged

``` bash
git reset --soft HEAD~1
```

### Scenario: Undo the latest commit and keep changes unstaged

``` bash
git reset HEAD~1
```

### Scenario: Remove the latest commit and discard its changes

``` bash
git reset --hard HEAD~1
```

**Warning:** `--hard` discards local changes and moves the branch
pointer. Avoid it if you are unsure or if the commit is shared.

### Scenario: Undo a commit that has already been pushed to a shared branch

``` bash
git revert COMMIT_ID
git push origin branch-name
```

`git revert` creates a new commit that reverses the selected commit. It
is generally safer for shared history than force-pushing.

### Scenario: Remove an untracked file

``` bash
git clean -n
git clean -f
```

`-n` previews what would be removed. `-f` actually removes untracked
files. To include untracked directories, use `git clean -fd`. Be very
careful.

------------------------------------------------------------------------

## 8. Fix and manage remotes

### Scenario: Check remote URLs

``` bash
git remote -v
```

### Scenario: Change the URL of `origin`

``` bash
git remote set-url origin https://github.com/OWNER/REPOSITORY.git
```

### Scenario: Add another remote

``` bash
git remote add upstream https://github.com/ORIGINAL-OWNER/REPOSITORY.git
```

### Scenario: Download updates from upstream

``` bash
git fetch upstream
```

### Scenario: Remove a remote alias

``` bash
git remote remove github
```

This removes the local remote configuration only; it does not delete the
GitHub repository.

**Remember:** `origin`, `github`, and `upstream` are labels you choose.
The URL configured for each label determines which repository it points
to.

------------------------------------------------------------------------

## 9. Rebase

Rebase reapplies your commits on top of another base commit, creating a
more linear history.

### Scenario: Update your feature branch using the latest master

``` bash
git fetch origin
git switch feature/login
git rebase origin/master
```

### Scenario: Continue after resolving a rebase conflict

``` bash
# Edit conflicted files and resolve the markers
git add <resolved-file>
git rebase --continue
```

### Scenario: Cancel a rebase and return to its starting state

``` bash
git rebase --abort
```

### Scenario: Push a rebased branch

``` bash
git push --force-with-lease origin feature/login
```

Only do this on a branch you own and coordinate with anyone else using
it. Do not casually rebase shared branches. `--force-with-lease` is
safer than `--force`, but it still rewrites remote history.

**Merge vs rebase:** Merge preserves the branch merge history. Rebase
rewrites your local commit sequence to appear on top of another base.

------------------------------------------------------------------------

## 10. Resolve merge conflicts

### Scenario: Git reports a conflict during merge

``` bash
git status
```

1.  Open each conflicted file.
2.  Find conflict markers: `<<<<<<<`, `=======`, and `>>>>>>>`.
3.  Decide which changes to keep and edit the file.
4.  Remove all conflict markers.
5.  Test the code.

Then, if you were merging:

``` bash
git add <resolved-file>
git commit
```

If Git created a merge commit message, save and close the editor to
finish.

### Scenario: Cancel a merge that is in progress

``` bash
git merge --abort
```

### Scenario: Conflict during rebase

``` bash
git status
# Resolve files
git add <resolved-file>
git rebase --continue
```

To cancel:

``` bash
git rebase --abort
```

------------------------------------------------------------------------

## 11. GitHub Pull Request workflow

A Pull Request (PR) is created on GitHub, not with ordinary Git
commands.

### Scenario: Dev wants to submit completed work for review

``` bash
git switch dev
git status
git add .
git commit -m "Implement login API"
git push -u origin dev
```

Then on GitHub: 1. Open the repository. 2. Select **Compare & pull
request** (or open **Pull requests** → **New pull request**). 3. Set
**base** to `master`. 4. Set **compare** to `dev`. 5. Review the changed
files and description. 6. Create the PR. 7. Ask a teammate to review it.
8. Merge after approval and checks pass.

### Scenario: Update an existing PR

Make more changes on the same source branch, then:

``` bash
git add .
git commit -m "Fix login validation"
git push
```

The existing PR updates automatically.

### Scenario: Check GitHub CLI availability and create a PR from terminal

Install and authenticate GitHub CLI (`gh`) first. Then:

``` bash
gh auth login
gh pr create --base master --head dev --title "Add login API" --body "Implements the login API."
```

Useful GitHub CLI commands:

``` bash
gh repo view
gh pr list
gh pr view
gh pr checkout 123
gh pr status
gh pr checks
gh pr merge 123
```

`gh` is a separate GitHub CLI tool, not a built-in `git` subcommand.

------------------------------------------------------------------------

## 12. Tags and releases

### Scenario: Mark a release version

``` bash
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

### Scenario: List tags

``` bash
git tag
```

### Scenario: Push all local tags

``` bash
git push origin --tags
```

### Scenario: Delete a local tag

``` bash
git tag -d v1.0.0
```

### Scenario: Delete a remote tag

``` bash
git push origin --delete v1.0.0
```

------------------------------------------------------------------------

## 13. Useful inspection and comparison commands

  Scenario                                Command
  --------------------------------------- ---------------------------------
  See latest commit                       `git log -1`
  Compact history                         `git log --oneline -10`
  See who changed each line               `git blame src/Login.jsx`
  Compare two branches                    `git diff master..dev`
  Compare current work with last commit   `git diff HEAD`
  See files changed in latest commit      `git show --stat HEAD`
  See commits in dev but not master       `git log master..dev --oneline`
  See commits in master but not dev       `git log dev..master --oneline`
  Search commit messages                  `git log --grep="login"`
  Search tracked files for text           `git grep "function login"`

------------------------------------------------------------------------

## 14. Team workflow: Dev and Bhavya

Assume both developers work on separate branches and `master` is the
stable branch.

### Dev: start work and publish a feature

``` bash
git switch dev
git pull origin dev
git switch -c feature/login-api
# Make changes
git add .
git commit -m "Add login API"
git push -u origin feature/login-api
```

Open a PR on GitHub with base `master` and compare `feature/login-api`.

### Bhavya: start separate work

``` bash
git switch bhavya
git pull origin bhavya
git switch -c feature/register-ui
# Make changes
git add .
git commit -m "Add registration UI"
git push -u origin feature/register-ui
```

Open a PR with base `master` and compare `feature/register-ui`.

### Bhavya needs Dev's unmerged feature branch

``` bash
git fetch origin
git switch bhavya
git merge origin/feature/login-api
git push origin bhavya
```

Only do this if the team agrees that Bhavya should depend on Dev's
unmerged work. The PR may then include those changes too, depending on
the branch history.

### Both developers need the latest approved master code

``` bash
git fetch origin
git switch bhavya
git merge origin/master
```

Dev can do the same from the `dev` branch.

------------------------------------------------------------------------

## 15. Common errors and what to check

### `fatal: not a git repository`

You are not inside the project folder, or the folder has not been
initialized.

``` bash
cd path/to/project
git status
```

If it is a new project, run `git init`.

### `remote: Repository not found`

Check:

``` bash
git remote -v
```

Verify the repository URL, spelling/capitalization, account access, and
authentication.

### `rejected: non-fast-forward`

The remote branch has commits you do not have locally.

``` bash
git fetch origin
git pull --rebase
# Resolve conflicts if any
git push
```

Use the correct upstream branch for your current branch. Do not
force-push as the first fix.

### `error: Your local changes would be overwritten`

Commit or stash your work before switching or integrating changes.

``` bash
git stash push -u -m "Temporary work"
```

### `src refspec main does not match any`

You may be on a different branch or may not have created a commit yet.

``` bash
git branch --show-current
git status
git log --oneline -1
```

### `Permission denied` or authentication failure

Check that you are authenticated to GitHub and have write access. Use
GitHub's supported HTTPS or SSH authentication setup; never paste tokens
or passwords into chat or commit them to a repository.

------------------------------------------------------------------------

## 16. Quick command cheat sheet

``` bash
# Status and history
git status
git log --oneline --graph --decorate --all
git diff
git diff --staged

# Branches
git branch
git branch -a
git switch branch-name
git switch -c new-branch

# Stage and commit
git add file-name
git add .
git commit -m "message"

# Remote sync
git remote -v
git fetch origin
git pull
git push
git push -u origin branch-name

# Merge and rebase
git merge branch-name
git merge --abort
git rebase origin/master
git rebase --continue
git rebase --abort

# Stash
git stash push -u -m "WIP"
git stash list
git stash show -p
git stash apply
git stash pop
git stash drop

# Undo
git restore file-name
git restore --staged file-name
git revert COMMIT_ID
git reset --soft HEAD~1

# Remote branch
git push origin --delete branch-name
```

------------------------------------------------------------------------

## 17. Safety checklist before pushing

-   [ ] Confirm the branch with `git branch --show-current`.
-   [ ] Check changed files with `git status`.
-   [ ] Review changes with `git diff` and `git diff --staged`.
-   [ ] Do not commit `.env`, passwords, API keys, private certificates,
    or personal data.
-   [ ] Run tests and build checks.
-   [ ] Commit with a meaningful message.
-   [ ] Push to the intended remote and branch.
-   [ ] Use a Pull Request for review before merging into the stable
    branch.
-   [ ] Avoid `git push --force` on shared branches.
-   [ ] Avoid `git reset --hard`, `git clean -f`, and `git stash clear`
    unless you understand what will be deleted.

## 18. Official references

-   Git documentation: https://git-scm.com/docs
-   Git book: https://git-scm.com/book/en/v2
-   GitHub Docs: https://docs.github.com/
-   GitHub CLI manual: https://cli.github.com/manual/

------------------------------------------------------------------------

**Remember:** `fetch` downloads remote information; `pull` fetches and
integrates; `merge` combines branch histories; `rebase` replays commits;
`stash` temporarily shelves local changes; `revert` safely reverses a
commit by adding another commit.
