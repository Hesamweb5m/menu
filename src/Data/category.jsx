import { useEffect, useState } from "react";
import api from "../services/api";

function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <>
      {categories.map((item) => (
        <div key={item.id}>
          {item.title}
        </div>
      ))}
    </>
  );
}

export default Categories;