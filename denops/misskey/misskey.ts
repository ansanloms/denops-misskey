import * as Misskey from "./deps/misskey-js/index.ts";
import { isObject, isString, isUndefined } from "./deps/unknownutil/mod.ts";
import { default as xdg } from "./deps/xdg/mod.ts";
import * as path from "./deps/std/path/mod.ts";

export const bufferScheme = "misskey://";

export const configFilePath = path.join(
  xdg.config(),
  "denops-misskey",
  "config.json",
) as const;

type Config = {
  token: string;
};

export const timelineList = ["global", "home", "social", "local"] as const;
export type Timeline = typeof timelineList[number];

type Channels = {
  globalTimeline: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  homeTimeline: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  hybridTimeline: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
  localTimeline: Misskey.ChannelConnection<{
    params: null;
    events: {
      note: (payload: Misskey.entities.Note) => void;
    };
    receives: null;
  }>;
};
export type Channel = keyof Channels;

const streams: { [origin: string]: Misskey.Stream } = {};

const channels: {
  [origin: string]: Partial<Channels>;
} = {};

const assertMisskeyBufname = (bufname: string) => {
  if (bufname.slice(0, bufferScheme.length) !== bufferScheme) {
    throw new Error(`'${bufname}' is not a Misskey buffer.`);
  }
};

const assertMisskeyTimelineBufname = (bufname: string) => {
  assertMisskeyBufname(bufname);
  const [_origin, type] = bufname.slice(bufferScheme.length).split("/");

  if (type !== "timeline") {
    throw new Error(`'${bufname}' is not a Misskey timline buffer.`);
  }
};

export const assertMisskeyNoteBufname = (bufname: string) => {
  assertMisskeyBufname(bufname);
  const [_origin, type] = bufname.slice(bufferScheme.length).split("/");

  if (type !== "note") {
    throw new Error(`'${bufname}' is not a Misskey note buffer.`);
  }
};

export const assertMisskeyNoteCreateBufname = (bufname: string) => {
  assertMisskeyNoteBufname(bufname);
  const [_origin, _type, exec] = bufname.slice(bufferScheme.length).split("/");

  if (exec !== "create") {
    throw new Error(`'${bufname}' is not a Misskey create note buffer.`);
  }
};

const assertVisibility = (visibility: unknown) => {
  if (isUndefined(visibility)) {
    return;
  }

  if (!isString(visibility)) {
    throw new Error("visibility must be string or undefined.");
  }

  if (!["home", "public", "followers", "specified"].includes(visibility)) {
    throw new Error(
      "visibility must be one of 'home', 'public', 'followers', or 'specified'.",
    );
  }
};

export const isVisibility = (
  visibility: unknown,
): visibility is Misskey.Endpoints["notes/create"]["req"]["visibility"] => {
  try {
    assertVisibility(visibility);
    return true;
  } catch {
    return false;
  }
};

export const isMisskeyTimelineBufname = (bufname: string) => {
  try {
    assertMisskeyTimelineBufname(bufname);
    return true;
  } catch {
    return false;
  }
};

export const getOriginByBufname = (bufname: string) => {
  assertMisskeyBufname(bufname);

  const [origin] = bufname.slice(bufferScheme.length).split("/");

  return origin;
};

export const getTimelineByBufname = (bufname: string) => {
  assertMisskeyTimelineBufname(bufname);

  const [_origin, _type, timeline] = bufname.slice(bufferScheme.length).split(
    "/",
  );

  if (!timelineList.includes(timeline as Timeline)) {
    throw new Error(`'${timeline}' is a not exists timeline.`);
  }

  return timeline as Timeline;
};

export const getChannelByTimeline = (timeline: Timeline) => {
  if (timeline === "global") {
    return "globalTimeline";
  } else if (timeline === "home") {
    return "homeTimeline";
  } else if (timeline === "social") {
    return "hybridTimeline";
  } else if (timeline === "local") {
    return "localTimeline";
  }

  throw new Error(`'${timeline}' is a not exists timeline.`);
};

export const onNote = (
  origin: string,
  channel: ReturnType<typeof getChannelByTimeline>,
  fn: (payload: Misskey.entities.Note) => void,
) => {
  connectChannel(origin, channel);
  channels[origin][channel]?.on("note", fn);
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
  if (!streams[origin]) {
    return;
  }

  streams[origin]?.close();
  delete streams[origin];
};

const connectChannel = (origin: string, channel: Channel) => {
  connectStream(origin);

  if (!channels[origin]) {
    channels[origin] = {};
  }

  if (!channels[origin][channel]) {
    channels[origin][channel] = streams[origin]?.useChannel(channel);
  }
};

const disconnectChannel = (origin: string, channel: Channel) => {
  if (!channels[origin][channel]) {
    return;
  }

  channels[origin][channel]?.dispose();
  delete channels[origin][channel];

  if (Object.keys(channels[origin]).length <= 0) {
    disconnectStream(origin);
  }
};

export const disconnectAllChannel = (
  origin: string,
  ignoreChannels: Channel[] = [],
) => {
  (Object.keys(channels[origin]) as Channel[]).filter((channel) =>
    ignoreChannels.includes(channel)
  ).forEach((channel) => disconnectChannel(origin, channel));
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
