import { Avatar } from "@base-ui-components/react/avatar";
import { NavigationMenu } from "@base-ui-components/react/navigation-menu";
import { Separator } from "@base-ui-components/react/separator";
import { Link } from "react-router";

export function MenuBar() {
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
                <NavigationMenu.Trigger className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                  Feeds
                </NavigationMenu.Trigger>
              </Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item className="flex items-center">
              <NavigationMenu.Trigger className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                Starred
              </NavigationMenu.Trigger>
            </NavigationMenu.Item>

            <Separator
              orientation="vertical"
              className="h-4 w-0.5 bg-border-unfocus"
            />

            <NavigationMenu.Item className="flex items-center">
              <NavigationMenu.Trigger className="flex items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text">
                Settings
              </NavigationMenu.Trigger>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>
    </div>
  );
}