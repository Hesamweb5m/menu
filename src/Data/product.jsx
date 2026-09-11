import { useEffect, useState } from "react";

function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:1337/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.data);
      });
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