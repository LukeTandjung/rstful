import { NavigationMenu } from "@base-ui-components/react/navigation-menu";
import { Separator } from "@base-ui-components/react/separator";
import { Link, useLocation } from "react-router";
import { useHighlighter } from "services/highlighter";

export function MenuBar() {
  const location = useLocation();
  const hlFeeds = useHighlighter();
  const hlStarred = useHighlighter();
  const hlChat = useHighlighter();
  const hlSettings = useHighlighter();
  const hlContact = useHighlighter();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="glass-card rounded-lg px-4 py-2 shrink-0">
      <NavigationMenu.Root className="flex h-10 w-full">
        <NavigationMenu.List className="flex h-10 w-full items-center gap-6">
          <NavigationMenu.Item className="flex items-center">
            <Link to="/">
              <NavigationMenu.Trigger
                data-active={isActive("/")}
                style={
                  {
                    "--hl-bg": hlFeeds.bg,
                    "--hl-text": hlFeeds.text,
                  } as React.CSSProperties
                }
                className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
              >
                Feeds
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item className="flex items-center">
            <Link to="/starred">
              <NavigationMenu.Trigger
                data-active={isActive("/starred")}
                style={
                  {
                    "--hl-bg": hlStarred.bg,
                    "--hl-text": hlStarred.text,
                  } as React.CSSProperties
                }
                className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
              >
                Starred
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item className="flex items-center">
            <Link to="/chat">
              <NavigationMenu.Trigger
                data-active={isActive("/chat")}
                style={
                  {
                    "--hl-bg": hlChat.bg,
                    "--hl-text": hlChat.text,
                  } as React.CSSProperties
                }
                className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
              >
                Chat
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>

          <div className="flex-1" />

          <Separator
            orientation="vertical"
            className="h-4 w-0.5 bg-border-unfocus"
          />

          <NavigationMenu.Item className="flex items-center">
            <Link to="/settings">
              <NavigationMenu.Trigger
                data-active={isActive("/settings")}
                style={
                  {
                    "--hl-bg": hlSettings.bg,
                    "--hl-text": hlSettings.text,
                  } as React.CSSProperties
                }
                className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors data-[active=true]:bg-(--hl-bg) data-[active=true]:text-(--hl-text)"
              >
                Settings
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>

          <NavigationMenu.Item className="flex items-center">
            <a href="mailto:support@rstful.com">
              <NavigationMenu.Trigger
                style={
                  {
                    "--hl-bg": hlContact.bg,
                    "--hl-text": hlContact.text,
                  } as React.CSSProperties
                }
                className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text transition-colors hover:bg-(--hl-bg) hover:text-(--hl-text)"
              >
                Contact
              </NavigationMenu.Trigger>
            </a>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </nav>
  );
}
