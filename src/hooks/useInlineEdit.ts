import { useState } from "react";

/**
 * Custom hook for inline editing functionality
 * @param initialValue - The initial value to display/edit
 * @param onSave - Callback function when saving the value
 */
export function useInlineEdit(
  initialValue: string,
  onSave: (value: string) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(initialValue);

  const startEdit = () => {
    setLocalValue(initialValue);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(initialValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return {
    isEditing,
    localValue,
    setLocalValue,
    startEdit,
    handleSave,
    handleCancel,
    handleKeyDown,
  };
}