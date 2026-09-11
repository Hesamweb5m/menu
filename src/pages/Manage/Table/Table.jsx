import React from "react";
import Edit from "./Edit";
import Delete from "./Delete";

const Table = ({ products, editHandler, getProducts ,setProducts}) => {
  return (
    <div className="m-4 max-h-105 overflow-y-auto rounded-2xl border-2 border-orange-800">
      <table className="w-full  border-collapse">
        <tbody>
          <th className="px-2 py-3 sticky top-0 border-b border-gray-200 bg-[#F8F1EA]">
            نام محصول
          </th>
          <th className="px-4 py-3  sticky top-0 border-b border-gray-200 bg-[#F8F1EA]">
            قیمت (تومان)
          </th>
          <th className="px-4 py-3  sticky top-0 border-b border-gray-200 bg-[#F8F1EA]">
            عملیات
          </th>
          {products.map((item, index) => (
            <tr
              key={item.documentId}
              className={index % 2 === 0 ? "bg-white" : "bg-[#c4a485]/20"}
            >
              <td className="px-4 py-3 border-b border-gray-200 text-center border-l">
                {item.title}
              </td>
              <td className="px-4 py-3 border-b border-gray-200 text-center border-l">
                {item.price}
              </td>
              <td className="px-4 py-5 border-b border-gray-200 flex items-center justify-center">
                <div className=" flex items-center gap-5">
                  <Edit item={item} getProducts={getProducts} setProducts={setProducts} />
                  <Delete item={item} getProducts={getProducts} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
