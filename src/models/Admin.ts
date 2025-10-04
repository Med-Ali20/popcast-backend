import mongoose, { Document } from "mongoose";
import { IAdmin, IAdminDocument, IAdminModel} from "../types";
import bcrypt from "bcryptjs";

const AdminSchema = new mongoose.Schema<IAdminDocument>({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
});

AdminSchema.pre<IAdminDocument>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err as any);
  }
});

AdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);}

const Admin = mongoose.model<IAdminDocument, IAdminModel>("Admin", AdminSchema);
export default Admin;