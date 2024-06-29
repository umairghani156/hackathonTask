import express from "express";
import { validateToken } from "../helpers/Token.js";
import { forgotPasswordEmail, getResetPassword, login, resetPasswordEmail, signUp, verifyEmail } from "../controllers/authController.js";

const authRoute = express.Router()

authRoute.post("/signup", signUp)
authRoute.post("/login", login)
 authRoute.post("/verifyEmail", validateToken, verifyEmail);
 authRoute.post("/forgotPassword", forgotPasswordEmail)
 authRoute.get("/reset_password/:id/:token", getResetPassword)
authRoute.put('/resetPassword', resetPasswordEmail);
// authRoute.put("/user", getUser)



export default authRoute;