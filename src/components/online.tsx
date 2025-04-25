"use client"
import { usePresence } from "@/hooks/usePresence";
import { v4 as uuidv4 } from "uuid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";

export default function OnlineCounter() {
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") || uuidv4() : "server";
  
  // Save random userId once (falls du keine Auth hast)
  if (typeof window !== "undefined" && !localStorage.getItem("user_id")) {
    localStorage.setItem("user_id", userId);
  }

  const onlineUsers = usePresence("prokrastination-room", userId);

  return (
    
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button  size={"lg"} variant={"outline"}>{onlineUsers}</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{onlineUsers} users are online</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
    
  );
}