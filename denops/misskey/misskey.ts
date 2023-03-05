import * as Misskey from "./deps/misskey-js/index.ts";
import { isObject, isString, isUndefined } from "./deps/unknownutil/mod.ts";
import { default as xdg } from "./deps/xdg/mod.ts";
import { assertString } from "./deps/unknownutil/mod.ts";
import * as path from "./deps/std/path/mod.ts";

export const bufferScheme = "misskey://";

export const configFilePath = path.join(
  xdg.config(),
  "denops-misskey",
  "config.json",
);

type Config = {
  token: string;
};

export const channelList = {
  globalTimeline: "globalTimeline",
  homeTimeline: "homeTimeline",
  hybridTimeline: "hybridTimeline",
  localTimeline: "localTimeline",
} as const;

type Channels = {
  [channelList.globalTimeline]: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  [channelList.homeTimeline]: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  [channelList.hybridTimeline]: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  [channelList.localTimeline]: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
};

type Channel = typeof channelList[keyof typeof channelList];
type TimelineChannel =
  | typeof channelList.globalTimeline
  | typeof channelList.homeTimeline
  | typeof channelList.hybridTimeline
  | typeof channelList.localTimeline;

const streams: { [origin: string]: Misskey.Stream } = {};

const channels: {
  [origin: string]: {
    [key in Channel]?: {
      channel: Channels[key];
      useBuffers: Set<number>;
    };
  };
} = {};

export function assertChannel(x: unknown): asserts x is Channel {
  assertString(x);

  if (!Object.values<string>(channelList).includes(x)) {
    throw new Error(`"${x}" is not expected "Channel".`);
  }
}

export function assertTimelineChannel(
  x: unknown,
): asserts x is TimelineChannel {
  assertChannel(x);

  if (
    ![
      channelList.globalTimeline,
      channelList.homeTimeline,
      channelList.hybridTimeline,
      channelList.localTimeline,
    ].includes(x)
  ) {
    throw new Error(`"${x}" is not expected "TimelineChannel".`);
  }
}

export function assertVisibility(
  x: unknown,
): asserts x is Misskey.Endpoints["notes/create"]["req"]["visibility"] {
  assertString(x);

  if (!["home", "public", "followers", "specified"].includes(x)) {
    throw new Error(
      "visibility must be one of 'home', 'public', 'followers', or 'specified'.",
    );
  }
}

export const isVisibility = (
  x: unknown,
): x is Misskey.Endpoints["notes/create"]["req"]["visibility"] => {
  try {
    assertVisibility(x);
    return true;
  } catch {
    return false;
  }
};

export const onNote = (
  origin: string,
  channel: Channel,
  bufnr: number,
  fn: (note: Misskey.entities.Note) => void,
) => {
  connectChannel(origin, channel, bufnr);
  channels[origin][channel]?.channel.on("note", fn);
};

const getConfig = () => {
  const raw = Deno.readTextFileSync(configFilePath);
  const config = JSON.parse(raw);

  if (!isObject<Config>(config)) {
    throw new Error("Invalid config definition.");
  }

  return config;
};

const connectStream = (origin: string) => {
  if (!streams[origin]) {
    const token = getConfig()[origin]?.token || "";
    streams[origin] = new Misskey.Stream(`https://${origin}`, { token });
  }

  return streams[origin];
};

const disconnectStream = (origin: string) => {
  if (typeof streams[origin] === "undefined") {
    return;
  }

  streams[origin].close();
  delete streams[origin];
};

const connectChannel = (origin: string, channel: Channel, bufnr: number) => {
  connectStream(origin);

  if (typeof channels[origin] === "undefined") {
    channels[origin] = {};
  }

  if (channels[origin][channel]) {
    channels[origin][channel]?.useBuffers.add(bufnr);
  } else {
    channels[origin][channel] = {
      channel: streams[origin]?.useChannel(channel),
      useBuffers: new Set([bufnr]),
    };
  }
};

export const disconnectChannel = (
  origin: string,
  channel: Channel,
  bufnr: number,
) => {
  if (typeof channels[origin][channel] === "undefined") {
    return;
  }

  if (channels[origin][channel]?.useBuffers.has(bufnr)) {
    channels[origin][channel]?.useBuffers.delete(bufnr);
  }

  if ((channels[origin][channel]?.useBuffers.size || 0) <= 0) {
    channels[origin][channel]?.channel.dispose();
    delete channels[origin][channel];

    if (Object.keys(channels[origin]).length <= 0) {
      disconnectStream(origin);
    }
  }
};

const getApiClient = (origin: string) => {
  const credential = getConfig()[origin]?.token || "";

  return new Misskey.api.APIClient({
    origin: `https://${origin}`,
    credential,
  });
};

export const createNote = async (
  origin: string,
  req: Misskey.Endpoints["notes/create"]["req"],
) => {
  return await getApiClient(origin).request<
    "notes/create",
    Misskey.Endpoints["notes/create"]["req"]
  >("notes/create", req);
};
