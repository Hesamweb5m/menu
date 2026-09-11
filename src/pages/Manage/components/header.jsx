import React from 'react'
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from "react-icons/fa";

const Header = () => {
        const navigate = useNavigate();
    
        const ClickHandler = () => {
      navigate("/menu");
    };
  return (
    <div>
          <header className="bg-[#593e29]   h-12 flex justify-around items-center">
          <h3 className="text-[#D9BDA3] font-bold">پنل مدیریت  </h3>

          <button
            onClick={() => window.open("/menu", "_blank")}
            // onClick={ClickHandler}
            className="bg-[#f5ebe0] p-2 rounded-lg text-[#593e29]v flex items-center justify-center gap-3 cursor-pointer"
            

          >
            

            منو اصلی
         <FaArrowLeft />
          </button>
        </header>
    </div>
  )
}

export default Header
