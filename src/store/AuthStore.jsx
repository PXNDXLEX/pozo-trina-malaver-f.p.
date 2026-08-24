import { create } from "zustand";

export const useAuthStore = create((set) => ({
  // Recuperamos el usuario de localStorage convirtiendo el string de nuevo a Objeto (u objeto vacío si no existe)
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,

  login: (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData)); // Guardamos el usuario persistido
    set({ user: userData, token });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // Limpiamos al cerrar sesión
    set({ user: null, token: null });
  }
}));
