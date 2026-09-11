  import React, { useEffect, useRef, useState } from 'react'
    import { IoIosCafe } from "react-icons/io";
  import { BiSolidCategory } from "react-icons/bi";
    import { FaPlus } from "react-icons/fa";
import Modal from "../../../components/Modal/Modal";
import api from "../../../services/api";
import toast from "react-hot-toast";
import CategoryTable from '../Table/CategoryTable/CategoryTable';
  const CategoryControl = ({getCategories,categories}) => {
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
const [categoryName, setCategoryName] = useState("");
const [categoryImage, setCategoryImage] = useState(null);
const fileInputRef = useRef(null);
const [afterCategory, setAfterCategory] = useState("__last__");
const handleEditCategory = (item) => {
  setEditCategory(item);
  setCategoryName(item.name);
  setAfterCategory(item.documentId);
  setIsCategoryOpen(true);
};
const [editCategory, setEditCategory] = useState(null);
const sortedCategories = [...categories].sort(
  (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
);
const calculateDisplayOrder = () => {
  if (sortedCategories.length === 0) return 100;

  // اول لیست
  if (afterCategory === "__first__") {
    return Math.max((sortedCategories[0].displayOrder ?? 100) - 100, 0);
  }

  // آخر لیست
  if (afterCategory === "__last__") {
    return (sortedCategories.at(-1).displayOrder ?? 0) + 100;
  }

  const index = sortedCategories.findIndex(
    (item) => item.documentId === afterCategory
  );

  if (index === -1) {
    return (sortedCategories.at(-1).displayOrder ?? 0) + 100;
  }

  const current = sortedCategories[index].displayOrder;
  const next = sortedCategories[index + 1]?.displayOrder;

  // اگر آخرین دسته بود
  if (!next) {
    return current + 100;
  }

  // اگر بین دو عدد فاصله نباشه
  if (next - current <= 1) {
    toast.error("فاصله کافی بین دسته‌بندی‌ها وجود ندارد.");
    return null;
  }

  // همیشه عدد صحیح
  return Math.floor((current + next) / 2);
};
const categorySubmitHandler = async () => {
  try {
    let imageId = null;

    if (categoryImage) {
      const formData = new FormData();
      formData.append("files", categoryImage);

      const upload = await api.post("/upload", formData);
      imageId = upload.data[0].id;
    }

    const displayOrder = calculateDisplayOrder();

    if (displayOrder === null) return;

    // داده‌ای که به Strapi ارسال می‌شود
    const data = {
      name: categoryName,
      displayOrder,
    };

    // فقط اگر عکس جدید انتخاب شده باشد، تصویر را تغییر بده
    if (imageId) {
      data.image = imageId;
    }

    if (editCategory) {
      await api.put(`/categories/${editCategory.documentId}`, {
        data,
      });

      toast.success("دسته بندی ویرایش شد");
    } else {
      await api.post("/categories", {
        data,
      
      });
await getCategories();
      toast.success("دسته بندی ثبت شد");
    }

    // ریست فرم
    setCategoryName("");
    setCategoryImage(null);
    setAfterCategory("__last__");
    setEditCategory(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsCategoryOpen(false);

    await getCategories();
  } catch (err) {
    console.log(err.response?.data || err);

    toast.error("خطا در ثبت دسته بندی");
  }
};


    return (
      <div>
        <div className="flex items-center justify-start gap-3 p-4">
        <BiSolidCategory className="text-[#7E5439] bg-[#F3EAE1] rounded-full w-10 h-10 p-1"/>
        
                <p className="text-xl font-bold text-black">مدیریت دسته بندی ها</p>
        </div>
  <button
  onClick={() => setIsCategoryOpen(true)}
            className="bg-[#7E543A]  text-white text-[13px] flex items-center justify-center gap-2 p-3 mr-3 rounded-2xl hover:bg-[#926244] cursor-pointer "
          >
              <FaPlus /> 
  افزودن دسته بندی      
          </button>
<Modal
  isOpen={isCategoryOpen}
  onClose={() => setIsCategoryOpen(false)}
  title={editCategory ? "ویرایش دسته بندی" : "افزودن دسته بندی"}

submitText={editCategory ? "ذخیره تغییرات" : "ثبت دسته بندی"}
  onSubmit={categorySubmitHandler}
>
  <div className="space-y-4">

    <input
      type="text"
      placeholder="نام دسته بندی"
      value={categoryName}
      onChange={(e)=>setCategoryName(e.target.value)}
      className="w-full border-2 border-[#7E543A] rounded-md p-2"
    />
<select
    value={afterCategory}
    onChange={(e) => setAfterCategory(e.target.value)}
    className="w-full border-2 border-[#7E543A] rounded-md p-2"
>

    <option value="__first__" className='text-center'>اول لیست</option>

    {sortedCategories.map((item) => (
        <option
        className='text-center'
            key={item.documentId}
            value={item.documentId}
        >
            بعد از {item.name}
        </option>
    ))}

    <option value="__last__" className='text-center'>انتهای لیست</option>

</select>
    <input
      type="file"
      onChange={(e)=>setCategoryImage(e.target.files[0])}
        ref={fileInputRef}
      className='w-full border-2 border-[#7E543A] rounded-md p-2  file:ml-2
    file:px-2
    file:py-1
    file:rounded-md
    file:bg-[#7E543A]
    file:text-white
    file:cursor-pointer" '
    />

  </div>
</Modal>
<CategoryTable
  categories={categories}
  getCategories={getCategories}
  handleEditCategory={handleEditCategory}
/>
      </div>
    )
  }

  export default CategoryControl;
