/**
 * Module-level store for passing a pending payment booking ID
 * from the checkout modal to the bookings tab screen.
 *
 * Background: router.replace({ pathname: '/(tabs)/bookings', params: { payId } })
 * from a Stack modal does not reliably deliver params to useLocalSearchParams
 * in Expo Router SDK 54 when the target is a nested tab route. This module
 * bypasses the params system entirely with a synchronous in-memory hand-off.
 */
let _pendingPayId: string | null = null;

export function setPendingPayId(id: string | null): void {
  _pendingPayId = id;
}

/** Returns the pending ID and clears it (consume-once semantics). */
export function consumePendingPayId(): string | null {
  const id = _pendingPayId;
  _pendingPayId = null;
  return id;
}
