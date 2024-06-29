import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config()

export const dbConnection =async ()=>{
    try{
        const con = await  mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${con.connection.host}`);
    }catch(err){
        console.log(err);
    }
}