function! misskey#note#create#submit() abort
  let l:bufnr = expand("<abuf>") + 0
  return denops#request("misskey", "createNote", [l:bufnr])
endfunction

function! misskey#note#create#get(origin) abort
  return "misskey://" . a:origin . "/note/create"
endfunction

function! misskey#note#create#open(origin) abort
  execute "edit " . misskey#note#create#get(a:origin)
endfunction
