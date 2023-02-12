if exists("b:current_syntax")
  finish
endif

syntax match MisskeyTimelineTagBegin /<mk-[a-z]\+>/ contained conceal
syntax match MisskeyTimelineTagEnd /<\/mk-[a-z]\+>/ contained conceal

highlight! link MisskeyTimelineTagBegin Conceal
highlight! link MisskeyTimelineTagEnd Conceal

syntax region MisskeyTimelineName start="<mk-name>" end="</mk-name>" contains=MisskeyTimelineTagBegin,MisskeyTimelineTagEnd keepend
syntax region MisskeyTimelineUserName start="<mk-username>" end="</mk-username>" contains=MisskeyTimelineTagBegin,MisskeyTimelineTagEnd keepend
syntax region MisskeyTimelineHost start="<mk-host>" end="</mk-host>" contains=MisskeyTimelineTagBegin,MisskeyTimelineTagEnd keepend
syntax match MisskeyTimelineSep "│" contains=MisskeyTimelineTagBegin,MisskeyTimelineTagEnd keepend
syntax match MisskeyTimelineHashtag /\zs#[^ ]\+/

highlight! link MisskeyTimelineName MoreMsg
highlight! link MisskeyTimelineUserName Constant
highlight! link MisskeyTimelineHost LineNr
highlight! link MisskeyTimelineSeparator NonText
highlight! link MisskeyTimelineHashtag Underlined

let b:current_syntax = "misskey-timeline"
