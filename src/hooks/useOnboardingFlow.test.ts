import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderHook, act } from "@/test-utils/render-hook";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { loadOnboardingState } from "@/lib/onboarding-state";
import { useOnboardingFlow } from "./useOnboardingFlow";

// #953 — a per-step "Skip for Now" / "Decide Later" must advance the flow
// instead of completing it. Only the bottom "Skip All" completes from any step.

const STORAGE_KEY = STORAGE_KEYS.ONBOARDING_STATE;

function readPersisted(): { lastStep?: number; completed?: boolean } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { lastStep?: number; completed?: boolean }) : null;
}

describe("useOnboardingFlow handleStepSkip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("advances currentStep and leaves isCompleted false on the first step", () => {
    const { result } = renderHook(() => useOnboardingFlow({ totalSteps: 3 }));

    act(() => {
      result.current.handleStepSkip();
    });

    assert.equal(result.current.currentStep, 1);
    assert.equal(result.current.isCompleted, false);
  });

  it("persists the advanced step as not completed", () => {
    const { result } = renderHook(() => useOnboardingFlow({ totalSteps: 3 }));

    act(() => {
      result.current.handleStepSkip();
    });

    const persisted = readPersisted();
    assert.equal(persisted?.lastStep, 1);
    assert.equal(persisted?.completed, false);
  });

  it("advances repeatedly without completing until the final step", () => {
    let completes = 0;
    let skips = 0;
    const { result } = renderHook(() =>
      useOnboardingFlow({
        totalSteps: 3,
        onComplete: () => {
          completes += 1;
        },
        onSkip: () => {
          skips += 1;
        },
      }),
    );

    act(() => {
      result.current.handleStepSkip();
    });
    act(() => {
      result.current.handleStepSkip();
    });

    assert.equal(result.current.currentStep, 2);
    assert.equal(result.current.isCompleted, false);
    assert.equal(completes, 0);
    assert.equal(skips, 0);
  });

  it("completes the flow only when the final step is skipped", () => {
    let completes = 0;
    const { result } = renderHook(() =>
      useOnboardingFlow({
        totalSteps: 3,
        initialStep: 2,
        onComplete: () => {
          completes += 1;
        },
      }),
    );

    act(() => {
      result.current.handleStepSkip();
    });

    assert.equal(result.current.isCompleted, true);
    assert.equal(completes, 1);
    assert.equal(readPersisted()?.completed, true);
  });

  it("keeps Skip All completing unconditionally from the first step", () => {
    let skips = 0;
    const { result } = renderHook(() =>
      useOnboardingFlow({
        totalSteps: 3,
        onSkip: () => {
          skips += 1;
        },
      }),
    );

    act(() => {
      result.current.handleSkip();
    });

    assert.equal(result.current.isCompleted, true);
    assert.equal(skips, 1);
    assert.equal(readPersisted()?.completed, true);
  });
});

describe("useOnboardingFlow / onboarding-state consolidation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // #1054 — values written by the flow hook must round-trip through the shared adapter.
  it("reads back via loadOnboardingState the same shape saved by useOnboardingFlow", () => {
    const { result } = renderHook(() => useOnboardingFlow({ totalSteps: 3 }));

    act(() => {
      result.current.handleNext();
    });

    const loaded = loadOnboardingState();
    const raw = readPersisted() as {
      lastStep?: number;
      completed?: boolean;
      timestamp?: number;
    } | null;

    assert.ok(loaded);
    assert.ok(raw);
    assert.deepEqual(loaded, raw);
    assert.equal(loaded.completed, false);
    assert.equal(loaded.lastStep, 1);
    assert.equal(typeof loaded.timestamp, "number");
  });

  it("handleStepSkip shares handleNext's persistence path", () => {
    const { result } = renderHook(() => useOnboardingFlow({ totalSteps: 3 }));

    act(() => {
      result.current.handleStepSkip();
    });

    const loaded = loadOnboardingState();
    assert.equal(loaded?.lastStep, 1);
    assert.equal(loaded?.completed, false);
    assert.equal(result.current.currentStep, 1);
  });
});
