import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.js";
import {dbConnection} from "./db/config.js";


dotenv.config()
const PORT = process.env.port_number || 7000;
const app = express();
app.use(express.json())
app.use(cors({
    origin:"http://localhost:5173"
}))
app.use(cookieParser())
dbConnection()
app.get("/",(req,res)=>{
    res.send("Chl rha hn")
})

app.use("/api/auth", authRoute)


// app.use("/api/jobs", jobsRoute)
// app.use("/api/categories", categoriesRoute)






app.listen(PORT,()=>{
    console.log("Server is Running on the PORT "+PORT);
})
