import React, { StrictMode, Suspense } from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import { AccountProvider } from "./context/AccountContext";
import { UserProvider } from "./context/UserContext";
import { store } from "./store";
import AppRoutes from "./AppRoutes";

const App = () => {
  return (
    <Provider store={store}>
      <UserProvider>
        <AccountProvider>
          <StrictMode>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>}>
                <AppRoutes />
              </Suspense>
            </Router>
          </StrictMode>
        </AccountProvider>
      </UserProvider>
    </Provider>
  );
};

export default App;
