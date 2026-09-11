import { MdEdit } from "react-icons/md";
import DeleteCategory from "./DeleteCategory";
import EditCategory from "./EditCategory";


const CategoryTable = ({categories=[],getCategories,setEditCategory,handleEditCategory
}) => {

console.log(categories);
return (
<div className="m-4 max-h-105 overflow-y-auto rounded-2xl border-2 border-orange-800">

<table className="w-full border-collapse">

<thead className="px-2 h-15 py-3 sticky top-0 border-b border-gray-200 bg-[#F8F1EA] text-center">
<tr>
<th>عکس</th>
<th>نام</th>
<th>عملیات</th>
</tr>
</thead>


<tbody>

{
categories.map((item,index)=>(
<tr key={item.documentId} className={index % 2 === 0 ? "bg-white" : "bg-[#c4a485]/20"}>

<td className="px-4 py-3 border-b border-gray-200 text-center border-l">
  {item.image?.length > 0 ? (
    <img
      src={`http://localhost:1337${item.image[0].url}`}
      className="w-12 h-12 rounded-full mx-auto"
      alt={item.name}
    />
  ) : (
    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto text-xs text-gray-500">
      بدون عکس
    </div>
  )}
</td>


<td className="px-4 py-3 border-b border-gray-200 text-center border-l">
{item.name}
</td>


<td className="px-4 py-7 border-b border-gray-200 flex items-center justify-center">


<div className=" flex items-center gap-5">
<EditCategory
  item={item}
  onEdit={handleEditCategory}

/>

<DeleteCategory
  id={item.documentId}
  name={item.name}
  getCategories={getCategories}
/>
</div>

</td>

</tr>
))
}


</tbody>

</table>

</div>
)

}

export default CategoryTable;