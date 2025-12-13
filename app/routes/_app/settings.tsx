import type { Route } from "./+types/settings";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { Cog6ToothIcon } from "@heroicons/react/16/solid";
import { Button } from "@base-ui-components/react/button";
import { SectionCard, TokenProgress } from "components";
import { useNavigate } from "react-router";
import * as React from "react";
import { Effect } from "effect";
import { AuthService } from "services/auth";
import { appRuntime } from "services/runtime";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { downloadOpml, parseOpml, readOpmlFile } from "services/opml";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - RSS Reader" },
    {
      name: "description",
      content: "Configure your RSS Reader settings",
    },
  ];
}

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const viewer = useQuery(api.auth.currentUser);
  const feeds = useQuery(
    api.rss_feed.get_feeds_for_export,
    viewer?._id ? { user_id: viewer._id } : "skip"
  );
  const importFeeds = useMutation(api.rss_feed.import_feeds);

  const handleExport = () => {
    if (!feeds || feeds.length === 0) {
      alert("No feeds to export");
      return;
    }
    downloadOpml(feeds, "rss-feeds.opml");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewer?._id) return;

    try {
      const opmlText = await readOpmlFile(file);
      const { feeds: parsedFeeds, errors } = parseOpml(opmlText);

      if (errors.length > 0) {
        alert(`Error parsing OPML: ${errors.join(", ")}`);
        return;
      }

      if (parsedFeeds.length === 0) {
        alert("No feeds found in OPML file");
        return;
      }

      const result = await importFeeds({
        user_id: viewer._id,
        feeds: parsedFeeds,
      });

      alert(`Imported ${result.imported} feeds, skipped ${result.skipped} duplicates`);
    } catch (err) {
      alert(`Failed to import: ${err}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    if (!appRuntime) {
      console.error("App not initialized");
      return;
    }

    const program = Effect.gen(function* () {
      const authService = yield* AuthService;
      yield* authService.logout;
      navigate("/login");
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error("Logout failed:", error);
          // Navigate anyway even if logout fails
          navigate("/login");
        }),
      ),
    );

    appRuntime.runPromise(program);
  };

  return (
    <div className="flex flex-col gap-6 md:grow md:min-h-0 w-full max-w-4xl mx-auto">
      <SectionCard
        icon={<Cog6ToothIcon className="size-7" />}
        title="Settings"
        description="Configure your RSS Reader preferences"
        className="md:min-h-0"
      >
        <ScrollArea.Root className="flex grow min-h-0 w-full">
          <ScrollArea.Viewport className="flex grow min-h-0">
            <div className="flex flex-col gap-8 p-4">
              {/* Token Usage Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-lg leading-7 text-text">
                    Token Usage
                  </h3>
                  <p className="font-normal text-sm leading-6 text-text-alt">
                    Track your AI chat token usage
                  </p>
                </div>

                <div className="flex flex-col gap-6 pl-4">
                  <TokenProgress
                    label="Chat Tokens"
                    current={2500}
                    max={10000}
                    period="this month"
                  />

                  <div className="flex items-center gap-4">
                    <Button className="bg-border-focus hover:bg-border-focus/80 px-4 py-2 rounded-lg font-medium text-base leading-7 text-text transition-colors">
                      Buy More Tokens
                    </Button>
                    <p className="font-normal text-sm leading-6 text-text-alt">
                      Need more? Purchase additional tokens for extended AI chat
                      usage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-lg leading-7 text-text">
                    Data Management
                  </h3>
                  <p className="font-normal text-sm leading-6 text-text-alt">
                    Manage your feeds and articles data
                  </p>
                </div>

                <div className="flex flex-col gap-4 pl-4">
                  <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-base leading-6 text-text">
                        Export feeds (OPML)
                      </div>
                      <div className="font-normal text-sm leading-5 text-text-alt">
                        Export your feed subscriptions as OPML file
                      </div>
                    </div>
                    <Button
                      onClick={handleExport}
                      className="px-4 py-2 rounded-lg bg-background-select hover:bg-border-focus/10 text-text font-medium text-sm transition-colors"
                    >
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-base leading-6 text-text">
                        Import feeds (OPML)
                      </div>
                      <div className="font-normal text-sm leading-5 text-text-alt">
                        Import feed subscriptions from OPML file
                      </div>
                    </div>
                    <Button
                      onClick={handleImportClick}
                      className="px-4 py-2 rounded-lg bg-background-select hover:bg-border-focus/10 text-text font-medium text-sm transition-colors"
                    >
                      Import
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".opml,.xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-lg leading-7 text-text">
                    Account
                  </h3>
                  <p className="font-normal text-sm leading-6 text-text-alt">
                    Manage your account settings
                  </p>
                </div>

                <div className="flex flex-col gap-4 pl-4">
                  <div className="flex items-center justify-between py-3">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-base leading-6 text-text">
                        Sign out
                      </div>
                      <div className="font-normal text-sm leading-5 text-text-alt">
                        Sign out of your account
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg bg-background-select hover:bg-border-focus/10 text-text font-medium text-sm transition-colors"
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </SectionCard>
    </div>
  );
}
