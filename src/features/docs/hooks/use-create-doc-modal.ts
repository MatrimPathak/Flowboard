"use client";

import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreateDocModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-doc",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  const open = () => void setIsOpen(true);
  const close = () => void setIsOpen(false);

  return { isOpen: !!isOpen, open, close };
};
