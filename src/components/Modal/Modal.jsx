  import clsx from "clsx";
  import { BiX } from "react-icons/bi";

  function Modal({
    isOpen,
    onClose,
    children,
    title,
    onSubmit,
    submitText = "ثبت",
      loading = false,

  }) {
    return (
      <div
        className={clsx(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/30 duration-300",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        <div className="w-80 rounded-lg bg-white overflow-hidden shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <span className="text-lg font-bold">{title}</span>

            <button
              onClick={onClose}
              className="text-3xl cursor-pointer hover:text-red-500"
            >
              <BiX />
            </button>
          </div>

          <div className="p-5">
            {children}
          </div>

      <div className="min-h-14 flex items-center justify-end gap-2 px-4 bg-[#f1f3f7]">
    <button
      onClick={onClose}
      className="px-4 py-2 rounded bg-gray-300 hover:bg-red-500"
    >
      انصراف
    </button>

  <button
    onClick={onSubmit}
    disabled={loading}
    className="px-4 py-2 rounded bg-[#7E543A]  text-white disabled:opacity-50"
  >
    {loading ? "در حال ثبت..." : submitText}
  </button>
  </div>
        </div>
      </div>
    );
  }

  export default Modal;