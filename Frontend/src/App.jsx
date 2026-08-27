import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Products from "./components/Products";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Events from "./components/Events";
import ProtectedRoute from "./components/ProtectedRoute";
import Contact from "./components/Contact";
import Shop from "./components/Shop";
import Footer from "./components/Footer";
import EventsPreview from "./components/EventsPreview";
import Newsletter from "./components/Newsletter";
import AddProduct from "./components/AddProduct";
import AdminProducts from "./components/AdminProducts";
import AdminDashboard from "./components/AdminDashboard";
import AddEmployee from "./components/AddEmployee";
import EmployeeHours from "./components/EmployeeHours";
import AdminEvents from "./components/AdminEvents";
import ForgotPassword from "./components/ForgotPassword";
import UserProtectedRoute from "./components/UserProtectedRoute";
import OrderHistory from "./components/OrderHistory";
import OrderCollection from "./components/OrderCollection";
import Favorites from "./components/Favorites";
import OrderCallback from "./components/OrderCallback";
import AdminOrders from "./components/AdminOrders";
import { Toaster } from "sonner";
import ElephantResort from "./components/ElephantResort";
import ResortCallback from "./components/ResortCallback";
import ResortBookings from "./components/ResortBookings";
import AdminResortBookings from "./components/AdminResortBookings";
import EventTicketCheckout from "./components/EventTicketCheckout";
import TicketCallback from "./components/TicketCallback";
import MyTickets from "./components/MyTickets";
import TicketVerify from "./components/TicketVerify";
import AdminTickets from "./components/AdminTickets";
import ScrollToTop from "./components/ScrollToTop";
import Cart from "./components/Cart";
import { CartProvider } from "./context/CartContext";
import MaintenancePage from "./components/MaintenancePage";
import FAQ from "./components/FAQ";
import About from "./components/About";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Terms from "./components/Terms";




function MaintenanceGate({ user, children }) {
  const location = useLocation();
  const [status, setStatus] = useState({
    loading: true,
    maintenanceMode: false,
    message: ""
  });

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      try {
        const response = await fetch("http://localhost:3000/site-status", {
          cache: "no-store"
        });
        const data = await response.json();
        if (mounted) {
          setStatus({
            loading: false,
            maintenanceMode: Boolean(data.maintenanceMode),
            message: data.message || ""
          });
        }
      } catch (error) {
        // Fail open if the status endpoint cannot be reached. API security and
        // availability are still enforced by the backend.
        console.error("Could not load website status:", error);
        if (mounted) {
          setStatus((current) => ({
            ...current,
            loading: false,
            maintenanceMode: import.meta.env.PROD ? true : current.maintenanceMode,
            message: import.meta.env.PROD
              ? "The website is temporarily unavailable. Please check back shortly."
              : current.message
          }));
        }
      }
    };

    loadStatus();
    const timer = setInterval(loadStatus, 5000);

    const onStatusChanged = () => loadStatus();
    window.addEventListener("maintenance-status-changed", onStatusChanged);

    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("maintenance-status-changed", onStatusChanged);
    };
  }, []);

  const admin = user?.isAdmin === true || user?.IsAdmin === true || user?.IsAdmin === 1;
  const allowAdminLogin = location.pathname === "/login" || location.pathname === "/forgot-password";

  if (status.loading) {
    return <div className="site-status-loading" aria-label="Loading website" />;
  }

  if (status.maintenanceMode && !admin && !allowAdminLogin) {
    return <MaintenancePage message={status.message} />;
  }

  return children;
}

function App() {
  
  const [user, setUser] = useState(null);

  useEffect(() => {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  if (storedUser) {
    setUser(storedUser);
  }
}, []);

  

  return (
    <CartProvider>
    <BrowserRouter>

    <ScrollToTop />

    <MaintenanceGate user={user}>
      <Navbar  user={user} setUser={setUser} />

      
      <Routes>
        
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/products"
  element={
    <ProtectedRoute>
      <AdminProducts />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/add-product"
  element={
    <ProtectedRoute>
      <AddProduct />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/events"
  element={
    <ProtectedRoute>
      <AdminEvents />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/add-employee"
  element={
    <ProtectedRoute>
      <AddEmployee />
    </ProtectedRoute>
  }
/>

<Route
  path="/employee-hours/:id"
  element={
    <ProtectedRoute>
      <EmployeeHours />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/orders"
  element={
    <ProtectedRoute>
      <AdminOrders />
    </ProtectedRoute>
  }
/>


<Route
  path="/admin/resort-bookings"
  element={
    <ProtectedRoute>
      <AdminResortBookings />
    </ProtectedRoute>
  }
/>

<Route
  path="/resort/bookings"
  element={
    <UserProtectedRoute>
      <ResortBookings />
    </UserProtectedRoute>
  }
/>

<Route
  path="/resort/callback"
  element={
    <UserProtectedRoute>
      <ResortCallback />
    </UserProtectedRoute>
  }
/>


<Route
  path="/admin/tickets"
  element={
    <ProtectedRoute>
      <AdminTickets />
    </ProtectedRoute>
  }
/>

<Route
  path="/tickets"
  element={
    <UserProtectedRoute>
      <MyTickets />
    </UserProtectedRoute>
  }
/>

<Route
  path="/tickets/callback"
  element={
    <UserProtectedRoute>
      <TicketCallback />
    </UserProtectedRoute>
  }
/>

<Route path="/ticket/:token" element={<TicketVerify />} />
<Route path="/events/:id/tickets" element={<EventTicketCheckout />} />

<Route
  path="/admin/reservations"
  element={
    <ProtectedRoute>
      <AdminOrders />
    </ProtectedRoute>
  }
/>

<Route
  path="/orders"
  element={
    <UserProtectedRoute>
      <OrderHistory />
    </UserProtectedRoute>
  }
/>

<Route
  path="/orders/:id"
  element={
    <UserProtectedRoute>
      <OrderCollection />
    </UserProtectedRoute>
  }
/>

<Route
  path="/orders/callback"
  element={
    <UserProtectedRoute>
      <OrderCallback />
    </UserProtectedRoute>
  }
/>

<Route
  path="/reservations"
  element={<Navigate to="/orders" replace />}
/>

<Route
  path="/reservations/callback"
  element={<Navigate to="/orders/callback" replace />}
/>

<Route
  path="/favorites"
  element={
    <UserProtectedRoute>
      <Favorites />
    </UserProtectedRoute>
  }
/> 
        <Route
          path="/" 
          element={
            <>
              <Hero />
              <Products  />
              <EventsPreview />
          
              
              
              
            </>
          }
        />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/register" element={<Register />} />
        <Route path="/events" element={<Events />} />
        <Route path="/elephant-resort" element={<ElephantResort />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route
        path="/forgot-password"
        element={<ForgotPassword />}
        />
        
        <Route path="/faq" element={<FAQ />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>

          <Toaster
  position="top-right"
  richColors
  closeButton
  duration={3000}
  toastOptions={{
    style: {
      background: "#111827",
      color: "#ffffff",
      border: "1px solid #d4af37",
      borderRadius: "14px",
      fontWeight: "600",
      boxShadow: "0 8px 24px rgba(0,0,0,.18)"
    }
  }}
/>

     <Footer />

    </MaintenanceGate>
    </BrowserRouter>
    </CartProvider>
    
  );
}

export default App;