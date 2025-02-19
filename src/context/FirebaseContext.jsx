import React, { createContext, useContext } from "react";
import { auth, db } from "../firebase"; // Import Firebase services

// Create Firebase Context
const FirebaseContext = createContext(null);

// Provider Component
export const FirebaseProvider = ({ children }) => {
  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Custom Hook for Using Firebase Context
export const useFirebase = () => {
  return useContext(FirebaseContext);
};
