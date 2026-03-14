"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Topbar } from "./ui.jsxx";
import { clearStoredSession, getStoredSession } from "../lib/auth.js";

export function ClientShell({ children }) {
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    router.push("/");
  }

  return (
    <div>
      <Topbar session={session} onLogout={handleLogout} />
      {children}
    </div>
  );
}
