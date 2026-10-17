import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import { FormErrorSummary } from "./FormErrors";

describe("FormErrorSummary", () => {
  it("renders null when errors array is empty", () => {
    const result = FormErrorSummary({ title: "Validation Error", errors: [] });
    assert.equal(result, null);
  });

  it("renders error list and title when errors exist", () => {
    const result = FormErrorSummary({ title: "Form Errors", errors: ["Email required", "Password too short"] });
    assert.ok(result);
    assert.equal(result.type, "div");
    assert.equal(result.props.role, "alert");
    assert.equal(result.props["aria-live"], "assertive");
  });
});
