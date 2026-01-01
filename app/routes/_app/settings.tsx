import type { Route } from "./+types/settings";
import { Cog6ToothIcon } from "@heroicons/react/16/solid";
import { Button } from "@base-ui-components/react/button";
import { SectionCard, TokenProgress } from "components";
import { useNavigate } from "react-router";
import * as React from "react";
import { Effect } from "effect";
import { AuthService } from "services/auth";
import { appRuntime } from "services/runtime";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { downloadOpml, parseOpml, readOpmlFile } from "services/opml";
import { useHighlighter } from "services/highlighter";

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

  const hlManageSubscription = useHighlighter();
  const hlExport = useHighlighter();
  const hlImport = useHighlighter();
  const hlLogout = useHighlighter();

  const viewer = useQuery(api.auth.currentUser);
  const tokenBalance = useQuery(api.tokens.getTokenBalance);
  const feeds = useQuery(
    api.rss_feed.get_feeds_for_export,
    viewer?._id ? { user_id: viewer._id } : "skip",
  );
  const importFeeds = useMutation(api.rss_feed.import_feeds);
  const generateCustomerPortalUrl = useAction(
    api.polar.generateCustomerPortalUrl,
  );

  const handleManageSubscription = async () => {
    const result = await generateCustomerPortalUrl();
    if (result?.url) {
      window.location.href = result.url;
    }
  };

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

      alert(
        `Imported ${result.imported} feeds, skipped ${result.skipped} duplicates`,
      );
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
        <div className="flex flex-col gap-8 p-4 w-full overflow-y-auto">
          {/* Token Usage Section */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-lg leading-7 text-text">
                Token Usage
              </h3>
              <p className="font-normal text-sm leading-6 text-text-alt">
                Track your monthly usage
              </p>
            </div>

            <div className="flex flex-col gap-6 pl-4 w-full">
              <TokenProgress
                label="Messages consumed"
                current={tokenBalance?.messagesUsed ?? 0}
                max={tokenBalance?.messagesLimit ?? 500}
                period="this month"
              />

              <TokenProgress
                label="Deep Search consumed"
                current={tokenBalance?.deepSearchUsed ?? 0}
                max={tokenBalance?.deepSearchLimit ?? 30}
                period="this month"
              />
            </div>
          </div>

          {/* Subscription Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-lg leading-7 text-text">
                Subscription
              </h3>
              <p className="font-normal text-sm leading-6 text-text-alt">
                Manage your subscription and billing
              </p>
            </div>

            <div className="flex flex-col gap-4 pl-4">
              <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-base leading-6 text-text">
                    Manage subscription
                  </div>
                  <div className="font-normal text-sm leading-5 text-text-alt">
                    Update payment method, view invoices, or cancel
                  </div>
                </div>
                <Button
                  onClick={handleManageSubscription}
                  style={
                    {
                      "--hl-bg": hlManageSubscription.bg,
                      "--hl-text": hlManageSubscription.text,
                    } as React.CSSProperties
                  }
                  className="px-4 py-2 rounded-lg bg-(--hl-bg) text-(--hl-text) font-medium text-sm transition-colors"
                >
                  Manage
                </Button>
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
                  style={
                    {
                      "--hl-bg": hlExport.bg,
                      "--hl-text": hlExport.text,
                    } as React.CSSProperties
                  }
                  className="px-4 py-2 rounded-lg bg-(--hl-bg) text-(--hl-text) font-medium text-sm transition-colors"
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
                  style={
                    {
                      "--hl-bg": hlImport.bg,
                      "--hl-text": hlImport.text,
                    } as React.CSSProperties
                  }
                  className="px-4 py-2 rounded-lg bg-(--hl-bg) text-(--hl-text) font-medium text-sm transition-colors"
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
                  style={
                    {
                      "--hl-bg": hlLogout.bg,
                      "--hl-text": hlLogout.text,
                    } as React.CSSProperties
                  }
                  className="px-4 py-2 rounded-lg bg-(--hl-bg) text-(--hl-text) font-medium text-sm transition-colors"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
