import { useState } from "react";
import { MdDelete } from "react-icons/md";
import api from "../../../services/api";
import toast from "react-hot-toast";
import Modal from "../../../components/Modal/Modal";


const Delete = ({ item, getProducts }) => {

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);


  const deleteHandler = async () => {
    try {
      setLoading(true);

      await api.delete(`/products/${item.documentId}`);

      toast.success("محصول حذف شد.");

      getProducts();

      setIsOpen(false);

    } catch (error) {
      console.log(error);
      toast.error("خطا در حذف محصول");

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
        title="حذف محصول"
        submitText="حذف"
        onSubmit={deleteHandler}
        loading={loading}
      >

        <p className="text-center">
           آیا مطمئن هستید که می‌خواهید
          <span className="font-bold mx-1">
            {item.title + " "}
          </span>
          را حذف کنید؟
        </p>

      </Modal>

    </>
  );
};

export default Delete;