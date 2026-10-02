import { createRequire } from "node:module";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = createRequire(import.meta.url);
const expo = createRequire(root.resolve("expo/package.json"));
const cli = createRequire(expo.resolve("@expo/cli/package.json"));
const forge = cli("node-forge") as {
  jsbn: { BigInteger: new (value: string, radix?: number) => unknown };
  md: { sha256: { create: () => { update: (text: string) => void; digest: () => { getBytes: () => string } } } };
  pki: {
    setRsaPublicKey: (modulus: unknown, exponent: unknown) => { verify: (digest: string, signature: string, scheme?: unknown, options?: unknown) => boolean };
    publicKeyFromPem: (pem: string) => { verify: (digest: string, signature: string) => boolean };
  };
};

describe("Expo signing-tool DigestInfo security", () => {
  it("rejects the upstream nested DigestAlgorithm regression vector", () => {
    const fixture = JSON.parse(readFileSync(new URL("./fixtures/forge-nested-digest.json", import.meta.url), "utf8"));
    const key = forge.pki.setRsaPublicKey(new forge.jsbn.BigInteger(fixture.publicModulus, 16), new forge.jsbn.BigInteger(fixture.publicExponent));
    const digest = forge.md.sha256.create();digest.update("hello world!");
    expect(() => key.verify(digest.digest().getBytes(), Buffer.from(fixture.malformedSignature, "hex").toString("binary"), undefined, { _skipPaddingChecks: true, _parseAllDigestBytes: true })).toThrow("DigestInfo value");
  });

  it("accepts a valid platform-generated SHA256/RSA signature and rejects tampering", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const signature = sign("sha256", Buffer.from("Nexus build validation"), privateKey).toString("binary");
    const digest = forge.md.sha256.create();digest.update("Nexus build validation");
    expect(forge.pki.publicKeyFromPem(pem).verify(digest.digest().getBytes(), signature)).toBe(true);
    const changed = forge.md.sha256.create();changed.update("Changed payload");
    expect(forge.pki.publicKeyFromPem(pem).verify(changed.digest().getBytes(), signature)).toBe(false);
  });
});
