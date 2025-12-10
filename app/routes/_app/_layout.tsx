import { Outlet, Navigate } from "react-router";
import { Separator } from "@base-ui-components/react/separator";
import { MenuBar } from "components";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function Layout() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center h-screen w-full">
          <p>Loading...</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>

      <Authenticated>
        <div className="bg-background flex flex-col h-screen w-full">
          <div className="h-30 md:h-40 lg:h-50 relative w-full shrink-0">
            <img
              src="/assets/banner.png"
              alt="Banner"
              className="absolute inset-0 max-w-none object-cover object-center pointer-events-none size-full"
            />
          </div>
          <div className="flex flex-col gap-6 grow min-h-0 p-6 w-full">
            <MenuBar />
            <Separator className="w-full bg-border-unfocus h-0.5" />
            <Outlet />
          </div>
        </div>
      </Authenticated>
    </>
  );
}
