// Same documentation and concepts as homeCont.js refer them if you want to understant the concepts

const Staff = require("../models/staff");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Event = require("../models/event");
const Dept = require("../models/dept");
const Participant = require("../models/participant");

// for using mongoose methods
const Magazines = require("../models/magazine-reciever");
const Events = require("../models/event");
const Departments = require("../models/dept");
const Participants = require("../models/participant");

const staffCont = {
    // Controller to render the staff login page
    staffLoginPage: (req, res) => {
        // console.log(req.cookies.jwt_token);
        if (req.cookies.jwt_token) {
            return res.redirect("/dashboard");
        }
        return res.render("layouts/staff-login", {
            error: req.flash("error"),
        });
    },

    staffRegisterPage: (req, res) => {
        // console.log(req.cookies.jwt_token);
        if (req.cookies.jwt_token) {
            return res.redirect("/dashboard");
        }
        return res.render("layouts/staff-register", {
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    staffPasswordResetPage: (req, res) => {
        // console.log(req.cookies.jwt_token);
        if (req.cookies.jwt_token) {
            res.redirect("/dashboard");
        }
        return res.render("layouts/password-reset-email", {
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    staffActualPasswordResetPage: (req, res) => {
        // console.log(req.cookies.jwt_token);
        const { token } = req.params;
        if (req.cookies.jwt_token) {
            res.redirect("/dashboard");
        }
        return res.render("layouts/password-reset", {
            token,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    // Controller to register the staff member
    staffRegister: async (req, res, next) => {
        try {
            const {
                firstname,
                lastname,
                email,
                department,
                designation,
                profile_pic_url,
                key,
            } = req.body;
            await Staff.findOne({ email }, async (err, staff) => {
                if (err) {
                    console.log(err);
                    next(ErrorHandler.serverError());
                } else if (staff) {
                    // return res.status(200).json({
                    //     message: "Member with this email already exists",
                    // });
                    req.flash("error", "Member with this email already exists");
                    return res.redirect("/staff-register");
                } else {
                    const token = jwt.sign(
                        {
                            firstname,
                            lastname,
                            email,
                            department,
                            designation,
                            profile_pic_url,
                            key,
                        },
                        process.env.JWT_ACCOUNT_ACTIVATION_SECRET,
                        {
                            expiresIn: "5m",
                        }
                    );

                    const transporter = nodeMailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: process.env.EMAIL_ID,
                            pass: process.env.EMAIL_PASSWORD,
                        },
                    });

                    const mailOptions = {
                        from: process.env.EMAIL_ID,
                        to: email,
                        subject: "Account activation link | E-Cell, GNDEC",
                        html: `
                        <h1>Hello, ${firstname + " " + lastname}</h1>
                        <p>Click button below to verify your account</p>
                        <a href="${process.env.CLIENT_URL
                            }/staff-account/activation/${token}">Activate</a>
                    `,
                    };

                    transporter.sendMail(mailOptions, (error, data) => {
                        if (error) {
                            console.log(error);
                            next(ErrorHandler.serverError());
                        } else {
                            // console.log(data);
                            // return res.status(200).json({
                            //     message: "Account activation link sent successfully!",
                            // });
                            req.flash(
                                "success",
                                "Account activation link sent successfully!"
                            );
                            return res.redirect("/staff-register");
                        }
                    });
                }
            });
        } catch (err) {
            console.log(err);
            return next(ErrorHandler.serverError());
        }
    },

    // Controller to verify the staff members in the data base
    staffActivation: async (req, res, next) => {
        try {
            // console.log("This here");
            const { token } = req.params;
            // console.log(token);
            if (token) {
                jwt.verify(
                    token,
                    process.env.JWT_ACCOUNT_ACTIVATION_SECRET,
                    async (err, decoded) => {
                        if (err) {
                            console.log("Activaion Error", err);
                            // return res.status(401).json({
                            //     error: "Expired or Invalid activation link. Please try again",
                            // });
                            req.flash(
                                "error",
                                "Expired or Invalid activation link. Please try again"
                            );
                            return res.render(
                                "layouts/staff-password-register",
                                {
                                    error: req.flash("error"),
                                    success: req.flash("success"),
                                }
                            );
                        } else {
                            // console.log(decoded);
                            res.cookie("token", decoded);
                            return res.render(
                                "layouts/staff-password-register",
                                {
                                    error: req.flash("error"),
                                    success: req.flash("success"),
                                }
                            );
                        }
                    }
                );
            } else {
                // return res.json({
                //     message: "An error occured. Please try again",
                // });
                req.flash("error", "An error occured. Please try again");
                return res.render("layouts/staff-password-register", {
                    error: req.flash("error"),
                    success: req.flash("success"),
                });
            }
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    staffPasswordRegisterPage: (req, res) => {
        return res.render("layouts/staff-password-register");
    },

    staffPasswordRegister: async (req, res, next) => {
        try {
            // console.log("Wrong Wroong");
            const {
                firstname,
                lastname,
                email,
                department,
                designation,
                profile_pic_url,
                key,
            } = req.cookies.token;
            // console.log("Token from cookie", req.cookies.token);
            await Staff.findOne({ email }, async (err, staff) => {
                if (err) {
                    console.log(err);
                    req.flash(
                        "error",
                        "Something went wrong! Please try later"
                    );
                    return res.redirect(
                        `/staff-account/activation/${req.cookies.token}`
                    );
                } else if (!staff) {
                    const { password } = req.body;
                    const staff = new Staff({
                        firstname,
                        lastname,
                        email,
                        department,
                        designation,
                        profile_pic_url,
                        key,
                        password,
                    });
                    const data = await staff.save();
                    return res.redirect("/staff-login");
                } else {
                    req.flash("error", "Activation link is already used");
                    return res.redirect("back");
                }
            });
        } catch (err) {
            console.log("This is the error from password register", err);
            next(ErrorHandler.serverError());
        }
    },

    staffLogin: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            await Staff.findOne({ email }, async (err, staff) => {
                if (err) {
                    console.log(err);
                    next(ErrorHandler.serverError());
                } else if (!staff) {
                    // return res.json({
                    //     message: "Member with this email does not exists",
                    // });
                    req.flash("error", "Invalid email or password");
                    return res.redirect("back");
                } else {
                    bcrypt.compare(
                        password,
                        staff.password,
                        async (err, result) => {
                            if (err) {
                                console.log(err);
                                next(ErrorHandler.serverError());
                            }
                            // console.log(result);
                            else if (!result) {
                                // return res.json({
                                //     message:
                                //         "Invalid email address or password",
                                // });
                                req.flash("error", "Invalid email or password");
                                return res.redirect("back");
                            } else {
                                const token = jwt.sign(
                                    {
                                        id: staff._id,
                                    },
                                    process.env.JWT_SECRET,
                                    {
                                        expiresIn: "30m",
                                    }
                                );
                                res.cookie("jwt_token", token, {
                                    httpOnly: true,
                                    secure: true,
                                    maxAge: 30 * 60 * 1000,
                                });
                                return res.redirect("/dashboard");
                            }
                        }
                    );
                }
            });
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    staffDashboard: async (req, res, next) => {
        try {
            const token = req.cookies.jwt_token;
            jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    console.log(err);
                    next(ErrorHandler.forbidden());
                } else if (decodedToken) {
                    const eventCount = await Event.countDocuments();
                    const deptCount = await Dept.countDocuments();
                    const participantCount = await Participant.countDocuments();
                    const staffCount = await Staff.countDocuments();
                    return res.render("layouts/dashboard/dashboard", { staffCount, eventCount, deptCount, participantCount });
                }
            });
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    boardIndex: async (req, res, next) => {
        try {
            const token = req.cookies.jwt_token;
            jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    console.log(err);
                    next(ErrorHandler.forbidden());
                } else if (decodedToken) {
                    const staff = await Staff.find().select("-password -_id -resetPasswordLink -registerPasswordToken -key -password -createdAt -updatedAt");
                    console.log("This should be the array of the staff", staff);
                    const eventCount = await Event.countDocuments();
                    const deptCount = await Dept.countDocuments();
                    const participantCount = await Participant.countDocuments();
                    return res.render("layouts/dashboard/board", { staffData: staff, eventCount, deptCount, participantCount });
                }
            });
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },
    
    messageIndex: async (req, res, next) => {
        try {
            const token = req.cookies.jwt_token;
            jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    console.log(err);
                    next(ErrorHandler.forbidden());
                } else if (decodedToken) {
                    const staff = await Staff.find().select("-password -_id -resetPasswordLink -registerPasswordToken -key -password -createdAt -updatedAt");
                    console.log("This should be the array of the staff", staff);
                    const eventCount = await Event.countDocuments();
                    const deptCount = await Dept.countDocuments();
                    const participantCount = await Participant.countDocuments();
                    return res.render("layouts/dashboard/message", { staffData: staff, eventCount, deptCount, participantCount });
                }
            });
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    eventsRetriver: async (req, res, next) => {
        // for retriving all the events list from database
        await Events.find({}, async (err, eventsList) => {
            if (err) {
                console.log(
                    `Error occur while retriving events list from database`
                );
                // req.flash("error","An error occured while retriving events list");
                res.redirect("/staff-dashboard");
            } else {
                return res.json({
                    eventsList,
                });
            }
        });
    },

    magazineRecieversRetriver: async (req, res, next) => {
        // for retriving all magazine subs from database
        await Magazines.find({}, async (err, magazineSubsList) => {
            if (err) {
                console.log(
                    `Error occur while retriving magazine subs list from database`
                );
                // req.flash("error","An error occured while retriving Magazine Recievers list");
                res.redirect("/staff-dashboard");
            } else {
                return res.json({
                    magazineSubsList,
                });
            }
        });
    },

    departmentsRetriver: async (req, res, next) => {
        // for retriving all the departments from the database
        await Departments.find({}, async (err, departmentsList) => {
            if (err) {
                console.log(
                    `Error occur while retriving departments list from database`
                );
                // req.flash("error","An error occured while retriving departments");
                res.redirect("/staff-dashboard");
            } else {
                return res.json({
                    departmentsList,
                });
            }
        });
    },

    participantsRetriver: async (req, res, next) => {
        // for retriving all the participants from the database
        await Participants.find({}, async (err, participantsList) => {
            if (err) {
                console.log(
                    `Error occur while retriving participants list from database`
                );
                // req.flash("error","An error occured while retriving participants");
                res.redirect("/staff-dashboard");
            } else {
                return res.json({
                    participantsList,
                });
            }
        });
    },

    forgotPassword: (req, res, next) => {
        console.log("In forgotPassword");
        try {
            const { email } = req.body;
            Staff.findOne(
                {
                    email,
                },
                async (err, staff) => {
                    if (err) {
                        console.log(err);
                        next(ErrorHandler.serverError());
                    } else if (staff) {
                        const token = jwt.sign(
                            {
                                _id: staff._id,
                            },
                            process.env.JWT_RESET_PASSWORD_SECRET,
                            {
                                expiresIn: "5m",
                            }
                        );
                        await staff.updateOne(
                            {
                                resetPasswordLink: token,
                            },
                            (err, result) => {
                                if (err) {
                                    console.log(err);
                                    next(ErrorHandler.serverError());
                                } else if (result) {
                                    const transporter =
                                        nodeMailer.createTransport({
                                            service: "gmail",
                                            auth: {
                                                user: process.env.EMAIL_ID,
                                                pass: process.env
                                                    .EMAIL_PASSWORD,
                                            },
                                        });

                                    const mailOptions = {
                                        from: process.env.EMAIL_ID,
                                        to: email,
                                        subject:
                                            "Account password reset link | E-Cell, GNDEC",
                                        html: `
                                            <h1>Hello, ${staff.fullname}</h1>
                                            <p>Click button below to reset your account password</p>
                                            <a href="${process.env.CLIENT_URL}/password-reset/${token}">Activate</a>
                                        `,
                                    };

                                    transporter.sendMail(
                                        mailOptions,
                                        (error, data) => {
                                            if (error) {
                                                console.log(error);
                                                next(
                                                    ErrorHandler.serverError()
                                                );
                                            } else {
                                                // console.log(
                                                //     "This is the data",
                                                //     data
                                                // );
                                                // return res.status(200).json({
                                                //     message:
                                                //         "Password reset link sent successfully!",
                                                // });
                                                req.flash(
                                                    "success",
                                                    "Password reset link sent successfully!"
                                                );
                                                return res.redirect("back");
                                            }
                                        }
                                    );
                                } else {
                                    // return res.json({
                                    //     message:
                                    //         "Expired or invalid reset link. Please try again",
                                    // });
                                    req.flash(
                                        "error",
                                        "Expired or invalid reset link. Please try again"
                                    );
                                    return res.redirect("back");
                                }
                            }
                        );
                    } else {
                        req.flash("error", "Invalid Email Addres");
                        return res.redirect("back");
                    }
                }
            );
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    resetPasswordTokenCheck: (req, res, next) => {
        try {
            // console.log(req.flash("error"));
            const { token } = req.params;
            // console.log("This is the params", token);
            jwt.verify(
                token,
                process.env.JWT_RESET_PASSWORD_SECRET,
                async (err, decoded) => {
                    if (err) {
                        // return res.status(400).json({
                        //     message:
                        //         "Invalid or expired link. Please try again",
                        // });
                        console.log(
                            "This is the errrorrorooassdoasdadasd",
                            err
                        );
                        req.flash(
                            "error",
                            "Invalid or expired link. Please try again"
                        );
                        return res.redirect("back");
                    }
                    console.log("NONONONNONNONONO");
                    await Staff.findOne(
                        {
                            resetPasswordLink: token,
                        },
                        (err, staff) => {
                            if (err) {
                                console.log(err);
                                next(ErrorHandler.serverError());
                            } else if (!staff) {
                                // console.log(staff);
                                // return res.status(400).json({
                                //     message:
                                //         "Password reset link is either not valid or expired. Please try again",
                                // });
                                req.flash(
                                    "error",
                                    "Password reset link is either used or expired. Please try again"
                                );
                                return res.redirect("back");
                            } else {
                                next();
                            }
                        }
                    );
                }
            );
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
        console.log(req.flash("error"));
    },

    updatePassword: (req, res, next) => {
        try {
            console.log("After validation");
            const { token } = req.params;
            // console.log(req.params);
            const { password } = req.body;
            jwt.verify(
                token,
                process.env.JWT_RESET_PASSWORD_SECRET,
                async (err, decoded) => {
                    if (err) {
                        // return res.status(400).json({
                        //     message:
                        //         "Invalid or expired link. Please try again",
                        // });
                        req.flash(
                            "error",
                            "Invalid or expired link. Please try again"
                        );
                        return res.render("layouts/password-reset", {
                            error: req.flash("error"),
                            success: req.flash("success"),
                        });
                    } else {
                        let newPassword;
                        const salt = await bcrypt.genSalt(10);
                        const hashedPassword = await bcrypt.hash(
                            password,
                            salt
                        );
                        newPassword = hashedPassword;
                        await Staff.findOne(
                            { resetPasswordLink: token },
                            async (err, staff) => {
                                if (err) {
                                    console.log(err);
                                    req.flash(
                                        "error",
                                        "Something went wrong. Please try again"
                                    );
                                    return res.redirect("back");
                                } else if (staff) {
                                    console.log("This is staff", staff);
                                    await Staff.findByIdAndUpdate(
                                        decoded._id,
                                        {
                                            password: newPassword,
                                            resetPasswordLink: "",
                                        },
                                        async (err, result) => {
                                            if (err) {
                                                console.log(err);
                                                next(
                                                    ErrorHandler.serverError()
                                                );
                                            } else if (!result) {
                                                // return res.json({
                                                //     message:
                                                //         "Something went wrong. Please try again",
                                                // });
                                                req.flash(
                                                    "error",
                                                    "Something went wrong. Please try again"
                                                );
                                                return res.redirect("back");
                                            } else {
                                                // return res.json({
                                                //     message:
                                                //         "Password changed successfully",
                                                // });
                                                req.flash(
                                                    "success",
                                                    "Password changed successfully"
                                                );
                                                return res.redirect("back");
                                            }
                                        }
                                    );
                                } else {
                                    // console.log(staff);
                                    req.flash(
                                        "error",
                                        "Password reset link is already used"
                                    );
                                    return res.redirect("back");
                                }
                            }
                        );
                    }
                }
            );
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },

    staffLogout: (req, res) => {
        try {
            if (res.locals.staff) {
                res.locals.staff = null;
            } else {
                if (req.cookies.jwt_token) {
                    res.cookie("jwt_token", "", {
                        httpOnly: true,
                        secure: true,
                        maxAge: 1,
                    });
                }
                return res.redirect("/staff-login");
            }
        } catch (err) {
            console.log(err);
            next(ErrorHandler.serverError());
        }
    },
};

module.exports = staffCont;
