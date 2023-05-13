# @guysenpai/nx-release

**Nx plugin for versioning** using [SemVer](https://semver.org/), **CHANGELOG generation** powered by [Conventional Commits](https://www.conventionalcommits.org/), **release and libraries publishing** on NPM, Github or Gitlab.

## Setup

### Install

Using Nx:

```sh
npm install -D @guysenpai/nx-release
nx g @guysenpai/nx-release:install
```

Using Angular CLI:

```sh
ng add @guysenpai/nx-release
```

This package allows you to manage your Nx workspace using of two modes: **Synced** or **Independent**.

#### Independent mode (default)

Allow multiple projects to be versioned independently. This way you release only what you want and consumers don't get updates they don't need.

#### Synced/locked mode

Allow multiple projects to be versioned in a synced/locked mode. This mode is useful if you want to automatically tie package versions together.

## Usage

### Version

#### Synced mode

Version workspace by running:

```bash
nx run workspace:version [...options]
```

#### Independent mode

Release project independently by running:

```bash
nx run my-project:version [...options]
```

You can leverage the affected command to only version changed packages:

```bash
nx affected --target version [...options]
```

#### When run, this executor does the following

1. Retrieve the current version by looking at the last `git tag`.
2. Bump `package.json` version based on the commits.
3. Generates CHANGELOG based on the commits.
4. Creates a new commit including the `package.json` file and updated CHANGELOG.
5. Creates a new tag with the new version number.
6. Pushes the version th the remote repository.
7. Runs post-targets hook to publish the version on NPM, Github, Gitlab.

Important: merge commits messages are ignored by tool when calculating next version to bump.

#### Available options

| name                   | type               | default     | description                                                                                                      |
| ---------------------- | ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `syncVersions`         | `boolean`          | `false`     | Allow to use independent or synced versioning mode. independent versioning is used by default.                   |
| `baseBranch`           | `string`           | `'main'`    | Pushes against git base branch.                                                                                  |
| `commitMessageFormat`  | `string`           | `undefined` | A string to be used to format the auto-generated release commit message.                                         |
| `changelogHeader`      | `string`           | `undefined` | Generates CHANGELOG with custom header.                                                                          |
| `changelogPreset`      | `string \| object` | `'angular'` | Customize Conventional Changelog options.                                                                        |
| `releaseType`          | `string`           | `undefined` | Manually increment the version by setting this.                                                                  |
| `allowEmptyRelease`    | `boolean`          | `false`     | Allow bumping versions even if there are no changes in the library.                                              |
| `tagCommand`           | `string`           | `undefined` | A custom command used when applying git tags.                                                                    |
| `remote`               | `string`           | `'origin'`  | Pushed against git remote repository.                                                                            |
| `amend`                | `boolean`          | `false`     | Allow to commit all changes on current commit, instead of add new one.                                           |
| `preid`                | `string`           | `undfined`  | Use the next semantic prerelease version with a specific prerelease identifier.                                  |
| `push`                 | `boolean`          | `false`     | Pushes to the git remote.                                                                                        |
| `trackDeps`            | `boolean`          | `false`     | Includes the project's dependencies in calculating a recommended version bump.                                   |
| `postTargets`          | `string[]`         | `[]`        | Specify the targets to run after a new version was successfully created.                                         |
| `tagPrefix`            | `string`           | `undefined` | Tag version prefix. Default is 'v' with the synced mode and '${projectName}@' in independent mode.               |
| `skipRootChangelog`    | `boolean`          | `false`     | Skip root CHANGELOG generation containing all monorepo changes (only with synced mode).                          |
| `skipProjectChangelog` | `boolean`          | `false`     | Skip project CHANGELOG generation (only with synced mode).                                                       |
| `skipCommit`           | `boolean`          | `false`     | Allow to skip making a commit when bumping a version and put the tag on last existent commit.                    |
| `skipCommitTypes`      | `string[]`         | `[]`        | Specify array of commit types to be ignored when calculating next version bump.                                  |
| `skipTag`              | `boolean`          | `false`     | Allow to skip puting tag on commit when bumping a version.                                                       |
| `skipPrivate`          | `boolean`          | `false`     | Allow to skip bumping versions, making commits, tagging releases, and generating CHANGELOGs for private packages |
| `noVerify`             | `boolean`          | `false`     | Bypass pre-commit or commit-msg git hooks during the commit phase.                                               |
| `dryRun`               | `boolean`          | `false`     | See what commands should be run, without committing to git or updating files.                                    |

#### Overwrite default configuration

You can customize the default configuration using the definition file (`angular.json` or `project.json`):

```json
{
  "executor": "@guysenpai/nx-release:version",
  "options": {
    "baseBranch": "master",
    "changelogPreset": "conventionalcommits",
    "tagPrefix": "${projectName}@"
  }
}
```

#### Customizing Conventional Changelog options

The preset is highly configurable, following the [conventional-changelog configuration specification](https://github.com/conventional-changelog/conventional-changelog-config-spec). As an example, suppose you'r using Gitlab, rather than Github, you might modify the following variables:

```json
{
  "executor": "@guysenpai/nx-release:version",
  "options": {
    "preset": {
      "commitUrlFormat": "{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
      "compareUrlFormat": "{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}",
      "issueUrlFormat": "{{host}}/{{owner}}/{{repository}}/issues/{{id}}"
    }
  }
}
```
