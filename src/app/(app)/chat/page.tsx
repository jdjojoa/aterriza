import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Chat · Aterriza" };

export default function ChatPage() {
  return <ComingSoon href="/chat" />;
}
