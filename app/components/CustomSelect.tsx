import { Select } from "@base-ui-components/react/select";
import { CaretSortIcon } from "@radix-ui/react-icons";

interface CustomSelectProps {
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function CustomSelect({
  name,
  label,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
}: CustomSelectProps) {
  return (
    <div className="flex flex-col gap-3.5 items-start w-full">
      {label && (
        <label htmlFor={name} className="font-normal text-lg leading-7 text-text">
          {label}
        </label>
      )}
      <Select.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={(newValue) => {
          if (newValue !== null) {
            onValueChange?.(newValue);
          }
        }}
      >
        <Select.Trigger className="bg-background-select flex gap-3 items-center px-3 py-2 rounded w-full">
          <Select.Value className="font-normal text-base leading-4 text-text flex-1 text-left" />
          <Select.Icon className="flex items-center">
            <CaretSortIcon className="w-4 h-4 text-text" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner sideOffset={8}>
            <Select.Popup className="bg-background-select rounded px-3 py-2 flex flex-col gap-2 min-w-35">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex items-center text-base leading-4 text-text font-normal cursor-pointer whitespace-pre text-nowrap"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}