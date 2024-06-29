import pkg from "jsonwebtoken";
import dotenv from "dotenv";
import { NOTALLOWED, NOTFOUND, OK, UNAUTHORIZED } from "../constants/httpStatus.js";
const {sign, verify} = pkg;

dotenv.config()

export const GenerateToken = ({ data, expiresIn }) => {
    //make the key more harder
    //expires in should also be from .env file
    //good approach
    return sign({ result: data }, process.env.jwt_secret_key, { expiresIn:expiresIn });
};

export const validateToken = (req, res, next) => {
    let token;
    const { authorization } = req.headers;
    if(!authorization){
        return res.status(NOTFOUND).send({
            status: false,
            message: "Something went wrong with token"
        })
    }
    console.log(authorization.startsWith("Bearer"), "===>>authorization")

    if(authorization && authorization.startsWith('Bearer')){
        try{
            // Get Token from header
            token = authorization.split(' ')[1];
            console.log(token, "====>>token")
            // Verify Token
            const verification = verify(token, process.env.jwt_secret_key);
            const { result } = verify(token, process.env.jwt_secret_key);
            // console.log("result",result);
            req.user = result;
            next();
        }catch(error){
            console.log(error, "===>>error")
            res.status(401).send({ status: 'failed', message: 'Unauthorized User' });
        }
    };
    if (!token) {
        res
            .status(401)
            .send({ status: 'failed', message: 'Unauthorized User, No Token' });
    };
   

};