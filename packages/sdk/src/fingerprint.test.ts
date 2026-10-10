import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateFingerprint } from "./fingerprint";

describe("SDK Fingerprint Generator", () => {
  test("generates deterministic 16-char hex hash without stack", () => {
    const fp1 = generateFingerprint("TypeError", "Cannot read properties of undefined");
    const fp2 = generateFingerprint("TypeError", "Cannot read properties of undefined");
    
    assert.strictEqual(fp1.length, 16);
    assert.strictEqual(fp1, fp2);
  });

  test("generates different fingerprints for different error names or messages", () => {
    const fp1 = generateFingerprint("TypeError", "Cannot read undefined");
    const fp2 = generateFingerprint("RangeError", "Maximum call stack exceeded");

    assert.notStrictEqual(fp1, fp2);
  });

  test("strips line and column numbers to cluster identical stack frames", () => {
    const stack1 = `TypeError: Cannot read properties of undefined
    at authenticate (src/middleware/auth.ts:42:18)
    at handleRequest (node_modules/express/router.js:95:5)
    at next (node_modules/express/route.js:144:13)`;

    const stack2 = `TypeError: Cannot read properties of undefined
    at authenticate (src/middleware/auth.ts:108:34)
    at handleRequest (node_modules/express/router.js:95:5)
    at next (node_modules/express/route.js:144:13)`;

    const fp1 = generateFingerprint("TypeError", "Cannot read properties of undefined", stack1);
    const fp2 = generateFingerprint("TypeError", "Cannot read properties of undefined", stack2);

    assert.strictEqual(fp1, fp2);
  });
});
