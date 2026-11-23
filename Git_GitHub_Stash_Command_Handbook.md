# Git & GitHub Command Handbook

A practical guide for two developers (Dev and Bhavya), branches,
commits, pull requests, remotes, and Git Stash.

## 1. Git basics

  ----------------------------------------------------------------------------------------
  Command                                              What it does / Why you use it
  ---------------------------------------------------- -----------------------------------
  `git --version`                                      Checks whether Git is installed and
                                                       displays its version.

  `git config --global user.name "Your Name"`          Sets the name recorded in your
                                                       commits on this computer.

  `git config --global user.email "you@example.com"`   Sets the email recorded in your
                                                       commits. Use an email associated
                                                       with your GitHub account if you
                                                       want commits linked to it.

  `git clone REPOSITORY_URL`                           Downloads a remote repository and
                                                       creates a local working copy.

  `cd project-folder`                                  Moves your terminal into the
                                                       project folder.

  `git status`                                         Shows the current branch and files
                                                       that are modified, staged,
                                                       untracked, or ready to commit. Use
                                                       it before committing or switching
                                                       branches.

  `git log --oneline`                                  Shows recent commits in a short,
                                                       readable format.

  `git diff`                                           Shows unstaged changes that have
                                                       not yet been added to the staging
                                                       area.

  `git diff --staged`                                  Shows changes already staged and
                                                       waiting to be committed.
  ----------------------------------------------------------------------------------------

## 2. Branch commands

  -----------------------------------------------------------------------
  Command                             What it does / Why you use it
  ----------------------------------- -----------------------------------
  `git branch`                        Lists local branches and marks the
                                      branch you are currently using.

  `git branch -a`                     Lists local and remote-tracking
                                      branches.

  `git branch dev`                    Creates a local branch named `dev`
                                      without switching to it.

  `git switch -c dev`                 Creates the `dev` branch and
                                      switches to it.

  `git switch bhavya`                 Switches to the existing local
                                      `bhavya` branch.

  `git checkout dev`                  Older, still-supported way to
                                      switch to `dev`.

  `git branch -d branch-name`         Deletes a local branch if Git
                                      considers it safely merged.
  -----------------------------------------------------------------------

## 3. Add, commit, and push

  ------------------------------------------------------------------------
  Command                              What it does / Why you use it
  ------------------------------------ -----------------------------------
  `git add Login.jsx`                  Stages only `Login.jsx`. Use this
                                       when you do not want other modified
                                       files included in the next commit.

  `git add Login.jsx Register.jsx`     Stages exactly these two files.

  `git add .`                          Stages changes under the current
                                       folder. Be careful: this may
                                       include files you did not intend to
                                       commit.

  `git commit -m "Added login page"`   Creates a local commit from staged
                                       changes and gives it a meaningful
                                       message.

  `git push origin dev`                Uploads commits from the local
                                       `dev` branch to the `dev` branch on
                                       the remote named `origin`.

  `git push github main`               Same idea, but uses the remote
                                       named `github` instead of `origin`.
                                       The remote name must exist in your
                                       configuration.

  `git push -u origin dev`             Pushes `dev` and sets its upstream.
                                       Later, while on that branch, you
                                       can usually run `git push` and
                                       `git pull` without specifying the
                                       remote and branch.

  `git show --stat HEAD`               Shows the latest commit and a
                                       summary of which files it changed.
  ------------------------------------------------------------------------

## 4. Separate commits and pushing selected files

Example: `Login.jsx`, `Register.jsx`, and `Navbar.jsx` are all modified.
You want the first two in one commit and `Navbar.jsx` later.

``` bash
git status
git add Login.jsx Register.jsx
git commit -m "Add login and registration pages"
git push origin dev
git status
```

-   `git status`: Check all modified files.
-   `git add Login.jsx Register.jsx`: Stage only the Login and Register
    files. `Navbar.jsx` remains unstaged.
-   `git commit -m "Add login and registration pages"`: Create a commit
    containing only the two staged files.
-   `git push origin dev`: Upload the new commit to the remote `dev`
    branch.
-   `git status`: `Navbar.jsx` should still appear as modified; its
    changes remain in your working folder.

When you are ready to push `Navbar.jsx`:

``` bash
git add Navbar.jsx
git commit -m "Update navbar"
git push origin dev
```

## 5. Fetch, pull, merge, and pull requests

  -----------------------------------------------------------------------
  Command / Action                    What it does / Why you use it
  ----------------------------------- -----------------------------------
  `git fetch origin`                  Downloads new remote branch and
                                      commit information without merging
                                      it into your current branch. Useful
                                      before reviewing or merging another
                                      developer's work.

  `git pull origin dev`               Fetches and integrates the latest
                                      remote `dev` branch into your
                                      current local branch. Normally run
                                      while on `dev`.

  `git merge origin/dev`              Merges the fetched remote-tracking
                                      `dev` branch into the branch you
                                      are currently on. Example: while on
                                      `bhavya`, this brings `dev` changes
                                      into `bhavya`.

  `git merge master`                  Merges your local `master` branch
                                      into the branch you are currently
                                      on. Update local `master` first if
                                      you need the latest GitHub version.

  `git switch master`                 Switches to `master`.

  `git pull origin master`            Updates local `master` from the
                                      remote `master` branch.

  `git switch bhavya`                 Returns to Bhavya's working branch.

  `git merge master`                  Brings the updated `master` changes
                                      into `bhavya`.

  GitHub Pull Request: `dev` →        A request to review and merge
  `master`                            changes from `dev` into `master`.
                                      Creating a PR does not itself merge
                                      the code.

  GitHub Pull Request: `bhavya` →     A request to review and merge
  `master`                            Bhavya's changes into `master`.
  -----------------------------------------------------------------------

## 6. Team workflow example (Dev and Bhavya)

Suggested branch roles:

-   `master`: stable shared code.
-   `dev`: Dev's working branch.
-   `bhavya`: Bhavya's working branch.

### Dev uploads his work

``` bash
git switch dev
git pull origin dev
git add Login.jsx
git commit -m "Add login page"
git push origin dev
```

-   Dev switches to his own branch.
-   Dev updates his branch before starting work.
-   Dev stages the completed login page.
-   Dev saves the change as a commit.
-   Dev uploads his commit to GitHub's `dev` branch.

### Bhavya wants Dev's code before it is merged into master

``` bash
git switch bhavya
git stash push -m "WIP registration page"
git fetch origin
git merge origin/dev
git stash pop
git push origin bhavya
```

-   `git switch bhavya`: Bhavya switches to her branch.
-   `git stash push -m "WIP registration page"`: Temporarily stores her
    tracked, uncommitted changes so her working tree is clean.
-   `git fetch origin`: Gets the latest remote branch information,
    including Dev's pushed commits.
-   `git merge origin/dev`: Merges Dev's latest remote `dev` branch into
    Bhavya's current branch.
-   `git stash pop`: Restores Bhavya's saved work and removes that stash
    entry if it applies successfully.
-   `git push origin bhavya`: Uploads Bhavya's updated branch if she
    wants to share it.

If Dev's work has already been reviewed and merged into `master`, Bhavya
can instead update `master`, switch back to `bhavya`, and merge
`master`:

``` bash
git switch master
git pull origin master
git switch bhavya
git merge master
```

## 7. Git Stash commands

  -----------------------------------------------------------------------
  Command                             What it does / Why you use it
  ----------------------------------- -----------------------------------
  `git stash`                         Temporarily saves tracked-file
                                      changes and cleans the working
                                      tree. Useful when you need to
                                      switch tasks without making a
                                      commit.

  `git stash push -m "message"`       Saves changes with a helpful label
                                      so you can identify the stash
                                      later.

  `git stash -u`                      Also includes untracked files (new
                                      files Git is not tracking yet).

  `git stash list`                    Lists saved stashes, such as
                                      `stash@{0}`, `stash@{1}`.

  `git stash show`                    Shows a summary of the latest
                                      stash.

  `git stash show -p`                 Shows the actual patch/diff stored
                                      in the latest stash.

  `git stash apply`                   Restores the latest stash but keeps
                                      it in the stash list.

  `git stash apply stash@{1}`         Restores a particular stash without
                                      deleting it.

  `git stash pop`                     Restores the latest stash and
                                      removes it from the stash list if
                                      successful.

  `git stash drop stash@{0}`          Deletes one selected stash entry.

  `git stash clear`                   Deletes all stash entries. Use with
                                      care; this is difficult to undo.
  -----------------------------------------------------------------------

## 8. Git remotes: `origin` vs `github`

A remote name is just a nickname for a repository URL. `origin` is the
conventional default name, but `github`, `company`, or another name is
also valid. The name itself does not change the destination; its
configured URL does.

  --------------------------------------------------------------------------------------------------
  Command                                                        What it does / Why you use it
  -------------------------------------------------------------- -----------------------------------
  `git remote -v`                                                Lists remote names and their
                                                                 fetch/push URLs. Use this to
                                                                 diagnose "repository not found" or
                                                                 a wrong destination.

  `git remote add origin https://github.com/USER/REPO.git`       Adds a remote named `origin`
                                                                 pointing to the specified
                                                                 repository.

  `git remote set-url origin https://github.com/USER/REPO.git`   Changes the URL configured for the
                                                                 existing `origin` remote.

  `git remote rename github origin`                              Renames the remote nickname
                                                                 `github` to `origin`; it does not
                                                                 rename the GitHub repository.

  `git remote remove github`                                     Removes the `github` remote
                                                                 nickname from local configuration.
                                                                 It does not delete the online
                                                                 GitHub repository or local files.

  `git push github main`                                         Pushes local `main` to the remote
                                                                 named `github`. Works only if
                                                                 `github` is configured and you have
                                                                 access.

  `git push origin main`                                         Pushes local `main` to the remote
                                                                 named `origin`. Works only if
                                                                 `origin` points to the correct
                                                                 repository and you have access.
  --------------------------------------------------------------------------------------------------

## 9. Undoing a pushed commit safely

Choose the method based on whether you want to preserve shared history.
Before rewriting history, coordinate with anyone else using that branch.

  -------------------------------------------------------------------------------
  Command                                     What it does / Why you use it
  ------------------------------------------- -----------------------------------
  `git revert HEAD`                           Creates a new commit that reverses
                                              the latest commit. Recommended for
                                              shared branches because it
                                              preserves history.

  `git push origin main`                      Uploads the revert commit to
                                              GitHub.

  `git reset --hard HEAD~1`                   Moves the current branch back one
                                              commit and discards working-tree
                                              changes. It can permanently discard
                                              local work; use only when you are
                                              sure.

  `git push --force-with-lease origin main`   Rewrites the remote branch to match
                                              your reset local branch, while
                                              checking that the remote has not
                                              advanced unexpectedly. Still risky
                                              on shared branches.
  -------------------------------------------------------------------------------

**Important:** `git revert` does not erase the original commit; it adds
a new commit that undoes its changes. Reset plus a force push rewrites
branch history and can disrupt collaborators. Avoid plain `--force` when
`--force-with-lease` is suitable.

## 10. Common errors and checks

  -----------------------------------------------------------------------------------------
  Symptom                                               What to check / likely fix
  ----------------------------------------------------- -----------------------------------
  `remote: Repository not found`                        Run `git remote -v`. Check the
                                                        repository owner/name and URL,
                                                        confirm the repository exists, and
                                                        confirm your GitHub account has
                                                        access. Private repositories
                                                        require authentication and
                                                        permission.

  `fatal: ... does not appear to be a git repository`   The remote name or URL may be
                                                        wrong. Check `git remote -v` and
                                                        correct it with
                                                        `git remote set-url`.

  `src refspec main does not match any`                 You may not have a local `main`
                                                        branch or any commit yet. Check
                                                        `git branch` and `git log`; commit
                                                        first if needed, or push the
                                                        correct branch name.

  `rejected: non-fast-forward`                          The remote has commits your local
                                                        branch does not have. Fetch/pull
                                                        and integrate the remote changes,
                                                        resolve conflicts if needed, then
                                                        push. Do not force-push casually.

  `CONFLICT` during merge or stash pop                  Open the conflicted files, choose
                                                        or combine the correct changes,
                                                        save them, then stage the resolved
                                                        files. For a merge, complete with a
                                                        commit if Git asks. If `stash pop`
                                                        conflicts, Git normally keeps the
                                                        stash entry so you can inspect it
                                                        later.
  -----------------------------------------------------------------------------------------

## 11. Quick checklist before pushing

-   Run `git status` and confirm the current branch.
-   Stage only the files you intend to commit.
-   Run `git diff --staged` to review what will be committed.
-   Use a clear commit message.
-   Run `git log --oneline` if you need to check recent commits.
-   Push to the correct remote and branch, for example
    `git push origin dev`.
-   For team projects, use a Pull Request to merge feature branches into
    `master`/`main` after review.

> **Remember:** `commit` saves changes in your local Git history; `push`
> uploads commits to a remote; `pull` downloads and integrates remote
> changes; `fetch` downloads remote information without integrating it;
> `stash` temporarily shelves uncommitted changes.
