import mongoose from "mongoose"
const users = mongoose.Schema(
    {
        firstName:{
            type: String,
            required: [true, 'Please Add First Name'],
            minlength: 3,
            maxlength: 20,
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Please Add Last Name'],
            minlength: 3,
            maxlength: 20,
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please Add Email'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, 'Please Add Password'],
            minlength: 8,
            trim: true,
        },
        otp: {
            type: String,
        },
        expiresIn: {
            type: Date
        },
        isVerified: {
            type: Boolean,
            default: false
        },
         PasswordResetToken: {
            type: String,
            minlength: 8,
            trim: true,
        },
        ExpiryPasswordResetToken: {
            type: Date,
        }

    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Users', users);