import { useState } from "react";
import { MdDelete } from "react-icons/md";
import Modal from "../../../../components/Modal/Modal";
import api from "../../../../services/api";
import toast from "react-hot-toast";

const DeleteCategory = ({ id, getCategories ,name}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const deleteHandler = async () => {
    try {
      setLoading(true);

      await api.delete(`/categories/${id}`);

      toast.success("دسته بندی حذف شد.");

      await getCategories();

      setIsOpen(false);
    } catch (error) {
      console.log(error);
      toast.error("خطا در حذف دسته بندی");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-300 text-red-600 text-sm px-3 py-1 rounded flex items-center justify-center gap-2 cursor-pointer"
      >
        <MdDelete />
      </button>

    <Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="حذف دسته بندی"
  submitText={loading ? "در حال حذف..." : "حذف"}
  onSubmit={deleteHandler}
>
  <div className="text-center space-y-2">
    <p>آیا از حذف دسته‌بندی  <span className="font-bold text-red-600">{name} </span>مطمئن هستید؟</p>


  </div>
</Modal>
    </>
  );
};

export default DeleteCategory;