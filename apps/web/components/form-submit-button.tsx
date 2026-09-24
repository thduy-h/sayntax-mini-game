"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

interface FormSubmitButtonProps extends ButtonProps {
  pendingLabel: string;
}

export function FormSubmitButton({ children, disabled, pendingLabel, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending || disabled} disabled={pending || disabled} type="submit" {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
