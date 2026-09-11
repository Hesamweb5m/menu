import { MdEdit } from "react-icons/md";
const EditCategory = ({ item, onEdit }) => {
  return (
    <div>
    <button onClick={() => onEdit(item)} className="bg-[#F7F3ED] text-[#7E5439] text-sm px-3 py-1 rounded flex items-center justify-center gap-2 cursor-pointer">
      <MdEdit />
    </button>
  </div>
  );

};

export default EditCategory;