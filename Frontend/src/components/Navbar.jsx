import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaBoxOpen,
  FaHeart,
  FaTachometerAlt,
  FaBoxes,
  FaPlus,
  FaCalendarAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaTicketAlt,
  FaShoppingBasket
} from "react-icons/fa";

import allLiquorsLogo from "../assets/allliquors-logo.jpeg";
import { useCart } from "../context/CartContext";

function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();

  function handleLogout() {
    localStorage.removeItem("user");
    sessionStorage.removeItem("accessToken");
    setUser(null);
    setOpen(false);
    navigate("/login");
  }

  return (
    <nav className="navbar">

      {/* ================= LEFT ================= */}

      <div className="nav-left">

        <Link
          to="/"
          className="brand-mark"
        >
          <img
            src={allLiquorsLogo}
            alt="All Liquors"
          />
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/events">Events</Link>
          <Link to="/elephant-resort">
            Elephant Resort
          </Link>
          <Link to="/contact">Contact</Link>
        </div>

      </div>


      {/* ================= RIGHT ================= */}

      <div className="nav-right">

        {!user?.isAdmin && (
          <Link
            to="/cart"
            className="nav-cart-link"
            aria-label={`Shopping basket with ${itemCount} items`}
            onClick={() => setOpen(false)}
          >
            <FaShoppingBasket />
            <span className="nav-cart-text">Basket</span>
            {itemCount > 0 && (
              <span className="nav-cart-count">{itemCount > 99 ? "99+" : itemCount}</span>
            )}
          </Link>
        )}

        {user ? (

          <div className="user-dropdown">

            <button
              className="dropdown-btn"
              onClick={() => setOpen(!open)}
            >
              {user.email}

              <span
                className={`dropdown-chevron ${
                  open ? "open" : ""
                }`}
              >
                ⌄
              </span>
            </button>


            {open && (

              <div className="dropdown-menu">

                {/* ================= CUSTOMER MENU ================= */}

                {!user.isAdmin && (
                  <>
                    <Link
                      to="/orders"
                      onClick={() => setOpen(false)}
                    >
                      <FaBoxOpen />
                      Order History
                    </Link>

                    <Link
                      to="/favorites"
                      onClick={() => setOpen(false)}
                    >
                      <FaHeart />
                      Saved Products
                    </Link>

                    <Link
                      to="/resort/bookings"
                      onClick={() => setOpen(false)}
                    >
                      <FaTicketAlt />
                      Resort Bookings
                    </Link>

                    <Link
                      to="/tickets"
                      onClick={() => setOpen(false)}
                    >
                      <FaTicketAlt />
                      My Tickets
                    </Link>
                  </>
                )}


                {/* ================= ADMIN MENU ================= */}

                {user.isAdmin && (

                  <div className="admin-menu-group">

                    <span>
                      Administration
                    </span>

                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                    >
                      <FaTachometerAlt />
                      Dashboard
                    </Link>

                    <Link
                      to="/admin/products"
                      onClick={() => setOpen(false)}
                    >
                      <FaBoxes />
                      Manage Products
                    </Link>

                    <Link
                      to="/admin/add-product"
                      onClick={() => setOpen(false)}
                    >
                      <FaPlus />
                      Add Product
                    </Link>

                    <Link
                      to="/admin/orders"
                      onClick={() => setOpen(false)}
                    >
                      <FaBoxOpen />
                      Manage Orders
                    </Link>

                    <Link
                      to="/admin/resort-bookings"
                      onClick={() => setOpen(false)}
                    >
                      <FaTicketAlt />
                      Manage Resort Bookings
                    </Link>

                    <Link
                      to="/admin/events"
                      onClick={() => setOpen(false)}
                    >
                      <FaCalendarAlt />
                      Manage Events
                    </Link>

                    <Link
                      to="/admin/tickets"
                      onClick={() => setOpen(false)}
                    >
                      <FaTicketAlt />
                      Manage Ticket Sales
                    </Link>

                    <Link
                      to="/admin/add-employee"
                      onClick={() => setOpen(false)}
                    >
                      <FaUserPlus />
                      Add Employee
                    </Link>

                  </div>

                )}


                {/* ================= LOGOUT ================= */}

                <button
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt />
                  Logout
                </button>

              </div>

            )}

          </div>

        ) : (

          <div className="auth-links">

            <Link to="/login">
              Login
            </Link>

            <div className="Register-auth-link">
              <Link to="/register">
                Register
              </Link>
            </div>

          </div>

        )}

      </div>

    </nav>
  );
}

export default Navbar;

