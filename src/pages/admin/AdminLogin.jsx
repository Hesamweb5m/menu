import React from 'react'
import { Navigate } from 'react-router-dom'

const AdminLogin = () => {
  const clickhandler{
if (password ==1234) {
  <Navigate to={/>manage}/>
  else{}
}
  }
  return (
    <div className='bg-[#17150f] w-full h-screen flex items-center justify-center'>
      <div className='w-[80%] h-100 bg-[#f8f1ea] flex flex-col gap-10 items-center justify-center  rounded-2xl '>
      <input className='w-[80%] h-[10%] border bg-amber-100 text-center text-gray-700 rounded-3xl' placeholder='نام کاربری' type="text" />
      <input className='w-[80%] h-[10%] border bg-amber-100 text-center text-gray-700 rounded-3xl'placeholder='کلمه عبور' type="password" />
      <button onClick={clickhandler} className='bg-amber-700/50 w-20 h-10 rounded-2xl cursor-pointer '>ورود</button>
      </div>
    </div>
  )
}

export default AdminLogin;