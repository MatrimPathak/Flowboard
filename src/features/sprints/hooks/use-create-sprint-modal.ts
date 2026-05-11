import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreateSprintModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-sprint",
    parseAsBoolean.withDefault(false)
  );
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return { isOpen, open, close };
};
