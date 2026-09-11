import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import { Navigation, Pagination, Autoplay, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch("http://localhost:1337/api/categories?sort=displayOrder:asc")
      .then((res) => res.json())
      .then((data) => setCategories(data.data));

    fetch("http://localhost:1337/api/products?populate=*&sort=displayOrder:asc")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.data);
      });
  }, []);

  return (
    <div>
      {categories.map((category) => (
        <div key={category.id} id={`category-${category.id}`}>
       <div className="flex items-center gap-4">
    <div className="flex-1 h-px bg-yellow-700"></div>

    <h2 className="text-2xl font-bold text-amber-400">
{category.name}    </h2>

    <div className="flex-1 h-px bg-yellow-700"></div>
</div>

          <Swiper
  modules={[ Pagination,FreeMode]}
  spaceBetween={10}
  FreeMode-={true}
  slidesPerView={1}
 

  navigation
  className="my-8"
>
  {products
    .filter((product) => product.category?.id === category.id)
    .map((product) => (
      <SwiperSlide key={product.id}>
        <div className="bg-[#161511]  border border-[#584a37] rounded-xl p-5 h-full flex flex-col items-center">

          {product.image && (
            <img
              src={`http://localhost:1337${product.image.url}`}
              alt={product.title}
              className=" w-38 h-38 object-fit rounded-xl"
            />
          )}

          <span className="border-b border-[#584a37] w-full my-4"></span>

          <div className="text-[#e2c9a2] text-lg mt-3 mb-4 text-center">
            <h3>{product.title}</h3>
            <p className="text-sm" >
            {product.description}
          </p>
            
          </div>
<p className=" text-[#b1905b] font-bold">{product.price} تومان</p>
          

          <div className="mt-4 w-full flex justify-between items-center">
            <span
              className={`px-3 py-1 rounded-full text-xs ${
                product.available
                  ? "bg-green-200 text-green-700"
                  : "bg-red-200 text-red-700"
              }`}
            >
              {product.available ? "موجود" : "ناموجود"}
            </span>
          </div>

        </div>
      </SwiperSlide>
    ))}
</Swiper>
        </div>
      ))}
    </div>
  );
};

export default Products;