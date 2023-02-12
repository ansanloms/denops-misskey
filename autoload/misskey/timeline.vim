function! misskey#timeline#get(origin, timeline) abort
  return "misskey://" . a:origin . "/timeline/" . a:timeline
endfunction

function! misskey#timeline#open(origin, timeline) abort
  execute "edit " . misskey#timeline#get(a:origin, a:timeline)
endfunction
