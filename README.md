# denops-misskey

[misskey](https://misskey-hub.net/) client for vim.

## Feature

- Browse Home / Local / Social / Global timeline.

## Requirement

- [vim-denops/denops.vim](https://github.com/vim-denops/denops.vim)

## Usage

Edit config file.

```vim
call misskey#config#open()
```

Write the following:

```json:config.json
{
  "misskey.io": {
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "other.misskey.example.com": {
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

Open timeline buffer:

```vim
call misskey#timeline#open("misskey.io", "home")
call misskey#timeline#open("misskey.io", "local")
call misskey#timeline#open("misskey.io", "social")
call misskey#timeline#open("misskey.io", "global")
```
