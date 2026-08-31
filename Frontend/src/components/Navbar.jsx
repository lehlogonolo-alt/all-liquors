import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  useEffect,
  useState
} from "react";

import {
  FaBars,
  FaTimes,
  FaBoxOpen,
  FaHeart,
  FaTachometerAlt,
  FaBoxes,
  FaPlus,
  FaCalendarAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaTicketAlt,
  FaShoppingBasket,
  FaHome,
  FaStore,
  FaUmbrellaBeach,
  FaEnvelope
} from "react-icons/fa";

import allLiquorsLogo from "../assets/allliquors-logo.jpeg";
import { useCart } from "../context/CartContext";

function Navbar({
  user,
  setUser
}) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [open, setOpen] =
    useState(false);

  const [
    mobileOpen,
    setMobileOpen
  ] = useState(false);

  const { itemCount } =
    useCart();

  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle(
      "mobile-nav-open",
      mobileOpen
    );

    return () =>
      document.body.classList.remove(
        "mobile-nav-open"
      );
  }, [mobileOpen]);

  function closeMenus() {
    setOpen(false);
    setMobileOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "accessToken"
    );

    setUser(null);

    closeMenus();

    navigate("/login");
  }

  const customerLinks = (
    <>
      <Link
        to="/orders"
        onClick={closeMenus}
      >
        <FaBoxOpen />
        Order History
      </Link>

      <Link
        to="/favorites"
        onClick={closeMenus}
      >
        <FaHeart />
        Saved Products
      </Link>

      <Link
        to="/resort/bookings"
        onClick={closeMenus}
      >
        <FaTicketAlt />
        Resort Bookings
      </Link>

      <Link
        to="/tickets"
        onClick={closeMenus}
      >
        <FaTicketAlt />
        My Tickets
      </Link>
    </>
  );

  const adminLinks = (
    <>
      <Link
        to="/admin"
        onClick={closeMenus}
      >
        <FaTachometerAlt />
        Dashboard
      </Link>

      <Link
        to="/admin/products"
        onClick={closeMenus}
      >
        <FaBoxes />
        Manage Products
      </Link>

      <Link
        to="/admin/add-product"
        onClick={closeMenus}
      >
        <FaPlus />
        Add Product
      </Link>

      <Link
        to="/admin/orders"
        onClick={closeMenus}
      >
        <FaBoxOpen />
        Manage Orders
      </Link>

      <Link
        to="/admin/resort-bookings"
        onClick={closeMenus}
      >
        <FaTicketAlt />
        Manage Resort Bookings
      </Link>

      <Link
        to="/admin/events"
        onClick={closeMenus}
      >
        <FaCalendarAlt />
        Manage Events
      </Link>

      <Link
        to="/admin/tickets"
        onClick={closeMenus}
      >
        <FaTicketAlt />
        Manage Ticket Sales
      </Link>

      <Link
        to="/admin/add-employee"
        onClick={closeMenus}
      >
        <FaUserPlus />
        Add Employee
      </Link>
    </>
  );

  return (
    <nav
      className="navbar"
      aria-label="Main navigation"
    >
      <div className="nav-left">
        <Link
          to="/"
          className="brand-mark"
          onClick={closeMenus}
          aria-label="All Liquors home"
        >
          <img
            src={allLiquorsLogo}
            alt="All Liquors"
          />
        </Link>

        <div className="nav-links">
          <Link to="/">
            Home
          </Link>

          <Link to="/shop">
            Shop
          </Link>

          <Link to="/events">
            Events
          </Link>

          <Link to="/elephant-resort">
            Elephant Resort
          </Link>

          <Link to="/contact">
            Contact
          </Link>
        </div>
      </div>

      <div className="nav-right">
        {!user?.isAdmin && (
          <Link
            to="/cart"
            className="nav-cart-link"
            aria-label={`Shopping basket with ${itemCount} items`}
            onClick={closeMenus}
          >
            <FaShoppingBasket />

            <span className="nav-cart-text">
              Basket
            </span>

            {itemCount > 0 && (
              <span className="nav-cart-count">
                {itemCount > 99
                  ? "99+"
                  : itemCount}
              </span>
            )}
          </Link>
        )}

        <div className="desktop-account-area">
          {user ? (
            <div className="user-dropdown">
              <button
                className="dropdown-btn"
                onClick={() =>
                  setOpen(!open)
                }
                aria-expanded={open}
              >
                {user.email}

                <span
                  className={`dropdown-chevron ${
                    open
                      ? "open"
                      : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {open && (
                <div className="dropdown-menu">
                  {!user.isAdmin &&
                    customerLinks}

                  {user.isAdmin && (
                    <div className="admin-menu-group">
                      <span>
                        Administration
                      </span>

                      {adminLinks}
                    </div>
                  )}

                  <button
                    className="logout-btn"
                    onClick={
                      handleLogout
                    }
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

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() =>
            setMobileOpen(
              (value) =>
                !value
            )
          }
          aria-label={
            mobileOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={
            mobileOpen
          }
        >
          {mobileOpen ? (
            <FaTimes />
          ) : (
            <FaBars />
          )}
        </button>
      </div>

      <div
        className={`mobile-nav-backdrop ${
          mobileOpen
            ? "open"
            : ""
        }`}
        onClick={closeMenus}
        aria-hidden="true"
      />

      <aside
        className={`mobile-nav-drawer ${
          mobileOpen
            ? "open"
            : ""
        }`}
        aria-hidden={
          !mobileOpen
        }
      >
        <div className="mobile-nav-head">
          <img
            src={allLiquorsLogo}
            alt="All Liquors"
          />

          <button
            type="button"
            onClick={closeMenus}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mobile-nav-links">
          <Link
            to="/"
            onClick={closeMenus}
          >
            <FaHome />
            Home
          </Link>

          <Link
            to="/shop"
            onClick={closeMenus}
          >
            <FaStore />
            Shop
          </Link>

          <Link
            to="/events"
            onClick={closeMenus}
          >
            <FaCalendarAlt />
            Events
          </Link>

          <Link
            to="/elephant-resort"
            onClick={closeMenus}
          >
            <FaUmbrellaBeach />
            Elephant Resort
          </Link>

          <Link
            to="/contact"
            onClick={closeMenus}
          >
            <FaEnvelope />
            Contact
          </Link>
        </div>

        {user && (
          <div className="mobile-nav-section">
            <span className="mobile-nav-label">
              {user.isAdmin
                ? "Administration"
                : "My account"}
            </span>

            <div className="mobile-nav-links compact">
              {user.isAdmin
                ? adminLinks
                : customerLinks}
            </div>
          </div>
        )}

        <div className="mobile-nav-footer">
          {user ? (
            <>
              <div className="mobile-user-email">
                {user.email}
              </div>

              <button
                type="button"
                className="mobile-logout-btn"
                onClick={
                  handleLogout
                }
              >
                <FaSignOutAlt />
                Logout
              </button>
            </>
          ) : (
            <div className="mobile-auth-actions">
              <Link
                to="/login"
                className="mobile-login-btn"
                onClick={
                  closeMenus
                }
              >
                Login
              </Link>

              <Link
                to="/register"
                className="mobile-register-btn"
                onClick={
                  closeMenus
                }
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>
    </nav>
  );
}

export default Navbar;

