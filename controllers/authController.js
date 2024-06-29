import nodemailer from "nodemailer";
import Users from "../models/Users.js";
import { v4 as uuidv4 } from "uuid";
import { compareSync, genSaltSync, hashSync } from "bcrypt";
import { ALREADYEXISTS, BADREQUEST, CREATED, FORBIDDEN, INTERNALERROR, NOTFOUND, OK } from "../constants/httpStatus.js";
import { responseMessages } from "../constants/responseMessage.js";
import { GenerateToken } from "../helpers/Token.js";
import { sendEmailOTP } from "../helpers/mailFunc.js";
import { sendError, sendSuccess } from "../utils/response.js";




export const signUp = async (req, res) => {

    try {
        const { firstName, lastName, email, password, cPassword } = req.body;
        if (!firstName, !lastName, !email, !password, !cPassword) {
            return res.status(BADREQUEST)
                .send(sendError({ status: false, message: responseMessages.MISSING_FIELDS }))
        }
        const user = await Users.findOne({ email: email })
        if (user) {
            return res.status(ALREADYEXISTS).send(sendError({ status: false, message: responseMessages.EMAIL_EXIST }))
        } else {
            const user = await Users.findOne({ firstName: firstName });
            if (user) {
                return res
                    .status(ALREADYEXISTS).send(sendError({ status: false, message: responseMessages.USER_EXISTS }));
            } else {
                const salt = genSaltSync(10);

                let doc;
                if (password?.length > 7) {
                    doc = new Users({
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        password: hashSync(password, salt),
                    });
                    // console.log(doc);
                    const otp = uuidv4().slice(0, 6);
                    doc.otp = otp
                    doc.expiresIn = Date.now() + 300000;
                    const savedUser = await doc.save()
                    if (savedUser.errors) {
                        return res
                            .status(INTERNALERROR)
                            .send(sendError({ status: false, message: error.message, error }));
                    } else {
                        // return res.send(savedUser);
                        console.log(savedUser.password);
                        savedUser.password = undefined;
                        const token = GenerateToken({ data: savedUser, expiresIn: '24h' });

                        console.log("token", token);
                        console.log("email",email);
                        const emailResponse =await  sendEmailOTP(email, otp);
                        console.log(emailResponse, "===>");
                        return res.status(CREATED).json(
                            sendSuccess({
                                status: true,
                                message: responseMessages.SUCCESS_REGISTRATION,
                                token,
                                data: savedUser,
                            })
                        );
                    }
                } else {
                    return res
                        .status(FORBIDDEN)
                        .send(sendError({ status: false, message: responseMessages.UN_AUTHORIZED }));
                }
            }
        }
    } catch (err) {
        return res
            .status(500) //INTERNALERROR
            // .send(sendError({ status: false, message: error.message, error }));
            .send(err.message);
    }
};


export const verifyEmail = async (req, res) => {
    //  console.log(req.user);
    try {
        const { otp } = req.body;
        console.log("otp", otp);
        if (otp) {
            const user = await Users.findOne({ otp: otp, _id: req.user._id });
            console.log("user", user);
            if (user) {
                console.log(user, "===>> user")
                console.log(user.expiresIn > Date.now());
                if (user.expiresIn > Date.now()) {
                    user.isVerified = true;
                    user.otp = undefined;
                    user.otpExpires = undefined;
                    await user.save();
                    console.log("user", user);
                    return res.status(OK).send(
                        sendSuccess({
                            status: true,
                            message: 'Email Verified Successfully',
                            data: user,
                        })
                    );
                } else {
                    return res.status(OK).send(
                        sendError({
                            status: false,
                            message: 'OTP has expired. Please request a new OTP',
                        })
                    );
                }
            } else {
                return res
                    .status(FORBIDDEN)
                    .send(sendError({ status: false, message: 'Invalid OTP' }));
            }
        } else {
            return res
                .status(BADREQUEST)
                .send(sendError({ status: false, message: responseMessages.MISSING_FIELDS }));
        }
    } catch (error) {
        return res
            .status(INTERNALERROR)
            .send(sendError({ status: false, message: error.message, error }));
    }
};


export const login = async (req, res) => {
    try {

        const { email, password } = req.body;
        if (email && password) {
            const user = await Users.findOne({ email: email });
            console.log("user", user);

            if (user) {
                const isValid = compareSync(password, user.password);
                if (user.email === email && isValid) {
                    user.password = undefined;
                    const token = GenerateToken({ data: user, expiresIn: '24h' });
                    res.cookie("token", token, { httpOnly: true });
                    res.status(OK).send(
                        sendSuccess({
                            status: true,
                            message: 'Login Successful',
                            token,
                            data: user,
                        })
                    );
                } else {
                    return res
                        .status(FORBIDDEN)
                        .send(sendError({ status: false, message: responseMessages.UN_AUTHORIZED }));
                };
            } else {
                return res
                    .status(NOTFOUND)
                    .send(sendError({ status: false, message: responseMessages.NO_USER }));
            };

        } else {
            return res.status(BADREQUEST) //BADREQUEST
                .send(sendError({ status: false, message: responseMessages.MISSING_FIELDS}));

        };

    } catch (error) {
        res.status(INTERNALERROR).send({
            status: false,
            message: error.message
        })
    }
};


export const forgotPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (email) {
            const user = await Users.findOne({ email: email });
            if (user) {
                const secret = user._id + process.env.jwt_secret_key;
                const token = GenerateToken({ data: secret, expiresIn: '2h' });
                // res.send(token)
                const link = `${process.env.web_link}/api/auth/reset_password/${user._id}/${token}`;
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.portal_email,
                        pass: process.env.portal_password,
                    },
                });

                const mailOptions = {
                    from: process.env.portal_email,
                    to: email,
                    subject: 'Reset Password',
                    text: `Please click on the link to reset your password ${link}`,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        return res
                            .status(INTERNALERROR)
                            .send(sendError({ status: false, message: error.message }));
                    } else {
                        console.log('Email sent: ' + info.response);
                        return res.status(OK).send(
                            sendSuccess({
                                status: true,
                                message: 'Reset Password Link Generated',
                            })
                        );
                    }
                });

            } else {
                return res
                    .status(NOTFOUND)
                    .send(sendError({ status: false, message: responseMessages.NO_USER_FOUND }));
            }
        } else {
            return res
                .status(BADREQUEST)
                .send(sendError({ status: false, message: responseMessages.MISSING_FIELD_EMAIL }));
        }

    } catch (error) {
        res.status(INTERNALERROR).send({
            status: false,
            message: error.message,
            data: null
        })
    }
};

export const getResetPassword = async (req, res)=>{
    const {id, token} = req.params;
    try{
        const user = await Users.findById(id);
        if(!user){
            return res.status(NOTFOUND).send(responseMessages.NO_USER_FOUND);
        }
        try {
            const verifyUser = verify(token, process.env.jwt_secret_key); 
            const frontendResetPasswordUrl = `${process.env.FRONTEND_URL}/reset_password/${id}/${token}`;
            return res.status(OK).send(`
            <html>
            <head>
                <style>
                   *{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                   }
                    .passwordPar{
                        width: 100%;
                        height:100%;
                        display: flex;
                        justify-content:center;
                        align-items:center;
                    }
                    .passwordWrapper{
                        max-width:90vw;
                        width:400px;
                        height: 150px;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        gap:30px;
                        padding:15px 10px;
                        border-radius:10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .button {
                        background-color: rgb(104, 81, 255);
                        border: none;
                        color: white;
                        padding: 15px 32px;
                        text-align: center;
                        text-decoration: none;
                        display: inline-block;
                        font-size: 16px;
                        margin: 4px 2px;
                        cursor: pointer;
                        border-radius: 10px;
                    }
                    #change{
                        text-align:center;
                    }

                    .button:hover {
                        background-color: blue;
                    }
                    #header{
                        font-size: 25px;
                        font-weight: 500;
                        font-family: sans-serf;
                    }
                </style>
            </head>
            <body>
                <div class="passwordPar">
                 <div class="passwordWrapper">
                 <div>
                <p id="header">Verified successfully!</p>
                <p id="change">Now, Change your password</p>
                </div>
                <button class="button" onclick="redirectToResetPassword()">Reset Password</button>
                </div>
                </div>
                <script>
                    function redirectToResetPassword() {
                        window.location.href = '${frontendResetPasswordUrl}';
                    }
                </script>
            </body>
        </html>
            `);
        } catch (err) {
            return res.status(BADREQUEST).send(`
            <html>
            <head>
                <style>
                   *{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                   }
                    .passwordPar{
                        width: 100%;
                        height:100%;
                        display: flex;
                        justify-content:center;
                        align-items:center;
                    }
                    .passwordWrapper{
                        max-width:90vw;
                        width:400px;
                        background-color:red;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                        gap:30px;
                        padding:15px 10px;
                        border-radius:10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .button {
                        background-color: rgb(104, 81, 255);
                        border: none;
                        color: white;
                        padding: 15px 32px;
                        text-align: center;
                        text-decoration: none;
                        display: inline-block;
                        font-size: 16px;
                        margin: 4px 2px;
                        cursor: pointer;
                        border-radius: 10px;
                    }
                    #change{
                        text-align:center;
                    }

                    .button:hover {
                        background-color: blue;
                    }
                    #header{
                        font-size: 25px;
                        font-weight: 500;
                        font-family: sans-serf;
                        color: white;
                    }
                </style>
            </head>
            <body>
                <div class="passwordPar">
                 <div class="passwordWrapper">
                 <div>
                <p id="header">You are not Verified!</p>
                </div>
                </div>
                </div>
                
            </body>
        </html>`);
        }

    }catch(error){
        res.status(BADREQUEST).send({
            status: false,
            message: res.message,
        })
    }
}


export const resetPasswordEmail = async (req, res) => {
    try {
        const { newPassword, confirmNewPassword, token } = req.body;
      
        if (newPassword && confirmNewPassword && token) {
            const {result} = verify(token, process.env.jwt_secret_key);
            const userId = result.split("kashmiripolao")[0]
            const user = await Users.findById(userId);
            console.log(user);
            if (user) {
                const salt = genSaltSync(10);
                const hashedPassword = hashSync(newPassword, salt);
                console.log("hashedPassword", hashedPassword);
                await Users.findByIdAndUpdate(userId, {
                    $set: { password: hashedPassword },
                });
                return res.status(OK).send(
                    sendSuccess({
                        status: true,
                        message: 'Password Updated Successfully',
                    })
                );
            } else {
                return res
                    .status(NOTFOUND)
                    .send(sendError({ status: false, message: responseMessages.NO_USER }));
            }
        } else {
            return res
                .status(BADREQUEST)
                .send(sendError({ status: false, message: responseMessages.MISSING_FIELDS }));
        }

    } catch (error) {

    }
}

export const getUser =async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) return res.sendStatus(401);
        let data;
        verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
            if (err) return res.status(BADREQUEST).send("Token is not valid");
            data = user;
        });
        console.log(data);
        const currentUser = await Users.findById({_id: data.result._id})
        if(currentUser){
            const otp = uuidv4().slice(0, 6);
            currentUser.otp = otp
            currentUser.expiresIn = Date.now() + 60000;
            const savedUser = await currentUser.save()
            if(savedUser.errors){
                    return res
                        .status(INTERNALERROR)
                        .send(sendError({ status: false, message: error.message, error }));

            }else{
                    // return res.send(savedUser);
                    const token2 = GenerateToken({ data: savedUser, expiresIn: '24h' });
                        console.log("token", token);
                        const emailResponse = await sendEmailOTP(savedUser.email, otp);
                            console.log(emailResponse, "===>");
                            return res.status(OK).json(
                                sendSuccess({
                                    status: true,
                                    message: "Otp regenerated Successfully",
                                    token2,
                                    data: savedUser,
                                })
                            );
            }
        }else{
            return res
                    .status(NOTFOUND)
                    .send(sendError({ status: false, message: responseMessages.NO_USER }));
        }

    } catch (error) {
        res.send(INTERNALERROR).send({
            status: false,
            message: error.message
        })
    }
}


