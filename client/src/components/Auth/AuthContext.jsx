import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../../api";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const logout = () => setUser(null);
    window.addEventListener("furpaws:logout", logout);
    if (sessionStorage.getItem("furpawsToken"))
      api
        .get("/users/me")
        .then(({ data }) => setUser(data))
        .catch(() => sessionStorage.removeItem("furpawsToken"))
        .finally(() => setLoading(false));
    else setLoading(false);
    return () => window.removeEventListener("furpaws:logout", logout);
  }, []);
  const login = async (values) => {
    const { data } = await api.post("/auth/login", values);
    sessionStorage.setItem("furpawsToken", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    sessionStorage.removeItem("furpawsToken");
    sessionStorage.removeItem("furpawsDraft");
    sessionStorage.removeItem("furpawsConfirmation");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
