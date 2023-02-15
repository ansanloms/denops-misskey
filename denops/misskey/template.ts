import * as Misskey from "./deps/misskey-js/index.ts";

export const note = (n: Misskey.entities.Note, prefix?: string) => {
  const template: string[] = [];

  const sep = " │ ";
  const icon = n.user.isCat ? "🐱" : (n.user.isBot ? "🤖" : "👤");

  template.push(
    `<mk-name>${icon} ${n.user.name || ""}</mk-name> ` +
      `<mk-username>@${n.user.username}</mk-username>` +
      (n.user.host ? `<mk-host>@n.user.host</mk-host>` : ""),
  );
  template.push("");

  if (n.text) {
    template.push(
      ...`${n.text || ""}`.split("\n").map((v) => `  ${v}`),
    );
    template.push("");
  }

  if (n.renote) {
    template.push(...note(n.renote, `${prefix || ""} ${sep}`));
    template.push("");
  }

  if (template.at(-1) === "") {
    template.pop();
  }

  return template.map((v) => `${prefix || ""}${v}`);
};

export const createNote = (
  options: {
    origin: string;
    visibility?: Misskey.Endpoints["notes/create"]["req"]["visibility"];
  },
) => {
  return `---
origin: "${options.origin}"
visibility: ${
    options?.visibility || "home"
  }  # home, public, followers or specified.
---


`.split("\n");
};
