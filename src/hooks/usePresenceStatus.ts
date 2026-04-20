import { useEffect, useState } from "react";
import { subscribeToPresence, UserPresence } from "@/services/presenceService";

/**
 * Subscribe to the real-time presence of a user identified by `id`.
 * Pass `null` while the id is not yet known — the hook will return offline.
 */
export default function usePresenceStatus(id: string | null): UserPresence {
  const [status, setStatus] = useState<UserPresence>({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!id) return;
    return subscribeToPresence(id, setStatus);
  }, [id]);

  return status;
}
