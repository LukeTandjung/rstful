import { Avatar } from "@base-ui-components/react/avatar";
import { NavigationMenu } from "@base-ui-components/react/navigation-menu";
import { Separator } from "@base-ui-components/react/separator";
import { Link, useLocation } from "react-router";

export function MenuBar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex items-center justify-between w-full">
      <Avatar.Root className="size-14">
        <Avatar.Image
          src="./favicon.ico"
          alt="RSS Reader"
          className="size-full"
        />
      </Avatar.Root>

      <div className="flex items-stretch">
        <NavigationMenu.Root className="flex h-full">
          <NavigationMenu.List className="flex h-full items-center justify-end gap-6">
            <NavigationMenu.Item className="flex items-center">
              <Link to="/">
                <NavigationMenu.Trigger 
                  data-active={isActive("/")}
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text hover:bg-surface-alt transition-colors data-[active=true]:text-border-focus"
                >
                  Feeds
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <Link to="/starred">
                <NavigationMenu.Trigger 
                  data-active={isActive("/starred")}
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text hover:bg-surface-alt transition-colors data-[active=true]:text-border-focus"
                >
                  Starred
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <Link to="/chat">
                <NavigationMenu.Trigger 
                  data-active={isActive("/chat")}
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text hover:bg-surface-alt transition-colors data-[active=true]:text-border-focus"
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
                  className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text hover:bg-surface-alt transition-colors data-[active=true]:text-border-focus"
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