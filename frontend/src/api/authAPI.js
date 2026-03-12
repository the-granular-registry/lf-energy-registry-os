import baseAPI from "./baseAPI";

export const loginAPI = (credentials) => {
  // Ensure x-www-form-urlencoded body for OAuth2PasswordRequestForm
  const form = new URLSearchParams();
  form.append("username", credentials.username);
  form.append("password", credentials.password);
  return baseAPI.post("/auth/login", form, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
};
