const confirmFn = Function('message', 'return window.confirm(message);');

export async function showConfirm(message: string, options?: {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  return confirmFn(message);
}
