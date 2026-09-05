import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `cancelProSubscription` — the website's Cancel Plan flow.
 *
 * Mirrors the desktop app: calls the same `cancel-subscription` edge function,
 * requires a session, and never claims success unless the function actually
 * returned `{ success: true }`.
 */
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSession: mocks.getSession,
  supabaseUrl: "https://test.supabase.co",
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

const { cancelProSubscription } = await import("@/lib/checkout");

const SESSION = { access_token: "token-abc", user: { id: "user-1", email: "paid@juskoe.in" } };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(SESSION);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

const cancelCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("cancel-subscription"));

describe("cancelProSubscription", () => {
  it("calls cancel-subscription with the user's bearer token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });

    const ok = await cancelProSubscription();

    expect(ok).toBe(true);
    expect(cancelCalls()).toHaveLength(1);
    const [, options] = cancelCalls()[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer token-abc",
    });
  });

  it("refuses to run without a session and never calls the endpoint", async () => {
    mocks.getSession.mockResolvedValue(null);

    const ok = await cancelProSubscription();

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves false when the edge function reports failure", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: "Razorpay error" }),
    });

    const ok = await cancelProSubscription();

    expect(ok).toBe(false);
  });

  it("resolves false on a non-2xx response without throwing", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false }),
    });

    await expect(cancelProSubscription()).resolves.toBe(false);
  });

  it("resolves false on a network error without throwing", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(cancelProSubscription()).resolves.toBe(false);
  });

  it("surfaces a session-expired message on 401", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    await cancelProSubscription();

    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Cancellation failed",
      expect.objectContaining({ description: expect.stringContaining("sign in again") })
    );
  });
});
