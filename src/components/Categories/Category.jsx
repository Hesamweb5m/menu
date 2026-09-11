import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import api, { mediaUrl } from "../../services/api";

import "swiper/css";
import "swiper/css/free-mode";

const Category = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/categories?populate=*&sort=displayOrder:asc")
      .then(({ data }) => setCategories(data.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <Swiper
      modules={[Autoplay, FreeMode]}
      freeMode={true}
      loop={true}
      autoplay={{
        delay: 1500,
      }}
        slidesPerView={4}
     spaceBetween={10}
    >
      {categories.map((item) => (
        <SwiperSlide key={item.id}>
          <a
            href={`#category-${item.id}`}
            className="bg-[#161511] border border-[#584a37]  rounded-2xl w-full p-4 flex flex-col items-center justify-center hover:bg-white/70 transition-all "
          >
            {item.image?.length > 0 && (
              <img
                src={mediaUrl(item.image[0].url)}
                alt={item.name}
                className="w-20 h-18 object-cover rounded-full"
              />
            )}

            <h3 className="mt-2 text-sm font-semibold text-center text-[#e2c9a2] ">
              {item.name}
            </h3>
          </a>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default Category;