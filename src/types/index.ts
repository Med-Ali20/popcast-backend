import { Document, HydratedDocument, Model, Types } from "mongoose";

export interface IPodcast {
  title: string;
  subTitle?: string;
  audioUrl: string;
  videoUrl: string;
  description?: string;
  youtube?: string;
  spotify?: string;
  anghami?: string;
  tags?: string[];
  category?: Types.ObjectId;
  appleMusic: string;
  thumbnailUrl?: string;
}

export interface IAdmin {
  username: string;
  password: string;
  isSuperAdmin: boolean;
}

export type IAdminDocument = HydratedDocument<IAdmin> & {
  comparePassword(candidatePassword: string): Promise<boolean>;
};
export interface IAdminModel extends Model<IAdminDocument> {}
