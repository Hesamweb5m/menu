import { useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";
import Modal from "../../../components/Modal/Modal";
import api from "../../../services/api";
import toast from "react-hot-toast";

const Edit = ({ item, getProducts, setProducts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(item.price);
  const [description, setDescription] = useState(item.description);
  const [available, setAvailable] = useState(item.available);
  const [category, setCategory] = useState(
    item.category?.documentId || item.category?.id || ""
  );

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const updateHandler = async () => {
    try {
      setLoading(true);

      let imageId = item.image?.id;

      // اگر کاربر عکس جدید انتخاب کرد
      if (image) {
        const formData = new FormData();
        formData.append("files", image);

        const uploadRes = await api.post("/upload", formData);

        imageId = uploadRes.data[0].id;
      }

      await api.put(`/products/${item.documentId}`, {
        data: {
          title,
          description,
          price,
          available,
          category,
          image: imageId ? [imageId] : [],
        },
      });

      toast.success("محصول با موفقیت ویرایش شد.");

      setProducts((prev) =>
        prev.map((product) =>
          product.documentId === item.documentId
            ? {
              ...product,
              title,
              description,
              price,
              available,
              category,
            }
            : product
        )
      );
      setIsOpen(false);
    } catch (err) {
      console.log(err);
      toast.error("خطا در ویرایش محصول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
          className="bg-[#F7F3ED] text-[#7E5439] text-sm px-3 py-1 rounded flex items-center justify-center gap-2 cursor-pointer"
      >
        <MdEdit />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="ویرایش محصول"
        submitText="ویرایش"
        onSubmit={updateHandler}
        loading={loading}
      >
        <div className="space-y-4">

          <input
            type="text"
            value={title || ""}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="نام محصول"
            className="w-full border-2 border-[#7E543A] rounded-md p-2"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border-2 border-[#7E543A] rounded-md p-2"
          >
            <option value="">دسته‌بندی را انتخاب کنید</option>

            {categories.map((cat) => (
              <option
                key={cat.id}
                value={cat.documentId}
              >
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="قیمت"
            className="w-full border-2 border-[#7E543A] rounded-md p-2"
          />

          <div className="flex justify-around">
            <label>
              <input
                type="radio"
                checked={available}
                onChange={() => setAvailable(true)}
              />
              موجود
            </label>

            <label>
              <input
                type="radio"
                checked={!available}
                onChange={() => setAvailable(false)}
              />
              ناموجود
            </label>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات"
            className="w-full border-2 border-[#7E543A] rounded-md p-2"
          />
          <div className="flex flex-col gap-2">
            <label>عکس محصول</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="border-2 border-[#7E543A] rounded-md  p-2   file:ml-2
    file:px-2
    file:py-1
    file:rounded-md
    file:bg-[#7E543A]
    file:text-white
    file:cursor-pointer"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Edit;