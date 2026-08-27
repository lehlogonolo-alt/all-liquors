import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "allLiquorsCart";

function normalizeItem(item) {
  return {
    id: Number(item.id),
    name: String(item.name || "Product"),
    price: Number(item.price) || 0,
    image: item.image || "",
    category: item.category || "",
    quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1))
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(saved) ? saved.map(normalizeItem) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product, quantity = 1) {
    const safeProduct = normalizeItem({ ...product, quantity });

    setItems((current) => {
      const existing = current.find((item) => item.id === safeProduct.id);

      if (existing) {
        return current.map((item) =>
          item.id === safeProduct.id
            ? { ...item, quantity: Math.min(99, item.quantity + safeProduct.quantity) }
            : item
        );
      }

      return [...current, safeProduct];
    });
  }

  function updateQuantity(id, quantity) {
    const safeQuantity = Math.min(99, Math.max(1, Number(quantity) || 1));
    setItems((current) =>
      current.map((item) =>
        item.id === Number(id) ? { ...item, quantity: safeQuantity } : item
      )
    );
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== Number(id)));
  }

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
