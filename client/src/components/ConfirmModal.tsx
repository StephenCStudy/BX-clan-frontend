  type ConfirmModalProps = {
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
  };

  export default function ConfirmModal({
    open,
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    onConfirm,
    onClose,
  }: ConfirmModalProps) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden
        />
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border-2 border-gray-200">
          <div className="p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm mb-4">{message}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
