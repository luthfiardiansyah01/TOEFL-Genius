"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

interface MeUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | string;
}

async function fetchMe(): Promise<MeUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

/**
 * Auth state hook. Combines next-auth session + a /api/auth/me check so the
 * UI gates correctly even on first load / after register.
 */
export function useAuth() {
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();

  const meQuery = useQuery<MeUser | null>({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: sessionStatus !== "loading",
    staleTime: 60_000,
  });

  const user = meQuery.data ?? null;
  const loading =
    sessionStatus === "loading" ||
    (sessionStatus !== "loading" && meQuery.isLoading);
  const isAdmin = user?.role === "ADMIN";

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    queryClient.setQueryData(["me"], null);
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return { user, loading, authenticated: !!user, isAdmin, logout };
}
