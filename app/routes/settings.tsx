import type { Route } from "./+types/settings";
import { Separator } from "@base-ui-components/react/separator";
import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { Cog6ToothIcon } from "@heroicons/react/16/solid";
import { SectionCard, MenuBar } from "components";

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
  return (
    <div className="bg-background flex flex-col h-screen w-full">
      <div className="h-[300px] relative w-full shrink-0">
        <img
          src="/assets/banner.png"
          alt="Banner"
          className="absolute inset-0 max-w-none object-cover object-center pointer-events-none size-full"
        />
      </div>

      <div className="flex flex-col gap-6 grow min-h-0 p-6 w-full">
        <MenuBar />

        <Separator className="w-full bg-border-unfocus h-0.5" />

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
                  {/* General Settings */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-lg leading-7 text-text">
                        General
                      </h3>
                      <p className="font-normal text-sm leading-6 text-text-alt">
                        Configure general application settings
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 pl-4">
                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Auto-refresh feeds
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Automatically check for new articles
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-border-unfocus peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Mark as read on scroll
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Automatically mark articles as read when scrolled past
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-border-unfocus peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Show unread count
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Display unread article counts in feed list
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-border-unfocus peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Reading Preferences */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-lg leading-7 text-text">
                        Reading Preferences
                      </h3>
                      <p className="font-normal text-sm leading-6 text-text-alt">
                        Customize your reading experience
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 pl-4">
                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Open links in new tab
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Open article links in a new browser tab
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-border-unfocus peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Show full article content
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Display full content instead of summaries
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-border-unfocus peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
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
                            Clear read articles
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Remove all read articles older than 30 days
                          </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-surface-alt hover:bg-accent/10 text-text font-medium text-sm transition-colors">
                          Clear
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-border-unfocus">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Export feeds (OPML)
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Export your feed subscriptions as OPML file
                          </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-surface-alt hover:bg-accent/10 text-text font-medium text-sm transition-colors">
                          Export
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-base leading-6 text-text">
                            Import feeds (OPML)
                          </div>
                          <div className="font-normal text-sm leading-5 text-text-alt">
                            Import feed subscriptions from OPML file
                          </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-surface-alt hover:bg-accent/10 text-text font-medium text-sm transition-colors">
                          Import
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
