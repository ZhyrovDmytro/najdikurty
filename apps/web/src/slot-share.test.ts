import { describe, expect, it } from "vitest";
import { buildImageShareData } from "./slot-share";

describe("buildImageShareData", () => {
  it("shares only the generated image without text or title", () => {
    const file = { name: "hledejkurty-availability.png" } as File;

    expect(buildImageShareData(file)).toEqual({ files: [file] });
  });
});
