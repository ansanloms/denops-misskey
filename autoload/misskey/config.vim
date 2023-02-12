function! misskey#config#get() abort
  return denops#request("misskey", "config", [])
endfunction

function! misskey#config#open() abort
  execute "edit " . misskey#config#get()
endfunction
