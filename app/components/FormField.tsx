import { Field } from "@base-ui-components/react/field";

interface FormFieldProps {
  label: string;
  placeholder: string;
  description?: string;
  multiline?: boolean;
  name: string;
  defaultValue?: string;
  type?: string;
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
  return (
    <Field.Root
      className="flex flex-col gap-2.5 w-full"
      name={name}
    >
      <Field.Label
        className="font-normal text-lg leading-7 text-text"
      >
        {label}
      </Field.Label>

      {description && (
        <Field.Description
          className="font-light text-base leading-7 text-text-alt"
        >
          {description}
        </Field.Description>
      )}

      {multiline ? (
        <Field.Control
          render={(props) => (
            <textarea
              {...props}
              rows={3}
              placeholder={placeholder}
              defaultValue={defaultValue}
              className="bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt w-full resize-none"
            />
          )}
        />
      ) : (
        <Field.Control
          render={(props) => (
            <input
              {...props}
              type={type}
              placeholder={placeholder}
              defaultValue={defaultValue}
              className="bg-background-select px-3 py-2 rounded-lg text-base leading-7 text-text placeholder:text-text-alt w-full"
            />
          )}
        />
      )}
    </Field.Root>
  );
}