"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

async function fetchWithAuth(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  return res.json();
}

async function fetchWithToken(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  return res.json();
}

export function useArenas(filters?: { status?: string; preset?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.preset) params.set("preset", filters.preset);
  if (filters?.page) params.set("page", String(filters.page));

  return useQuery({
    queryKey: ["arenas", filters],
    queryFn: () => fetchWithAuth(`/api/arenas?${params.toString()}`),
    refetchInterval: 10000,
  });
}

export function useArena(arenaId: string) {
  return useQuery({
    queryKey: ["arena", arenaId],
    queryFn: () => fetchWithAuth(`/api/arenas/${arenaId}`),
    enabled: !!arenaId,
    refetchInterval: 5000,
  });
}

export function useCreateArena() {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      preset: string;
      starts_at: string;
      min_participants?: number;
      max_participants?: number;
      is_invite_only?: boolean;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken("/api/arenas", token, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arenas"] });
    },
  });
}

export function useJoinArena(arenaId: string) {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(`/api/arenas/${arenaId}/join`, token, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arena", arenaId] });
      queryClient.invalidateQueries({ queryKey: ["arenas"] });
    },
  });
}

export function useLeaveArena(arenaId: string) {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(`/api/arenas/${arenaId}/leave`, token, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arena", arenaId] });
      queryClient.invalidateQueries({ queryKey: ["arenas"] });
    },
  });
}

export function useCurrentUser() {
  const { getAccessToken, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken("/api/users/me", token);
    },
    enabled: authenticated,
  });
}

export function useUpdateUsername() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken("/api/users/me", token, {
        method: "PATCH",
        body: JSON.stringify({ username }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}
