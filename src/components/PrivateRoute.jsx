import React from "react";
import { Navigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

const PrivateRoute = ({ children }) => {
  const { auth } = useFirebase();

  return auth?.currentUser ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
