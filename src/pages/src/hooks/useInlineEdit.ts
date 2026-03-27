import { useState } from 'react';

/**
 * Custom hook for inline editing functionality
 * Eliminates code duplication between components that need inline title editing
 */
export function useInlineEdit(
  initialValue: string,
  onSave: (value: string) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(initialValue);

  const handleSave = () => {
    onSave(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(initialValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const startEditing = () => {
    setLocalValue(initialValue); // Reset to current value when starting edit
    setIsEditing(true);
  };

  return {
    isEditing,
    localValue,
    setLocalValue,
    handleSave,
    handleCancel,
    handleKeyDown,
    startEditing,
  };
}