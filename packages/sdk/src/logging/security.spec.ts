import { it, expect } from "vitest";
import { Logger } from "./logger.js";

it.each(["text", "json"] as const)(
  "redacts nested credentials from %s logs without modifying the input",
  (format) => {
    const output: string[] = [];
    const logger = new Logger({ format, writer: (line) => output.push(line) });
    const data = {
      password: "secret-password",
      nested: {
        access_token: "secret-access",
        refreshToken: "secret-refresh",
        headers: { Authorization: "Bearer secret-bearer", Cookie: "secret-cookie" },
      },
      items: [{ p12Pin: "secret-pin", privateKey: "secret-key" }],
      clave: "public-clave",
    };
    logger.child("auth").info("test", data);
    const text = output.join("");
    expect(text).not.toContain("secret-");
    expect(text).toContain("public-clave");
    expect(data.password).toBe("secret-password");
  },
);
it("does not crash on cyclic or excessively deep diagnostic data", () => {
  const data: Record<string, unknown> = {};
  data.self = data;
  let output = "";
  new Logger({
    writer: (line) => {
      output = line;
    },
  }).info("test", data);
  expect(output).toContain("Circular");
});
