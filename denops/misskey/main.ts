import type { Denops } from "./deps/denops_std/mod.ts";
import * as autocmd from "./deps/denops_std/autocmd/mod.ts";
import * as helper from "./deps/denops_std/helper/mod.ts";
import {
  bufferScheme,
  configFilePath,
  disconnectAllChannel,
  getChannelByTimeline,
  getOriginByBufname,
  getTimelineByBufname,
  isMisskeyTimelineBufname,
  onNote,
  timelineList,
} from "./misskey.ts";
import type { Channel, Timeline } from "./misskey.ts";
import * as template from "./template.ts";

export async function main(denops: Denops): Promise<void> {
  await autocmd.group(denops, "misskey-settings", (helper) => {
    helper.remove("*");

    for (const channelType of timelineList) {
      helper.define(
        "BufReadCmd",
        `${bufferScheme}*/timeline/${channelType}`,
        "setlocal ft=misskey-timeline buftype=acwrite conceallevel=3",
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
  });

  denops.dispatcher = {
    config: async () => {
      await helper.echo(denops, "loading...");
      return configFilePath;
    },

    connectTimeline: async () => {
      await helper.echo(denops, "loading...");

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
      await helper.echo(denops, "loading...");

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
  };
}
