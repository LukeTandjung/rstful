import { Field } from "@base-ui-components/react/field";
import { Toggle } from "@base-ui-components/react/toggle";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import * as React from "react";

interface FormFieldProps {
  label: string;
  placeholder: string;
  description?: string;
  multiline?: boolean;
  name: string;
  defaultValue?: string;
  type?: "text" | "email" | "password";
}

export function FormField({
  label,
  placeholder,
  description,
  multiline = false,
  name,
  defaultValue,
  type = "text",
}: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <Field.Root className="flex flex-col gap-2.5 w-full" name={name}>
      <Field.Label className="font-normal text-lg leading-7 text-text">
        {label}
      </Field.Label>

      {description && (
        <Field.Description className="font-light text-base leading-7 text-text-alt">
          {description}
        </Field.Description>
      )}

      <div className="relative">
        <Field.Control
          render={multiline ? <textarea rows={3} /> : <input type={inputType} />}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt w-full ${multiline ? "resize-none" : ""} ${isPasswordField ? "pr-10" : ""}`}
        />
        {isPasswordField && (
          <Toggle
            pressed={showPassword}
            onPressedChange={setShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeSlashIcon className="size-5 text-text" />
            ) : (
              <EyeIcon className="size-5 text-text" />
            )}
          </Toggle>
        )}
      </div>
    </Field.Root>
  );
}
