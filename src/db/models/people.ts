import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { Agent } from "./agent.js";

export class People extends Model {
  declare id: number;
  declare agentId: number;
  declare type: "twitter" | "telegram";
  declare identifier: string;
  // declare actions: PeopleAction[]; -- Later
}

People.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    agentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Agent,
        key: "id",
      },
    },
  },
  {
    sequelize: db,
    modelName: "people",
  }
);
