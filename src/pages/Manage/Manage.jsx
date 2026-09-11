  import { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import Modal from "../../components/Modal/Modal";
  import api from "../../services/api";
  import Table from "./Table/Table";
  import Header from "./components/header";
  import Title from "./components/ProductControl";
  import ProductControl from "./components/productcontrol";
  import CategoryControl from "./components/categorycontrol";
  import Footer from "./components/Footer";



  function Manage() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [available, setAvailable] = useState(true);
    const [image, setImage] = useState(null);
    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");

    const filteredProducts = products.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
    const getProducts = async () => {
      try {
        const res = await api.get("/products?populate=*&sort=displayOrder:asc");
        setProducts(res.data.data);
      } catch (error) {
        console.log(error);
      }
    };
    useEffect(() => {
      getProducts();
      getCategories();
    }, []);
    const submitHandler = async () => {
      try {
        setLoading(true);

        if (isEditing) {
          // ویرایش محصول
          await api.put(`/products/${editingId}`, {
            data: {
              title,
              description,
              price,
              available,
              category,
            },
          });

          toast.success("محصول با موفقیت ویرایش شد.");
        } else {
          // افزودن محصول

          const formData = new FormData();
          formData.append("files", image);

          const uploadRes = await api.post("/upload", formData);
          const imageId = uploadRes.data[0].id;

          await api.post("/products", {
            data: {
              title,
              description,
              price,
              available,
              category,
              image: [imageId],
            },
          });

          toast.success("محصول با موفقیت ثبت شد.");
        }

        await getProducts();

        setTitle("");
        setDescription("");
        setPrice("");
        setCategory("");
        setAvailable(true);
        setImage(null);

        setIsEditing(false);
        setEditingId(null);
        setIsOpen(false);
      } catch (error) {
        // مدیریت خطا
      } finally {
        setLoading(false);
      }
    };
    const editHandler = (product) => {
      console.log("Edit Clicked", product);

      setIsEditing(true);
      setEditingId(product.documentId);

      setEditingId(product.documentId);

      setTitle(product.title);
      setDescription(product.description);
      setPrice(product.price);
      setAvailable(product.available);

      setCategory(
        product.category?.documentId || product.category?.id
      );

      setImage(null);

      setIsOpen(true);
    };
  const getCategories = async () => {
    const { data } = await api.get(
      "/categories?populate=*&sort=displayOrder:asc"
    );

    setCategories(
    data.data.map((item) => ({
      id: item.id,
      documentId: item.documentId,
      name: item.name,
      displayOrder: item.displayOrder,
      image: item.image,
    }))
  );
  };


useEffect(() => {
  getCategories();
}, []);
    return (
      <>
        <Header />
    <ProductControl
  products={products}
  search={search}
  setSearch={setSearch}
  getProducts={getProducts}
  categories={categories}
  getCategories={getCategories}
/>
          <Table
            products={filteredProducts}
            setProducts={setProducts}
            getProducts={getProducts}
            editHandler={editHandler}

          />
          <CategoryControl getCategories={getCategories}     categories={categories}
  />
<Footer/>
      </>
    )
  };

  export default Manage;