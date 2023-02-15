import type { Denops } from "./deps/denops_std/mod.ts";
import * as autocmd from "./deps/denops_std/autocmd/mod.ts";
import { assertNumber, assertString } from "./deps/unknownutil/mod.ts";
import {
  assertTimelineChannel,
  assertVisibility,
  bufferScheme,
  channelList,
  createNote,
  disconnectChannel,
  onNote,
} from "./misskey.ts";
import * as template from "./template.ts";
import { Marked } from "./deps/markdown/mod.ts";

export async function main(denops: Denops) {
  await autocmd.group(denops, "misskey-settings", (helper) => {
    helper.remove("*");

    for (
      const [timeline, channel] of Object.entries(
        {
          global: channelList.globalTimeline,
          home: channelList.homeTimeline,
          social: channelList.hybridTimeline,
          local: channelList.localTimeline,
        },
      )
    ) {
      helper.define(
        "BufReadCmd",
        `${bufferScheme}*/timeline/${timeline}`,
        "setlocal ft=misskey-timeline conceallevel=3 concealcursor=nivc buftype=nofile bufhidden=wipe noswapfile",
      );

      helper.define(
        "BufReadCmd",
        `${bufferScheme}*/timeline/${timeline}`,
        `call denops#notify("${denops.name}", "connectTimeline", [
          expand("<abuf>") + 0,
          substitute(bufnr(expand("<abuf>") + 0)->bufname(), "^${bufferScheme}", "", "")->split("/")[0],
          "${channel}"
        ])`,
      );

      helper.define(
        "BufDelete",
        `${bufferScheme}*/timeline/${timeline}`,
        `call denops#notify("${denops.name}", "disconnectTimeline", [
          expand("<abuf>") + 0,
          substitute(bufnr(expand("<abuf>") + 0)->bufname(), "^${bufferScheme}", "", "")->split("/")[0],
          "${channel}"
        ])`,
      );
    }

    helper.define(
      "BufReadCmd",
      `${bufferScheme}*/note/create`,
      "setlocal ft=misskey-note bufhidden=wipe noswapfile",
    );

    helper.define(
      "BufReadCmd",
      `${bufferScheme}*/note/create`,
      `call denops#notify("${denops.name}", "setNoteTemplate", [
        expand("<abuf>") + 0,
        substitute(bufnr(expand("<abuf>") + 0)->bufname(), "^${bufferScheme}", "", "")->split("/")[0],
      ])`,
    );
  });

  denops.dispatcher = {
    config: async () => {
      return configFilePath;
    },

    connectTimeline: async (
      bufnr: unknown,
      origin: unknown,
      channel: unknown,
    ) => {
      assertNumber(bufnr);
      assertString(origin);
      assertTimelineChannel(channel);

      console.log(bufnr, origin, channel);

      onNote(origin, channel, bufnr, async (note) => {
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

    disconnectTimeline: async (
      bufnr: unknown,
      origin: unknown,
      channel: unknown,
    ) => {
      assertNumber(bufnr);
      assertString(origin);
      assertTimelineChannel(channel);

      disconnectChannel(origin, channel, bufnr);
    },

    setNoteTemplate: async (
      bufnr: unknown,
      origin: unknown,
    ) => {
      assertNumber(bufnr);
      assertString(origin);

      await denops.call("appendbufline", bufnr, 0, [
        ...template.createNote({ origin }),
      ]);
    },

    createNote: async (
      bufnr: unknown,
    ) => {
      assertNumber(bufnr);

      const body = (await denops.call("getbufline", bufnr, 0, "$") as string[])
        .join("\n");
      const { meta } = Marked.parse(body);
      console.log(meta);

      const origin = meta?.origin;
      assertString(origin);

      const visibility = meta?.visibility;
      if (typeof visibility !== "undefined") {
        assertVisibility(visibility);
      }

      const sliceIndex = body.trim().split("\n").findIndex((_, i, o) =>
        i > 1 && o[i - 1]?.trimEnd() === "---"
      );

      const text = sliceIndex < 0
        ? body.trim()
        : body.trim().split("\n").slice(sliceIndex).join("\n");

      await createNote(origin, { visibility, text });
    },
  };
}
