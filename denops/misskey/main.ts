import type { Denops } from "./deps/denops_std/mod.ts";
import * as autocmd from "./deps/denops_std/autocmd/mod.ts";
import * as helper from "./deps/denops_std/helper/mod.ts";
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
  const bufload = async (bufnr: number) => {
    if (await denops.call("bufexists", bufnr)) {
      await denops.call("bufload", bufnr);
    } else {
      throw new Error(`Buffer: ${bufnr} does not exists.`);
    }
  };

  await autocmd.group(denops, "misskey-settings", (helper) => {
    helper.remove("*");

    helper.define(
      "BufReadCmd",
      `${bufferScheme}*`,
      "setlocal bufhidden=wipe noswapfile",
    );

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
        "setlocal ft=misskey-timeline conceallevel=3 concealcursor=nivc buftype=nofile",
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
        "BufWipeout",
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
      "setlocal ft=misskey-note buftype=acwrite",
    );

    helper.define(
      "BufReadCmd",
      `${bufferScheme}*/note/create`,
      `call denops#notify("${denops.name}", "setNoteTemplate", [
        expand("<abuf>") + 0,
        substitute(bufnr(expand("<abuf>") + 0)->bufname(), "^${bufferScheme}", "", "")->split("/")[0],
      ])`,
    );

    helper.define(
      "BufWriteCmd",
      `${bufferScheme}*/note/create`,
      `call denops#request("${denops.name}", "createNote", [
        expand("<abuf>") + 0,
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

      await bufload(bufnr);
      await helper.echo(denops, `${origin}: loading...`);

      onNote(origin, channel, bufnr, async (note) => {
        const line = Number(await denops.call("line", "."));

        if (bufnr === (await denops.call("bufnr", "%"))) {
          await helper.echo(denops, `${origin}: loading...`);
        }

        await denops.call("appendbufline", bufnr, 0, [
          "",
          ...template.note(note),
          "",
        ]);
        await helper.echo(denops, "");

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

      await bufload(bufnr);

      disconnectChannel(origin, channel, bufnr);
    },

    setNoteTemplate: async (
      bufnr: unknown,
      origin: unknown,
    ) => {
      assertNumber(bufnr);
      assertString(origin);

      await bufload(bufnr);

      await denops.call("deletebufline", bufnr, 1, "$");
      await denops.call(
        "appendbufline",
        bufnr,
        0,
        template.createNote({ origin }),
      );
    },

    createNote: async (
      bufnr: unknown,
    ) => {
      assertNumber(bufnr);
      await bufload(bufnr);

      const body = (await denops.call("getbufline", bufnr, 0, "$") as string[])
        .join("\n");
      const { meta } = Marked.parse(body);

      const origin = meta?.origin;
      assertString(origin);

      const visibility = meta?.visibility;
      if (typeof visibility !== "undefined") {
        assertVisibility(visibility);
      }

      const sliceIndex =
        body.trim().split("\n").findIndex((v, i) =>
          i > 1 && v.trimEnd() === "---"
        ) + 1;
      const text = sliceIndex < 0
        ? body.trim()
        : body.trim().split("\n").slice(sliceIndex).join("\n");

      await createNote(origin, { visibility, text });
      await denops.dispatcher.setNoteTemplate(bufnr, origin);
      await helper.echo(denops, `${origin}: Note has been created!`);
    },
  };
}
