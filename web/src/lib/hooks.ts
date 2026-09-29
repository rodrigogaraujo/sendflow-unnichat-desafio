import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";

export const useAuth = () => {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => setState({ user, loading: false })),
    [],
  );
  return state;
};
export const useCollection = <T extends { id: string }>(
  name: string,
  tenantId: string,
) => {
  const [state, setState] = useState<{
    items: T[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: true, error: "" });
  useEffect(() => {
    setState({ items: [], loading: true, error: "" });
    return onSnapshot(
      query(collection(db, name), where("tenantId", "==", tenantId)),
      (snapshot) => {
        setState({
          items: snapshot.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as T,
          ),
          loading: false,
          error: "",
        });
      },
      () =>
        setState({
          items: [],
          loading: false,
          error:
            "Não foi possível carregar seus dados. Verifique a conexão e tente recarregar a página.",
        }),
    );
  }, [name, tenantId]);
  return state;
};
