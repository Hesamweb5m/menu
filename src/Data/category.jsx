import { useEffect, useState } from "react";

function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch("http://localhost:1337/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.data);
      });
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