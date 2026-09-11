import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import Modal from "../../../components/Modal/Modal";
import api from "../../../services/api";
import { IoIosCafe } from "react-icons/io";
import { FaPlus } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';

const ProductControl = ({   products = [],
  search,
  setSearch,
  getProducts,
  categories,}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [afterProduct, setAfterProduct] = useState("__last__");
  const [image, setImage] = useState(null);
const [category, setCategory] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const filteredProducts = products.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );
  //  const getProducts = async () => {
  //     try {
  //       const res = await api.get("/products?populate=*");
  //       setProducts(res.data.data);
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };
  const sortedProducts = [...products]
    .map((item, index) => ({
      ...item,
      displayOrder:
        item.displayOrder == null ? (index + 1) * 100 : item.displayOrder,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const updateDisplayOrders = async () => {
    let newDisplayOrder = 100;
    console.log("afterProduct:", afterProduct);

    sortedProducts.forEach((item) => {
      console.log(item.title, item.displayOrder, item.documentId);
    });
    // اول لیست
    if (afterProduct === "__first__") {
      newDisplayOrder = 100;

const updatedProducts = products.filter(
  (item) => (item.displayOrder ?? 0) >= 100
);

for (const item of updatedProducts) {
  console.log(
    "Updated:",
    item.title,
    "=>",
    (item.displayOrder ?? 0) + 100
  );

  await api.put(`/products/${item.documentId}`, {
    data: {
      displayOrder: (item.displayOrder ?? 0) + 100,
    },
  });
}
      

      return newDisplayOrder;
    }

    // آخر لیست
    if (afterProduct === "__last__") {
      return (sortedProducts.at(-1)?.displayOrder ?? 0) + 100;
    }

    // بعد از یک محصول مشخص
    const selected = sortedProducts.find(
      (item) => item.documentId === afterProduct
    );

    if (!selected) {
      return (sortedProducts.at(-1)?.displayOrder ?? 0) + 100;
    }

    newDisplayOrder = selected.displayOrder + 100;

    const updatedProducts = products.filter(
      (item) => (item.displayOrder ?? 0) >= newDisplayOrder
    );

    for (const item of updatedProducts) {
      await api.put(`/products/${item.documentId}`, {
        data: {
          displayOrder: (item.displayOrder ?? 0) + 100,
        },
      });
    }

    return newDisplayOrder;
  };
  const submitHandler = async () => {
    try {
      setLoading(true);

      let imageId = 47;
      if (image) {
        const formData = new FormData();
        formData.append("files", image);

        const uploadRes = await api.post("/upload", formData);

        imageId = uploadRes.data[0].id;
      }

      const displayOrder = await updateDisplayOrders();
      console.log("displayOrder =", displayOrder);

      await api.post("/products", {
        data: {
          title,
          description,
          price,
          available,
          category,
          image: [imageId],
          displayOrder,
        }
      });

      toast.success("✅ محصول با موفقیت ثبت شد.");
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setAvailable(true);
      setImage("");
      setAfterProduct("__last__");
      setIsEditing(false);
      setEditingId(null);

      await getProducts();

      setIsOpen(false);
    } catch (error) {
      console.log(error);
      console.log(error.response);
      console.log(error.message);
      if (error.response) {
        switch (error.response.status) {
          case 400:
            toast.error("❌ اطلاعات یا فایل ارسالی معتبر نیست.");
            break;
          case 403:
            toast.error("❌ اجازه آپلود فایل را ندارید.");
            break;
          case 500:
            toast.error("❌ خطایی در سرور رخ داده است.");
            break;
          default:
            toast.error("❌ ثبت محصول با خطا مواجه شد.");
        }
      } else {
        toast.error("❌ اتصال به سرور برقرار نشد.");
      }
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const getCategories = async () => {
    try {
      const res = await api.get("/categories?populate=*");
      console.log(res.data.data);
      setCategories(res.data.data);
    } catch (error) {
      console.log("خطا در دریافت دسته‌ها:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-start gap-3 p-4">
        <IoIosCafe className="text-[#7E5439] bg-[#F3EAE1] rounded-full w-10 h-10 p-1" />

        <p className="text-xl font-bold text-black">مدیریت محصولات</p>

      </div>
      <div className="p-3 h-20  flex items-center justify-between gap-5 ">

        <div className="relative text-[#896551]">
          <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-[#896551]" />

          <input
            type="search"
            placeholder="جستجوی محصولات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border p-2 pr-10 outline-none"
          />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#7E543A]  text-white text-[13px] flex items-center justify-center gap-2 p-3 rounded-2xl hover:bg-[#926244] cursor-pointer"
        >
          <FaPlus />
          افزودن محصول
        </button>
      </div>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={isEditing ? "ویرایش محصول" : "افزودن محصول"}
        submitText={isEditing ? "ویرایش" : "ثبت"}
        onSubmit={submitHandler}
        loading={loading}>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="نام محصول"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border-[#7E543A] rounded-md  text-black  p-2"
          />
          <select
            value={afterProduct}
            onChange={(e) => setAfterProduct(e.target.value)}
            className="w-full border-2 border-[#7E543A] rounded-md p-2"

          >
            <option value="__first__" className="text-center">اول لیست</option>

            {sortedProducts.map((item) => (
              <option key={item.documentId} value={item.documentId} className="text-center">
                بعد از {item.title}
              </option>
            ))}

            <option value="__last__" className="text-center">آخر لیست</option>
          </select>
          <select
            value={category}
            onChange={(e) => {
              console.log(e.target.value);
              setCategory(e.target.value);
            }}
            className="w-full border-2 border-[#7E543A] rounded-md p-2"
          >
            <option value="">دسته‌بندی را انتخاب کنید</option>

            {categories.map((item) => (
              <option
                key={item.id || item.documentId}
                value={item.id || item.documentId}
                className="text-center p-2 "
              >
                {item.title || item.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="قیمت"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border-2 border-[#7E543A] rounded-md  p-2"
          />

          <div className="flex justify-around">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="available"
                checked={available}
                onChange={() => setAvailable(true)}
              />
              موجود
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="available"
                checked={!available}
                onChange={() => setAvailable(false)}
              />
              ناموجود
            </label>
          </div>

          <textarea
            placeholder="توضیحات"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
      <Toaster />

    </div>
  );
};

export default ProductControl;
