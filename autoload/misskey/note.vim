function! misskey#config#create() abort
  return denops#request("misskey", "config", [])
endfunction
