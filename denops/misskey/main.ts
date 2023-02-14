import type { Denops } from "./deps/denops_std/mod.ts";
import * as autocmd from "./deps/denops_std/autocmd/mod.ts";
import {
  assertMisskeyNoteCreateBufname,
  bufferScheme,
  configFilePath,
  createNote,
  disconnectAllChannel,
  getChannelByTimeline,
  getOriginByBufname,
  getTimelineByBufname,
  isMisskeyTimelineBufname,
  isVisibility,
  onNote,
  timelineList,
} from "./misskey.ts";
import type { Channel, Timeline } from "./misskey.ts";
import * as template from "./template.ts";
import { Marked } from "./deps/markdown/mod.ts";

export async function main(denops: Denops): Promise<void> {
  await autocmd.group(denops, "misskey-settings", (helper) => {
    helper.remove("*");

    // timeline:
    for (const channelType of timelineList) {
      helper.define(
        "BufReadCmd",
        `${bufferScheme}*/timeline/${channelType}`,
        "setlocal ft=misskey-timeline conceallevel=3 concealcursor=nivc buftype=nofile bufhidden=wipe noswapfile",
      );

      helper.define(
        "BufCreate",
        `${bufferScheme}*/timeline/${channelType}`,
        `call denops#notify("${denops.name}", "connectTimeline", [])`,
      );

      helper.define(
        "BufDelete",
        `${bufferScheme}*/timeline/${channelType}`,
        `call denops#notify("${denops.name}", "disconnectTimeline", [])`,
      );
    }

    // create note:
    helper.define(
      "BufReadCmd",
      `${bufferScheme}*/note/create`,
      "setlocal ft=misskey-note bufhidden=wipe noswapfile",
    );

    helper.define(
      "BufCreate",
      `${bufferScheme}*/note/create`,
      `call denops#notify("${denops.name}", "setCreateNoteTemplate", [])`,
    );
  });

  denops.dispatcher = {
    config: async () => {
      return configFilePath;
    },

    connectTimeline: async () => {
      const bufname = await denops.call("bufname", "%") as string;
      const bufnr = await denops.call("bufnr", "%") as number;
      const origin = getOriginByBufname(bufname);
      const timeline = getTimelineByBufname(bufname);
      const channel = getChannelByTimeline(timeline);

      onNote(origin, channel, async (note) => {
        const line = Number(await denops.call("line", "."));

        await denops.call("appendbufline", bufnr, 0, [
          "",
          ...template.note(note),
          "",
        ]);

        if (bufnr === (await denops.call("bufnr", "%"))) {
          if (line === 1) {
            // 元の位置が先頭だった時のみ先頭追従させる。
            await denops.cmd("1");
          }
          await denops.cmd("redraw");
        }
      });
    },

    disconnectTimeline: async () => {
      const bufferNumberList = (await denops.eval(
        "map(filter(copy(getbufinfo()), 'v:val.listed'), 'v:val.bufnr')",
      )) as number[];

      const activeChannels: {
        [origin: string]: Set<Channel>;
      } = {};

      for (const bufferNumber of bufferNumberList) {
        const bufname = await denops.call("bufname", bufferNumber) as string;

        if (isMisskeyTimelineBufname(bufname)) {
          const origin = getOriginByBufname(bufname);
          const timeline = getTimelineByBufname(bufname);
          const channel = getChannelByTimeline(timeline);

          if (!activeChannels[origin]) {
            activeChannels[origin] = new Set();
          }

          activeChannels[origin].add(channel);
        }
      }

      for (const origin in activeChannels) {
        disconnectAllChannel(origin, [...activeChannels[origin]]);
      }
    },

    setCreateNoteTemplate: async () => {
      const bufname = await denops.call("bufname", "%") as string;
      const bufnr = await denops.call("bufnr", "%") as number;
      assertMisskeyNoteCreateBufname(bufname);

      await denops.call("appendbufline", bufnr, 0, [
        ...template.createNote(),
      ]);
    },

    createNote: async () => {
      const bufname = await denops.call("bufname", "%") as string;
      const bufnr = await denops.call("bufnr", "%") as number;
      assertMisskeyNoteCreateBufname(bufname);

      const origin = getOriginByBufname(bufname);

      const body = (await denops.call("getbufline", bufnr, 0, "$") as string[])
        .join("\n");
      const { meta } = Marked.parse(body);

      const visibility = isVisibility(meta?.visibility)
        ? meta.visibility
        : undefined;
      const text = body.replace(/^\-\-\-\n.*\n\-\-\-/g, "").trim();

      await createNote(origin, { visibility, text });
    },
  };
}
