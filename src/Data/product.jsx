import { useEffect, useState } from "react";
import api from "../services/api";

function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => setProducts(data.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <>
      {products.map((item) => (
        <div key={item.id}>
          {item.title}
      {item.available}
        </div>
      ))}
    </>
  );
}

export default Products;