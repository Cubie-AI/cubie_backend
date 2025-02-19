import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";

export class Token extends Model {
  declare address: string;
  declare name: string;
  declare symbol: string;
  declare decimals: number;
  declare logoURI: string;
  declare mintedAt: Date;
  declare tags: string;
  declare freezeAuthority: string;
  declare mintAuthority: string;
  declare dailyVolume: number;
}

Token.init(
  {
    address: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    decimals: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    logoURI: DataTypes.STRING,
    mintedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    freezeAuthority: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mintAuthority: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dailyVolume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "token",
  }
);
