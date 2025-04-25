// hooks/usePresence.ts
"use client"

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function usePresence(roomId = "default-room", userId = "anon") {
  const supabase = createClient();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel(roomId, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const usersOnline = Object.keys(state).length;
        setOnlineCount(usersOnline);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  return onlineCount;
}