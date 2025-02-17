import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { Agent } from "./agent.js";

export class Comment extends Model {
  declare id: number;
  declare agentId: number;
  declare address: string;
  declare content: string;
  declare replyTo: number | null;
}

Comment.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    agentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Agent,
        key: "id",
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    replyTo: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: "comments",
  }
);
