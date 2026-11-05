"use client";

import { Suspense, useEffect, useState } from "react";
import { getSession, Session } from "./lib/api";
import { AccessGate } from "./_components/AccessGate";
import { ProgramationEditor } from "./_components/ProgramationEditor";

// Programme creation is an athlete feature: guests are asked to log in, coaches are turned away
function ProgramationGate() {
  // undefined = still checking
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    getSession().then(setSession);
  }, []);

  if (session === undefined) return <AccessGate kind="loading" />;
  if (!session) return <AccessGate kind="guest" />;
  if (session.role !== "athlete") return <AccessGate kind="coach" />;
  return <ProgramationEditor session={session} />;
}

export default function ProgramationPage() {
  // useSearchParams (programme id in the URL) needs a Suspense boundary
  return (
    <Suspense fallback={<AccessGate kind="loading" />}>
      <ProgramationGate />
    </Suspense>
  );
}
