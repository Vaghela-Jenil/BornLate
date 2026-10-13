"use client";

import { useClerk } from "@clerk/nextjs";

export default function Home() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/sign-in";
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-95"
    >
      Sign Out
    </button>
  );
}