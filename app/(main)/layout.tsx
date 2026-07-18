import React from "react";
import WorkspaceHeader from "@/components/WorkspaceHeader";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <WorkspaceHeader />
      {children}
    </>
  );
}
