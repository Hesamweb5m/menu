  import { useNavigate } from "react-router-dom";
  import { Outlet } from "react-router-dom";
  import Footer from ".././Manage/components/Footer";

  function Home() {
    const navigate = useNavigate()
    const ClickHandler = () =>{
    setTimeout(() => {

      navigate("/menu")
    },1000)}
    return (
      <>
  <div className=" relative w-full ">
          <img src="/images/home.png" alt="Home" className="w-full h-screen object-cover" />
      
        <div className=" absolute inset-0  flex my-auto justify-center">
         <div className=" flex flex-col items-center justify-center gap-3">
           <img src="/images/ic.png" alt="" className="w-30 h-35" />
          <p className="text-white text-2xl">Welcome to</p>
          <p className="text-white text-4xl font-semibold">Atlass Cafe</p>
          <img src="/images/cf.png" alt="cofee" />
          <button className="flex items-center justify-center bg-white  text-3xl text-black font-bold p-5 rounded-2xl  hover:bg-[#462a0b] cursor-pointer  " onClick={ClickHandler}> Menu </button>
         </div>
        </div>
          </div>  

<Footer/>
    
    
    
      </>
    );
  }

  export default Home;