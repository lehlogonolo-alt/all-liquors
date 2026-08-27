import { useState } from "react";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";

function AddProduct() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Beer");
  const [image, setImage] = useState(null);

  const [isSpecial, setIsSpecial] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();

    if (!name || !price || !image || !category) {
      toast.error("Please complete all fields before submitting");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("image", image);
    formData.append("isSpecial", isSpecial);
    formData.append("isAvailable", isAvailable);

    fetch("http://localhost:3000/products", {
      method: "POST",
      body: formData
    })
      .then(res => res.text())
      .then(data => {
        toast.success(data);

        setName("");
        setPrice("");
        setCategory("Beer");
        setImage(null);
        setIsSpecial(false);
        setIsAvailable(true);

        document.getElementById("productImage").value = "";
      })
      .catch(err => {
        console.log(err);
        toast.error("Error adding product ");
      });
  }

  return (
    <div className="add-product-page">

      <div className="add-product-card">

        <div className="add-product-header">
          <h1>
          <FaPlus className="section-icon" />
          Add Product
          </h1>
          <p>
            Add products to your catalogue and manage specials,
            categories and availability.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="add-product-form"
        >

          <div className="form-group">
            <label>Product Name</label>

            <input
              type="text"
              placeholder="Jameson Irish Whiskey"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Price (R)</label>

            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Category</label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Beer</option>
              <option>Wine</option>
              <option>Whisky</option>
              <option>Brandy</option>
              <option>Vodka</option>
              <option>Gin</option>
              <option>Spirits</option>
              <option>Rum</option>
              <option>Champagne</option>
              <option>Accessories</option>
              <option>Snacks</option>
              <option>Soft Drinks</option>
            </select>
          </div>

          <div className="form-group">
            <label>Product Image</label>

            <input
              id="productImage"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
          </div>

          <div className="special-toggle">

            <label className="checkbox-row">

              <input
                type="checkbox"
                checked={isSpecial}
                onChange={(e) =>
                  setIsSpecial(e.target.checked)
                }
              />

              <span>
                Feature in <strong>Current Specials</strong>
              </span>

            </label>

          </div>

          <div className="special-toggle">

            <label className="checkbox-row">

              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) =>
                  setIsAvailable(e.target.checked)
                }
              />

              <span>
                Product is <strong>Available In Store</strong>
              </span>

            </label>

          </div>

          <button
            className="save-product-btn"
            type="submit"
          >
            Save Product
          </button>

        </form>

      </div>

    </div>
  );
}

export default AddProduct;