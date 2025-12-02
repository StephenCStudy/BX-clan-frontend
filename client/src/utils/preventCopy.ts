/**
 * Utility to prevent text selection and copying on Windows
 * This prevents users from copying content using mouse drag selection
 */

export const preventCopyAndSelection = () => {
  // Only apply on Windows
  const isWindows = navigator.platform.toLowerCase().includes("win");
  if (!isWindows) return;

  // Prevent text selection via mouse drag
  const handleMouseDown = (e: MouseEvent) => {
    // Allow clicks on inputs, textareas, and contenteditable elements
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" ||
      tagName === "textarea" ||
      target.isContentEditable ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest('[contenteditable="true"]');

    if (!isEditable) {
      // Prevent default selection behavior
      if (e.detail > 1) {
        // Double/triple click
        e.preventDefault();
      }
    }
  };

  // Prevent selectstart event (text selection)
  const handleSelectStart = (e: Event) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" ||
      tagName === "textarea" ||
      target.isContentEditable ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest('[contenteditable="true"]');

    if (!isEditable) {
      e.preventDefault();
    }
  };

  // Prevent copy event
  const handleCopy = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" || tagName === "textarea" || target.isContentEditable;

    if (!isEditable) {
      e.preventDefault();
    }
  };

  // Prevent context menu (right-click)
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" || tagName === "textarea" || target.isContentEditable;

    if (!isEditable) {
      e.preventDefault();
    }
  };

  // Prevent drag
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();

    // Allow dragging images if needed, otherwise prevent all drag
    if (tagName !== "img") {
      e.preventDefault();
    }
  };

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("selectstart", handleSelectStart);
  document.addEventListener("copy", handleCopy);
  document.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("dragstart", handleDragStart);

  // Add CSS to prevent selection
  const style = document.createElement("style");
  style.id = "prevent-copy-style";
  style.textContent = `
    /* Prevent text selection on Windows */
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Allow selection in input fields */
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
  `;
  document.head.appendChild(style);

  // Return cleanup function
  return () => {
    document.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("selectstart", handleSelectStart);
    document.removeEventListener("copy", handleCopy);
    document.removeEventListener("contextmenu", handleContextMenu);
    document.removeEventListener("dragstart", handleDragStart);

    const existingStyle = document.getElementById("prevent-copy-style");
    if (existingStyle) {
      existingStyle.remove();
    }
  };
};

export default preventCopyAndSelection;
