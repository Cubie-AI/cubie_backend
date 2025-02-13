import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";

export class Nonce extends Model {
  declare id: number;
  declare nonce: string;
  declare owner: string;
  declare used: boolean;
}

Nonce.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    nonce: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "nonce",
  }
);
