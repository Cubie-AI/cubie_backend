import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { Agent } from "./agent.js";

export class AgentInfo extends Model {
  declare id: number;
  declare agentId: number;
  declare type: "knowledge" | "style" | "twitter_style" | "telegram_style";
  declare data: string;
}

// export interface AgentInfoBasic extends AgentInfo {

// }

// export interface AgentInfoAction extends AgentInfo {
//   type: "react_to_tweet" | "like_tweet" | "retweet_tweet" | "quote_retweet";
//   data: { peopleId: number; action: string; likelihood: number };
// }

AgentInfo.init(
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    data: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "agent_info",
  }
);
