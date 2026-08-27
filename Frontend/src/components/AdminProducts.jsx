import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FaBoxOpen,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaTrash,
  FaTimes
} from "react-icons/fa";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;

  useEffect(() => {
    fetchProducts();
  }, []);

  function fetchProducts() {
    fetch("http://localhost:3000/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => {
        console.log(err);
        toast.error("Unable to load products");
      });
  }

  function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;

    fetch(`http://localhost:3000/products/${id}`, {
      method: "DELETE"
    })
      .then((res) => res.text())
      .then((msg) => {
        toast.success(msg || "Product deleted successfully");
        fetchProducts();
      })
      .catch((err) => {
        console.log(err);
        toast.error("Error deleting product");
      });
  }

  function handleEdit(product) {
    setEditingProduct(product);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function handleUpdate(e) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("name", editingProduct.Name);
    formData.append("price", editingProduct.Price);
    formData.append("category", editingProduct.Category);

    formData.append(
      "isSpecial",
      editingProduct.IsSpecial ? "true" : "false"
    );

    formData.append(
      "isAvailable",
      editingProduct.IsAvailable ? "true" : "false"
    );

    fetch(`http://localhost:3000/products/${editingProduct.Id}`, {
      method: "PUT",
      body: formData
    })
      .then((res) => res.text())
      .then((msg) => {
        toast.success(msg);
        setEditingProduct(null);
        fetchProducts();
      })
      .catch((err) => {
        console.log(err);
        toast.error("Error updating product");
      });
  }

  // =========================
  // SEARCH
  // =========================

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return true;

    return (
      product.Name?.toLowerCase().includes(search) ||
      product.Category?.toLowerCase().includes(search)
    );
  });

  // =========================
  // PAGINATION
  // =========================

  const totalPages = Math.ceil(
    filteredProducts.length / productsPerPage
  );

  const indexOfLastProduct =
    currentPage * productsPerPage;

  const indexOfFirstProduct =
    indexOfLastProduct - productsPerPage;

  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  function handleSearch(e) {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }

  function goToPage(page) {
    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  return (
    <div className="admin-products-page">

      {/* ================= HEADER ================= */}

      <div className="admin-products-header">

        <h1>
          <FaBoxOpen className="section-icon" />
          Manage Products
        </h1>

        <p>
          Manage your inventory, specials and product availability.
        </p>

      </div>

      {/* ================= SEARCH ================= */}

      <div className="admin-products-toolbar">

        <div className="admin-product-search">

          <FaSearch className="search-icon" />

          <input
            type="text"
            placeholder="Search products or categories..."
            value={searchTerm}
            onChange={handleSearch}
          />

          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}

        </div>

        <div className="product-count">

          {filteredProducts.length}{" "}
          {filteredProducts.length === 1
            ? "product"
            : "products"}

        </div>

      </div>

      {/* ================= EDIT PRODUCT ================= */}

      {editingProduct && (

        <div className="edit-product-card">

          <div className="edit-product-header">

            <h2>Edit Product</h2>

            <button
              className="close-edit-btn"
              onClick={() => setEditingProduct(null)}
              aria-label="Close edit form"
            >
              <FaTimes />
            </button>

          </div>

          <form
            onSubmit={handleUpdate}
            className="edit-product-form"
          >

            <div className="form-group">

              <label>Product Name</label>

              <input
                value={editingProduct.Name}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    Name: e.target.value
                  })
                }
              />

            </div>

            <div className="form-group">

              <label>Price</label>

              <input
                type="number"
                step="0.01"
                value={editingProduct.Price}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    Price: e.target.value
                  })
                }
              />

            </div>

            <div className="form-group">

              <label>Category</label>

              <select
                value={editingProduct.Category || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    Category: e.target.value
                  })
                }
              >

                
          <option value="Beer">Beer</option>
          <option value="Wine">Wine</option>
          <option value="Soft Drinks">Champagne</option>
          <option value="Soft Drinks">Spirits</option>
          <option value="Whisky">Whisky</option>
          <option value="Vodka">Vodka</option>
          <option value="Brandy">Brandy</option>
          <option value="Gin">Gin</option>
          <option value="Rum">Rum</option>
          <option value="Cider">Cider</option>
          <option value="Soft Drinks">Soft Drinks</option>
           <option value="Snacks">Snacks</option>
           <option value="Accessories">Accessories</option>

                

              </select>

            </div>

            <div className="special-toggle">

              <label className="checkbox-row">

                <input
                  type="checkbox"
                  checked={editingProduct.IsSpecial}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      IsSpecial: e.target.checked
                    })
                  }
                />

                <span>
                  Show in <strong>Current Specials</strong>
                </span>

              </label>

            </div>

            <div className="special-toggle">

              <label className="checkbox-row">

                <input
                  type="checkbox"
                  checked={editingProduct.IsAvailable}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      IsAvailable: e.target.checked
                    })
                  }
                />

                <span>
                  Available <strong>In Store</strong>
                </span>

              </label>

            </div>

            <button
              className="save-product-btn"
              type="submit"
            >
              Save Changes
            </button>

          </form>

        </div>

      )}

      {/* ================= PRODUCTS ================= */}

      {currentProducts.length > 0 ? (

        <div className="admin-products-grid">

          {currentProducts.map((product) => (

            <div
              key={product.Id}
              className="admin-product-card"
            >

              <div className="product-image-wrap">

                <img
                  src={product.Image}
                  alt={product.Name}
                  className="admin-product-image"
                />

                {product.IsSpecial && (

                  <span className="special-badge">
                    Special
                  </span>

                )}

              </div>

              <div className="admin-product-content">

                <h3>{product.Name}</h3>

                <p className="admin-product-price">
                  R{Number(product.Price).toFixed(2)}
                </p>

                <span className="category-badge">
                  {product.Category}
                </span>

                <span
                  className={
                    product.IsAvailable
                      ? "stock-badge available"
                      : "stock-badge unavailable"
                  }
                >

                  {product.IsAvailable
                    ? "In Stock"
                    : "Out of Stock"}

                </span>

                <div className="admin-product-actions">

                  <button
                    className="primary-btn"
                    onClick={() => handleEdit(product)}
                  >
                    <FaEdit />
                    Edit
                  </button>

                  <button
                    className="danger-btn"
                    onClick={() =>
                      handleDelete(product.Id)
                    }
                  >
                    <FaTrash />
                    Delete
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="no-products">

          <FaBoxOpen />

          <h3>No products found</h3>

          <p>
            {searchTerm
              ? `No products match "${searchTerm}".`
              : "There are currently no products available."}
          </p>

        </div>

      )}

      {/* ================= PAGINATION ================= */}

      {totalPages > 1 && (

        <div className="admin-pagination">

          <button
            className="pagination-arrow"
            disabled={currentPage === 1}
            onClick={() =>
              goToPage(currentPage - 1)
            }
          >
            <FaChevronLeft />
          </button>

          <div className="pagination-pages">

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (

              <button
                key={page}
                className={
                  currentPage === page
                    ? "pagination-page active"
                    : "pagination-page"
                }
                onClick={() => goToPage(page)}
              >
                {page}
              </button>

            ))}

          </div>

          <button
            className="pagination-arrow"
            disabled={currentPage === totalPages}
            onClick={() =>
              goToPage(currentPage + 1)
            }
          >
            <FaChevronRight />
          </button>

        </div>

      )}

    </div>
  );
}

export default AdminProducts;