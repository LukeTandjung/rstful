import { Avatar } from "@base-ui-components/react/avatar";
import { NavigationMenu } from "@base-ui-components/react/navigation-menu";
import { Separator } from "@base-ui-components/react/separator";
import { Link, useLocation } from "react-router";
import { highlighter } from "services/highlighter";

interface MenuBarProps {
  userName?: string | undefined;
}

export function MenuBar({ userName }: MenuBarProps) {
  const location = useLocation();
  const hlFeeds = highlighter();
  const hlStarred = highlighter();
  const hlChat = highlighter();
  const hlSettings = highlighter();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between w-full">
      <Avatar.Root className="size-14 rounded-full bg-background-alt">
        <Avatar.Image
          src="./rstful.svg"
          alt="RSS Reader"
          className="size-full"
        />
        <Avatar.Fallback className="size-full flex items-center justify-center bg-background-alt text-text font-medium text-lg rounded-full">
          {getInitials(userName)}
        </Avatar.Fallback>
      </Avatar.Root>

      <div className="flex items-stretch">
        <NavigationMenu.Root className="flex h-full">
          <NavigationMenu.List className="flex h-full items-center justify-end gap-6">
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
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>
    </div>
  );
}
