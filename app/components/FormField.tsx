import { Field } from "@base-ui-components/react/field";

interface FormFieldProps {
  label: string;
  placeholder: string;
  description?: string;
  multiline?: boolean;
  name: string;
  defaultValue?: string;
}

export function FormField({
  label,
  placeholder,
  description,
  multiline = false,
  name,
  defaultValue,
}: FormFieldProps) {
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

      <Field.Control
        render={multiline ? <textarea rows={3} /> : <input />}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt w-full ${multiline ? "resize-none" : ""}`}
      />
    </Field.Root>
  );
}
