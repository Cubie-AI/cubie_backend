import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { Agent } from "./agent.js";

export class PriceHistory extends Model {
  declare id: number;
  declare agentId: number;
  declare signature: string;
  declare blockTime: number;
  declare price: string;
}

PriceHistory.init(
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
    signature: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    blockTime: {
      type: DataTypes.INTEGER,
    },
    price: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize: db,
    tableName: "price_history",
  }
);
