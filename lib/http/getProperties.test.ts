import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getProperties } from "./getProperties";
import { ExtractionError } from "../errors";

const html = readFileSync(new URL("./__fixtures__/properties.html", import.meta.url), "utf8");

describe("getProperties", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the owner's properties from the selector (id + name)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(html, { status: 200 })));
    const properties = await getProperties({ session: { cookies: {} } });
    expect(properties).toEqual([
      { id: "100001", name: "Test Cottage" },
      { id: "100002", name: "Seaside Retreat" },
    ]);
  });

  it("throws ExtractionError when the selector is gone (markup changed)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><body>changed</body></html>", { status: 200 })));
    await expect(getProperties({ session: { cookies: {} } })).rejects.toThrow(ExtractionError);
  });
});
