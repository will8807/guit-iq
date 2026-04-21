import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "./settingsStore";

// Reset store state between tests
beforeEach(() => {
  useSettingsStore.setState({ showRoot: false });
});

describe("settingsStore", () => {
  it("starts with showRoot: false", () => {
    expect(useSettingsStore.getState().showRoot).toBe(false);
  });

  it("setShowRoot(true) sets showRoot to true", () => {
    useSettingsStore.getState().setShowRoot(true);
    expect(useSettingsStore.getState().showRoot).toBe(true);
  });

  it("setShowRoot(false) sets showRoot back to false", () => {
    useSettingsStore.setState({ showRoot: true });
    useSettingsStore.getState().setShowRoot(false);
    expect(useSettingsStore.getState().showRoot).toBe(false);
  });

  it("setShowRoot called multiple times retains last value", () => {
    useSettingsStore.getState().setShowRoot(true);
    useSettingsStore.getState().setShowRoot(true);
    useSettingsStore.getState().setShowRoot(false);
    expect(useSettingsStore.getState().showRoot).toBe(false);
  });
});
