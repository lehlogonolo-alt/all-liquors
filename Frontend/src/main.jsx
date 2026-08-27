import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const originalFetch = window.fetch.bind(window);
const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

window.fetch = (input, init = {}) => {
  const originalUrl = typeof input === "string" ? input : input?.url || "";
  const isLegacyLocalApi = originalUrl.startsWith("http://localhost:3000");
  const isApiRequest = originalUrl.startsWith(apiBase) || isLegacyLocalApi;

  if (!isApiRequest) return originalFetch(input, init);

  let requestInput = input;
  if (isLegacyLocalApi && apiBase !== "http://localhost:3000") {
    const localUrl = new URL(originalUrl);
    const rewrittenUrl = `${apiBase}${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
    requestInput = typeof input === "string" ? rewrittenUrl : new Request(rewrittenUrl, input);
  }

  const token = sessionStorage.getItem("accessToken");
  const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined) || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return originalFetch(requestInput, { ...init, headers }).then((response) => {
    if (response.status === 401 && token) {
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
    return response;
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
